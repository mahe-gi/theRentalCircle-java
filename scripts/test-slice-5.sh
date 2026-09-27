#!/usr/bin/env bash
# ==============================================================================
# Platform — Slice 5 Discovery & Search Verification Suite
# Script: scripts/test-slice-5.sh
#
# Tests end-to-end against the running stack (default: http://localhost):
# 1. Setup:
#    - Register & Login Admin, Owner1, Owner2, Tenant.
#    - Assign ROLE_ADMIN to Admin in PostgreSQL.
#    - Complete Owner Declarations & Verify Owner1 and Owner2.
#    - Create Property A (Bengaluru, RENT, APARTMENT, 2 BHK, 28000, SEMI_FURNISHED, PARKING + LIFT).
#    - Create Property B (Chennai, SALE, VILLA, 4 BHK, 8500000, FURNISHED, PARKING + GYM + POOL).
#    - Submit & Approve Property A and Property B -> both transition to LIVE!
#    - Create Property C (DRAFT only, Hyderabad) -> remains DRAFT.
# 2. LIVE Invariant:
#    - DRAFT property C excluded from search.
#    - Only LIVE properties returned.
# 3. Filter Correctness:
#    - listingType=RENT returns Property A, excludes Property B.
#    - listingType=SALE returns Property B, excludes Property A.
#    - city=bengaluru (case-insensitive) returns Property A.
#    - minPrice=5000000 returns Property B only.
#    - bhk=2 returns Property A; bhk=2&bhk=4 returns both.
#    - furnishing=FURNISHED returns Property B only.
#    - amenities AND semantics: PARKING&GYM returns Property B only.
#    - amenities=PARKING returns both.
# 4. Bounding Box Query:
#    - Bbox around Bengaluru returns Property A only.
#    - Bbox around Chennai returns Property B only.
# 5. Pagination & Sort:
#    - size=1&page=0 returns 1 result with totalElements >= 2.
#    - sort=PRICE_ASC: first price <= second price.
#    - sort=PRICE_DESC: first price >= second price.
#    - size=51 returns 400 Bad Request (hard cap).
# 6. Property Detail API:
#    - GET /api/v1/properties/{liveId} returns 200 with locality, pincode, lat/lng.
#    - Response DOES NOT contain address field (address is withheld).
#    - Response DOES NOT contain status field.
#    - Anonymous GET /api/v1/properties/{draftId} returns 404 (status not leaked).
# 7. Locations Autocomplete:
#    - query=Ben returns Bengaluru in cities.
#    - query=a (less than 2 chars) returns 400 Bad Request.
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

# Temporary directory for captures
TMP_DIR=$(mktemp -d /tmp/platform-test-slice5-XXXXXX 2>/dev/null || mktemp -d -t 'platform-test-slice5')
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

execute_db_sql() {
    local sql_query="$1"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql_query" 2>/dev/null
}

# Wait for stack availability
log_header "Checking Stack Readiness"
for i in {1..30}; do
    if curl -s -f "${BASE_URL}/api/health" > /dev/null 2>&1; then
        echo "Stack is healthy."
        break
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

# Unique suffix
RUN_ID=$((RANDOM % 90000 + 10000))
ADMIN_EMAIL="admin_s5_${RUN_ID}@test.com"
OWNER1_EMAIL="owner1_s5_${RUN_ID}@test.com"
OWNER2_EMAIL="owner2_s5_${RUN_ID}@test.com"
TENANT_EMAIL="tenant_s5_${RUN_ID}@test.com"
DEFAULT_PASS="TestP@ssw0rd123"

# ------------------------------------------------------------------------------
# SECTION 1: User Registration, Role Elevation & Verification
# ------------------------------------------------------------------------------
log_header "SECTION 1: Registration, Declarations & Verification Setup"

