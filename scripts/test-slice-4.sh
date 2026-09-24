#!/usr/bin/env bash
# ==============================================================================
# Platform — Slice 4 Integration & Security Verification Suite
# Script: scripts/test-slice-4.sh
#
# Tests end-to-end against the running stack (default: http://localhost):
# 1. Setup: Register & Login Owner1, Owner2, and AdminUser (assign ROLE_ADMIN in DB).
# 2. Complete Owner Declaration for Owner1 and Owner2.
# 3. Private Document Storage Isolation: Direct GET /secure-docs/* -> 404/403 (unmapped in Nginx).
# 4. Document Upload & Magic-Byte Validation: Valid PDF (201) vs Spoofed file (400).
# 5. Document Access Control & Audit:
#    - Non-owning owner download blocked (403 Forbidden).
#    - Admin downloads owner's document (200 OK).
#    - Database audit trail verified in admin_actions (admin_id, target_id, ADMIN_DOCUMENT_DOWNLOAD).
#    - Submit without documents -> 400 Bad Request.
#    - Submit with documents -> 200 OK, verificationStatus='SUBMITTED'.
# 7. Golden Invariant & Deterministic LIVE State Machine:
#    - Step A: Owner1 creates property draft, uploads photo, submits -> status SUBMITTED.
#    - Step B: Admin approves Owner1 property while Owner1 is still SUBMITTED ->
#              Assert property status is APPROVED, NOT LIVE! (HTTP 200).
#    - Step C: Admin verifies Owner1 -> Assert owner status is VERIFIED.
#              Invariant check: Assert property automatically transitioned APPROVED -> LIVE!
#    - Step D (Reverse Order Trigger): Admin verifies Owner2 first. Owner2 creates draft,
#              uploads photo, submits. Admin approves property -> immediately transitions to LIVE!
# 8. Concurrent Admin Decision Conflict (Optimistic Concurrency):
#    - Two concurrent decisions on same property or owner -> exactly one 200 OK and one 409 Conflict.
# 9. Execution summary with PASS/FAIL metrics and zero-defect exit code.
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
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Temporary directory for request/response captures
TMP_DIR=$(mktemp -d /tmp/platform-test-slice4-XXXXXX 2>/dev/null || mktemp -d -t 'platform-test-slice4')
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

# Database execution helper
execute_db_sql() {
    local sql="$1"
    # Option 1: Direct docker exec into running container
    if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
        docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql" 2>&1
        return $?
    fi
    # Option 2: Docker compose exec
    if command -v docker >/dev/null 2>&1 && docker compose ps --services 2>/dev/null | grep -q "postgres"; then
        docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql" 2>&1
        return $?
    fi
    # Option 3: Local psql client
    if command -v psql >/dev/null 2>&1; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$sql" 2>&1
        return $?
    fi
    echo "ERROR: Unable to execute SQL. Neither docker container '$DB_CONTAINER' nor 'psql' client is accessible." >&2
    return 1
}

# ------------------------------------------------------------------------------
# Pre-Flight Checks
# ------------------------------------------------------------------------------
log_header "Platform Slice 4 Integration & Security Test Suite"
echo -e "Base Target URL: ${BOLD}${BASE_URL}${NC}"
echo -e "Temporary Dir:   ${TMP_DIR}"

check_dependency curl
check_dependency jq
check_dependency grep
check_dependency sed
check_dependency tr

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
OWNER1_EMAIL="slice4_owner1_${RAND_ID}@example.com"
OWNER1_PASSWORD="Password123!"
OWNER2_EMAIL="slice4_owner2_${RAND_ID}@example.com"
OWNER2_PASSWORD="Password123!"
ADMIN_EMAIL="slice4_admin_${RAND_ID}@example.com"
ADMIN_PASSWORD="Password123!"

# ==============================================================================
# 1. Setup: Register & Login Users (Owner1, Owner2, AdminUser) & Owner Declaration
# ==============================================================================
log_step "Register Test Users (Owner1, Owner2, AdminUser)"

REG1_BODY="${TMP_DIR}/reg1_body.json"
HTTP_CODE_REG1=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER1_EMAIL}\",\"password\":\"${OWNER1_PASSWORD}\",\"confirmPassword\":\"${OWNER1_PASSWORD}\",\"firstName\":\"Aditya\",\"lastName\":\"Sharma\",\"userType\":\"LANDLORD\"}" \
    -o "$REG1_BODY" \
    -w "%{http_code}")

REG2_BODY="${TMP_DIR}/reg2_body.json"
HTTP_CODE_REG2=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER2_EMAIL}\",\"password\":\"${OWNER2_PASSWORD}\",\"confirmPassword\":\"${OWNER2_PASSWORD}\",\"firstName\":\"Vikram\",\"lastName\":\"Malhotra\",\"userType\":\"LANDLORD\"}" \
    -o "$REG2_BODY" \
    -w "%{http_code}")

ADMIN_REG_BODY="${TMP_DIR}/admin_reg_body.json"
HTTP_CODE_ADMIN_REG=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"confirmPassword\":\"${ADMIN_PASSWORD}\",\"firstName\":\"Super\",\"lastName\":\"Admin\",\"userType\":\"TENANT\"}" \
    -o "$ADMIN_REG_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_REG1" = "201" ] && [ "$HTTP_CODE_REG2" = "201" ] && [ "$HTTP_CODE_ADMIN_REG" = "201" ]; then
    pass_test "User Registrations" "Owner1, Owner2, and Admin registered successfully (HTTP 201)"
else
    fail_test "User Registrations" "Registration failed: owner1=${HTTP_CODE_REG1}, owner2=${HTTP_CODE_REG2}, admin=${HTTP_CODE_ADMIN_REG}"
