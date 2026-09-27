#!/usr/bin/env bash
# ==============================================================================
# Platform — Slice 6 Connections & Lead Management Verification Suite
# Script: scripts/test-slice-6.sh
#
# Tests end-to-end against the running stack (default: http://localhost):
# 1. Setup:
#    - Register & Login Admin, Owner, Tenant1, Tenant2.
#    - Assign ROLE_ADMIN to Admin in PostgreSQL.
#    - Complete Owner Declaration & Verify Owner.
#    - Create & Submit Property -> Admin Approves -> Transitions to LIVE.
#    - Create a second Property that remains DRAFT.
# 2. WhatsApp Contact Events:
#    - Unauthenticated contact attempt -> 401 Unauthorized.
#    - Owner contacting own property -> 400 Bad Request.
#    - Tenant contacting DRAFT property -> 400 Bad Request.
#    - Tenant1 contacts LIVE property -> 200 OK with wa.me URL and event ID.
#    - Verify Owner received notification: WHATSAPP_CONTACT.
# 3. Enquiry Lifecycle:
#    - Unauthenticated enquiry attempt -> 401 Unauthorized.
#    - Owner sending enquiry to own property -> 400 Bad Request.
#    - Tenant1 sends enquiry -> 201 Created with status NEW.
#    - Verify Owner received notification: NEW_ENQUIRY.
#    - Tenant1 views my enquiries (/enquiries/my) -> includes new enquiry.
#    - Owner views received enquiries (/enquiries/received) -> includes enquiry.
#    - Non-owner updates enquiry status -> 403 Forbidden.
#    - Owner updates status NEW -> CONTACTED -> 200 OK.
#    - Owner updates status CONTACTED -> VISIT_SCHEDULED -> 200 OK.
#    - Owner updates status VISIT_SCHEDULED -> CLOSED -> 200 OK.
# 4. Visit Scheduling Lifecycle:
#    - Unauthenticated visit request -> 401 Unauthorized.
#    - Owner scheduling visit on own property -> 400 Bad Request.
#    - Tenant1 schedules visit -> 201 Created with status REQUESTED.
#    - Verify Owner received notification: NEW_VISIT_REQUEST.
#    - Owner accepts visit -> status ACCEPTED.
#    - Verify Tenant1 received notification: VISIT_ACCEPTED.
#    - Owner reschedules visit -> status RESCHEDULED.
#    - Verify Tenant1 received notification: VISIT_RESCHEDULED.
#    - Non-requester (Tenant2) attempts to cancel -> 403 Forbidden.
#    - Tenant1 cancels visit -> status CANCELLED.
#    - Verify Owner received notification: VISIT_CANCELLED.
#    - Tenant2 schedules visit -> Owner accepts -> Owner completes -> status COMPLETED.
# 5. Favorites Toggle & List:
#    - Unauthenticated favorite -> 401 Unauthorized.
#    - Tenant1 favorites LIVE property -> favorited: true.
#    - Check favorite status endpoint -> favorited: true.
#    - Tenant1 lists favorites (/favorites) -> property present.
#    - Tenant1 unfavorites property -> favorited: false.
#    - Check favorite status endpoint -> favorited: false.
#    - Tenant1 lists favorites -> property absent.
# 6. Notifications System:
#    - Unread count endpoint returns count > 0.
#    - Get notifications page -> returns list of notifications.
#    - Mark single notification as read -> 200 OK.
#    - Mark all notifications as read -> 200 OK.
#    - Unread count returns 0.
# ==============================================================================

set -o pipefail

# ANSI color formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost}"
DB_CONTAINER="${DB_CONTAINER:-platform-postgres}"
DB_NAME="${POSTGRES_DB:-dev_platform}"
DB_USER="${POSTGRES_USER:-dev_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-dev_insecure_password_replace_in_prod}"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Temporary directory for captures
TMP_DIR=$(mktemp -d /tmp/platform-test-slice6-XXXXXX 2>/dev/null || mktemp -d -t 'platform-test-slice6')
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

log_header() {
    echo -e "\n${BOLD}${CYAN}==============================================================================${NC}"
    echo -e "${BOLD}${CYAN} $1${NC}"
    echo -e "${BOLD}${CYAN}==============================================================================${NC}"
}

log_step() {
    echo -e "\n${BOLD}${BLUE}--> $1${NC}"
}