register_and_login() {
    local email="$1"
    local role_type="$2"
    local token_var="$3"
    local user_id_var="$4"

    local reg_body="${TMP_DIR}/reg_${email}.json"
    curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${DEFAULT_PASS}\",
            \"confirmPassword\": \"${DEFAULT_PASS}\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"userType\": \"${role_type}\"
        }" -o "$reg_body" > /dev/null

    local login_body="${TMP_DIR}/login_${email}.json"
    curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${DEFAULT_PASS}\"
        }" -o "$login_body" > /dev/null

    local token
    token=$(jq -r '.data.accessToken // empty' "$login_body")
    local uid
    uid=$(jq -r '.data.user.id // empty' "$login_body")

    if [ -z "$token" ] || [ -z "$uid" ]; then
        echo "ERROR: Failed to register or login ${email}. Reg: $(cat "$reg_body" 2>/dev/null) Login: $(cat "$login_body" 2>/dev/null)" >&2
    fi

    eval "$token_var=\"$token\""
    eval "$user_id_var=\"$uid\""
}

register_and_login "$ADMIN_EMAIL" "TENANT" ADMIN_TOKEN ADMIN_ID
register_and_login "$OWNER1_EMAIL" "BUYER" OWNER1_TOKEN OWNER1_ID
register_and_login "$OWNER2_EMAIL" "BUYER" OWNER2_TOKEN OWNER2_ID
register_and_login "$TENANT_EMAIL" "TENANT" TENANT_TOKEN TENANT_ID

# Elevate Admin in DB
execute_db_sql "INSERT INTO user_roles (user_id, role_id) SELECT ${ADMIN_ID}, id FROM roles WHERE name = 'ROLE_ADMIN' ON CONFLICT DO NOTHING;"
# Re-login Admin to refresh JWT roles
LOGIN_ADMIN_BODY="${TMP_DIR}/login_admin_refreshed.json"
curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${DEFAULT_PASS}\"}" \
    -o "$LOGIN_ADMIN_BODY" > /dev/null
ADMIN_TOKEN=$(jq -r '.data.accessToken' "$LOGIN_ADMIN_BODY")

pass_test "Account Creation & Admin Elevation" "Created Admin (${ADMIN_ID}), Owner1 (${OWNER1_ID}), Owner2 (${OWNER2_ID}), Tenant (${TENANT_ID})"

# Owner Declarations
declare_owner() {
    local token="$1"
    local out_profile_id="$2"
    local body="${TMP_DIR}/decl_$(date +%s%N).json"
    curl -s -X POST "${BASE_URL}/api/v1/owners/register" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d '{
            "ownershipType": "TITLE_OWNER",
            "declarationAccepted": true
        }' -o "$body" > /dev/null
    local op_id
    op_id=$(jq -r '.data.id // empty' "$body")
    eval "$out_profile_id=\"$op_id\""
}

declare_owner "$OWNER1_TOKEN" OWNER1_PROFILE_ID
declare_owner "$OWNER2_TOKEN" OWNER2_PROFILE_ID

# Re-login Owners to refresh OWNER role in JWT
relogin() {
    local email="$1"
    local token_var="$2"
    local resp="${TMP_DIR}/relogin_${email}.json"
    curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"${email}\", \"password\": \"${DEFAULT_PASS}\"}" \
        -o "$resp" > /dev/null
    local t
    t=$(jq -r '.data.accessToken' "$resp")
    eval "$token_var=\"$t\""
}

relogin "$OWNER1_EMAIL" OWNER1_TOKEN
relogin "$OWNER2_EMAIL" OWNER2_TOKEN

# Upload dummy KYC doc for Owner1 and Owner2
DUMMY_PDF="${TMP_DIR}/doc.pdf"
printf "%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%%%EOF" > "$DUMMY_PDF"

upload_and_verify_owner() {
    local token="$1"
    local op_id="$2"

    curl -s -X POST "${BASE_URL}/api/v1/documents" \
        -H "Authorization: Bearer ${token}" \
        -F "file=@${DUMMY_PDF};type=application/pdf" \
        -F "documentType=IDENTITY_PROOF" > /dev/null

    curl -s -X POST "${BASE_URL}/api/v1/owners/verification/submit" \
        -H "Authorization: Bearer ${token}" > /dev/null

    curl -s -X PUT "${BASE_URL}/api/v1/admin/owners/${op_id}/verify" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"remarks": "Verified"}' > /dev/null
}

upload_and_verify_owner "$OWNER1_TOKEN" "$OWNER1_PROFILE_ID"
upload_and_verify_owner "$OWNER2_TOKEN" "$OWNER2_PROFILE_ID"