fi

# Assign ROLE_ADMIN to AdminUser in PostgreSQL database
echo "Assigning ROLE_ADMIN to ${ADMIN_EMAIL} in database..."
SQL_ASSIGN_ADMIN="INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = '${ADMIN_EMAIL}' AND r.name = 'ROLE_ADMIN' ON CONFLICT DO NOTHING;"
execute_db_sql "$SQL_ASSIGN_ADMIN" >/dev/null

ADMIN_USER_ID=$(execute_db_sql "SELECT id FROM users WHERE email = '${ADMIN_EMAIL}';" | tr -d '[:space:]')
if [ -n "$ADMIN_USER_ID" ] && [ "$ADMIN_USER_ID" -gt 0 ] 2>/dev/null; then
    pass_test "Admin Role Assignment" "ROLE_ADMIN assigned to admin user (ID: ${ADMIN_USER_ID})"
else
    fail_test "Admin Role Assignment" "Failed to verify admin user ID in database"
fi

# Login all 3 users
log_step "Login Users & Obtain Access Tokens"

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

ADMIN_LOGIN_BODY="${TMP_DIR}/admin_login_body.json"
HTTP_CODE_ADMIN_LOGIN=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    -o "$ADMIN_LOGIN_BODY" \
    -w "%{http_code}")
ADMIN_TOKEN=$(jq -r '.data.accessToken // empty' "$ADMIN_LOGIN_BODY" 2>/dev/null || echo "")

if [ -n "$TOKEN1" ] && [ -n "$TOKEN2" ] && [ -n "$ADMIN_TOKEN" ]; then
    pass_test "User Logins" "Tokens successfully acquired for Owner1, Owner2, and Admin"
else
    fail_test "User Logins" "Login failed: token1=${HTTP_CODE_LOGIN1}, token2=${HTTP_CODE_LOGIN2}, admin=${HTTP_CODE_ADMIN_LOGIN}"
fi

# Complete Owner Declaration for Owner1 and Owner2
log_step "Complete Owner Declarations (POST /api/v1/owners/register)"

ONBOARD1_BODY="${TMP_DIR}/onboard1_body.json"
HTTP_CODE_ONBOARD1=$(curl -s -X POST "${BASE_URL}/api/v1/owners/register" \
    -H "Authorization: Bearer ${TOKEN1}" \
    -H "Content-Type: application/json" \
    -d '{"ownershipType":"TITLE_OWNER","declarationAccepted":true}' \
    -o "$ONBOARD1_BODY" \
    -w "%{http_code}")

ONBOARD2_BODY="${TMP_DIR}/onboard2_body.json"
HTTP_CODE_ONBOARD2=$(curl -s -X POST "${BASE_URL}/api/v1/owners/register" \
    -H "Authorization: Bearer ${TOKEN2}" \
    -H "Content-Type: application/json" \
    -d '{"ownershipType":"AUTHORIZED_REPRESENTATIVE","companyName":"Prime Realty Asset Management","declarationAccepted":true}' \
    -o "$ONBOARD2_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_ONBOARD1" = "201" ] && [ "$HTTP_CODE_ONBOARD2" = "201" ]; then
    pass_test "Owner Declarations" "Owner1 (TITLE_OWNER) and Owner2 (AUTHORIZED_REPRESENTATIVE) declared successfully"
else
    fail_test "Owner Declarations" "Declaration failed: owner1=${HTTP_CODE_ONBOARD1}, owner2=${HTTP_CODE_ONBOARD2}"
fi

# Re-login Owner1 and Owner2 to refresh access tokens with ROLE_OWNER authority
curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER1_EMAIL}\",\"password\":\"${OWNER1_PASSWORD}\"}" \
    -o "${TMP_DIR}/owner1_refresh_login.json" >/dev/null
OWNER1_TOKEN=$(jq -r '.data.accessToken // empty' "${TMP_DIR}/owner1_refresh_login.json" 2>/dev/null || echo "$TOKEN1")

curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER2_EMAIL}\",\"password\":\"${OWNER2_PASSWORD}\"}" \
    -o "${TMP_DIR}/owner2_refresh_login.json" >/dev/null
OWNER2_TOKEN=$(jq -r '.data.accessToken // empty' "${TMP_DIR}/owner2_refresh_login.json" 2>/dev/null || echo "$TOKEN2")

# Retrieve Owner Profiles to capture profile IDs
PROFILE1_BODY="${TMP_DIR}/profile1_body.json"
curl -s -X GET "${BASE_URL}/api/v1/owners/profile" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -o "$PROFILE1_BODY" >/dev/null
OWNER1_PROFILE_ID=$(jq -r '.data.id // empty' "$PROFILE1_BODY" 2>/dev/null || echo "")

PROFILE2_BODY="${TMP_DIR}/profile2_body.json"
curl -s -X GET "${BASE_URL}/api/v1/owners/profile" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" \
    -o "$PROFILE2_BODY" >/dev/null
OWNER2_PROFILE_ID=$(jq -r '.data.id // empty' "$PROFILE2_BODY" 2>/dev/null || echo "")

if [ -n "$OWNER1_PROFILE_ID" ] && [ -n "$OWNER2_PROFILE_ID" ]; then
    pass_test "Owner Profile Setup" "Profile IDs retrieved: Owner1=${OWNER1_PROFILE_ID}, Owner2=${OWNER2_PROFILE_ID}"
else
    fail_test "Owner Profile Setup" "Failed to retrieve profile IDs from /owners/profile"
fi

# ==============================================================================
# 2. Private Document Storage Isolation (Direct Nginx GET -> 404/403)
# ==============================================================================
log_step "Private Document Storage Isolation (Direct HTTP GET /secure-docs/* unmapped in Nginx)"