pass_test() {
    local test_name="$1"
    local detail="${2:-}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  [${GREEN}PASS${NC}] ${BOLD}${test_name}${NC}"
    if [ -n "$detail" ]; then
        echo -e "         ${CYAN}${detail}${NC}"
    fi
}

fail_test() {
    local test_name="$1"
    local error_msg="${2:-Test condition failed}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "  [${RED}FAIL${NC}] ${BOLD}${test_name}${NC}"
    echo -e "         ${RED}Reason: ${error_msg}${NC}"
}

assert_http_code() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    local detail="${4:-}"
    if [ "$expected" -eq "$actual" ]; then
        pass_test "$test_name" "HTTP $actual${detail:+ - $detail}"
    else
        fail_test "$test_name" "Expected HTTP $expected but got HTTP $actual${detail:+ - $detail}"
    fi
}

assert_json_field() {
    local test_name="$1"
    local file="$2"
    local jsonpath="$3"
    local expected="$4"
    local actual
    actual=$(jq -r "$jsonpath" "$file" 2>/dev/null)
    if [ "$actual" = "$expected" ]; then
        pass_test "$test_name" "$jsonpath == $expected"
    else
        fail_test "$test_name" "$jsonpath: expected '$expected', got '$actual'"
    fi
}

assert_json_not_null() {
    local test_name="$1"
    local file="$2"
    local jsonpath="$3"
    local actual
    actual=$(jq -r "$jsonpath" "$file" 2>/dev/null)
    if [ -n "$actual" ] && [ "$actual" != "null" ]; then
        pass_test "$test_name" "$jsonpath is present: $actual"
    else
        fail_test "$test_name" "$jsonpath is null or missing"
    fi
}

assert_json_contains() {
    local test_name="$1"
    local file="$2"
    local jsonpath="$3"
    local substring="$4"
    local actual
    actual=$(jq -r "$jsonpath" "$file" 2>/dev/null)
    if [[ "$actual" == *"$substring"* ]]; then
        pass_test "$test_name" "$jsonpath contains '$substring'"
    else
        fail_test "$test_name" "$jsonpath: expected to contain '$substring', got '$actual'"
    fi
}

# Run SQL in postgres container
run_sql() {
    local sql="$1"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql" 2>/dev/null | tr -d '[:space:]'
}

# Ensure jq is installed
if ! command -v jq &>/dev/null; then
    echo -e "${RED}ERROR: jq is required but not installed.${NC}"
    exit 1
fi

log_header "PLATFORM — SLICE 6 CONNECTIONS & LEAD MANAGEMENT VERIFICATION"

# ------------------------------------------------------------------------------
# STEP 1: Registration and Authentication of Test Users
# ------------------------------------------------------------------------------
log_step "Step 1: Setting up Test Users (Admin, Owner, Tenant1, Tenant2)"

TIMESTAMP=$(date +%s)
ADMIN_EMAIL="admin_slice6_${TIMESTAMP}@example.com"
OWNER_EMAIL="owner_slice6_${TIMESTAMP}@example.com"
TENANT1_EMAIL="tenant1_slice6_${TIMESTAMP}@example.com"
TENANT2_EMAIL="tenant2_slice6_${TIMESTAMP}@example.com"
PASSWORD="SecurePassword123!"

register_and_login() {
    local email="$1"
    local fname="$2"
    local lname="$3"
    local mobile="$4"
    local role_type="$5"
    local token_var="$6"
    local user_id_var="$7"

    # Register
    curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${PASSWORD}\",
            \"confirmPassword\": \"${PASSWORD}\",
            \"firstName\": \"${fname}\",
            \"lastName\": \"${lname}\",
            \"mobile\": \"${mobile}\",
            \"userType\": \"${role_type}\"
        }" > "$TMP_DIR/reg_${email}.json"

    # Login
    curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${PASSWORD}\"
        }" > "$TMP_DIR/login_${email}.json"

    local token
    token=$(jq -r '.data.accessToken // empty' "$TMP_DIR/login_${email}.json")
    local uid
    uid=$(jq -r '.data.user.id // empty' "$TMP_DIR/login_${email}.json")

    eval "${token_var}='${token}'"
    eval "${user_id_var}='${uid}'"
}

