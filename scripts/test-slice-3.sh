#!/usr/bin/env bash
# ==============================================================================
# Platform — Slice 3 Integration & Security Verification Suite
# Script: scripts/test-slice-3.sh
#
# Tests end-to-end against the running stack (default: http://localhost):
# 1. User Registration & Login (Tenant 1 & Tenant 2)
# 2. Pre-Onboarding Access Guard (ROLE_OWNER required for owner endpoints)
# 3. Owner Onboarding Declaration (POST /api/v1/owners/register, duplicate prevention)
# 4. Re-login & Session Refresh (Verify ROLE_OWNER authority)
# 5. Property Draft Creation (POST /api/v1/properties with district, status DRAFT)
# 6. Valid Photo Upload & Nginx Static Delivery (Magic bytes inspection, HTTP 200 on /uploads/*)
# 7. Invalid Photo Rejection (Magic byte validation, HTTP 400 Bad Request)
# 8. Primary Image Setting & Image Deletion Cleanup (Physical file removed, HTTP 404)
# 9. Draft Update (PUT /api/v1/properties/{id})
# 10. Strict Ownership Isolation & IDOR Prevention (Tenant 2 blocked on Owner 1 resources)
# 11. Property Submission (PUT /api/v1/properties/{id}/submit, DRAFT -> SUBMITTED)
# 12. Post-Submission Immutability Guard (No edits/deletions/uploads allowed on SUBMITTED)
# 13. Owner Properties Listing (GET /api/v1/properties/my)
# 14. PASS/FAIL Summary & Report
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
BASE_URL="${BASE_URL:-http://localhost:8080}"
DB_CONTAINER="${DB_CONTAINER:-platform-postgres}"
DB_NAME="${POSTGRES_DB:-dev_platform}"
DB_USER="${POSTGRES_USER:-dev_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-dev_insecure_password_replace_in_prod}"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Temporary directory for request/response captures
TMP_DIR=$(mktemp -d /tmp/platform-test-slice3-XXXXXX 2>/dev/null || mktemp -d -t 'platform-test-slice3')
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

log_header() {
    echo -e "\n${BOLD}${CYAN}==============================================================================${NC}"
    echo -e "${BOLD}${CYAN} $1${NC}"
    echo -e "${BOLD}${CYAN}==============================================================================${NC}"
}

log_step() {
    echo -e "\n${BOLD}${BLUE}==> [TEST $((TOTAL_TESTS + 1))] $1${NC}"
}

pass_test() {
    local name="$1"
    local detail="${2:-}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
    if [ -n "$detail" ]; then
        echo -e "    ${GREEN}✔ PASS:${NC} ${BOLD}${name}${NC} (${detail})"
    else
        echo -e "    ${GREEN}✔ PASS:${NC} ${BOLD}${name}${NC}"
    fi
}

fail_test() {
    local name="$1"
    local detail="${2:-}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
    if [ -n "$detail" ]; then
        echo -e "    ${RED}✖ FAIL:${NC} ${BOLD}${name}${NC} (${RED}${detail}${NC})"
    else
        echo -e "    ${RED}✖ FAIL:${NC} ${BOLD}${name}${NC}"
    fi
}

check_dependency() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${RED}ERROR: Required command line utility '$cmd' is not installed or not in PATH.${NC}" >&2
        exit 1
    fi
}

log_header "Platform Slice 3 Integration & Security Test Suite"
echo -e "Base Target URL: ${BOLD}${BASE_URL}${NC}"
echo -e "Temporary Dir:   ${TMP_DIR}"

check_dependency curl
check_dependency jq
check_dependency grep
check_dependency sed