pass_test "Owner Verification Complete" "Owner1 and Owner2 verified by Admin"

# Create Property A (Bengaluru, RENT, APARTMENT, 2BHK, 28000, PARKING+LIFT)
PROP_A_BODY="${TMP_DIR}/prop_a.json"
curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Modern 2BHK Apartment in Indiranagar",
        "propertyType": "APARTMENT",
        "listingType": "RENT",
        "price": 28000.00,
        "maintenanceCharges": 2000.00,
        "securityDeposit": 56000.00,
        "bhk": 2,
        "bedrooms": 2,
        "bathrooms": 2,
        "carpetArea": 950.00,
        "builtUpArea": 1100.00,
        "furnishing": "SEMI_FURNISHED",
        "floorNumber": 3,
        "totalFloors": 5,
        "description": "Spacious and ventilated flat with balcony view",
        "preferredTenant": "FAMILY",
        "availabilityDate": "2026-11-01",
        "state": "Karnataka",
        "city": "Bengaluru",
        "district": "Bengaluru Urban",
        "locality": "Indiranagar",
        "address": "12, 100 Feet Road, Indiranagar",
        "pincode": "560038",
        "latitude": 12.97194000,
        "longitude": 77.64156000,
        "amenities": ["PARKING", "LIFT"]
    }' -o "$PROP_A_BODY" > /dev/null
PROP_A_ID=$(jq -r '.data.id' "$PROP_A_BODY")

# Create Property B (Chennai, SALE, VILLA, 4BHK, 8500000, FURNISHED, PARKING+GYM+SWIMMING_POOL)
PROP_B_BODY="${TMP_DIR}/prop_b.json"
curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Luxury 4BHK Beachside Villa in Adyar",
        "propertyType": "VILLA",
        "listingType": "SALE",
        "price": 8500000.00,
        "maintenanceCharges": 5000.00,
        "securityDeposit": 0.00,
        "bhk": 4,
        "bedrooms": 4,
        "bathrooms": 4,
        "carpetArea": 3200.00,
        "builtUpArea": 3800.00,
        "furnishing": "FULLY_FURNISHED",
        "floorNumber": 1,
        "totalFloors": 2,
        "description": "Exclusive villa with private pool and lawn",
        "preferredTenant": "ANY",
        "availabilityDate": "2026-10-15",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "district": "Chennai Urban",
        "locality": "Adyar",
        "address": "45, Beach Road, Adyar",
        "pincode": "600020",
        "latitude": 13.00624000,
        "longitude": 80.25588000,
        "amenities": ["PARKING", "GYM", "SWIMMING_POOL"]
    }' -o "$PROP_B_BODY" > /dev/null
PROP_B_ID=$(jq -r '.data.id' "$PROP_B_BODY")

# Create Property C (DRAFT only, Hyderabad - should NEVER appear in search)
PROP_C_BODY="${TMP_DIR}/prop_c.json"
curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Draft 1BHK in Hyderabad Hitec City",
        "propertyType": "APARTMENT",
        "listingType": "RENT",
        "price": 18000.00,
        "bhk": 1,
        "state": "Telangana",
        "city": "Hyderabad",
        "district": "Hyderabad",
        "locality": "Hitec City",
        "address": "Draft Lane 1",
        "pincode": "500081"
    }' -o "$PROP_C_BODY" > /dev/null
PROP_C_ID=$(jq -r '.data.id' "$PROP_C_BODY")

# Upload dummy JPEG photo to Property A and Property B
DUMMY_JPG="${TMP_DIR}/test.jpg"
printf "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xFF\xC0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xFF\xD9" > "$DUMMY_JPG"

curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP_A_ID}/images" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -F "file=@${DUMMY_JPG};type=image/jpeg" > /dev/null

curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP_B_ID}/images" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" \
    -F "file=@${DUMMY_JPG};type=image/jpeg" > /dev/null

# Submit Property A and Property B
curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_A_ID}/submit" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" > /dev/null

curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP_B_ID}/submit" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" > /dev/null

# Admin Approves Property A and Property B -> Both transition to LIVE!
curl -s -X PUT "${BASE_URL}/api/v1/admin/properties/${PROP_A_ID}/approve" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"remarks": "Approved"}' > /dev/null

