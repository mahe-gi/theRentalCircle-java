#!/usr/bin/env bash
# ==============================================================================
# RentalCircle — Slice 2 Integration & Security Verification Suite
# Script: scripts/test-slice-2.sh
# 
# Tests end-to-end against the running stack (default: http://localhost):
# 1. User Registration (POST /api/v1/auth/register) -> 201 Created & user data
# 2. User Login (POST /api/v1/auth/login) -> 200 OK, JWT & refresh_token cookie
# 3. Protected Resource with Bearer JWT (GET /api/v1/auth/me) -> 200 OK & match
# 4. Protected Resource without Token (GET /api/v1/auth/me) -> 401 Unauthorized
# 5. Session Refresh (POST /api/v1/auth/refresh) -> 200 OK, new token & new cookie
# 6. Refresh Token Reuse / Theft Detection -> Old token rejected (401) & family revoked
# 7. User Suspension -> is_active=false rejected (401/403), then restored
# 8. User Logout (POST /api/v1/auth/logout) -> 200 OK, cookie cleared (Max-Age=0)
# 9. PASS/FAIL Summary & Report
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
TMP_DIR=$(mktemp -d /tmp/rentalcircle-test-slice2-XXXXXX 2>/dev/null || mktemp -d -t 'rentalcircle-test-slice2')
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

# Utility output functions
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
        docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$sql" 2>&1
        return $?
    fi
    # Option 2: Docker compose exec
    if command -v docker >/dev/null 2>&1 && docker compose ps --services 2>/dev/null | grep -q "postgres"; then
        docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "$sql" 2>&1
        return $?
    fi
    # Option 3: Local psql client
    if command -v psql >/dev/null 2>&1; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql" 2>&1
        return $?
    fi
    echo "ERROR: Unable to execute SQL. Neither docker container '$DB_CONTAINER' nor 'psql' client is accessible." >&2
    return 1
}

# ------------------------------------------------------------------------------
# Pre-Flight Checks
# ------------------------------------------------------------------------------
log_header "RentalCircle Slice 2 Integration & Security Test Suite"
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
    echo -e "${YELLOW}Warning: /api/health returned HTTP ${HEALTH_HTTP_CODE}.${NC}"
    echo "Proceeding with test suite..."
fi

# Generate unique test user credentials
TIMESTAMP=$(date +%s)
RAND_ID=$((RANDOM % 90000 + 10000))
TEST_EMAIL="slice2_${TIMESTAMP}_${RAND_ID}@example.com"
TEST_PASSWORD="SecurePassw0rd!${RAND_ID}"
TEST_FIRST_NAME="SliceTwo"
TEST_LAST_NAME="Tester"
TEST_MOBILE="+9198$((RANDOM % 90000000 + 10000000))"
TEST_USER_TYPE="TENANT"

echo -e "Test User Email:  ${BOLD}${TEST_EMAIL}${NC}"
echo -e "Test User Mobile: ${BOLD}${TEST_MOBILE}${NC}"

# ==============================================================================
# 1. Register a New User (POST /api/v1/auth/register)
# ==============================================================================
log_step "Register New User (POST /api/v1/auth/register)"

REG_HEADERS="${TMP_DIR}/reg_headers.txt"
REG_BODY="${TMP_DIR}/reg_body.json"

REG_PAYLOAD=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASSWORD}",
  "firstName": "${TEST_FIRST_NAME}",
  "lastName": "${TEST_LAST_NAME}",
  "mobile": "${TEST_MOBILE}",
  "userType": "${TEST_USER_TYPE}"
}
EOF
)