# Check target server availability
echo -n "Checking target stack availability (${BASE_URL}/api/health)... "
HEALTH_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${BASE_URL}/api/health" || echo "000")
if [ "$HEALTH_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}UP (HTTP 200)${NC}"
else
    echo -e "${RED}DOWN (HTTP ${HEALTH_HTTP_CODE})${NC}"
    echo -e "${RED}ERROR: Platform stack is not reachable at ${BASE_URL}. Ensure docker compose is running.${NC}" >&2
    exit 1
fi

RAND_ID="${RANDOM}_$(date +%s)"
OWNER1_EMAIL="owner1_${RAND_ID}@example.com"
OWNER1_PASSWORD="Password123!"
OWNER2_EMAIL="tenant2_${RAND_ID}@example.com"
OWNER2_PASSWORD="Password123!"

# ==============================================================================
# 1. User Registration (Tenant 1 & Tenant 2)
# ==============================================================================
log_step "Register Users (Tenant 1 & Tenant 2)"

REG1_BODY="${TMP_DIR}/reg1_body.json"
HTTP_CODE_REG1=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER1_EMAIL}\",\"password\":\"${OWNER1_PASSWORD}\",\"confirmPassword\":\"${OWNER1_PASSWORD}\",\"firstName\":\"Ramesh\",\"lastName\":\"Gupta\",\"userType\":\"TENANT\"}" \
    -o "$REG1_BODY" \
    -w "%{http_code}")

REG2_BODY="${TMP_DIR}/reg2_body.json"
HTTP_CODE_REG2=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER2_EMAIL}\",\"password\":\"${OWNER2_PASSWORD}\",\"confirmPassword\":\"${OWNER2_PASSWORD}\",\"firstName\":\"Suresh\",\"lastName\":\"Verma\",\"userType\":\"TENANT\"}" \
    -o "$REG2_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_REG1" = "201" ] && [ "$HTTP_CODE_REG2" = "201" ]; then
    pass_test "User Registrations" "Both users registered successfully (HTTP 201)"
else
    fail_test "User Registrations" "Registration failed: user1=${HTTP_CODE_REG1}, user2=${HTTP_CODE_REG2}"
fi

# ==============================================================================
# 2. Login to obtain access tokens
# ==============================================================================
log_step "Login Users"

LOGIN1_BODY="${TMP_DIR}/login1_body.json"
HTTP_CODE_LOGIN1=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER1_EMAIL}\",\"password\":\"${OWNER1_PASSWORD}\"}" \
    -o "$LOGIN1_BODY" \
    -w "%{http_code}")

TOKEN1=$(jq -r '.data.accessToken // empty' "$LOGIN1_BODY" 2>/dev/null || echo "")

LOGIN2_BODY="${TMP_DIR}/login2_body.json"
HTTP_CODE_LOGIN2=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER2_EMAIL}\",\"password\":\"${OWNER2_PASSWORD}\"}" \
    -o "$LOGIN2_BODY" \
    -w "%{http_code}")

TOKEN2=$(jq -r '.data.accessToken // empty' "$LOGIN2_BODY" 2>/dev/null || echo "")

if [ -n "$TOKEN1" ] && [ -n "$TOKEN2" ]; then
    pass_test "User Logins" "Tokens acquired for both test users"
else
    fail_test "User Logins" "Failed to acquire tokens: token1=${HTTP_CODE_LOGIN1}, token2=${HTTP_CODE_LOGIN2}"
fi

# ==============================================================================
# 3. Pre-Onboarding Access Guard (ROLE_OWNER Required)
# ==============================================================================
log_step "Pre-Onboarding Access Guard (Non-owner blocked from owner endpoints)"

PRE_GUARD_BODY="${TMP_DIR}/pre_guard_body.json"
HTTP_CODE_PRE=$(curl -s -X GET "${BASE_URL}/api/v1/owners/profile" \
    -H "Authorization: Bearer ${TOKEN1}" \
    -o "$PRE_GUARD_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_PRE" = "403" ]; then
    pass_test "Pre-Onboarding Owner Guard" "HTTP 403 Forbidden returned when accessing /owners/profile before declaration"
else
    fail_test "Pre-Onboarding Owner Guard" "Expected HTTP 403 Forbidden, got HTTP ${HTTP_CODE_PRE}"
fi