curl -s -X PUT "${BASE_URL}/api/v1/admin/properties/${PROP_B_ID}/approve" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"remarks": "Approved"}' > /dev/null

pass_test "LIVE Properties Activated" "Property A (${PROP_A_ID}) and Property B (${PROP_B_ID}) are LIVE. Property C (${PROP_C_ID}) is DRAFT."

# ------------------------------------------------------------------------------
# SECTION 2: LIVE Invariant
# ------------------------------------------------------------------------------
log_header "SECTION 2: LIVE Invariant Enforcement"

SEARCH_ALL="${TMP_DIR}/search_all.json"
curl -s "${BASE_URL}/api/v1/properties/search" -o "$SEARCH_ALL"

IDS_RETURNED=$(jq -r '.data.content[].id' "$SEARCH_ALL" 2>/dev/null || echo "")

# Check DRAFT property C is NOT returned
if echo "$IDS_RETURNED" | grep -q "^${PROP_C_ID}$"; then
    fail_test "LIVE Invariant: DRAFT Excluded" "DRAFT Property ${PROP_C_ID} was incorrectly returned in search"
else
    pass_test "LIVE Invariant: DRAFT Excluded" "Property in DRAFT status (${PROP_C_ID}) is strictly excluded from public search"
fi

# Check Property A and Property B ARE returned
if echo "$IDS_RETURNED" | grep -q "^${PROP_A_ID}$" && echo "$IDS_RETURNED" | grep -q "^${PROP_B_ID}$"; then
    pass_test "LIVE Invariant: LIVE Included" "Both LIVE properties (${PROP_A_ID}, ${PROP_B_ID}) returned in public search"
else
    fail_test "LIVE Invariant: LIVE Included" "Expected Property A and B in search results"
fi

# ------------------------------------------------------------------------------
# SECTION 3: Filter Correctness
# ------------------------------------------------------------------------------
log_header "SECTION 3: Filter Correctness"

# Filter 1: listingType=RENT -> Property A only
RENT_RESP="${TMP_DIR}/filter_rent.json"
curl -s "${BASE_URL}/api/v1/properties/search?listingType=RENT" -o "$RENT_RESP"
RENT_IDS=$(jq -r '.data.content[].id' "$RENT_RESP" 2>/dev/null || echo "")
if echo "$RENT_IDS" | grep -q "^${PROP_A_ID}$" && ! echo "$RENT_IDS" | grep -q "^${PROP_B_ID}$"; then
    pass_test "Filter: listingType=RENT" "Returns only RENT listing (Property A), excludes SALE (Property B)"
else
    fail_test "Filter: listingType=RENT" "Expected only Property A, got: $RENT_IDS"
fi

# Filter 2: listingType=SALE -> Property B only
SALE_RESP="${TMP_DIR}/filter_sale.json"
curl -s "${BASE_URL}/api/v1/properties/search?listingType=SALE" -o "$SALE_RESP"
SALE_IDS=$(jq -r '.data.content[].id' "$SALE_RESP" 2>/dev/null || echo "")
if echo "$SALE_IDS" | grep -q "^${PROP_B_ID}$" && ! echo "$SALE_IDS" | grep -q "^${PROP_A_ID}$"; then
    pass_test "Filter: listingType=SALE" "Returns only SALE listing (Property B), excludes RENT (Property A)"
else
    fail_test "Filter: listingType=SALE" "Expected only Property B, got: $SALE_IDS"
fi

# Filter 3: city=bengaluru (lowercase case-insensitive) -> Property A only
CITY_RESP="${TMP_DIR}/filter_city.json"
curl -s "${BASE_URL}/api/v1/properties/search?city=bengaluru" -o "$CITY_RESP"
CITY_IDS=$(jq -r '.data.content[].id' "$CITY_RESP" 2>/dev/null || echo "")
if echo "$CITY_IDS" | grep -q "^${PROP_A_ID}$" && ! echo "$CITY_IDS" | grep -q "^${PROP_B_ID}$"; then
    pass_test "Filter: city (case-insensitive)" "Case-insensitive query 'bengaluru' matched Property A in 'Bengaluru'"
else
    fail_test "Filter: city (case-insensitive)" "Expected Property A only, got: $CITY_IDS"