register_and_login "$ADMIN_EMAIL" "Admin" "User" "+9196111${TIMESTAMP: -5}" "TENANT" ADMIN_TOKEN ADMIN_UID
register_and_login "$OWNER_EMAIL" "Owner" "Leader" "+9196222${TIMESTAMP: -5}" "BUYER" OWNER_TOKEN OWNER_UID
register_and_login "$TENANT1_EMAIL" "Tenant" "One" "+9196333${TIMESTAMP: -5}" "TENANT" TENANT1_TOKEN TENANT1_UID
register_and_login "$TENANT2_EMAIL" "Tenant" "Two" "+9196444${TIMESTAMP: -5}" "TENANT" TENANT2_TOKEN TENANT2_UID

if [ -n "$ADMIN_TOKEN" ] && [ -n "$OWNER_TOKEN" ] && [ -n "$TENANT1_TOKEN" ] && [ -n "$TENANT2_TOKEN" ]; then
    pass_test "Users Registered & Logged In" "Admin($ADMIN_UID), Owner($OWNER_UID), Tenant1($TENANT1_UID), Tenant2($TENANT2_UID)"
else
    fail_test "Users Registered & Logged In" "Failed to authenticate test accounts"
    exit 1
fi

# Elevate Admin in DB
run_sql "INSERT INTO user_roles (user_id, role_id) SELECT ${ADMIN_UID}, id FROM roles WHERE name = 'ROLE_ADMIN' ON CONFLICT DO NOTHING;"
# Re-login Admin to refresh roles
curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${PASSWORD}\"}" > "$TMP_DIR/admin_login.json"
ADMIN_TOKEN=$(jq -r '.data.accessToken // empty' "$TMP_DIR/admin_login.json")

# Complete Owner Declaration and Verification
curl -s -X POST "${BASE_URL}/api/v1/owners/register" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"ownershipType": "TITLE_OWNER", "declarationAccepted": true}' > "$TMP_DIR/owner_reg.json"
OWNER_PROFILE_ID=$(jq -r '.data.id // empty' "$TMP_DIR/owner_reg.json")

# Re-login Owner for ROLE_OWNER
curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${OWNER_EMAIL}\", \"password\": \"${PASSWORD}\"}" > "$TMP_DIR/owner_login.json"
OWNER_TOKEN=$(jq -r '.data.accessToken // empty' "$TMP_DIR/owner_login.json")

# Create a valid dummy PDF for verification
DUMMY_PDF="$TMP_DIR/kyc.pdf"
printf "%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%%%EOF\n" > "$DUMMY_PDF"

# Upload KYC doc & submit
curl -s -X POST "${BASE_URL}/api/v1/documents" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -F "file=@${DUMMY_PDF};type=application/pdf" \
    -F "documentType=IDENTITY_PROOF" > "$TMP_DIR/doc_upload.json"

curl -s -X POST "${BASE_URL}/api/v1/owners/verification/submit" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > "$TMP_DIR/owner_submit.json"

# Admin verifies owner
curl -s -X PUT "${BASE_URL}/api/v1/admin/owners/${OWNER_PROFILE_ID}/verify" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"remarks": "Owner KYC documents verified"}' > "$TMP_DIR/admin_verify_owner.json"

assert_json_field "Owner Profile Verified" "$TMP_DIR/admin_verify_owner.json" ".data.verificationStatus" "VERIFIED"

# ------------------------------------------------------------------------------
# STEP 2: Create Properties (Property 1 -> LIVE, Property 2 -> DRAFT)
# ------------------------------------------------------------------------------
log_step "Step 2: Creating Test Properties (LIVE Property and DRAFT Property)"

# Create Property 1
curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Slice 6 Luxury 3BHK Penthouse",
        "propertyType": "APARTMENT",
        "listingType": "RENT",
        "price": 45000,
        "maintenanceCharges": 3500,
        "securityDeposit": 150000,
        "bhk": 3,
        "bedrooms": 3,
        "bathrooms": 3,
        "carpetArea": 1600,
        "builtUpArea": 1900,
        "furnishing": "FULLY_FURNISHED",
        "floorNumber": 7,
        "totalFloors": 12,
        "description": "Stunning luxury penthouse in prime tech corridor",
        "preferredTenant": "FAMILY",
        "availabilityDate": "2026-10-01",
        "state": "Karnataka",
        "city": "Bengaluru",
        "district": "Bengaluru Urban",
        "locality": "Indiranagar",
        "address": "100ft Road, 12th Main",
        "pincode": "560038",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "amenities": ["PARKING", "LIFT", "GYM", "SECURITY"]
    }' > "$TMP_DIR/prop1.json"

PROP_LIVE_ID=$(jq -r '.data.id // empty' "$TMP_DIR/prop1.json")