# ==============================================================================
# 4. Owner Onboarding Declaration (POST /api/v1/owners/register)
# ==============================================================================
log_step "Owner Onboarding Declaration (POST /api/v1/owners/register)"

ONBOARD_BODY="${TMP_DIR}/onboard_body.json"
HTTP_CODE_ONBOARD=$(curl -s -X POST "${BASE_URL}/api/v1/owners/register" \
    -H "Authorization: Bearer ${TOKEN1}" \
    -H "Content-Type: application/json" \
    -d '{"ownershipType":"TITLE_OWNER","companyName":"Gupta Properties","declarationAccepted":true}' \
    -o "$ONBOARD_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_ONBOARD" = "200" ] || [ "$HTTP_CODE_ONBOARD" = "201" ]; then
    OWNERSHIP_TYPE=$(jq -r '.data.ownershipType // empty' "$ONBOARD_BODY" 2>/dev/null || echo "")
    DECLARATION_VERSION=$(jq -r '.data.declarationVersion // empty' "$ONBOARD_BODY" 2>/dev/null || echo "")
    if [ "$OWNERSHIP_TYPE" = "TITLE_OWNER" ] && [ "$DECLARATION_VERSION" = "v1.0" ]; then
        pass_test "Owner Onboarding Declaration" "HTTP ${HTTP_CODE_ONBOARD} OK, ownershipType=TITLE_OWNER, version=v1.0"
    else
        fail_test "Owner Onboarding Declaration" "Missing declaration details: type=${OWNERSHIP_TYPE}, version=${DECLARATION_VERSION}"
    fi
else
    fail_test "Owner Onboarding Declaration" "Expected HTTP 200/201, got HTTP ${HTTP_CODE_ONBOARD}. Body: $(cat "$ONBOARD_BODY")"
fi

# Test duplicate declaration prevention
DUP_ONBOARD_BODY="${TMP_DIR}/dup_onboard_body.json"
HTTP_CODE_DUP=$(curl -s -X POST "${BASE_URL}/api/v1/owners/register" \
    -H "Authorization: Bearer ${TOKEN1}" \
    -H "Content-Type: application/json" \
    -d '{"ownershipType":"TITLE_OWNER","declarationAccepted":true}' \
    -o "$DUP_ONBOARD_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_DUP" = "400" ]; then
    pass_test "Duplicate Owner Declaration Prevention" "HTTP 400 Bad Request returned on duplicate declaration attempt"
else
    fail_test "Duplicate Owner Declaration Prevention" "Expected HTTP 400 Bad Request, got HTTP ${HTTP_CODE_DUP}"
fi

# Re-login to get updated JWT containing ROLE_OWNER
LOGIN_OWNER_BODY="${TMP_DIR}/login_owner_body.json"
curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER1_EMAIL}\",\"password\":\"${OWNER1_PASSWORD}\"}" \
    -o "$LOGIN_OWNER_BODY" >/dev/null
OWNER1_TOKEN=$(jq -r '.data.accessToken // empty' "$LOGIN_OWNER_BODY" 2>/dev/null || echo "$TOKEN1")

# Verify /owners/profile access with owner token
PROFILE_BODY="${TMP_DIR}/owner_profile_body.json"
HTTP_CODE_PROFILE=$(curl -s -X GET "${BASE_URL}/api/v1/owners/profile" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -o "$PROFILE_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_PROFILE" = "200" ]; then
    pass_test "Owner Profile Access" "HTTP 200 OK returned for verified owner session"
else
    fail_test "Owner Profile Access" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_PROFILE}. Body: $(cat "$PROFILE_BODY")"
fi

# ==============================================================================
# 5. Property Draft Creation (POST /api/v1/properties)
# ==============================================================================
log_step "Property Draft Creation (POST /api/v1/properties)"