HTTP_CODE_SEC_ROOT=$(curl -s -L -o /dev/null -w "%{http_code}" "${BASE_URL}/secure-docs/")
HTTP_CODE_SEC_FILE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/secure-docs/test.pdf")
HTTP_CODE_SEC_PATH=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/secure-docs/documents/id_proof.pdf")

if [ "$HTTP_CODE_SEC_ROOT" = "404" ] || [ "$HTTP_CODE_SEC_ROOT" = "403" ]; then
    pass_test "Private Storage Root Protection" "Direct GET /secure-docs/ returned HTTP ${HTTP_CODE_SEC_ROOT} (unmapped in Nginx)"
else
    fail_test "Private Storage Root Protection" "Expected HTTP 404 or 403, got HTTP ${HTTP_CODE_SEC_ROOT}"
fi

if [ "$HTTP_CODE_SEC_FILE" = "404" ] || [ "$HTTP_CODE_SEC_FILE" = "403" ]; then
    pass_test "Private Storage File Protection" "Direct GET /secure-docs/test.pdf returned HTTP ${HTTP_CODE_SEC_FILE} (unmapped in Nginx)"
else
    fail_test "Private Storage File Protection" "Expected HTTP 404 or 403, got HTTP ${HTTP_CODE_SEC_FILE}"
fi

if [ "$HTTP_CODE_SEC_PATH" = "404" ] || [ "$HTTP_CODE_SEC_PATH" = "403" ]; then
    pass_test "Private Storage Deep Path Protection" "Direct GET /secure-docs/documents/id_proof.pdf returned HTTP ${HTTP_CODE_SEC_PATH}"
else
    fail_test "Private Storage Deep Path Protection" "Expected HTTP 404 or 403, got HTTP ${HTTP_CODE_SEC_PATH}"
fi

# ==============================================================================
# 3. Document Upload & Magic-Byte Validation
# ==============================================================================
log_step "Document Upload & Magic-Byte Validation (POST /api/v1/documents)"

# Create a valid dummy PDF document with standard %PDF-1.4 magic bytes
VALID_PDF="${TMP_DIR}/dummy_identity_proof.pdf"
printf '%%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%%%EOF\n' > "$VALID_PDF"

UPLOAD_VALID_BODY="${TMP_DIR}/upload_valid_body.json"
HTTP_CODE_UPLOAD_VALID=$(curl -s -X POST "${BASE_URL}/api/v1/documents" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -F "file=@${VALID_PDF};type=application/pdf" \
    -F "documentType=IDENTITY_PROOF" \
    -o "$UPLOAD_VALID_BODY" \
    -w "%{http_code}")

DOC1_ID=""
if [ "$HTTP_CODE_UPLOAD_VALID" = "201" ]; then
    DOC1_ID=$(jq -r '.data.id // .id // empty' "$UPLOAD_VALID_BODY" 2>/dev/null || echo "")
    DOC1_STATUS=$(jq -r '.data.status // .status // empty' "$UPLOAD_VALID_BODY" 2>/dev/null || echo "")
    DOC1_TYPE=$(jq -r '.data.documentType // .documentType // empty' "$UPLOAD_VALID_BODY" 2>/dev/null || echo "")
    if [ -n "$DOC1_ID" ] && [ "$DOC1_STATUS" = "UPLOADED" ] && [ "$DOC1_TYPE" = "IDENTITY_PROOF" ]; then
        pass_test "Valid Document Upload" "HTTP 201 Created, docId=${DOC1_ID}, status=UPLOADED, type=IDENTITY_PROOF"
    else
        fail_test "Valid Document Upload" "Invalid response payload: $(cat "$UPLOAD_VALID_BODY")"
    fi
else
    fail_test "Valid Document Upload" "Expected HTTP 201 Created, got HTTP ${HTTP_CODE_UPLOAD_VALID}. Body: $(cat "$UPLOAD_VALID_BODY")"
fi

# Create a spoofed file with .pdf extension but invalid magic bytes (executable / binary noise)
SPOOFED_FILE="${TMP_DIR}/spoofed_identity.pdf"
echo -e "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00FAKE_PE_HEADER_PAYLOAD" > "$SPOOFED_FILE"

UPLOAD_SPOOFED_BODY="${TMP_DIR}/upload_spoofed_body.json"
HTTP_CODE_UPLOAD_SPOOFED=$(curl -s -X POST "${BASE_URL}/api/v1/documents" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -F "file=@${SPOOFED_FILE};type=application/pdf" \
    -F "documentType=IDENTITY_PROOF" \
    -o "$UPLOAD_SPOOFED_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_UPLOAD_SPOOFED" = "400" ]; then
    pass_test "Spoofed Document Rejection" "HTTP 400 Bad Request correctly returned for fake extension with bad magic bytes"
else
    fail_test "Spoofed Document Rejection" "Expected HTTP 400 Bad Request, got HTTP ${HTTP_CODE_UPLOAD_SPOOFED}. Body: $(cat "$UPLOAD_SPOOFED_BODY")"
fi

# ==============================================================================
# 4. Document Access Control & Audit
# ==============================================================================
log_step "Document Access Control & Audit Trail Verification"