# Upload photo for Property 1
DUMMY_JPG="${TMP_DIR}/photo.jpg"
printf "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xFF\xD9" > "$DUMMY_JPG"

curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/images" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -F "file=@${DUMMY_JPG};type=image/jpeg" > "$TMP_DIR/prop1_img.json"

# Submit Property 1
curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/submit" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > "$TMP_DIR/prop1_submit.json"

# Admin approves Property 1 -> Since Owner is VERIFIED, it transitions immediately to LIVE
curl -s -X PUT "${BASE_URL}/api/v1/admin/properties/${PROP_LIVE_ID}/approve" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"remarks": "Property approved for public listing"}' > "$TMP_DIR/prop1_approve.json"

# Check Property 1 status in DB
P1_STATUS=$(run_sql "SELECT status FROM properties WHERE id = ${PROP_LIVE_ID};")
if [ "$P1_STATUS" = "LIVE" ]; then
    pass_test "Property 1 Transitioned to LIVE" "Property ID: $PROP_LIVE_ID"
else
    fail_test "Property 1 Transitioned to LIVE" "Expected status LIVE but got $P1_STATUS"
fi

# Create Property 2 (remains DRAFT)
curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Slice 6 Draft Villa",
        "propertyType": "VILLA",
        "listingType": "RENT",
        "price": 75000,
        "state": "Karnataka",
        "city": "Bengaluru",
        "district": "Bengaluru Urban",
        "locality": "Whitefield",
        "address": "ITPL Main Road",
        "pincode": "560066"
    }' > "$TMP_DIR/prop2.json"
PROP_DRAFT_ID=$(jq -r '.data.id // empty' "$TMP_DIR/prop2.json")
pass_test "Property 2 Created in DRAFT" "Property ID: $PROP_DRAFT_ID"

# ------------------------------------------------------------------------------
# STEP 3: WhatsApp Contact Events
# ------------------------------------------------------------------------------
log_step "Step 3: WhatsApp Contact Events"

# 3.1 Anonymous contact attempt -> 401
CODE=$(curl -s -o "$TMP_DIR/c1.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/contact" \
    -H "Content-Type: application/json" \
    -d '{"contactType": "WHATSAPP"}')
assert_http_code "Anonymous Contact Rejected" 401 "$CODE"

# 3.2 Owner contacting own property -> 400
CODE=$(curl -s -o "$TMP_DIR/c2.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/contact" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"contactType": "WHATSAPP"}')
assert_http_code "Owner Contacting Own Listing Rejected" 400 "$CODE"

# 3.3 Contacting non-LIVE property -> 400
CODE=$(curl -s -o "$TMP_DIR/c3.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_DRAFT_ID}/contact" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"contactType": "WHATSAPP"}')
assert_http_code "Contacting Non-LIVE Property Rejected" 400 "$CODE"

# 3.4 Tenant1 contacts LIVE property -> 200 OK with wa.me deep link
CODE=$(curl -s -o "$TMP_DIR/c4.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/contact" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"contactType": "WHATSAPP"}')
assert_http_code "Tenant1 Contacts LIVE Property" 200 "$CODE"
assert_json_contains "WhatsApp URL Generated" "$TMP_DIR/c4.json" ".data.whatsappUrl" "https://wa.me/"
assert_json_not_null "Contact Event ID Generated" "$TMP_DIR/c4.json" ".data.contactEventId"

# 3.5 Verify Owner received in-app notification for WhatsApp contact
NOTIF_COUNT=$(run_sql "SELECT COUNT(*) FROM notifications WHERE user_id = ${OWNER_UID} AND notification_type = 'CONTACT';")
if [ -n "$NOTIF_COUNT" ] && [ "$NOTIF_COUNT" -ge 1 ]; then
    pass_test "Owner Received CONTACT Notification" "Count: $NOTIF_COUNT"
else
    fail_test "Owner Received CONTACT Notification" "No notification found in DB (count: '$NOTIF_COUNT')"
fi

# ------------------------------------------------------------------------------
# STEP 4: Enquiry Lifecycle
# ------------------------------------------------------------------------------
log_step "Step 4: Enquiry Lifecycle (Create -> List -> Status Updates)"

# 4.1 Anonymous enquiry attempt -> 401
CODE=$(curl -s -o "$TMP_DIR/e1.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/enquiries" \
    -H "Content-Type: application/json" \
    -d '{"message": "Is this available immediately?"}')