PROPERTY_PAYLOAD=$(cat <<EOF
{
  "title": "Spacious 3BHK Luxury Apartment in Indiranagar",
  "propertyType": "APARTMENT",
  "listingType": "RENT",
  "price": 65000.00,
  "maintenanceCharges": 5000.00,
  "securityDeposit": 250000.00,
  "bhk": 3,
  "bedrooms": 3,
  "bathrooms": 3,
  "carpetArea": 1650.00,
  "builtUpArea": 1950.00,
  "furnishing": "SEMI_FURNISHED",
  "floorNumber": 4,
  "totalFloors": 12,
  "description": "Luxurious east-facing apartment with park view, 100% power backup, and modern modular kitchen.",
  "preferredTenant": "FAMILY",
  "state": "Karnataka",
  "city": "Bengaluru",
  "district": "Bengaluru Urban",
  "locality": "Indiranagar",
  "address": "100 Feet Road, HAL 2nd Stage, Indiranagar",
  "pincode": "560038",
  "amenities": ["LIFT", "GYM", "SWIMMING_POOL", "POWER_BACKUP", "SECURITY", "PARKING"]
}
EOF
)

CREATE_PROP_BODY="${TMP_DIR}/create_prop_body.json"
HTTP_CODE_PROP=$(curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PROPERTY_PAYLOAD" \
    -o "$CREATE_PROP_BODY" \
    -w "%{http_code}")

PROP_ID=""
if [ "$HTTP_CODE_PROP" = "201" ]; then
    PROP_ID=$(jq -r '.data.id // empty' "$CREATE_PROP_BODY" 2>/dev/null || echo "")
    PROP_STATUS=$(jq -r '.data.status // empty' "$CREATE_PROP_BODY" 2>/dev/null || echo "")
    PROP_DISTRICT=$(jq -r '.data.district // empty' "$CREATE_PROP_BODY" 2>/dev/null || echo "")

    if [ -n "$PROP_ID" ] && [ "$PROP_STATUS" = "DRAFT" ] && [ "$PROP_DISTRICT" = "Bengaluru Urban" ]; then
        pass_test "Property Draft Creation" "HTTP 201 Created, id=${PROP_ID}, status=DRAFT, district=Bengaluru Urban"
    else
        fail_test "Property Draft Creation" "Invalid property attributes: id=${PROP_ID}, status=${PROP_STATUS}, district=${PROP_DISTRICT}"
    fi
else
    fail_test "Property Draft Creation" "Expected HTTP 201 Created, got HTTP ${HTTP_CODE_PROP}. Body: $(cat "$CREATE_PROP_BODY")"
fi

# ==============================================================================
# 6. Valid Photo Upload & Nginx Static Delivery
# ==============================================================================
log_step "Photo Upload & Nginx Static Serving (POST /api/v1/properties/{id}/images)"

if [ -n "$PROP_ID" ]; then
    # Generate a genuine valid JPEG with magic bytes (FF D8 FF E0 ...)
    TEST_IMAGE_FILE="${TMP_DIR}/test_cover.jpg"
    printf "\xFF\xD8\xFF\xE0\x00\x10\x4A\x46\x49\x46\x00\x01\x01\x01\x00\x48\x00\x48\x00\x00\xFF\xDB\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0A\x0C\x14\x0D\x0C\x0B\x0B\x0C\x19\x12\x13\x0F\x14\x1D\x1A\x1F\x1E\x1D\x1A\x1C\x1C\x20\x24\x2E\x27\x20\x22\x2C\x23\x1C\x1C\x28\x37\x29\x2C\x30\x31\x34\x34\x34\x1F\x27\x39\x3D\x38\x32\x3C\x2E\x33\x34\x32\xFF\xC0\x00\x0B\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xDA\x00\x08\x01\x01\x00\x00\x3F\x00\xBF\x00\xFF\xD9" > "$TEST_IMAGE_FILE"

    UPLOAD_BODY="${TMP_DIR}/upload_body.json"
    HTTP_CODE_UPLOAD=$(curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP_ID}/images" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -F "file=@${TEST_IMAGE_FILE};type=image/jpeg" \
        -o "$UPLOAD_BODY" \
        -w "%{http_code}")

    IMAGE1_ID=""
    IMAGE1_URL=""
    if [ "$HTTP_CODE_UPLOAD" = "201" ]; then
        IMAGE1_ID=$(jq -r '.data.id // empty' "$UPLOAD_BODY" 2>/dev/null || echo "")
        IMAGE1_URL=$(jq -r '.data.url // empty' "$UPLOAD_BODY" 2>/dev/null || echo "")
        IS_PRIMARY=$(jq -r '.data.isPrimary // empty' "$UPLOAD_BODY" 2>/dev/null || echo "")

        if [ -n "$IMAGE1_ID" ] && [ -n "$IMAGE1_URL" ] && [ "$IS_PRIMARY" = "true" ]; then
            pass_test "Valid Photo Upload" "HTTP 201 Created, imageId=${IMAGE1_ID}, url=${IMAGE1_URL}, isPrimary=true"

            # Verify public serving by Nginx directly at the derived URL
            NGINX_IMG_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${IMAGE1_URL}")
            if [ "$NGINX_IMG_CODE" = "200" ]; then
                pass_test "Nginx Static Photo Serving" "HTTP 200 OK from Nginx at ${IMAGE1_URL}"
            else
                fail_test "Nginx Static Photo Serving" "Nginx returned HTTP ${NGINX_IMG_CODE} for ${BASE_URL}${IMAGE1_URL}"
            fi
        else
            fail_test "Valid Photo Upload" "Missing image details: id=${IMAGE1_ID}, url=${IMAGE1_URL}, primary=${IS_PRIMARY}"
        fi
    else
        fail_test "Valid Photo Upload" "Expected HTTP 201 Created, got HTTP ${HTTP_CODE_UPLOAD}. Body: $(cat "$UPLOAD_BODY")"
    fi
else
    fail_test "Photo Upload" "Skipped due to missing property ID"
fi

# ==============================================================================
# 7. Invalid Photo Rejection (Security & Magic Bytes)
# ==============================================================================
log_step "Invalid Photo Rejection (Magic Bytes Inspection)"

if [ -n "$PROP_ID" ]; then
    FAKE_IMAGE_FILE="${TMP_DIR}/fake_image.jpg"
    echo "This is not an image file. It is plain text pretending to be a JPG." > "$FAKE_IMAGE_FILE"

    FAKE_UPLOAD_BODY="${TMP_DIR}/fake_upload_body.json"
    HTTP_CODE_FAKE=$(curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP_ID}/images" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -F "file=@${FAKE_IMAGE_FILE};type=image/jpeg" \
        -o "$FAKE_UPLOAD_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_FAKE" = "400" ]; then
        pass_test "Fake Image Rejection" "HTTP 400 Bad Request correctly returned for spoofed file with invalid magic bytes"
    else
        fail_test "Fake Image Rejection" "Expected HTTP 400 Bad Request, got HTTP ${HTTP_CODE_FAKE}. Body: $(cat "$FAKE_UPLOAD_BODY")"
    fi
fi

# ==============================================================================
# 8. Primary Image Setting & Image Deletion Cleanup
# ==============================================================================
log_step "Primary Image Setting & File Deletion Cleanup"

if [ -n "$PROP_ID" ]; then
    # Upload a second valid PNG image
    TEST_IMAGE_FILE2="${TMP_DIR}/test_photo2.png"
    printf "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A\x00\x00\x00\x0D\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1F\x15\xC4\x89\x00\x00\x00\x0A\x49\x44\x41\x54\x78\x9C\x63\x00\x01\x00\x00\x05\x00\x01\x0D\x0A\x2D\xB4\x00\x00\x00\x00\x49\x45\x4E\x44\xAE\x42\x60\x82" > "$TEST_IMAGE_FILE2"

    UPLOAD_BODY2="${TMP_DIR}/upload_body2.json"
    HTTP_CODE_UPLOAD2=$(curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP_ID}/images" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -F "file=@${TEST_IMAGE_FILE2};type=image/png" \
        -o "$UPLOAD_BODY2" \
        -w "%{http_code}")

    IMAGE2_ID=""
    IMAGE2_URL=""
    if [ "$HTTP_CODE_UPLOAD2" = "201" ]; then
        IMAGE2_ID=$(jq -r '.data.id // empty' "$UPLOAD_BODY2" 2>/dev/null || echo "")
        IMAGE2_URL=$(jq -r '.data.url // empty' "$UPLOAD_BODY2" 2>/dev/null || echo "")
    fi

    if [ -n "$IMAGE2_ID" ]; then
        # Set image 2 as primary
        PRIMARY_BODY="${TMP_DIR}/primary_body.json"
        HTTP_CODE_PRIM=$(curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_ID}/images/${IMAGE2_ID}/primary" \
            -H "Authorization: Bearer ${OWNER1_TOKEN}" \
            -o "$PRIMARY_BODY" \
            -w "%{http_code}")

        if [ "$HTTP_CODE_PRIM" = "200" ]; then
            pass_test "Primary Image Setting" "Image ${IMAGE2_ID} successfully designated as primary cover photo"
        else
            fail_test "Primary Image Setting" "Expected HTTP 200, got HTTP ${HTTP_CODE_PRIM}. Body: $(cat "$PRIMARY_BODY")"
        fi

        # Delete image 1 and verify file removed from disk (404 on Nginx)
        DEL_IMG_BODY="${TMP_DIR}/del_img_body.json"
        HTTP_CODE_DEL=$(curl -s -X DELETE "${BASE_URL}/api/v1/properties/${PROP_ID}/images/${IMAGE1_ID}" \
            -H "Authorization: Bearer ${OWNER1_TOKEN}" \
            -o "$DEL_IMG_BODY" \
            -w "%{http_code}")

        if [ "$HTTP_CODE_DEL" = "200" ]; then
            pass_test "Image Deletion" "Image ${IMAGE1_ID} deleted from database"

            # Check Nginx 404 for deleted image file
            NGINX_AFTER_DEL=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${IMAGE1_URL}")
            if [ "$NGINX_AFTER_DEL" = "404" ]; then
                pass_test "Physical File Cleanup" "HTTP 404 confirmed from Nginx: physical file cleaned up on image deletion"
            else
                fail_test "Physical File Cleanup" "Expected HTTP 404 for deleted file, got HTTP ${NGINX_AFTER_DEL}"
            fi
        else
            fail_test "Image Deletion" "Expected HTTP 200, got HTTP ${HTTP_CODE_DEL}. Body: $(cat "$DEL_IMG_BODY")"
        fi
    fi
fi

# ==============================================================================
# 9. Draft Specification Updates (PUT /api/v1/properties/{id})
# ==============================================================================
log_step "Update Draft Property Specifications"

if [ -n "$PROP_ID" ]; then
    UPDATE_PAYLOAD=$(cat <<EOF
{
  "title": "Spacious 3BHK Ultra-Luxury Apartment in Indiranagar (Renovated)",
  "propertyType": "APARTMENT",
  "listingType": "RENT",
  "price": 68000.00,
  "maintenanceCharges": 5500.00,
  "securityDeposit": 250000.00,
  "bhk": 3,
  "bedrooms": 3,
  "bathrooms": 3,
  "carpetArea": 1700.00,
  "builtUpArea": 2000.00,
  "furnishing": "SEMI_FURNISHED",
  "floorNumber": 4,
  "totalFloors": 12,
  "description": "Updated description: Newly painted, premium Italian marble flooring, park view.",
  "preferredTenant": "FAMILY",
  "state": "Karnataka",
  "city": "Bengaluru",
  "district": "Bengaluru Urban",
  "locality": "Indiranagar",
  "address": "100 Feet Road, HAL 2nd Stage, Indiranagar",
  "pincode": "560038",
  "amenities": ["LIFT", "GYM", "SWIMMING_POOL", "POWER_BACKUP", "SECURITY", "PARKING", "CLUB_HOUSE"]
}
EOF
)

    UPDATE_PROP_BODY="${TMP_DIR}/update_prop_body.json"
    HTTP_CODE_UPDATE=$(curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_ID}" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$UPDATE_PAYLOAD" \
        -o "$UPDATE_PROP_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_UPDATE" = "200" ]; then
        UPDATED_TITLE=$(jq -r '.data.title // empty' "$UPDATE_PROP_BODY" 2>/dev/null || echo "")
        UPDATED_PRICE=$(jq -r '.data.price // empty' "$UPDATE_PROP_BODY" 2>/dev/null || echo "")
        if [[ "$UPDATED_TITLE" == *"Renovated"* ]] && [ "$UPDATED_PRICE" = "68000.00" ]; then
            pass_test "Draft Property Update" "HTTP 200 OK, title and price successfully updated"
        else
            fail_test "Draft Property Update" "Update response mismatch: title=${UPDATED_TITLE}, price=${UPDATED_PRICE}"
        fi
    else
        fail_test "Draft Property Update" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_UPDATE}. Body: $(cat "$UPDATE_PROP_BODY")"
    fi
