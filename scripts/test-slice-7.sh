#!/usr/bin/env bash
# ==============================================================================
# Platform — Slice 7 Trust, Operations & Admin Verification Suite
# Script: scripts/test-slice-7.sh
#
# Tests end-to-end against the running stack (default: http://localhost):
# 1. Setup:
#    - Register & Login Admin, Owner, Tenant1, Tenant2.
#    - Assign ROLE_ADMIN to Admin in PostgreSQL.
#    - Complete Owner Declaration & KYC Verification for Owner.
#    - Create Property 1 & Property 2 -> Submit -> Admin Approves -> Both LIVE.
# 2. Report Submission & User Views:
#    - Unauthenticated report attempt -> 401 Unauthorized.
#    - Tenant1 submits report against Property 1 (SUSPECTED_BROKER) -> 201 PENDING.
#    - Tenant1 views /reports/my -> includes Report 1.
#    - Tenant2 submits report against Property 2 (INACCURATE_INFORMATION) -> 201 PENDING.
# 3. Admin Moderation & Investigation:
#    - Non-admin access to admin reports -> 403 Forbidden.
#    - Admin lists /admin/reports?status=PENDING -> returns reports.
#    - Admin views /admin/reports/{id} detail -> returns full report.
#    - Admin marks report 1 as INVESTIGATING -> 200 OK.
# 4. Moderation Resolution & Invariant (HIDE_PROPERTY):
#    - Admin resolves report 1 with HIDE_PROPERTY -> 200 OK (status: RESOLVED).
#    - Invariant: Property 1 automatically transitions to SUSPENDED in DB.
#    - Public Search: Property 1 excluded from /api/v1/properties/search.
#    - Public Detail: GET /api/v1/properties/{id} returns 404 (status not leaked).
# 5. Moderation Dismissal:
#    - Admin dismisses report 2 -> 200 OK (status: DISMISSED).
#    - Property 2 remains LIVE in DB.
# 6. Admin User Management (Suspend & Restore):
#    - Admin lists /admin/users -> returns users page.
#    - Admin suspends Tenant2 -> 200 OK (active: false).
#    - DB check: is_active = false.
#    - Suspended Tenant2 calls /api/v1/auth/me -> rejected (401/403).
#    - Admin restores Tenant2 -> 200 OK (active: true).
#    - Restored Tenant2 calls /api/v1/auth/me -> 200 OK.
# 7. Admin Dashboard Metrics:
#    - Admin calls /api/v1/admin/dashboard -> 200 OK with all metric fields.
# 8. Immutable Admin Audit Logs:
#    - Admin calls /api/v1/admin/audit-logs -> 200 OK.
#    - Verify audit records for RESOLVE_REPORT, DISMISS_REPORT, SUSPEND_USER, RESTORE_USER.
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

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Temporary directory for captures
TMP_DIR=$(mktemp -d /tmp/platform-test-slice7-XXXXXX 2>/dev/null || mktemp -d -t 'platform-test-slice7')
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

log_header "PLATFORM — SLICE 7 TRUST, OPERATIONS & ADMIN VERIFICATION"

# ------------------------------------------------------------------------------
# STEP 1: Registration and Authentication of Test Users
# ------------------------------------------------------------------------------
log_step "Step 1: Setting up Test Users (Admin, Owner, Tenant1, Tenant2)"

TIMESTAMP=$(date +%s)
ADMIN_EMAIL="admin_slice7_${TIMESTAMP}@example.com"
OWNER_EMAIL="owner_slice7_${TIMESTAMP}@example.com"
TENANT1_EMAIL="tenant1_slice7_${TIMESTAMP}@example.com"
TENANT2_EMAIL="tenant2_slice7_${TIMESTAMP}@example.com"
PASSWORD="SecurePassword123!"

register_and_login() {
    local email="$1"
    local fname="$2"
    local lname="$3"
    local mobile="$4"
    local role_type="$5"
    local token_var="$6"
    local user_id_var="$7"

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

    eval "${token_var}=\"${token}\""
    eval "${user_id_var}=\"${uid}\""
}