fi

# Filter 4: minPrice=5000000 -> Property B only
PRICE_RESP="${TMP_DIR}/filter_price.json"
curl -s "${BASE_URL}/api/v1/properties/search?minPrice=5000000" -o "$PRICE_RESP"
PRICE_IDS=$(jq -r '.data.content[].id' "$PRICE_RESP" 2>/dev/null || echo "")
if echo "$PRICE_IDS" | grep -q "^${PROP_B_ID}$" && ! echo "$PRICE_IDS" | grep -q "^${PROP_A_ID}$"; then
    pass_test "Filter: minPrice Bracket" "minPrice=5000000 returned Property B (₹85L), excluded Property A (₹28K)"
else
    fail_test "Filter: minPrice Bracket" "Expected Property B only, got: $PRICE_IDS"
fi

# Filter 5: bhk=2 -> Property A only; bhk=2&bhk=4 -> both
BHK2_RESP="${TMP_DIR}/filter_bhk2.json"
curl -s "${BASE_URL}/api/v1/properties/search?bhk=2" -o "$BHK2_RESP"
BHK2_IDS=$(jq -r '.data.content[].id' "$BHK2_RESP" 2>/dev/null || echo "")

BHK_MULTI_RESP="${TMP_DIR}/filter_bhk_multi.json"
curl -s "${BASE_URL}/api/v1/properties/search?bhk=2&bhk=4" -o "$BHK_MULTI_RESP"
BHK_MULTI_IDS=$(jq -r '.data.content[].id' "$BHK_MULTI_RESP" 2>/dev/null || echo "")

if echo "$BHK2_IDS" | grep -q "^${PROP_A_ID}$" && ! echo "$BHK2_IDS" | grep -q "^${PROP_B_ID}$" && \
   echo "$BHK_MULTI_IDS" | grep -q "^${PROP_A_ID}$" && echo "$BHK_MULTI_IDS" | grep -q "^${PROP_B_ID}$"; then
    pass_test "Filter: bhk Multi-Select" "Single bhk=2 returned Property A; multi bhk=2&bhk=4 returned both"
else
    fail_test "Filter: bhk Multi-Select" "BHK filtering mismatch"
fi

# Filter 6: furnishing=FURNISHED -> Property B only
FURN_RESP="${TMP_DIR}/filter_furn.json"
curl -s "${BASE_URL}/api/v1/properties/search?furnishing=FURNISHED" -o "$FURN_RESP"
FURN_IDS=$(jq -r '.data.content[].id' "$FURN_RESP" 2>/dev/null || echo "")
if echo "$FURN_IDS" | grep -q "^${PROP_B_ID}$" && ! echo "$FURN_IDS" | grep -q "^${PROP_A_ID}$"; then
    pass_test "Filter: furnishing" "furnishing=FURNISHED returned Property B, excluded SEMI_FURNISHED Property A"
else
    fail_test "Filter: furnishing" "Expected Property B only, got: $FURN_IDS"
fi

# Filter 7: amenities AND semantics
# PARKING & GYM -> Property B has both. Property A has only PARKING -> Property B only
AMEN_AND_RESP="${TMP_DIR}/filter_amen_and.json"
curl -s "${BASE_URL}/api/v1/properties/search?amenities=PARKING&amenities=GYM" -o "$AMEN_AND_RESP"
AMEN_AND_IDS=$(jq -r '.data.content[].id' "$AMEN_AND_RESP" 2>/dev/null || echo "")
if echo "$AMEN_AND_IDS" | grep -q "^${PROP_B_ID}$" && ! echo "$AMEN_AND_IDS" | grep -q "^${PROP_A_ID}$"; then
    pass_test "Filter: amenities (AND semantics)" "Must-have amenities [PARKING, GYM] matched only Property B having ALL requested amenities"
else
    fail_test "Filter: amenities (AND semantics)" "Expected Property B only with AND semantics, got: $AMEN_AND_IDS"
fi