fi

# ==============================================================================
# 10. Strict Ownership Isolation & IDOR Prevention
# ==============================================================================
log_step "Strict Ownership Isolation & IDOR Prevention (Tenant 2 blocked on Owner 1 resources)"

if [ -n "$PROP_ID" ]; then
    # Tenant 2 tries to GET Owner 1's property
    IDOR_GET_BODY="${TMP_DIR}/idor_get_body.json"
    HTTP_CODE_IDOR_GET=$(curl -s -X GET "${BASE_URL}/api/v1/properties/${PROP_ID}" \
        -H "Authorization: Bearer ${TOKEN2}" \
        -o "$IDOR_GET_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_IDOR_GET" = "403" ] || [ "$HTTP_CODE_IDOR_GET" = "404" ]; then
        pass_test "IDOR GET Rejection" "HTTP ${HTTP_CODE_IDOR_GET} correctly returned when unauthorized user attempts GET"
    else
        fail_test "IDOR GET Rejection" "Expected HTTP 403 or 404, got HTTP ${HTTP_CODE_IDOR_GET}. Body: $(cat "$IDOR_GET_BODY")"
    fi

    # Tenant 2 tries to PUT (modify) Owner 1's property
    IDOR_PUT_BODY="${TMP_DIR}/idor_put_body.json"
    HTTP_CODE_IDOR_PUT=$(curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_ID}" \
        -H "Authorization: Bearer ${TOKEN2}" \
        -H "Content-Type: application/json" \
        -d "$UPDATE_PAYLOAD" \
        -o "$IDOR_PUT_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_IDOR_PUT" = "403" ] || [ "$HTTP_CODE_IDOR_PUT" = "404" ]; then
        pass_test "IDOR PUT Rejection" "HTTP ${HTTP_CODE_IDOR_PUT} correctly returned when unauthorized user attempts PUT"
    else
        fail_test "IDOR PUT Rejection" "Expected HTTP 403 or 404, got HTTP ${HTTP_CODE_IDOR_PUT}. Body: $(cat "$IDOR_PUT_BODY")"
    fi