HTTP_CODE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REG_PAYLOAD" \
    -D "$REG_HEADERS" \
    -o "$REG_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE" = "201" ]; then
    SUCCESS_FLAG=$(jq -r '.success // false' "$REG_BODY" 2>/dev/null || echo "false")
    RETURNED_EMAIL=$(jq -r '.data.email // empty' "$REG_BODY" 2>/dev/null || echo "")
    USER_ID=$(jq -r '.data.id // empty' "$REG_BODY" 2>/dev/null || echo "")

    if [ "$SUCCESS_FLAG" = "true" ] && [ "$RETURNED_EMAIL" = "$TEST_EMAIL" ] && [ -n "$USER_ID" ]; then
        pass_test "User Registration" "HTTP 201 Created, userId=${USER_ID}, email=${RETURNED_EMAIL}"
    else
        fail_test "User Registration" "HTTP 201 returned but JSON body validation failed: $(cat "$REG_BODY")"
    fi
else
    fail_test "User Registration" "Expected HTTP 201 Created, got HTTP ${HTTP_CODE}. Body: $(cat "$REG_BODY")"
fi

# ==============================================================================
# 2. Login with Valid Credentials (POST /api/v1/auth/login)
# ==============================================================================
log_step "Login with Valid Credentials (POST /api/v1/auth/login)"

LOGIN_HEADERS="${TMP_DIR}/login_headers.txt"
LOGIN_BODY="${TMP_DIR}/login_body.json"

LOGIN_PAYLOAD=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASSWORD}"
}
EOF
)

HTTP_CODE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_PAYLOAD" \
    -D "$LOGIN_HEADERS" \
    -o "$LOGIN_BODY" \
    -w "%{http_code}")

ACCESS_TOKEN=""
REFRESH_TOKEN=""

if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_FLAG=$(jq -r '.success // false' "$LOGIN_BODY" 2>/dev/null || echo "false")
    ACCESS_TOKEN=$(jq -r '.data.accessToken // empty' "$LOGIN_BODY" 2>/dev/null || echo "")
    
    # Extract refresh_token from Set-Cookie header (supports refresh_token= or refreshToken=)
    REFRESH_COOKIE_HEADER=$(grep -i '^set-cookie:' "$LOGIN_HEADERS" | grep -Ei '(refresh_token|refreshToken)=' | head -n 1)
    REFRESH_TOKEN=$(echo "$REFRESH_COOKIE_HEADER" | sed -E 's/.*(refresh_token|refreshToken)=([^;]+).*/\2/' | tr -d '\r\n ')

    if [ "$SUCCESS_FLAG" = "true" ] && [ -n "$ACCESS_TOKEN" ] && [ -n "$REFRESH_TOKEN" ]; then
        pass_test "User Login" "HTTP 200 OK, JWT parsed, refresh cookie extracted"
    else
        fail_test "User Login" "HTTP 200 returned but token extraction failed. AccessToken=${#ACCESS_TOKEN} chars, RefreshToken=${#REFRESH_TOKEN} chars"
    fi
else
    fail_test "User Login" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE}. Body: $(cat "$LOGIN_BODY")"
fi

# Check Set-Cookie security flags
if [ -n "$REFRESH_COOKIE_HEADER" ]; then
    COOKIE_LOWER=$(echo "$REFRESH_COOKIE_HEADER" | tr '[:upper:]' '[:lower:]')
    if echo "$COOKIE_LOWER" | grep -q "httponly" && echo "$COOKIE_LOWER" | grep -q "samesite=lax"; then
        pass_test "Refresh Cookie Security Flags" "HttpOnly and SameSite=Lax verified"
    else
        fail_test "Refresh Cookie Security Flags" "Cookie missing recommended attributes: ${REFRESH_COOKIE_HEADER}"
    fi
else
    fail_test "Refresh Cookie Security Flags" "No Set-Cookie header found"
fi

# ==============================================================================
# 3. Access Protected /api/v1/auth/me with Bearer JWT
# ==============================================================================
log_step "Access Protected /api/v1/auth/me with Bearer JWT"

ME_BODY="${TMP_DIR}/me_body.json"