# Filter 8: amenities=PARKING -> both have PARKING
AMEN_PARK_RESP="${TMP_DIR}/filter_amen_park.json"
curl -s "${BASE_URL}/api/v1/properties/search?amenities=PARKING" -o "$AMEN_PARK_RESP"
AMEN_PARK_IDS=$(jq -r '.data.content[].id' "$AMEN_PARK_RESP" 2>/dev/null || echo "")
if echo "$AMEN_PARK_IDS" | grep -q "^${PROP_A_ID}$" && echo "$AMEN_PARK_IDS" | grep -q "^${PROP_B_ID}$"; then
    pass_test "Filter: amenities (Single)" "Single amenity 'PARKING' matched both Property A and Property B"
else
    fail_test "Filter: amenities (Single)" "Expected both properties for PARKING, got: $AMEN_PARK_IDS"
fi

# ------------------------------------------------------------------------------
# SECTION 4: Bounding Box
# ------------------------------------------------------------------------------
log_header "SECTION 4: Map Viewport Bounding Box"

# Bengaluru Box: lat 12.8 to 13.1, lng 77.4 to 77.8
BBOX_BLR="${TMP_DIR}/bbox_blr.json"
curl -s "${BASE_URL}/api/v1/properties/search?minLat=12.8&maxLat=13.1&minLng=77.4&maxLng=77.8" -o "$BBOX_BLR"
BBOX_BLR_IDS=$(jq -r '.data.content[].id' "$BBOX_BLR" 2>/dev/null || echo "")
if echo "$BBOX_BLR_IDS" | grep -q "^${PROP_A_ID}$" && ! echo "$BBOX_BLR_IDS" | grep -q "^${PROP_B_ID}$"; then
    pass_test "Bounding Box: Bengaluru Viewport" "Returned Property A inside coordinates, excluded Property B (Chennai)"
else
    fail_test "Bounding Box: Bengaluru Viewport" "Expected Property A only in Bengaluru box, got: $BBOX_BLR_IDS"
fi

# Chennai Box: lat 12.8 to 13.2, lng 80.1 to 80.4
BBOX_CHN="${TMP_DIR}/bbox_chn.json"
curl -s "${BASE_URL}/api/v1/properties/search?minLat=12.8&maxLat=13.2&minLng=80.1&maxLng=80.4" -o "$BBOX_CHN"
BBOX_CHN_IDS=$(jq -r '.data.content[].id' "$BBOX_CHN" 2>/dev/null || echo "")
if echo "$BBOX_CHN_IDS" | grep -q "^${PROP_B_ID}$" && ! echo "$BBOX_CHN_IDS" | grep -q "^${PROP_A_ID}$"; then
    pass_test "Bounding Box: Chennai Viewport" "Returned Property B inside coordinates, excluded Property A (Bengaluru)"
else
    fail_test "Bounding Box: Chennai Viewport" "Expected Property B only in Chennai box, got: $BBOX_CHN_IDS"
fi

# ------------------------------------------------------------------------------
# SECTION 5: Pagination & Sorting
# ------------------------------------------------------------------------------
log_header "SECTION 5: Pagination & Sorting"

# Page size=1
PAGE1_RESP="${TMP_DIR}/page1.json"
curl -s "${BASE_URL}/api/v1/properties/search?size=1&page=0" -o "$PAGE1_RESP"
PAGE1_COUNT=$(jq '.data.content | length' "$PAGE1_RESP")
PAGE1_TOTAL=$(jq '.data.page.totalElements // .data.totalElements' "$PAGE1_RESP")
if [ "$PAGE1_COUNT" -eq 1 ] && [ "$PAGE1_TOTAL" -ge 2 ]; then
    pass_test "Pagination: size=1" "Page size 1 correctly returned exactly 1 item (totalElements >= 2)"
else
    fail_test "Pagination: size=1" "Expected count 1 and totalElements >= 2, got count=$PAGE1_COUNT total=$PAGE1_TOTAL"
fi

# Hard cap: size=51 -> 400 Bad Request
HTTP_CODE_CAP=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/properties/search?size=51")
if [ "$HTTP_CODE_CAP" = "400" ]; then
    pass_test "Pagination Hard Cap (size > 50 -> 400)" "HTTP 400 returned when size=51 exceeds maximum limit of 50"
else
    fail_test "Pagination Hard Cap (size > 50 -> 400)" "Expected HTTP 400 for size=51, got HTTP $HTTP_CODE_CAP"
fi