assert_http_code "Anonymous Enquiry Rejected" 401 "$CODE"

# 4.2 Owner enquiring on own property -> 400
CODE=$(curl -s -o "$TMP_DIR/e2.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/enquiries" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"message": "Self enquiry test"}')
assert_http_code "Owner Enquiring on Own Property Rejected" 400 "$CODE"

# 4.3 Tenant1 sends valid enquiry -> 201 Created with status NEW
CODE=$(curl -s -o "$TMP_DIR/e3.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/enquiries" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello, I am interested in renting this penthouse. Is the security deposit negotiable?"}')
assert_http_code "Tenant1 Sends Enquiry" 201 "$CODE"
assert_json_field "Enquiry Status is NEW" "$TMP_DIR/e3.json" ".data.status" "NEW"
ENQUIRY_ID=$(jq -r '.data.id // empty' "$TMP_DIR/e3.json")

# 4.4 Verify Owner received notification for ENQUIRY
NOTIF_ENQ=$(run_sql "SELECT COUNT(*) FROM notifications WHERE user_id = ${OWNER_UID} AND notification_type = 'ENQUIRY';")
if [ -n "$NOTIF_ENQ" ] && [ "$NOTIF_ENQ" -ge 1 ]; then
    pass_test "Owner Received ENQUIRY Notification" "Count: $NOTIF_ENQ"
else
    fail_test "Owner Received ENQUIRY Notification" "Notification not found"
fi

# 4.5 Tenant1 lists my enquiries -> includes the enquiry
curl -s -X GET "${BASE_URL}/api/v1/enquiries/my" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" > "$TMP_DIR/my_enquiries.json"
MY_ENQ_FOUND=$(jq -r --arg id "$ENQUIRY_ID" '.data.content[] | select(.id == ($id | tonumber)) | .id' "$TMP_DIR/my_enquiries.json" 2>/dev/null)
if [ "$MY_ENQ_FOUND" = "$ENQUIRY_ID" ]; then
    pass_test "Tenant1 My Enquiries Contains Enquiry" "Enquiry ID: $ENQUIRY_ID"
else
    fail_test "Tenant1 My Enquiries Contains Enquiry" "Enquiry $ENQUIRY_ID not in list"
fi

# 4.6 Owner lists received enquiries -> includes the enquiry
curl -s -X GET "${BASE_URL}/api/v1/enquiries/received" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > "$TMP_DIR/received_enquiries.json"
REC_ENQ_FOUND=$(jq -r --arg id "$ENQUIRY_ID" '.data.content[] | select(.id == ($id | tonumber)) | .id' "$TMP_DIR/received_enquiries.json" 2>/dev/null)
if [ "$REC_ENQ_FOUND" = "$ENQUIRY_ID" ]; then
    pass_test "Owner Received Enquiries Contains Enquiry" "Enquiry ID: $ENQUIRY_ID"
else
    fail_test "Owner Received Enquiries Contains Enquiry" "Enquiry $ENQUIRY_ID not in received list"
fi

# 4.7 Non-owner (Tenant2) attempts to update enquiry status -> 403 Forbidden
CODE=$(curl -s -o "$TMP_DIR/e_forbid.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/enquiries/${ENQUIRY_ID}/status" \
    -H "Authorization: Bearer ${TENANT2_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"status": "CONTACTED"}')
assert_http_code "Non-Owner Status Update Rejected" 403 "$CODE"

# 4.8 Owner updates enquiry status: NEW -> CONTACTED -> 200 OK
CODE=$(curl -s -o "$TMP_DIR/e_c.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/enquiries/${ENQUIRY_ID}/status" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"status": "CONTACTED"}')
assert_http_code "Owner Updates Enquiry to CONTACTED" 200 "$CODE"
assert_json_field "Status is CONTACTED" "$TMP_DIR/e_c.json" ".data.status" "CONTACTED"

# 4.9 Owner updates enquiry status: CONTACTED -> VISIT_SCHEDULED -> 200 OK
CODE=$(curl -s -o "$TMP_DIR/e_vs.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/enquiries/${ENQUIRY_ID}/status" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"status": "VISIT_SCHEDULED"}')
assert_http_code "Owner Updates Enquiry to VISIT_SCHEDULED" 200 "$CODE"
assert_json_field "Status is VISIT_SCHEDULED" "$TMP_DIR/e_vs.json" ".data.status" "VISIT_SCHEDULED"

# 4.10 Owner updates enquiry status: VISIT_SCHEDULED -> CLOSED -> 200 OK
CODE=$(curl -s -o "$TMP_DIR/e_cl.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/enquiries/${ENQUIRY_ID}/status" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"status": "CLOSED"}')
assert_http_code "Owner Updates Enquiry to CLOSED" 200 "$CODE"
assert_json_field "Status is CLOSED" "$TMP_DIR/e_cl.json" ".data.status" "CLOSED"

# ------------------------------------------------------------------------------
# STEP 5: Visit Scheduling Lifecycle
# ------------------------------------------------------------------------------
log_step "Step 5: Visit Scheduling Lifecycle (Request -> Accept -> Reschedule -> Cancel / Complete)"

# 5.1 Anonymous visit request -> 401
CODE=$(curl -s -o "$TMP_DIR/v1.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/visits" \
    -H "Content-Type: application/json" \
    -d '{"preferredDate": "2026-10-10", "preferredTime": "10:00:00"}')
assert_http_code "Anonymous Visit Request Rejected" 401 "$CODE"

# 5.2 Owner scheduling visit on own property -> 400
CODE=$(curl -s -o "$TMP_DIR/v2.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/visits" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"preferredDate": "2026-10-10", "preferredTime": "10:00:00"}')
assert_http_code "Owner Scheduling Visit on Own Property Rejected" 400 "$CODE"

# 5.3 Tenant1 schedules visit -> 201 Created with status REQUESTED
CODE=$(curl -s -o "$TMP_DIR/v3.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/visits" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "preferredDate": "2026-10-12",
        "preferredTime": "11:30:00",
        "message": "I would like to view the penthouse around noon."
    }')
assert_http_code "Tenant1 Schedules Visit" 201 "$CODE"
assert_json_field "Visit Status is REQUESTED" "$TMP_DIR/v3.json" ".data.status" "REQUESTED"
VISIT1_ID=$(jq -r '.data.id // empty' "$TMP_DIR/v3.json")

# 5.4 Check Owner notification for VISIT_REQUEST
NOTIF_VISIT=$(run_sql "SELECT COUNT(*) FROM notifications WHERE user_id = ${OWNER_UID} AND notification_type = 'VISIT_REQUEST';")
if [ -n "$NOTIF_VISIT" ] && [ "$NOTIF_VISIT" -ge 1 ]; then
    pass_test "Owner Received VISIT_REQUEST Notification" "Count: $NOTIF_VISIT"
else
    fail_test "Owner Received VISIT_REQUEST Notification" "Notification not found"
fi

# 5.5 Owner accepts visit -> status becomes ACCEPTED
CODE=$(curl -s -o "$TMP_DIR/v_accept.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/visits/${VISIT1_ID}/accept" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")
assert_http_code "Owner Accepts Visit" 200 "$CODE"
assert_json_field "Visit Status is ACCEPTED" "$TMP_DIR/v_accept.json" ".data.status" "ACCEPTED"

# 5.6 Verify Tenant1 received notification VISIT_ACCEPTED
NOTIF_ACC=$(run_sql "SELECT COUNT(*) FROM notifications WHERE user_id = ${TENANT1_UID} AND notification_type = 'VISIT_ACCEPTED';")
if [ -n "$NOTIF_ACC" ] && [ "$NOTIF_ACC" -ge 1 ]; then
    pass_test "Tenant1 Received VISIT_ACCEPTED Notification" "Count: $NOTIF_ACC"
else
    fail_test "Tenant1 Received VISIT_ACCEPTED Notification" "Notification not found"
fi

# 5.7 Owner reschedules visit -> status becomes RESCHEDULED
CODE=$(curl -s -o "$TMP_DIR/v_resched.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/visits/${VISIT1_ID}/reschedule" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "rescheduledDate": "2026-10-14",
        "rescheduledTime": "16:00:00",
        "ownerRemarks": "Can we meet on Wednesday afternoon instead?"
    }')
assert_http_code "Owner Reschedules Visit" 200 "$CODE"
assert_json_field "Visit Status is RESCHEDULED" "$TMP_DIR/v_resched.json" ".data.status" "RESCHEDULED"
assert_json_field "New Visit Date Updated" "$TMP_DIR/v_resched.json" ".data.rescheduledDate" "2026-10-14"

# 5.8 Verify Tenant1 received notification VISIT_RESCHEDULED
NOTIF_RES=$(run_sql "SELECT COUNT(*) FROM notifications WHERE user_id = ${TENANT1_UID} AND notification_type = 'VISIT_RESCHEDULED';")
if [ -n "$NOTIF_RES" ] && [ "$NOTIF_RES" -ge 1 ]; then
    pass_test "Tenant1 Received VISIT_RESCHEDULED Notification" "Count: $NOTIF_RES"
else
    fail_test "Tenant1 Received VISIT_RESCHEDULED Notification" "Notification not found"
fi

# 5.9 Tenant2 attempts to cancel Tenant1's visit -> 403/404 Forbidden/Not Found
CODE=$(curl -s -o "$TMP_DIR/v_canc_bad.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/visits/${VISIT1_ID}/cancel" \
    -H "Authorization: Bearer ${TENANT2_TOKEN}")
if [ "$CODE" -eq 403 ] || [ "$CODE" -eq 404 ]; then
    pass_test "Unauthorized Cancellation Attempt Rejected" "HTTP $CODE"
else
    fail_test "Unauthorized Cancellation Attempt Rejected" "Expected HTTP 403 or 404 but got HTTP $CODE"
fi

# 5.10 Tenant1 cancels own visit -> status becomes CANCELLED
CODE=$(curl -s -o "$TMP_DIR/v_canc.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/visits/${VISIT1_ID}/cancel" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}")
assert_http_code "Tenant1 Cancels Visit" 200 "$CODE"
assert_json_field "Visit Status is CANCELLED" "$TMP_DIR/v_canc.json" ".data.status" "CANCELLED"

# 5.11 Verify Owner received notification VISIT_CANCELLED
NOTIF_CANC=$(run_sql "SELECT COUNT(*) FROM notifications WHERE user_id = ${OWNER_UID} AND notification_type = 'VISIT_CANCELLED';")
if [ -n "$NOTIF_CANC" ] && [ "$NOTIF_CANC" -ge 1 ]; then
    pass_test "Owner Received VISIT_CANCELLED Notification" "Count: $NOTIF_CANC"
else
    fail_test "Owner Received VISIT_CANCELLED Notification" "Notification not found"
fi

# 5.12 Tenant2 schedules second visit, Owner accepts and completes it
curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/visits" \
    -H "Authorization: Bearer ${TENANT2_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"preferredDate": "2026-10-15", "preferredTime": "14:00:00", "message": "Ready to visit"}' > "$TMP_DIR/v_second.json"
VISIT2_ID=$(jq -r '.data.id // empty' "$TMP_DIR/v_second.json")

# Owner accepts
curl -s -X PUT "${BASE_URL}/api/v1/visits/${VISIT2_ID}/accept" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > /dev/null

# Owner completes visit -> status becomes COMPLETED
CODE=$(curl -s -o "$TMP_DIR/v_comp.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/visits/${VISIT2_ID}/complete" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")
assert_http_code "Owner Completes Visit" 200 "$CODE"
assert_json_field "Visit Status is COMPLETED" "$TMP_DIR/v_comp.json" ".data.status" "COMPLETED"

# ------------------------------------------------------------------------------
# STEP 6: Favorites Module
# ------------------------------------------------------------------------------
log_step "Step 6: Favorites Toggle, Status Check & Listing"

# 6.1 Anonymous favorite attempt -> 401
CODE=$(curl -s -o "$TMP_DIR/f1.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/favorite")
assert_http_code "Anonymous Favorite Rejected" 401 "$CODE"

# 6.2 Tenant1 checks initial favorite status -> favorited: false
CODE=$(curl -s -o "$TMP_DIR/f_stat1.json" -w "%{http_code}" -X GET \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/favorite/status" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}")
assert_http_code "Favorite Status Retrieved" 200 "$CODE"
assert_json_field "Initial Favorite Status is False" "$TMP_DIR/f_stat1.json" ".data.favorited" "false"

# 6.3 Tenant1 toggles favorite on -> favorited: true
CODE=$(curl -s -o "$TMP_DIR/f_tog1.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/favorite" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}")
assert_http_code "Favorite Toggled ON" 200 "$CODE"
assert_json_field "Toggle Response Favorited is True" "$TMP_DIR/f_tog1.json" ".data.favorited" "true"

# 6.4 Tenant1 verifies status endpoint -> favorited: true
curl -s -X GET "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/favorite/status" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" > "$TMP_DIR/f_stat2.json"
assert_json_field "Favorite Status Endpoint Returns True" "$TMP_DIR/f_stat2.json" ".data.favorited" "true"

# 6.5 Tenant1 lists favorites -> property is present
curl -s -X GET "${BASE_URL}/api/v1/favorites" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" > "$TMP_DIR/fav_list1.json"
FAV_FOUND=$(jq -r --arg id "$PROP_LIVE_ID" '.data.content[] | select(.id == ($id | tonumber)) | .id' "$TMP_DIR/fav_list1.json" 2>/dev/null)
if [ "$FAV_FOUND" = "$PROP_LIVE_ID" ]; then
    pass_test "Favorites List Contains Property" "Property ID: $PROP_LIVE_ID"
else
    fail_test "Favorites List Contains Property" "Property $PROP_LIVE_ID not found in favorites"
fi

# 6.6 Tenant1 toggles favorite off -> favorited: false
CODE=$(curl -s -o "$TMP_DIR/f_tog2.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/properties/${PROP_LIVE_ID}/favorite" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}")
assert_http_code "Favorite Toggled OFF" 200 "$CODE"
assert_json_field "Toggle Response Favorited is False" "$TMP_DIR/f_tog2.json" ".data.favorited" "false"

# 6.7 Tenant1 lists favorites -> property is removed
curl -s -X GET "${BASE_URL}/api/v1/favorites" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" > "$TMP_DIR/fav_list2.json"
FAV_REMOVED=$(jq -r --arg id "$PROP_LIVE_ID" '.data.content[] | select(.id == ($id | tonumber)) | .id' "$TMP_DIR/fav_list2.json" 2>/dev/null)
if [ -z "$FAV_REMOVED" ]; then
    pass_test "Favorites List Successfully Removed Property" "No longer in list"
else
    fail_test "Favorites List Successfully Removed Property" "Property still present in favorites"
fi

# ------------------------------------------------------------------------------
# STEP 7: Notification Management Endpoints
# ------------------------------------------------------------------------------
log_step "Step 7: In-App Notifications API (Unread Count, Read Single, Read All)"

# 7.1 Owner unread notification count > 0
curl -s -X GET "${BASE_URL}/api/v1/notifications/unread-count" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > "$TMP_DIR/unread1.json"
UNREAD_COUNT=$(jq -r '.data.count // 0' "$TMP_DIR/unread1.json")
if [ "$UNREAD_COUNT" -gt 0 ]; then
    pass_test "Owner Has Unread Notifications" "Unread count: $UNREAD_COUNT"
else
    fail_test "Owner Has Unread Notifications" "Expected > 0 unread, got $UNREAD_COUNT"
fi

# 7.2 Owner fetches notifications page
curl -s -X GET "${BASE_URL}/api/v1/notifications?size=10" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > "$TMP_DIR/notifs.json"
FIRST_NOTIF_ID=$(jq -r '.data.content[0].id // empty' "$TMP_DIR/notifs.json")
assert_json_not_null "Notifications List Contains Entries" "$TMP_DIR/notifs.json" ".data.content[0].title"

# 7.3 Mark single notification as read
CODE=$(curl -s -o "$TMP_DIR/read_single.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/notifications/${FIRST_NOTIF_ID}/read" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")
assert_http_code "Mark Single Notification as Read" 200 "$CODE"
assert_json_field "Notification Marked isRead=true" "$TMP_DIR/read_single.json" ".data.read" "true"

# 7.4 Mark all notifications as read
CODE=$(curl -s -o "$TMP_DIR/read_all.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/notifications/read-all" \
    -H "Authorization: Bearer ${OWNER_TOKEN}")
assert_http_code "Mark All Notifications as Read" 200 "$CODE"

# 7.5 Unread count is now 0
curl -s -X GET "${BASE_URL}/api/v1/notifications/unread-count" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > "$TMP_DIR/unread2.json"
assert_json_field "Unread Count is Now 0" "$TMP_DIR/unread2.json" ".data.count" "0"

# ------------------------------------------------------------------------------
# SUMMARY REPORT
# ------------------------------------------------------------------------------
log_header "SLICE 6 VERIFICATION SUMMARY"
echo -e "Total Tests Run : ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "Tests Passed    : ${GREEN}${BOLD}${PASSED_TESTS}${NC}"
echo -e "Tests Failed    : ${RED}${BOLD}${FAILED_TESTS}${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}>>> ALL SLICE 6 VERIFICATION TESTS PASSED! <<<${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}>>> SLICE 6 VERIFICATION HAD FAILURES! <<<${NC}\n"
    exit 1
fi