register_and_login "$ADMIN_EMAIL" "Admin" "User" "+9197111${TIMESTAMP: -5}" "TENANT" ADMIN_TOKEN ADMIN_UID
register_and_login "$OWNER_EMAIL" "Owner" "Leader" "+9197222${TIMESTAMP: -5}" "BUYER" OWNER_TOKEN OWNER_UID
register_and_login "$TENANT1_EMAIL" "Tenant" "One" "+9197333${TIMESTAMP: -5}" "TENANT" TENANT1_TOKEN TENANT1_UID
register_and_login "$TENANT2_EMAIL" "Tenant" "Two" "+9197444${TIMESTAMP: -5}" "TENANT" TENANT2_TOKEN TENANT2_UID

if [ -n "$ADMIN_TOKEN" ] && [ -n "$OWNER_TOKEN" ] && [ -n "$TENANT1_TOKEN" ] && [ -n "$TENANT2_TOKEN" ]; then
    pass_test "Users Registered & Logged In" "Admin($ADMIN_UID), Owner($OWNER_UID), Tenant1($TENANT1_UID), Tenant2($TENANT2_UID)"
else
    fail_test "Users Registered & Logged In" "Failed to authenticate test accounts"
    exit 1
fi

# Elevate Admin in DB & re-login
run_sql "INSERT INTO user_roles (user_id, role_id) SELECT ${ADMIN_UID}, id FROM roles WHERE name = 'ROLE_ADMIN' ON CONFLICT DO NOTHING;"
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

# Upload KYC doc & verify owner
DUMMY_PDF="$TMP_DIR/kyc.pdf"
printf "%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%%%EOF" > "$DUMMY_PDF"

curl -s -X POST "${BASE_URL}/api/v1/documents" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" \
    -F "file=@${DUMMY_PDF};type=application/pdf" \
    -F "documentType=IDENTITY_PROOF" > /dev/null

curl -s -X POST "${BASE_URL}/api/v1/owners/verification/submit" \
    -H "Authorization: Bearer ${OWNER_TOKEN}" > /dev/null

curl -s -X PUT "${BASE_URL}/api/v1/admin/owners/${OWNER_PROFILE_ID}/verify" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"remarks": "Owner KYC documents verified"}' > "$TMP_DIR/admin_verify_owner.json"

assert_json_field "Owner Profile Verified" "$TMP_DIR/admin_verify_owner.json" ".data.verificationStatus" "VERIFIED"

# Create Property 1 & Property 2
DUMMY_JPG="${TMP_DIR}/photo.jpg"
printf "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xFF\xD9" > "$DUMMY_JPG"

create_and_publish_property() {
    local title="$1"
    local locality="$2"
    local prop_id_var="$3"

    curl -s -X POST "${BASE_URL}/api/v1/properties" \
        -H "Authorization: Bearer ${OWNER_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"${title}\",
            \"propertyType\": \"APARTMENT\",
            \"listingType\": \"RENT\",
            \"price\": 35000,
            \"bhk\": 2,
            \"bedrooms\": 2,
            \"bathrooms\": 2,
            \"carpetArea\": 1100,
            \"furnishing\": \"FULLY_FURNISHED\",
            \"state\": \"Karnataka\",
            \"city\": \"Bengaluru\",
            \"district\": \"Bengaluru Urban\",
            \"locality\": \"${locality}\",
            \"address\": \"Main Road\",
            \"pincode\": \"560038\"
        }" > "$TMP_DIR/create_prop.json"

    local pid
    pid=$(jq -r '.data.id // empty' "$TMP_DIR/create_prop.json")

    curl -s -X POST "${BASE_URL}/api/v1/properties/${pid}/images" \
        -H "Authorization: Bearer ${OWNER_TOKEN}" \
        -F "file=@${DUMMY_JPG};type=image/jpeg" > /dev/null

    curl -s -X PUT "${BASE_URL}/api/v1/properties/${pid}/submit" \
        -H "Authorization: Bearer ${OWNER_TOKEN}" > /dev/null

    curl -s -X PUT "${BASE_URL}/api/v1/admin/properties/${pid}/approve" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"remarks": "Approved"}' > /dev/null

    eval "${prop_id_var}=\"${pid}\""
}