fi

# ==============================================================================
# 11. Property Submission for Moderation (DRAFT -> SUBMITTED)
# ==============================================================================
log_step "Property Submission for Moderation (PUT /api/v1/properties/{id}/submit)"

if [ -n "$PROP_ID" ]; then
    SUBMIT_BODY="${TMP_DIR}/submit_body.json"
    HTTP_CODE_SUBMIT=$(curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_ID}/submit" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -o "$SUBMIT_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_SUBMIT" = "200" ]; then
        NEW_STATUS=$(jq -r '.data.status // empty' "$SUBMIT_BODY" 2>/dev/null || echo "")
        if [ "$NEW_STATUS" = "SUBMITTED" ]; then
            pass_test "Property Submission" "HTTP 200 OK, property status transitioned from DRAFT -> SUBMITTED"
        else
            fail_test "Property Submission" "Expected status SUBMITTED, got ${NEW_STATUS}"
        fi
    else
        fail_test "Property Submission" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_SUBMIT}. Body: $(cat "$SUBMIT_BODY")"
    fi
fi

# ==============================================================================
# 12. Post-Submission Immutability Guard
# ==============================================================================
log_step "Post-Submission Immutability Guard (No edits or deletion allowed on SUBMITTED)"

if [ -n "$PROP_ID" ]; then
    # Attempt to edit submitted property
    POST_SUB_EDIT_BODY="${TMP_DIR}/post_sub_edit_body.json"
    HTTP_CODE_POST_EDIT=$(curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_ID}" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$UPDATE_PAYLOAD" \
        -o "$POST_SUB_EDIT_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_POST_EDIT" = "400" ]; then
        pass_test "Submitted Property Edit Lock" "HTTP 400 Bad Request correctly returned when trying to edit SUBMITTED property"
    else
        fail_test "Submitted Property Edit Lock" "Expected HTTP 400 Bad Request, got HTTP ${HTTP_CODE_POST_EDIT}. Body: $(cat "$POST_SUB_EDIT_BODY")"
    fi

    # Attempt to delete submitted property
    POST_SUB_DEL_BODY="${TMP_DIR}/post_sub_del_body.json"
    HTTP_CODE_POST_DEL=$(curl -s -X DELETE "${BASE_URL}/api/v1/properties/${PROP_ID}" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -o "$POST_SUB_DEL_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_POST_DEL" = "400" ]; then
        pass_test "Submitted Property Delete Lock" "HTTP 400 Bad Request correctly returned when trying to delete SUBMITTED property"
    else
        fail_test "Submitted Property Delete Lock" "Expected HTTP 400 Bad Request, got HTTP ${HTTP_CODE_POST_DEL}. Body: $(cat "$POST_SUB_DEL_BODY")"
    fi