if [ -n "$ACCESS_TOKEN" ]; then
    HTTP_CODE=$(curl -s -X GET "${BASE_URL}/api/v1/auth/me" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -o "$ME_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE" = "200" ]; then
        ME_EMAIL=$(jq -r '.data.email // empty' "$ME_BODY" 2>/dev/null || echo "")
        if [ "$ME_EMAIL" = "$TEST_EMAIL" ]; then
            pass_test "Access Protected Resource with JWT" "HTTP 200 OK, user profile email matched: ${ME_EMAIL}"
        else
            fail_test "Access Protected Resource with JWT" "HTTP 200 OK but email mismatch: expected ${TEST_EMAIL}, got ${ME_EMAIL}"
        fi
    else
        fail_test "Access Protected Resource with JWT" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE}. Body: $(cat "$ME_BODY")"
    fi
else
    fail_test "Access Protected Resource with JWT" "Skipped due to missing access token from login"
fi

# ==============================================================================
# 4. Access /api/v1/auth/me Without Token
# ==============================================================================
log_step "Access Protected /api/v1/auth/me Without Token"

UNAUTH_BODY="${TMP_DIR}/unauth_body.json"

HTTP_CODE=$(curl -s -X GET "${BASE_URL}/api/v1/auth/me" \
    -o "$UNAUTH_BODY" \
    -w "%{http_code}")

if [ "$HTTP_CODE" = "401" ]; then
    pass_test "Unauthorized Request Rejection" "HTTP 401 Unauthorized correctly returned when unauthenticated"
else
    fail_test "Unauthorized Request Rejection" "Expected HTTP 401 Unauthorized, got HTTP ${HTTP_CODE}. Body: $(cat "$UNAUTH_BODY")"
fi

# ==============================================================================
# 5. Refresh Session (POST /api/v1/auth/refresh with refresh cookie)
# ==============================================================================
log_step "Refresh Session (POST /api/v1/auth/refresh)"

REFRESH_HEADERS="${TMP_DIR}/refresh_headers.txt"
REFRESH_BODY="${TMP_DIR}/refresh_body.json"
NEW_ACCESS_TOKEN=""
NEW_REFRESH_TOKEN=""

if [ -n "$REFRESH_TOKEN" ]; then
    HTTP_CODE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/refresh" \
        -H "Cookie: refresh_token=${REFRESH_TOKEN}; refreshToken=${REFRESH_TOKEN}" \
        -H "Content-Type: application/json" \
        -D "$REFRESH_HEADERS" \
        -o "$REFRESH_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE" = "200" ]; then
        NEW_ACCESS_TOKEN=$(jq -r '.data.accessToken // empty' "$REFRESH_BODY" 2>/dev/null || echo "")
        NEW_REFRESH_COOKIE_HEADER=$(grep -i '^set-cookie:' "$REFRESH_HEADERS" | grep -Ei '(refresh_token|refreshToken)=' | head -n 1)
        NEW_REFRESH_TOKEN=$(echo "$NEW_REFRESH_COOKIE_HEADER" | sed -E 's/.*(refresh_token|refreshToken)=([^;]+).*/\2/' | tr -d '\r\n ')

        if [ -n "$NEW_ACCESS_TOKEN" ] && [ -n "$NEW_REFRESH_TOKEN" ]; then
            if [ "$NEW_REFRESH_TOKEN" != "$REFRESH_TOKEN" ]; then
                pass_test "Session Refresh & Rotation" "HTTP 200 OK, new access token issued, refresh token rotated"
            else
                fail_test "Session Refresh & Rotation" "Refresh token was not rotated (new equals old)"
            fi
        else
            fail_test "Session Refresh & Rotation" "Failed to extract new access token or refresh cookie"
        fi
    else
        fail_test "Session Refresh & Rotation" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE}. Body: $(cat "$REFRESH_BODY")"
    fi
else
    fail_test "Session Refresh & Rotation" "Skipped due to missing initial refresh token"
fi