create_and_publish_property "Slice 7 Penthouse" "Indiranagar" PROP1_ID
create_and_publish_property "Slice 7 Villa" "Whitefield" PROP2_ID

P1_STATUS=$(run_sql "SELECT status FROM properties WHERE id = ${PROP1_ID};")
P2_STATUS=$(run_sql "SELECT status FROM properties WHERE id = ${PROP2_ID};")

if [ "$P1_STATUS" = "LIVE" ] && [ "$P2_STATUS" = "LIVE" ]; then
    pass_test "Properties 1 & 2 Live" "Prop1($PROP1_ID) and Prop2($PROP2_ID) in status LIVE"
else
    fail_test "Properties 1 & 2 Live" "P1: $P1_STATUS, P2: $P2_STATUS"
    exit 1
fi

# ------------------------------------------------------------------------------
# STEP 2: Report Submission & User Views
# ------------------------------------------------------------------------------
log_step "Step 2: User Report Submission & My Reports View"

# 2.1 Anonymous report attempt -> 401
CODE=$(curl -s -o "$TMP_DIR/r_anon.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/reports" \
    -H "Content-Type: application/json" \
    -d "{\"propertyId\": ${PROP1_ID}, \"reason\": \"BROKER\", \"description\": \"Demanding brokerage\"}")
assert_http_code "Anonymous Report Rejected" 401 "$CODE"

# 2.2 Tenant1 submits report against Property 1 -> 201 Created
CODE=$(curl -s -o "$TMP_DIR/r1.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/reports" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"propertyId\": ${PROP1_ID},
        \"reason\": \"BROKER\",
        \"description\": \"Owner asked for 1 month brokerage fee off-platform.\"
    }")
assert_http_code "Tenant1 Submits Report 1" 201 "$CODE"
assert_json_field "Report 1 Status is OPEN" "$TMP_DIR/r1.json" ".data.status" "OPEN"
REPORT1_ID=$(jq -r '.data.id // empty' "$TMP_DIR/r1.json")

# 2.3 Tenant1 views my reports -> includes Report 1
curl -s -X GET "${BASE_URL}/api/v1/reports/my" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}" > "$TMP_DIR/my_reports.json"
MY_REP_FOUND=$(jq -r --arg id "$REPORT1_ID" '.data.content[] | select(.id == ($id | tonumber)) | .id' "$TMP_DIR/my_reports.json" 2>/dev/null)
if [ "$MY_REP_FOUND" = "$REPORT1_ID" ]; then
    pass_test "Tenant1 My Reports Contains Report 1" "Report ID: $REPORT1_ID"
else
    fail_test "Tenant1 My Reports Contains Report 1" "Report $REPORT1_ID not found in user reports"
fi