if [ -n "$DOC1_ID" ]; then
    # Owner2 attempts to download Owner1's document (IDOR attempt)
    IDOR_DL_BODY="${TMP_DIR}/idor_dl_body.json"
    HTTP_CODE_IDOR_DL=$(curl -s -X GET "${BASE_URL}/api/v1/documents/${DOC1_ID}/download" \
        -H "Authorization: Bearer ${OWNER2_TOKEN}" \
        -o "$IDOR_DL_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_IDOR_DL" = "403" ]; then
        pass_test "Document IDOR Isolation" "HTTP 403 Forbidden returned when Owner2 attempts to download Owner1's document"
    else
        fail_test "Document IDOR Isolation" "Expected HTTP 403 Forbidden, got HTTP ${HTTP_CODE_IDOR_DL}. Body: $(cat "$IDOR_DL_BODY")"
    fi

    # Owner1 downloads own document
    OWNER1_DL_HEADERS="${TMP_DIR}/owner1_dl_headers.txt"
    OWNER1_DL_CONTENT="${TMP_DIR}/owner1_dl_content.bin"
    HTTP_CODE_OWNER_DL=$(curl -s -D "$OWNER1_DL_HEADERS" -X GET "${BASE_URL}/api/v1/documents/${DOC1_ID}/download" \
        -H "Authorization: Bearer ${OWNER1_TOKEN}" \
        -o "$OWNER1_DL_CONTENT" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_OWNER_DL" = "200" ]; then
        CACHE_CONTROL=$(grep -i "^Cache-Control:" "$OWNER1_DL_HEADERS" | tr -d '\r' || echo "")
        CONTENT_DISP=$(grep -i "^Content-Disposition:" "$OWNER1_DL_HEADERS" | tr -d '\r' || echo "")

        CC_VALID=false
        CD_VALID=false
        if echo "$CACHE_CONTROL" | grep -qi "no-store"; then CC_VALID=true; fi
        if echo "$CONTENT_DISP" | grep -qi "attachment"; then CD_VALID=true; fi

        if [ "$CC_VALID" = true ] && [ "$CD_VALID" = true ]; then
            pass_test "Owner Document Download" "HTTP 200 OK with Cache-Control: no-store and Content-Disposition: attachment"
        else
            fail_test "Owner Document Download" "Missing security headers. Cache-Control: '${CACHE_CONTROL}', Content-Disposition: '${CONTENT_DISP}'"
        fi
    else
        fail_test "Owner Document Download" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_OWNER_DL}"
    fi

    # AdminUser downloads Owner1's document
    ADMIN_DL_HEADERS="${TMP_DIR}/admin_dl_headers.txt"
    ADMIN_DL_CONTENT="${TMP_DIR}/admin_dl_content.bin"
    HTTP_CODE_ADMIN_DL=$(curl -s -D "$ADMIN_DL_HEADERS" -X GET "${BASE_URL}/api/v1/documents/${DOC1_ID}/download" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -o "$ADMIN_DL_CONTENT" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_ADMIN_DL" = "200" ]; then
        pass_test "Admin Document Download" "HTTP 200 OK returned for authorized admin document download"
    else
        fail_test "Admin Document Download" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_ADMIN_DL}"
    fi

    # Database verification: query admin_actions in PostgreSQL
    SQL_AUDIT_CHECK="SELECT COUNT(*) FROM admin_actions WHERE target_type = 'DOCUMENT' AND target_id = ${DOC1_ID} AND action = 'ADMIN_DOCUMENT_DOWNLOAD' AND admin_id = ${ADMIN_USER_ID};"
    AUDIT_COUNT=$(execute_db_sql "$SQL_AUDIT_CHECK" | tr -d '[:space:]')

    if [ -n "$AUDIT_COUNT" ] && [ "$AUDIT_COUNT" -ge 1 ] 2>/dev/null; then
        pass_test "Admin Access Audit Trail" "Verified audit record in admin_actions (admin_id=${ADMIN_USER_ID}, target_id=${DOC1_ID}, count=${AUDIT_COUNT})"
    else
        fail_test "Admin Access Audit Trail" "Expected at least 1 audit record in admin_actions, found '${AUDIT_COUNT}'"
    fi
else
    fail_test "Document Access Tests" "Skipped due to prior document upload failure"
fi

# ==============================================================================
# 5. Owner Verification Submission
# ==============================================================================
log_step "Owner Verification Submission & Document Requirement Guard"

# Attempt POST /api/v1/owners/verification/submit before uploading any documents (using Owner2 who has 0 documents)
SUBMIT_PRE_BODY="${TMP_DIR}/submit_pre_body.json"
HTTP_CODE_SUBMIT_PRE=$(curl -s -X POST "${BASE_URL}/api/v1/owners/verification/submit" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" \
    -o "$SUBMIT_PRE_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_SUBMIT_PRE" = "400" ]; then
    pass_test "Submit Without Documents Guard" "HTTP 400 Bad Request correctly returned when submitting verification without documents"
else
    fail_test "Submit Without Documents Guard" "Expected HTTP 400 Bad Request, got HTTP ${HTTP_CODE_SUBMIT_PRE}. Body: $(cat "$SUBMIT_PRE_BODY")"
fi

# Owner1 (who uploaded dummy_identity_proof.pdf) submits verification
SUBMIT_OWNER1_BODY="${TMP_DIR}/submit_owner1_body.json"
HTTP_CODE_SUBMIT_OWNER1=$(curl -s -X POST "${BASE_URL}/api/v1/owners/verification/submit" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -o "$SUBMIT_OWNER1_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_SUBMIT_OWNER1" = "200" ]; then
    STATUS_SUBMITTED=$(jq -r '.data.verificationStatus // .data.status // empty' "$SUBMIT_OWNER1_BODY" 2>/dev/null || echo "")
    if [ "$STATUS_SUBMITTED" = "SUBMITTED" ]; then
        pass_test "Owner Verification Submission" "HTTP 200 OK, verificationStatus transitioned to SUBMITTED"
    else
        fail_test "Owner Verification Submission" "Expected verificationStatus SUBMITTED, got '${STATUS_SUBMITTED}'. Body: $(cat "$SUBMIT_OWNER1_BODY")"
    fi
else
    fail_test "Owner Verification Submission" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_SUBMIT_OWNER1}. Body: $(cat "$SUBMIT_OWNER1_BODY")"