fi

# ==============================================================================
# 13. Owner Properties Listing (GET /api/v1/properties/my)
# ==============================================================================
log_step "Owner Properties Listing (GET /api/v1/properties/my)"

MY_PROPS_BODY="${TMP_DIR}/my_props_body.json"
HTTP_CODE_MY=$(curl -s -X GET "${BASE_URL}/api/v1/properties/my?status=SUBMITTED" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -o "$MY_PROPS_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_MY" = "200" ]; then
    TOTAL_PROPS=$(jq -r '.data.page.totalElements // .data.totalElements // (.data.content | length) // 0' "$MY_PROPS_BODY" 2>/dev/null)
    if [ -n "$TOTAL_PROPS" ] && [ "$TOTAL_PROPS" -ge 1 ] 2>/dev/null; then
        pass_test "Owner Properties Listing" "HTTP 200 OK, retrieved ${TOTAL_PROPS} submitted property for owner"
    else
        fail_test "Owner Properties Listing" "Expected at least 1 property, got ${TOTAL_PROPS}. Body: $(cat "$MY_PROPS_BODY")"
    fi
else
    fail_test "Owner Properties Listing" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_MY}. Body: $(cat "$MY_PROPS_BODY")"
fi

# ==============================================================================
# 14. Summary Report
# ==============================================================================
log_header "Slice 3 Test Execution Summary"

echo -e "Total Checks Executed: ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "Total Checks Passed:   ${GREEN}${BOLD}${PASSED_TESTS}${NC}"
echo -e "Total Checks Failed:   ${RED}${BOLD}${FAILED_TESTS}${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}==============================================================================${NC}"
    echo -e "${BOLD}${GREEN} ALL SLICE 3 OWNER ONBOARDING & PROPERTY CREATION TESTS PASSED! (100%)${NC}"
    echo -e "${BOLD}${GREEN}==============================================================================${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}==============================================================================${NC}"
    echo -e "${BOLD}${RED} SLICE 3 INTEGRATION TESTS COMPLETED WITH ${FAILED_TESTS} FAILURE(S).${NC}"
    echo -e "${BOLD}${RED}==============================================================================${NC}\n"
    exit 1
fi