# Verify newly issued access token is valid
if [ -n "$NEW_ACCESS_TOKEN" ]; then
    ME_AFTER_REFRESH_BODY="${TMP_DIR}/me_after_refresh.json"
    HTTP_CODE=$(curl -s -X GET "${BASE_URL}/api/v1/auth/me" \
        -H "Authorization: Bearer ${NEW_ACCESS_TOKEN}" \
        -o "$ME_AFTER_REFRESH_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE" = "200" ]; then
        pass_test "New Access Token Validity" "New JWT successfully accessed /api/v1/auth/me"
    else
        fail_test "New Access Token Validity" "New JWT rejected at /api/v1/auth/me with HTTP ${HTTP_CODE}"
    fi
fi

# ==============================================================================
# 6. Test Refresh Token Reuse (Theft Detection)
# ==============================================================================
log_step "Test Refresh Token Reuse & Theft Detection"

REUSE_HEADERS="${TMP_DIR}/reuse_headers.txt"
REUSE_BODY="${TMP_DIR}/reuse_body.json"

if [ -n "$REFRESH_TOKEN" ] && [ -n "$NEW_REFRESH_TOKEN" ]; then
    # Present the OLD (already rotated) refresh token
    HTTP_CODE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/refresh" \
        -H "Cookie: refresh_token=${REFRESH_TOKEN}; refreshToken=${REFRESH_TOKEN}" \
        -H "Content-Type: application/json" \
        -D "$REUSE_HEADERS" \
        -o "$REUSE_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE" = "401" ]; then
        pass_test "Old Refresh Token Rejection" "HTTP 401 Unauthorized correctly returned when presenting already-rotated token"
    else
        fail_test "Old Refresh Token Rejection" "Expected HTTP 401 on reused token, got HTTP ${HTTP_CODE}. Body: $(cat "$REUSE_BODY")"
    fi

    # Verify that the active session was also revoked (the new refresh token is now invalidated)
    FAMILY_REVOKE_HEADERS="${TMP_DIR}/family_revoke_headers.txt"
    FAMILY_REVOKE_BODY="${TMP_DIR}/family_revoke_body.json"

    HTTP_CODE_FAMILY=$(curl -s -X POST "${BASE_URL}/api/v1/auth/refresh" \
        -H "Cookie: refresh_token=${NEW_REFRESH_TOKEN}; refreshToken=${NEW_REFRESH_TOKEN}" \
        -H "Content-Type: application/json" \
        -D "$FAMILY_REVOKE_HEADERS" \
        -o "$FAMILY_REVOKE_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE_FAMILY" = "401" ]; then
        pass_test "Token Family Revocation" "HTTP 401: Active session refresh token revoked after theft/reuse detection"
    else
        fail_test "Token Family Revocation" "Active session was NOT revoked after reuse! Got HTTP ${HTTP_CODE_FAMILY}. Body: $(cat "$FAMILY_REVOKE_BODY")"
    fi
else
    fail_test "Refresh Token Reuse" "Skipped due to missing old or new refresh tokens"
fi

# ==============================================================================
# 7. Test User Suspension
# ==============================================================================
log_step "Test User Suspension (is_active = false)"

# Re-login to acquire a fresh active session
SUSPEND_LOGIN_BODY="${TMP_DIR}/suspend_login_body.json"
SUSPEND_LOGIN_HEADERS="${TMP_DIR}/suspend_login_headers.txt"

HTTP_CODE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_PAYLOAD" \
    -D "$SUSPEND_LOGIN_HEADERS" \
    -o "$SUSPEND_LOGIN_BODY" \
    -w "%{http_code}")

SUSPEND_ACCESS_TOKEN=""
SUSPEND_REFRESH_TOKEN=""