fi

# Verify GET /api/v1/owners/verification/status confirms SUBMITTED
VERIF_STATUS_BODY="${TMP_DIR}/verif_status_body.json"
HTTP_CODE_VERIF_STATUS=$(curl -s -X GET "${BASE_URL}/api/v1/owners/verification/status" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -o "$VERIF_STATUS_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_VERIF_STATUS" = "200" ]; then
    CURR_VERIF_STATUS=$(jq -r '.data.verificationStatus // empty' "$VERIF_STATUS_BODY" 2>/dev/null || echo "")
    if [ "$CURR_VERIF_STATUS" = "SUBMITTED" ]; then
        pass_test "Owner Verification Status Query" "HTTP 200 OK, status verified as SUBMITTED via /owners/verification/status"
    else
        fail_test "Owner Verification Status Query" "Expected verificationStatus SUBMITTED, got '${CURR_VERIF_STATUS}'"
    fi
else
    fail_test "Owner Verification Status Query" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE_VERIF_STATUS}"
fi

# ==============================================================================
# 6. Golden Invariant & Deterministic LIVE State Machine
# ==============================================================================
log_step "Golden Invariant: Step A — Owner1 creates draft, uploads photo, submits property"

PROPERTY_PAYLOAD_1=$(cat <<EOF
{
  "title": "Prime 3BHK Apartment in Koramangala 4th Block",
  "propertyType": "APARTMENT",
  "listingType": "RENT",
  "price": 55000.00,
  "maintenanceCharges": 4000.00,
  "securityDeposit": 200000.00,
  "bhk": 3,
  "bedrooms": 3,
  "bathrooms": 3,
  "carpetArea": 1500.00,
  "builtUpArea": 1800.00,
  "furnishing": "SEMI_FURNISHED",
  "floorNumber": 3,
  "totalFloors": 5,
  "description": "Spacious sun-lit flat with modular kitchen, premium fixtures, and covered car parking.",
  "preferredTenant": "FAMILY",
  "state": "Karnataka",
  "city": "Bengaluru",
  "district": "Bengaluru Urban",
  "locality": "Koramangala 4th Block",
  "address": "80 Feet Road, 4th Block, Koramangala",
  "pincode": "560034",
  "amenities": ["LIFT", "POWER_BACKUP", "SECURITY", "PARKING"]
}
EOF
)