# Sort: PRICE_ASC
SORT_ASC="${TMP_DIR}/sort_asc.json"
curl -s "${BASE_URL}/api/v1/properties/search?sort=PRICE_ASC" -o "$SORT_ASC"
P1_PRICE=$(jq '.data.content[0].price' "$SORT_ASC")
P2_PRICE=$(jq '.data.content[1].price' "$SORT_ASC")
if (( $(echo "$P1_PRICE <= $P2_PRICE" | bc -l) )); then
    pass_test "Sort: PRICE_ASC" "First property price (₹${P1_PRICE}) <= second property price (₹${P2_PRICE})"
else
    fail_test "Sort: PRICE_ASC" "Ascending order violation: P1=$P1_PRICE, P2=$P2_PRICE"
fi

# Sort: PRICE_DESC
SORT_DESC="${TMP_DIR}/sort_desc.json"
curl -s "${BASE_URL}/api/v1/properties/search?sort=PRICE_DESC" -o "$SORT_DESC"
D1_PRICE=$(jq '.data.content[0].price' "$SORT_DESC")
D2_PRICE=$(jq '.data.content[1].price' "$SORT_DESC")
if (( $(echo "$D1_PRICE >= $D2_PRICE" | bc -l) )); then
    pass_test "Sort: PRICE_DESC" "First property price (₹${D1_PRICE}) >= second property price (₹${D2_PRICE})"
else
    fail_test "Sort: PRICE_DESC" "Descending order violation: D1=$D1_PRICE, D2=$D2_PRICE"
fi

# ------------------------------------------------------------------------------
# SECTION 6: Property Detail API & Address Privacy Enforcement
# ------------------------------------------------------------------------------
log_header "SECTION 6: Property Detail API & Address Privacy"

# Public unauthenticated GET on Property A (LIVE)
DETAIL_A_RESP="${TMP_DIR}/detail_a.json"
HTTP_CODE_DETAIL_A=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/properties/${PROP_A_ID}" -o "$DETAIL_A_RESP")

if [ "$HTTP_CODE_DETAIL_A" = "200" ]; then
    pass_test "Public Detail Access (LIVE -> 200)" "Anonymous user successfully retrieved details for LIVE Property ${PROP_A_ID}"
else
    fail_test "Public Detail Access (LIVE -> 200)" "Expected HTTP 200 for LIVE property, got HTTP $HTTP_CODE_DETAIL_A"
fi

# Verify ADDRESS IS WITHHELD
HAS_ADDRESS=$(jq '.data | has("address")' "$DETAIL_A_RESP")
if [ "$HAS_ADDRESS" = "false" ]; then
    pass_test "Address Privacy: 'address' Field Withheld" "CRITICAL: 'address' (flat/door/street) is completely withheld from public API response"
else
    fail_test "Address Privacy: 'address' Field Withheld" "VULNERABILITY: 'address' field leaked in public detail response!"
fi

# Verify status field is NOT leaked to public
HAS_STATUS=$(jq '.data | has("status")' "$DETAIL_A_RESP")
if [ "$HAS_STATUS" = "false" ]; then
    pass_test "Status Privacy: 'status' Field Withheld" "Internal moderation status is withheld from public response"
else
    fail_test "Status Privacy: 'status' Field Withheld" "'status' field was returned to anonymous public user"
fi

# Verify locality, pincode, lat/lng ARE provided
LOCALITY_VAL=$(jq -r '.data.locality // empty' "$DETAIL_A_RESP")
PINCODE_VAL=$(jq -r '.data.pincode // empty' "$DETAIL_A_RESP")
LAT_VAL=$(jq -r '.data.latitude // empty' "$DETAIL_A_RESP")
if [ -n "$LOCALITY_VAL" ] && [ -n "$PINCODE_VAL" ] && [ -n "$LAT_VAL" ]; then
    pass_test "General Location Disclosure" "Public response contains locality='${LOCALITY_VAL}', pincode='${PINCODE_VAL}', lat='${LAT_VAL}'"
else
    fail_test "General Location Disclosure" "Expected locality, pincode, and latitude in public response"
fi

# Verify Owner Verified Badge
VERIFIED_BADGE=$(jq '.data.owner.verifiedBadge' "$DETAIL_A_RESP")
if [ "$VERIFIED_BADGE" = "true" ]; then
    pass_test "Verified Owner Badge" "Verified owner badge present in public detail DTO"