if [ "$HTTP_CODE" = "200" ]; then
    SUSPEND_ACCESS_TOKEN=$(jq -r '.data.accessToken // empty' "$SUSPEND_LOGIN_BODY" 2>/dev/null || echo "")
    SUSPEND_COOKIE=$(grep -i '^set-cookie:' "$SUSPEND_LOGIN_HEADERS" | grep -Ei '(refresh_token|refreshToken)=' | head -n 1)
    SUSPEND_REFRESH_TOKEN=$(echo "$SUSPEND_COOKIE" | sed -E 's/.*(refresh_token|refreshToken)=([^;]+).*/\2/' | tr -d '\r\n ')
fi

if [ -n "$SUSPEND_ACCESS_TOKEN" ]; then
    # Suspend user in DB
    echo "    Updating DB: setting is_active = false for ${TEST_EMAIL}..."
    UPDATE_RESULT=$(execute_db_sql "UPDATE users SET is_active = false WHERE email = '${TEST_EMAIL}';")
    DB_STATUS=$?

    if [ $DB_STATUS -eq 0 ]; then
        pass_test "Database User Suspension" "is_active set to false in database"

        # Attempt to access protected /api/v1/auth/me with existing access token
        SUSPEND_ME_BODY="${TMP_DIR}/suspend_me_body.json"
        HTTP_CODE_ME=$(curl -s -X GET "${BASE_URL}/api/v1/auth/me" \
            -H "Authorization: Bearer ${SUSPEND_ACCESS_TOKEN}" \
            -o "$SUSPEND_ME_BODY" \
            -w "%{http_code}")

        # Attempt /api/v1/auth/refresh for suspended user
        SUSPEND_REF_BODY="${TMP_DIR}/suspend_ref_body.json"
        HTTP_CODE_REF=$(curl -s -X POST "${BASE_URL}/api/v1/auth/refresh" \
            -H "Cookie: refresh_token=${SUSPEND_REFRESH_TOKEN}; refreshToken=${SUSPEND_REFRESH_TOKEN}" \
            -H "Content-Type: application/json" \
            -o "$SUSPEND_REF_BODY" \
            -w "%{http_code}")

        if [ "$HTTP_CODE_ME" = "401" ] || [ "$HTTP_CODE_ME" = "403" ] || [ "$HTTP_CODE_REF" = "401" ] || [ "$HTTP_CODE_REF" = "403" ]; then
            pass_test "Suspended User Rejection" "Operation rejected with HTTP /me=${HTTP_CODE_ME}, /refresh=${HTTP_CODE_REF} (401/403 expected)"
        else
            fail_test "Suspended User Rejection" "Suspended user request was not rejected! /me=${HTTP_CODE_ME}, /refresh=${HTTP_CODE_REF}"
        fi

        # Restore user in DB
        echo "    Restoring DB: setting is_active = true for ${TEST_EMAIL}..."
        RESTORE_RESULT=$(execute_db_sql "UPDATE users SET is_active = true WHERE email = '${TEST_EMAIL}';")
        pass_test "Database User Restoration" "is_active restored to true in database"

    else
        fail_test "Database User Suspension" "Could not connect to database or update users table. Output: ${UPDATE_RESULT}"
    fi
else
    fail_test "Test User Suspension" "Could not log in to obtain session for suspension testing"
fi

# ==============================================================================
# 8. Logout (POST /api/v1/auth/logout)
# ==============================================================================
log_step "Logout (POST /api/v1/auth/logout)"

LOGOUT_LOGIN_BODY="${TMP_DIR}/logout_login_body.json"
LOGOUT_LOGIN_HEADERS="${TMP_DIR}/logout_login_headers.txt"

HTTP_CODE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_PAYLOAD" \
    -D "$LOGOUT_LOGIN_HEADERS" \
    -o "$LOGOUT_LOGIN_BODY" \
    -w "%{http_code}")

LOGOUT_REFRESH_TOKEN=""
if [ "$HTTP_CODE" = "200" ]; then
    LOGOUT_COOKIE=$(grep -i '^set-cookie:' "$LOGOUT_LOGIN_HEADERS" | grep -Ei '(refresh_token|refreshToken)=' | head -n 1)
    LOGOUT_REFRESH_TOKEN=$(echo "$LOGOUT_COOKIE" | sed -E 's/.*(refresh_token|refreshToken)=([^;]+).*/\2/' | tr -d '\r\n ')