PROP1_CREATE_BODY="${TMP_DIR}/prop1_create_body.json"
HTTP_CODE_P1_CREATE=$(curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PROPERTY_PAYLOAD_1" \
    -o "$PROP1_CREATE_BODY" \
    -w "%{http_code}")

PROP1_ID=""
if [ "$HTTP_CODE_P1_CREATE" = "201" ]; then
    PROP1_ID=$(jq -r '.data.id // empty' "$PROP1_CREATE_BODY" 2>/dev/null || echo "")
    pass_test "Owner1 Property Draft Creation" "HTTP 201 Created, propId=${PROP1_ID}"
else
    fail_test "Owner1 Property Draft Creation" "Expected HTTP 201, got HTTP ${HTTP_CODE_P1_CREATE}. Body: $(cat "$PROP1_CREATE_BODY")"
fi

# Upload valid photo for Property 1
PHOTO_FILE="${TMP_DIR}/sample_property_photo.jpg"
printf '\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\xFF\xC0\x00\x0B\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1F\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xBF\x00\xFF\xD9' > "$PHOTO_FILE"

UPLOAD_IMG1_BODY="${TMP_DIR}/upload_img1_body.json"
HTTP_CODE_UPLOAD_IMG1=$(curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP1_ID}/images" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -F "file=@${PHOTO_FILE};type=image/jpeg" \
    -o "$UPLOAD_IMG1_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_UPLOAD_IMG1" = "201" ]; then
    pass_test "Owner1 Property Photo Upload" "HTTP 201 Created, photo uploaded for Property ${PROP1_ID}"
else
    fail_test "Owner1 Property Photo Upload" "Expected HTTP 201, got HTTP ${HTTP_CODE_UPLOAD_IMG1}"
fi

# Submit Property 1 for moderation
SUBMIT_P1_BODY="${TMP_DIR}/submit_p1_body.json"
HTTP_CODE_SUBMIT_P1=$(curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP1_ID}/submit" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -o "$SUBMIT_P1_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_SUBMIT_P1" = "200" ]; then
    P1_STATUS=$(jq -r '.data.status // empty' "$SUBMIT_P1_BODY" 2>/dev/null || echo "")
    if [ "$P1_STATUS" = "SUBMITTED" ]; then
        pass_test "Owner1 Property Submission" "HTTP 200 OK, property status transitioned to SUBMITTED"
    else
        fail_test "Owner1 Property Submission" "Expected status SUBMITTED, got '${P1_STATUS}'"
    fi
else
    fail_test "Owner1 Property Submission" "Expected HTTP 200, got HTTP ${HTTP_CODE_SUBMIT_P1}"
fi

# ------------------------------------------------------------------------------
# Golden Invariant: Step B — Admin approves Owner1 property while Owner1 is unverified
# ------------------------------------------------------------------------------
log_step "Golden Invariant: Step B — Admin approves Property 1 while Owner is SUBMITTED (Assert APPROVED, NOT LIVE)"

ADMIN_APPROVE_P1_BODY="${TMP_DIR}/admin_approve_p1_body.json"
HTTP_CODE_APPROVE_P1=$(curl -s -X PUT "${BASE_URL}/api/v1/admin/properties/${PROP1_ID}/approve" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Property specifications and photos meet marketplace standards"}' \
    -o "$ADMIN_APPROVE_P1_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_APPROVE_P1" = "200" ]; then
    P1_AFTER_APPROVE_STATUS=$(jq -r '.data.status // empty' "$ADMIN_APPROVE_P1_BODY" 2>/dev/null || echo "")
    if [ "$P1_AFTER_APPROVE_STATUS" = "APPROVED" ]; then
        pass_test "Property Approval Without Verified Owner" "HTTP 200 OK: Property status is APPROVED (NOT LIVE) because owner is still unverified"
    else
        fail_test "Property Approval Without Verified Owner" "VIOLATION OF GOLDEN INVARIANT: Expected status APPROVED, got '${P1_AFTER_APPROVE_STATUS}'"
    fi
else
    fail_test "Property Approval Without Verified Owner" "Expected HTTP 200, got HTTP ${HTTP_CODE_APPROVE_P1}. Body: $(cat "$ADMIN_APPROVE_P1_BODY")"
fi

# ------------------------------------------------------------------------------
# Golden Invariant: Step C — Admin verifies Owner1 -> Assert Property automatically transitions APPROVED -> LIVE
# ------------------------------------------------------------------------------
log_step "Golden Invariant: Step C — Admin verifies Owner1 (Assert owner VERIFIED & Property automatically transitions APPROVED -> LIVE)"

ADMIN_VERIFY_O1_BODY="${TMP_DIR}/admin_verify_o1_body.json"
HTTP_CODE_VERIFY_O1=$(curl -s -X PUT "${BASE_URL}/api/v1/admin/owners/${OWNER1_PROFILE_ID}/verify" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Government ID verified against title ownership records"}' \
    -o "$ADMIN_VERIFY_O1_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_VERIFY_O1" = "200" ]; then
    O1_STATUS=$(jq -r '.data.verificationStatus // empty' "$ADMIN_VERIFY_O1_BODY" 2>/dev/null || echo "")
    if [ "$O1_STATUS" = "VERIFIED" ]; then
        pass_test "Owner Verification Approval" "HTTP 200 OK: Owner1 verificationStatus transitioned to VERIFIED"
    else
        fail_test "Owner Verification Approval" "Expected verificationStatus VERIFIED, got '${O1_STATUS}'"
    fi
else
    fail_test "Owner Verification Approval" "Expected HTTP 200, got HTTP ${HTTP_CODE_VERIFY_O1}. Body: $(cat "$ADMIN_VERIFY_O1_BODY")"
fi

# Invariant check: query property status -> must now be automatically LIVE
P1_CHECK_BODY="${TMP_DIR}/p1_check_body.json"
HTTP_CODE_P1_CHECK=$(curl -s -X GET "${BASE_URL}/api/v1/properties/${PROP1_ID}" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -o "$P1_CHECK_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_P1_CHECK" = "200" ]; then
    P1_FINAL_STATUS=$(jq -r '.data.status // empty' "$P1_CHECK_BODY" 2>/dev/null || echo "")
    if [ "$P1_FINAL_STATUS" = "LIVE" ]; then
        pass_test "Automatic Transition APPROVED -> LIVE" "GOLDEN INVARIANT SATISFIED: Property ${PROP1_ID} automatically transitioned to LIVE upon owner verification"
    else
        fail_test "Automatic Transition APPROVED -> LIVE" "Expected property status LIVE, got '${P1_FINAL_STATUS}'. Body: $(cat "$P1_CHECK_BODY")"
    fi
else
    fail_test "Automatic Transition APPROVED -> LIVE" "Failed to fetch property details: HTTP ${HTTP_CODE_P1_CHECK}"
fi

# ------------------------------------------------------------------------------
# Golden Invariant: Step D — Reverse Order Trigger (Owner verified first, then property approved -> transitions directly to LIVE)
# ------------------------------------------------------------------------------
log_step "Golden Invariant: Step D — Reverse Order Trigger (Owner2 verified first, then property approved -> immediate LIVE)"

# 1. Owner2 uploads document
UPLOAD_DOC2_BODY="${TMP_DIR}/upload_doc2_body.json"
HTTP_CODE_DOC2=$(curl -s -X POST "${BASE_URL}/api/v1/documents" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" \
    -F "file=@${VALID_PDF};type=application/pdf" \
    -F "documentType=IDENTITY_PROOF" \
    -o "$UPLOAD_DOC2_BODY" \
    -w "%{http_code}")

# 2. Owner2 submits verification
curl -s -X POST "${BASE_URL}/api/v1/owners/verification/submit" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" >/dev/null

# 3. Admin verifies Owner2 first
ADMIN_VERIFY_O2_BODY="${TMP_DIR}/admin_verify_o2_body.json"
HTTP_CODE_VERIFY_O2=$(curl -s -X PUT "${BASE_URL}/api/v1/admin/owners/${OWNER2_PROFILE_ID}/verify" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Representative authorization letter and ID verified"}' \
    -o "$ADMIN_VERIFY_O2_BODY" \
    -w "%{http_code}")

O2_STATUS=$(jq -r '.data.verificationStatus // empty' "$ADMIN_VERIFY_O2_BODY" 2>/dev/null || echo "")
if [ "$HTTP_CODE_VERIFY_O2" = "200" ] && [ "$O2_STATUS" = "VERIFIED" ]; then
    pass_test "Pre-Verification of Owner2" "Owner2 verified prior to property moderation (verificationStatus=VERIFIED)"
else
    fail_test "Pre-Verification of Owner2" "Failed to verify Owner2: HTTP ${HTTP_CODE_VERIFY_O2}. Body: $(cat "$ADMIN_VERIFY_O2_BODY")"
fi

# 4. Owner2 creates property draft
PROPERTY_PAYLOAD_2=$(cat <<EOF
{
  "title": "Luxury 4BHK Villa in Whitefield Prestige Ozone",
  "propertyType": "VILLA",
  "listingType": "RENT",
  "price": 120000.00,
  "maintenanceCharges": 8000.00,
  "securityDeposit": 500000.00,
  "bhk": 4,
  "bedrooms": 4,
  "bathrooms": 4,
  "carpetArea": 2800.00,
  "builtUpArea": 3400.00,
  "furnishing": "FULLY_FURNISHED",
  "floorNumber": 1,
  "totalFloors": 2,
  "description": "Exclusive gated community villa with private garden, Italian marble, and clubhouse access.",
  "preferredTenant": "ANY",
  "state": "Karnataka",
  "city": "Bengaluru",
  "district": "Bengaluru Urban",
  "locality": "Whitefield",
  "address": "Prestige Ozone, Varthur Main Road, Whitefield",
  "pincode": "560066",
  "amenities": ["LIFT", "GYM", "SWIMMING_POOL", "POWER_BACKUP", "SECURITY", "PARKING"]
}
EOF
)

PROP2_CREATE_BODY="${TMP_DIR}/prop2_create_body.json"
HTTP_CODE_P2_CREATE=$(curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PROPERTY_PAYLOAD_2" \
    -o "$PROP2_CREATE_BODY" \
    -w "%{http_code}")
PROP2_ID=$(jq -r '.data.id // empty' "$PROP2_CREATE_BODY" 2>/dev/null || echo "")

# 5. Owner2 uploads photo for Property 2
curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP2_ID}/images" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" \
    -F "file=@${PHOTO_FILE};type=image/jpeg" >/dev/null

# 6. Owner2 submits Property 2
curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP2_ID}/submit" \
    -H "Authorization: Bearer ${OWNER2_TOKEN}" >/dev/null

# 7. Admin approves Property 2 -> since Owner2 is ALREADY VERIFIED, property must transition directly to LIVE
ADMIN_APPROVE_P2_BODY="${TMP_DIR}/admin_approve_p2_body.json"
HTTP_CODE_APPROVE_P2=$(curl -s -X PUT "${BASE_URL}/api/v1/admin/properties/${PROP2_ID}/approve" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Approved for verified owner"}' \
    -o "$ADMIN_APPROVE_P2_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE_APPROVE_P2" = "200" ]; then
    P2_STATUS=$(jq -r '.data.status // empty' "$ADMIN_APPROVE_P2_BODY" 2>/dev/null || echo "")
    if [ "$P2_STATUS" = "LIVE" ]; then
        pass_test "Reverse Order Direct LIVE Transition" "GOLDEN INVARIANT SATISFIED: Property ${PROP2_ID} immediately became LIVE upon approval because Owner2 was already VERIFIED"
    else
        fail_test "Reverse Order Direct LIVE Transition" "Expected status LIVE immediately upon approval, got '${P2_STATUS}'. Body: $(cat "$ADMIN_APPROVE_P2_BODY")"
    fi
else
    fail_test "Reverse Order Direct LIVE Transition" "Expected HTTP 200, got HTTP ${HTTP_CODE_APPROVE_P2}. Body: $(cat "$ADMIN_APPROVE_P2_BODY")"
fi

# ==============================================================================
# 7. Concurrent Admin Decision Conflict (Optimistic Concurrency)
# ==============================================================================
log_step "Concurrent Admin Decision Conflict (Optimistic Concurrency / 409 Conflict)"

# Create Property 3 under Owner1 to test concurrent moderation decisions
PROP3_CREATE_BODY="${TMP_DIR}/prop3_create_body.json"
HTTP_CODE_P3_CREATE=$(curl -s -X POST "${BASE_URL}/api/v1/properties" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PROPERTY_PAYLOAD_1" \
    -o "$PROP3_CREATE_BODY" \
    -w "%{http_code}")
PROP3_ID=$(jq -r '.data.id // empty' "$PROP3_CREATE_BODY" 2>/dev/null || echo "")

curl -s -X POST "${BASE_URL}/api/v1/properties/${PROP3_ID}/images" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" \
    -F "file=@${PHOTO_FILE};type=image/jpeg" >/dev/null

curl -s -X PUT "${BASE_URL}/api/v1/properties/${PROP3_ID}/submit" \
    -H "Authorization: Bearer ${OWNER1_TOKEN}" >/dev/null

echo "Executing two concurrent admin decisions on Property ${PROP3_ID} (Approve vs Reject)..."

RESP_CONC_1="${TMP_DIR}/resp_conc_1.txt"
RESP_CONC_2="${TMP_DIR}/resp_conc_2.txt"

# Trigger concurrent PUT /approve and PUT /reject simultaneously in background
(curl -s -o "${TMP_DIR}/conc1_body.json" -w "%{http_code}" -X PUT "${BASE_URL}/api/v1/admin/properties/${PROP3_ID}/approve" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Concurrent decision thread 1 - approve"}' > "$RESP_CONC_1") &
PID_CONC_1=$!

(curl -s -o "${TMP_DIR}/conc2_body.json" -w "%{http_code}" -X PUT "${BASE_URL}/api/v1/admin/properties/${PROP3_ID}/reject" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Concurrent decision thread 2 - reject"}' > "$RESP_CONC_2") &
PID_CONC_2=$!

wait "$PID_CONC_1" "$PID_CONC_2"

CODE_1=$(cat "$RESP_CONC_1" | tr -d '[:space:]')
CODE_2=$(cat "$RESP_CONC_2" | tr -d '[:space:]')

echo "Concurrent Property Moderation Decision Codes: Thread 1 = ${CODE_1}, Thread 2 = ${CODE_2}"

if { [ "$CODE_1" = "200" ] && [ "$CODE_2" = "409" ]; } || { [ "$CODE_1" = "409" ] && [ "$CODE_2" = "200" ]; }; then
    pass_test "Concurrent Admin Property Decision Conflict" "Optimistic concurrency enforced: exactly one decision succeeded (200) and the concurrent decision returned 409 Conflict"
else
    fail_test "Concurrent Admin Property Decision Conflict" "Expected exactly one 200 and one 409, got thread1=${CODE_1}, thread2=${CODE_2}"
fi

# Concurrent decision conflict on Owner verification
log_step "Concurrent Admin Decision Conflict on Owner Verification"

OWNER3_EMAIL="slice4_owner3_${RAND_ID}@example.com"
curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER3_EMAIL}\",\"password\":\"Password123!\",\"confirmPassword\":\"Password123!\",\"firstName\":\"Rohit\",\"lastName\":\"Sen\",\"userType\":\"LANDLORD\"}" >/dev/null

LOGIN3_BODY="${TMP_DIR}/login3_body.json"
curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER3_EMAIL}\",\"password\":\"Password123!\"}" \
    -o "$LOGIN3_BODY" >/dev/null
OWNER3_TOKEN_INIT=$(jq -r '.data.accessToken // empty' "$LOGIN3_BODY" 2>/dev/null || echo "")

curl -s -X POST "${BASE_URL}/api/v1/owners/register" \
    -H "Authorization: Bearer ${OWNER3_TOKEN_INIT}" \
    -H "Content-Type: application/json" \
    -d '{"ownershipType":"TITLE_OWNER","declarationAccepted":true}' >/dev/null

curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${OWNER3_EMAIL}\",\"password\":\"Password123!\"}" \
    -o "${TMP_DIR}/owner3_refresh_login.json" >/dev/null
OWNER3_TOKEN=$(jq -r '.data.accessToken // empty' "${TMP_DIR}/owner3_refresh_login.json" 2>/dev/null || echo "")

curl -s -X GET "${BASE_URL}/api/v1/owners/profile" \
    -H "Authorization: Bearer ${OWNER3_TOKEN}" \
    -o "${TMP_DIR}/profile3_body.json" >/dev/null
OWNER3_PROFILE_ID=$(jq -r '.data.id // empty' "${TMP_DIR}/profile3_body.json" 2>/dev/null || echo "")

curl -s -X POST "${BASE_URL}/api/v1/documents" \
    -H "Authorization: Bearer ${OWNER3_TOKEN}" \
    -F "file=@${VALID_PDF};type=application/pdf" \
    -F "documentType=IDENTITY_PROOF" >/dev/null

curl -s -X POST "${BASE_URL}/api/v1/owners/verification/submit" \
    -H "Authorization: Bearer ${OWNER3_TOKEN}" >/dev/null

echo "Executing two concurrent admin decisions on Owner ${OWNER3_PROFILE_ID} (Verify vs Reject)..."

RESP_O_CONC_1="${TMP_DIR}/resp_o_conc_1.txt"
RESP_O_CONC_2="${TMP_DIR}/resp_o_conc_2.txt"

(curl -s -o "${TMP_DIR}/conc_o1_body.json" -w "%{http_code}" -X PUT "${BASE_URL}/api/v1/admin/owners/${OWNER3_PROFILE_ID}/verify" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Concurrent verify thread 1"}' > "$RESP_O_CONC_1") &
PID_O_1=$!

(curl -s -o "${TMP_DIR}/conc_o2_body.json" -w "%{http_code}" -X PUT "${BASE_URL}/api/v1/admin/owners/${OWNER3_PROFILE_ID}/reject" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"adminRemarks":"Concurrent reject thread 2"}' > "$RESP_O_CONC_2") &
PID_O_2=$!

wait "$PID_O_1" "$PID_O_2"

CODE_O1=$(cat "$RESP_O_CONC_1" | tr -d '[:space:]')
CODE_O2=$(cat "$RESP_O_CONC_2" | tr -d '[:space:]')

echo "Concurrent Owner Verification Decision Codes: Thread 1 = ${CODE_O1}, Thread 2 = ${CODE_O2}"

if { [ "$CODE_O1" = "200" ] && [ "$CODE_O2" = "409" ]; } || { [ "$CODE_O1" = "409" ] && [ "$CODE_O2" = "200" ]; }; then
    pass_test "Concurrent Admin Owner Decision Conflict" "Optimistic concurrency enforced: exactly one owner decision succeeded (200) and concurrent decision returned 409 Conflict"
else
    fail_test "Concurrent Admin Owner Decision Conflict" "Expected exactly one 200 and one 409, got thread1=${CODE_O1}, thread2=${CODE_O2}"
fi

# ==============================================================================
# 8. Summary Report
# ==============================================================================
log_header "Slice 4 Test Execution Summary"

echo -e "Total Checks Executed: ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "Total Checks Passed:   ${GREEN}${BOLD}${PASSED_TESTS}${NC}"
echo -e "Total Checks Failed:   ${RED}${BOLD}${FAILED_TESTS}${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}==============================================================================${NC}"
    echo -e "${BOLD}${GREEN} ALL SLICE 4 TRUST LAYER & MODERATION TESTS PASSED! (100%)${NC}"
    echo -e "${BOLD}${GREEN}==============================================================================${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}==============================================================================${NC}"
    echo -e "${BOLD}${RED} SLICE 4 INTEGRATION TESTS COMPLETED WITH ${FAILED_TESTS} FAILURE(S).${NC}"
    echo -e "${BOLD}${RED}==============================================================================${NC}\n"
    exit 1
fi