# 2.4 Tenant2 submits report against Property 2 -> 201 Created
CODE=$(curl -s -o "$TMP_DIR/r2.json" -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/reports" \
    -H "Authorization: Bearer ${TENANT2_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"propertyId\": ${PROP2_ID},
        \"reason\": \"WRONG_INFORMATION\",
        \"description\": \"Listing claims 4 balconies but there is only 1.\"
    }")
assert_http_code "Tenant2 Submits Report 2" 201 "$CODE"
REPORT2_ID=$(jq -r '.data.id // empty' "$TMP_DIR/r2.json")

# ------------------------------------------------------------------------------
# STEP 3: Admin Moderation & Investigation
# ------------------------------------------------------------------------------
log_step "Step 3: Admin Moderation & Investigation"

# 3.1 Non-admin calls admin reports -> 403 Forbidden
CODE=$(curl -s -o "$TMP_DIR/admin_forbid.json" -w "%{http_code}" -X GET \
    "${BASE_URL}/api/v1/admin/reports" \
    -H "Authorization: Bearer ${TENANT1_TOKEN}")
assert_http_code "Non-Admin Access to Admin Reports Rejected" 403 "$CODE"

# 3.2 Admin lists reports -> returns reports
curl -s -X GET "${BASE_URL}/api/v1/admin/reports?status=OPEN" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" > "$TMP_DIR/admin_reports.json"
R1_FOUND=$(jq -r --arg id "$REPORT1_ID" '.data.content[] | select(.id == ($id | tonumber)) | .id' "$TMP_DIR/admin_reports.json" 2>/dev/null)
if [ "$R1_FOUND" = "$REPORT1_ID" ]; then
    pass_test "Admin Lists Reports Queue" "Found Report $REPORT1_ID in OPEN queue"
else
    fail_test "Admin Lists Reports Queue" "Report $REPORT1_ID not found in admin queue"
fi

# 3.3 Admin views report detail
curl -s -X GET "${BASE_URL}/api/v1/admin/reports/${REPORT1_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" > "$TMP_DIR/admin_report_detail.json"
assert_json_field "Admin Report Detail Retrieved" "$TMP_DIR/admin_report_detail.json" ".data.reason" "BROKER"

# 3.4 Admin marks Report 1 as INVESTIGATING
CODE=$(curl -s -o "$TMP_DIR/r1_investigate.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/admin/reports/${REPORT1_ID}/investigate" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
assert_http_code "Admin Marks Report as INVESTIGATING" 200 "$CODE"
assert_json_field "Report 1 Status is UNDER_INVESTIGATION" "$TMP_DIR/r1_investigate.json" ".data.status" "UNDER_INVESTIGATION"

# ------------------------------------------------------------------------------
# STEP 4: Moderation Resolution & Invariant (HIDE_PROPERTY)
# ------------------------------------------------------------------------------
log_step "Step 4: Report Resolution (HIDE_PROPERTY) & System Invariant Verification"

# 4.1 Admin resolves Report 1 with HIDE_PROPERTY
CODE=$(curl -s -o "$TMP_DIR/r1_resolve.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/admin/reports/${REPORT1_ID}/resolve" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "action": "HIDE_PROPERTY",
        "notes": "Confirmed broker violation. Property suspended immediately."
    }')
assert_http_code "Admin Resolves Report with HIDE_PROPERTY" 200 "$CODE"
assert_json_field "Report 1 Status is RESOLVED" "$TMP_DIR/r1_resolve.json" ".data.status" "RESOLVED"
assert_json_field "Resolution Action is HIDE_PROPERTY" "$TMP_DIR/r1_resolve.json" ".data.resolutionAction" "HIDE_PROPERTY"

# 4.2 Invariant Verification: Target Property transitioned to SUSPENDED in DB
P1_POST_STATUS=$(run_sql "SELECT status FROM properties WHERE id = ${PROP1_ID};")
if [ "$P1_POST_STATUS" = "SUSPENDED" ]; then
    pass_test "Invariant: Property Transitioned to SUSPENDED" "Property $PROP1_ID status: SUSPENDED"
else
    fail_test "Invariant: Property Transitioned to SUSPENDED" "Expected SUSPENDED, got $P1_POST_STATUS"
fi

# 4.3 Public Search: Property 1 excluded from search results
curl -s -X GET "${BASE_URL}/api/v1/properties/search" > "$TMP_DIR/public_search.json"
P1_SEARCH_FOUND=$(jq -r --arg id "$PROP1_ID" '.data.content[] | select(.id == ($id | tonumber)) | .id' "$TMP_DIR/public_search.json" 2>/dev/null)
if [ -z "$P1_SEARCH_FOUND" ]; then
    pass_test "Public Search Excludes Suspended Property" "Property $PROP1_ID not in search results"
else
    fail_test "Public Search Excludes Suspended Property" "Suspended Property $PROP1_ID found in search!"
fi

# 4.4 Public Detail: GET /api/v1/properties/{id} returns 404
CODE=$(curl -s -o "$TMP_DIR/p1_pub.json" -w "%{http_code}" -X GET \
    "${BASE_URL}/api/v1/properties/${PROP1_ID}")
assert_http_code "Public Detail Returns 404 for Suspended Property" 404 "$CODE"

# ------------------------------------------------------------------------------
# STEP 5: Moderation Dismissal
# ------------------------------------------------------------------------------
log_step "Step 5: Report Dismissal"

CODE=$(curl -s -o "$TMP_DIR/r2_dismiss.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/admin/reports/${REPORT2_ID}/dismiss" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"notes": "Verified details match architectural layout. Dismissing report."}')
assert_http_code "Admin Dismisses Report 2" 200 "$CODE"
assert_json_field "Report 2 Status is DISMISSED" "$TMP_DIR/r2_dismiss.json" ".data.status" "DISMISSED"

# Property 2 remains LIVE
P2_POST_STATUS=$(run_sql "SELECT status FROM properties WHERE id = ${PROP2_ID};")
if [ "$P2_POST_STATUS" = "LIVE" ]; then
    pass_test "Property 2 Remains LIVE after Report Dismissal" "Property $PROP2_ID status: LIVE"
else
    fail_test "Property 2 Remains LIVE after Report Dismissal" "Expected LIVE, got $P2_POST_STATUS"
fi

# ------------------------------------------------------------------------------
# STEP 6: Admin User Management (Suspend & Restore)
# ------------------------------------------------------------------------------
log_step "Step 6: Admin User Management (Suspend & Restore)"

# 6.1 List users
curl -s -X GET "${BASE_URL}/api/v1/admin/users" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" > "$TMP_DIR/admin_users.json"
assert_json_not_null "Admin User Directory Retrievable" "$TMP_DIR/admin_users.json" ".data.content[0].email"

# 6.2 Admin suspends Tenant2
CODE=$(curl -s -o "$TMP_DIR/u_susp.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/admin/users/${TENANT2_UID}/suspend" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
assert_http_code "Admin Suspends User" 200 "$CODE"
assert_json_field "User is Suspended" "$TMP_DIR/u_susp.json" ".data.active" "false"

# 6.3 DB verify active = false
T2_ACTIVE=$(run_sql "SELECT is_active FROM users WHERE id = ${TENANT2_UID};")
if [ "$T2_ACTIVE" = "f" ] || [ "$T2_ACTIVE" = "false" ]; then
    pass_test "User is_active is false in Database" "Tenant2($TENANT2_UID)"
else
    fail_test "User is_active is false in Database" "Expected false, got $T2_ACTIVE"
fi

# 6.4 Suspended user cannot access protected endpoints
CODE=$(curl -s -o "$TMP_DIR/t2_auth.json" -w "%{http_code}" -X GET \
    "${BASE_URL}/api/v1/auth/me" \
    -H "Authorization: Bearer ${TENANT2_TOKEN}")
if [ "$CODE" -eq 401 ] || [ "$CODE" -eq 403 ]; then
    pass_test "Suspended User Access Blocked" "HTTP $CODE"
else
    fail_test "Suspended User Access Blocked" "Expected HTTP 401 or 403 but got HTTP $CODE"
fi

# 6.5 Admin restores Tenant2
CODE=$(curl -s -o "$TMP_DIR/u_rest.json" -w "%{http_code}" -X PUT \
    "${BASE_URL}/api/v1/admin/users/${TENANT2_UID}/restore" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
assert_http_code "Admin Restores User" 200 "$CODE"
assert_json_field "User is Restored Active" "$TMP_DIR/u_rest.json" ".data.active" "true"

# 6.6 Restored user can access auth/me
CODE=$(curl -s -o "$TMP_DIR/t2_restored.json" -w "%{http_code}" -X GET \
    "${BASE_URL}/api/v1/auth/me" \
    -H "Authorization: Bearer ${TENANT2_TOKEN}")
assert_http_code "Restored User Access Restored" 200 "$CODE"

# ------------------------------------------------------------------------------
# STEP 7: Admin Operations Dashboard Metrics
# ------------------------------------------------------------------------------
log_step "Step 7: Admin Operations Dashboard Metrics"

curl -s -X GET "${BASE_URL}/api/v1/admin/dashboard" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" > "$TMP_DIR/admin_dash.json"

assert_json_not_null "Dashboard totalUsers Present" "$TMP_DIR/admin_dash.json" ".data.totalUsers"
assert_json_not_null "Dashboard totalOwners Present" "$TMP_DIR/admin_dash.json" ".data.totalOwners"
assert_json_not_null "Dashboard liveProperties Present" "$TMP_DIR/admin_dash.json" ".data.liveProperties"
assert_json_not_null "Dashboard openReports Present" "$TMP_DIR/admin_dash.json" ".data.openReports"

# ------------------------------------------------------------------------------
# STEP 8: Immutable Admin Audit Logs
# ------------------------------------------------------------------------------
log_step "Step 8: Chronological Admin Audit Log Query"

curl -s -X GET "${BASE_URL}/api/v1/admin/audit-logs" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" > "$TMP_DIR/audit_logs.json"

TOTAL_AUDIT_LOGS=$(jq -r '.data.totalElements // .data.page.totalElements // (.data.content | length)' "$TMP_DIR/audit_logs.json")
if [ "$TOTAL_AUDIT_LOGS" -ge 4 ]; then
    pass_test "Audit Logs Contain Recorded Actions" "Total entries: $TOTAL_AUDIT_LOGS"
else
    fail_test "Audit Logs Contain Recorded Actions" "Expected >= 4 entries, got $TOTAL_AUDIT_LOGS"
fi

# Verify specific audit actions were logged
RESOLVE_LOG=$(jq -r '.data.content[] | select(.action == "RESOLVE_REPORT") | .id' "$TMP_DIR/audit_logs.json" 2>/dev/null | head -1)
DISMISS_LOG=$(jq -r '.data.content[] | select(.action == "DISMISS_REPORT") | .id' "$TMP_DIR/audit_logs.json" 2>/dev/null | head -1)
SUSPEND_LOG=$(jq -r '.data.content[] | select(.action == "SUSPEND_USER") | .id' "$TMP_DIR/audit_logs.json" 2>/dev/null | head -1)
RESTORE_LOG=$(jq -r '.data.content[] | select(.action == "RESTORE_USER") | .id' "$TMP_DIR/audit_logs.json" 2>/dev/null | head -1)

if [ -n "$RESOLVE_LOG" ] && [ -n "$DISMISS_LOG" ] && [ -n "$SUSPEND_LOG" ] && [ -n "$RESTORE_LOG" ]; then
    pass_test "Audit Trail Contains All Expected Event Types" "RESOLVE_REPORT, DISMISS_REPORT, SUSPEND_USER, RESTORE_USER"
else
    fail_test "Audit Trail Contains All Expected Event Types" "Missing one or more expected audit actions"
fi

# ------------------------------------------------------------------------------
# SUMMARY REPORT
# ------------------------------------------------------------------------------
log_header "SLICE 7 VERIFICATION SUMMARY"
echo -e "Total Tests Run : ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "Tests Passed    : ${GREEN}${BOLD}${PASSED_TESTS}${NC}"
echo -e "Tests Failed    : ${RED}${BOLD}${FAILED_TESTS}${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}>>> ALL SLICE 7 VERIFICATION TESTS PASSED! <<<${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}>>> SLICE 7 VERIFICATION HAD FAILURES! <<<${NC}\n"
    exit 1
fi