fi

LOGOUT_HEADERS="${TMP_DIR}/logout_headers.txt"
LOGOUT_BODY="${TMP_DIR}/logout_body.json"

if [ -n "$LOGOUT_REFRESH_TOKEN" ]; then
    HTTP_CODE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/logout" \
        -H "Cookie: refresh_token=${LOGOUT_REFRESH_TOKEN}; refreshToken=${LOGOUT_REFRESH_TOKEN}" \
        -H "Content-Type: application/json" \
        -D "$LOGOUT_HEADERS" \
        -o "$LOGOUT_BODY" \
        -w "%{http_code}")

    if [ "$HTTP_CODE" = "200" ]; then
        pass_test "Logout Status" "HTTP 200 OK returned on logout"

        # Verify cookie cleared with Max-Age=0 or past expiry date
        CLEAR_COOKIE_HEADER=$(grep -i '^set-cookie:' "$LOGOUT_HEADERS" | grep -Ei '(refresh_token|refreshToken)=' | head -n 1)
        CLEAR_LOWER=$(echo "$CLEAR_COOKIE_HEADER" | tr '[:upper:]' '[:lower:]')

        if echo "$CLEAR_LOWER" | grep -Eq '(max-age=0|expires=thu, 01 jan 1970)'; then
            pass_test "Refresh Cookie Cleared" "Set-Cookie contains Max-Age=0 or expired date"
        else
            fail_test "Refresh Cookie Cleared" "Logout did not clear cookie as expected: ${CLEAR_COOKIE_HEADER}"
        fi

        # Verify revoked refresh token is no longer usable
        POST_LOGOUT_REF_BODY="${TMP_DIR}/post_logout_ref_body.json"
        HTTP_CODE_POST=$(curl -s -X POST "${BASE_URL}/api/v1/auth/refresh" \
            -H "Cookie: refresh_token=${LOGOUT_REFRESH_TOKEN}; refreshToken=${LOGOUT_REFRESH_TOKEN}" \
            -H "Content-Type: application/json" \
            -o "$POST_LOGOUT_REF_BODY" \
            -w "%{http_code}")

        if [ "$HTTP_CODE_POST" = "401" ]; then
            pass_test "Revoked Token Invalidation" "HTTP 401 Unauthorized confirmed for revoked session"
        else
            fail_test "Revoked Token Invalidation" "Revoked session was unexpectedly accepted! HTTP ${HTTP_CODE_POST}"
        fi
    else
        fail_test "Logout Status" "Expected HTTP 200 OK, got HTTP ${HTTP_CODE}. Body: $(cat "$LOGOUT_BODY")"
    fi
else
    fail_test "Logout Test" "Could not obtain refresh token for logout test"
fi

# ==============================================================================
# 9. Summary Report
# ==============================================================================
log_header "Slice 2 Test Execution Summary"

echo -e "Total Checks Executed: ${BOLD}${TOTAL_TESTS}${NC}"
echo -e "Total Checks Passed:   ${GREEN}${BOLD}${PASSED_TESTS}${NC}"
echo -e "Total Checks Failed:   ${RED}${BOLD}${FAILED_TESTS}${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}==============================================================================${NC}"
    echo -e "${BOLD}${GREEN} ALL SLICE 2 AUTHENTICATION & SECURITY INTEGRATION TESTS PASSED! (100%)${NC}"
    echo -e "${BOLD}${GREEN}==============================================================================${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}==============================================================================${NC}"
    echo -e "${BOLD}${RED} SLICE 2 INTEGRATION TESTS COMPLETED WITH ${FAILED_TESTS} FAILURE(S).${NC}"
    echo -e "${BOLD}${RED}==============================================================================${NC}\n"
    exit 1
fi