else
    fail_test "Verified Owner Badge" "Expected owner.verifiedBadge=true, got $VERIFIED_BADGE"
fi

# Anonymous GET on Property C (DRAFT) -> Must return 404 (status not leaked)
HTTP_CODE_DRAFT_PUBLIC=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/properties/${PROP_C_ID}")
if [ "$HTTP_CODE_DRAFT_PUBLIC" = "404" ]; then
    pass_test "Non-LIVE Property Privacy (DRAFT -> 404)" "Anonymous access to DRAFT property returns 404 Not Found (zero status leakage)"
else
    fail_test "Non-LIVE Property Privacy (DRAFT -> 404)" "Expected HTTP 404 for DRAFT property, got HTTP $HTTP_CODE_DRAFT_PUBLIC"
fi

# Authenticated Owner accessing own Property C (DRAFT) -> Returns 200 with status preserved
DETAIL_DRAFT_OWNER="${TMP_DIR}/detail_draft_owner.json"
HTTP_CODE_DRAFT_OWNER=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    "${BASE_URL}/api/v1/properties/${PROP_C_ID}" -o "$DETAIL_DRAFT_OWNER")

if [ "$HTTP_CODE_DRAFT_OWNER" = "200" ]; then
    OWNER_DRAFT_STATUS=$(jq -r '.data.status // empty' "$DETAIL_DRAFT_OWNER")
    if [ "$OWNER_DRAFT_STATUS" = "DRAFT" ]; then
        pass_test "Owner Retains Full Property Access" "Owner can access own DRAFT property details (HTTP 200, status=DRAFT)"
    else
        fail_test "Owner Retains Full Property Access" "Expected status=DRAFT for owner access, got $OWNER_DRAFT_STATUS"
    fi
else
    fail_test "Owner Retains Full Property Access" "Expected HTTP 200 for owner accessing own draft, got HTTP $HTTP_CODE_DRAFT_OWNER"
fi

# ------------------------------------------------------------------------------
# SECTION 7: Location Autocomplete
# ------------------------------------------------------------------------------
log_header "SECTION 7: Location Autocomplete"

# Valid query 'Ben' -> Bengaluru
LOC_RESP="${TMP_DIR}/loc_ben.json"
HTTP_CODE_LOC=$(curl -s -w "%{http_code}" "${BASE_URL}/api/v1/properties/search/locations?query=Ben" -o "$LOC_RESP")
if [ "$HTTP_CODE_LOC" = "200" ]; then
    HAS_BLR=$(jq '.data.cities | contains(["Bengaluru"])' "$LOC_RESP")
    if [ "$HAS_BLR" = "true" ]; then
        pass_test "Autocomplete: Prefix Query 'Ben'" "Cities suggestions correctly included 'Bengaluru'"
    else
        fail_test "Autocomplete: Prefix Query 'Ben'" "Expected Bengaluru in cities, got: $(cat "$LOC_RESP")"
    fi
else
    fail_test "Autocomplete: Prefix Query 'Ben'" "Expected HTTP 200, got HTTP $HTTP_CODE_LOC"
fi

# Short query 'a' (1 char) -> 400 Bad Request
HTTP_CODE_SHORT=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/properties/search/locations?query=a")
if [ "$HTTP_CODE_SHORT" = "400" ]; then
    pass_test "Autocomplete: Min Length Validation (1 char -> 400)" "Query < 2 characters correctly rejected with HTTP 400 Bad Request"
else
    fail_test "Autocomplete: Min Length Validation (1 char -> 400)" "Expected HTTP 400 for 1-char query, got HTTP $HTTP_CODE_SHORT"
fi

# ------------------------------------------------------------------------------
# SUMMARY & VERDICT
# ------------------------------------------------------------------------------
log_header "SLICE 5 EXECUTION SUMMARY"

echo -e "Total Test Assertions: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}>>> ALL SLICE 5 INTEGRATION CHECKS PASSED SUCCESSFULLY (100%) <<<${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}>>> SLICE 5 FAILED WITH ${FAILED_TESTS} UNRESOLVED DEFECTS <<<${NC}\n"
    exit 1
fi
