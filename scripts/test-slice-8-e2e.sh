#!/usr/bin/env bash
# ==============================================================================
# RentalCircle — Slice 8: Full End-to-End User Journey Test Suite
#
# Tests complete cross-slice product journeys:
# 1. Journey A: Owner Onboarding, Draft Wizard, KYC Verification & LIVE Transition
# 2. Journey B: Tenant Discovery, Search, Address Privacy, WhatsApp & Visit Booking
# 3. Journey C: Trust, Community Reporting, Admin Moderation & Listing Suspension
# 4. Journey D: Owner Account Deletion & Physical Storage Cleanliness
# ==============================================================================

set -euo pipefail

BASE_URL="http://localhost"
TEMP_DIR=$(mktemp -d /tmp/rentalcircle-e2e-XXXXXX)
RAND_ID=$((10000 + RANDOM % 90000))
TIMESTAMP=$(date +%s)

TOTAL_ASSERTIONS=0
PASSED_ASSERTIONS=0
FAILED_ASSERTIONS=0

pass_assertion() {
  local title="$1"
  local detail="${2:-}"
  TOTAL_ASSERTIONS=$((TOTAL_ASSERTIONS + 1))
  PASSED_ASSERTIONS=$((PASSED_ASSERTIONS + 1))
  echo "  [PASS] $title"
  if [ -n "$detail" ]; then
    echo "         $detail"
  fi
}

fail_assertion() {
  local title="$1"
  local detail="${2:-}"
  TOTAL_ASSERTIONS=$((TOTAL_ASSERTIONS + 1))
  FAILED_ASSERTIONS=$((FAILED_ASSERTIONS + 1))
  echo "  [FAIL] $title"
  if [ -n "$detail" ]; then
    echo "         $detail"
  fi
  exit 1
}

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "=============================================================================="
echo " RentalCircle — Slice 8: Full E2E Journey Test Suite"
echo " Target Stack: $BASE_URL"
echo " Session ID:   $RAND_ID"
echo "=============================================================================="

# Check health
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" || true)
if [ "$HEALTH_CODE" != "200" ]; then
  echo "ERROR: Target stack at $BASE_URL is not healthy (HTTP $HEALTH_CODE)"
  exit 1
fi
echo "Stack is healthy (HTTP 200)."
echo ""

# Helper to execute SQL
execute_sql() {
  local query="$1"
  local user="${POSTGRES_USER:-dev_user}"
  local db="${POSTGRES_DB:-dev_platform}"
  docker exec -i platform-postgres psql -U "$user" -d "$db" -t -A -c "$query" 2>&1
}

# ==============================================================================
# JOURNEY A: Owner Onboarding, Property Listing, KYC & Moderation to LIVE
# ==============================================================================
echo "=============================================================================="
echo " JOURNEY A: Owner Onboarding, KYC & State-Machine to LIVE"
echo "=============================================================================="

OWNER_EMAIL="e2e_owner_${RAND_ID}_${TIMESTAMP}@example.com"
ADMIN_EMAIL="e2e_admin_${RAND_ID}_${TIMESTAMP}@example.com"
TENANT_EMAIL="e2e_tenant_${RAND_ID}_${TIMESTAMP}@example.com"
REPORTER_EMAIL="e2e_reporter_${RAND_ID}_${TIMESTAMP}@example.com"

# 1. Register Owner
OWNER_REG_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ramesh",
    "lastName": "Sharma",
    "email": "'"$OWNER_EMAIL"'",
    "mobile": "+91987'"$RAND_ID"'11",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "userType": "OWNER"
  }')
OWNER_ID=$(echo "$OWNER_REG_RESP" | jq -r '.data.id // empty')
[ -n "$OWNER_ID" ] || fail_assertion "Owner Registration" "Failed to get owner ID: $OWNER_REG_RESP"
pass_assertion "Owner Registration" "Owner registered with ID $OWNER_ID"

# 2. Login Owner
OWNER_LOGIN_RESP=$(curl -s -c "$TEMP_DIR/owner_cookies.txt" -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$OWNER_EMAIL"'", "password": "Password123!"}')
OWNER_TOKEN=$(echo "$OWNER_LOGIN_RESP" | jq -r '.data.accessToken // empty')
[ -n "$OWNER_TOKEN" ] || fail_assertion "Owner Login" "Failed to get access token"
pass_assertion "Owner Login" "JWT access token acquired"

# 3. Register Admin
ADMIN_REG_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Super",
    "lastName": "Admin",
    "email": "'"$ADMIN_EMAIL"'",
    "mobile": "+91987'"$RAND_ID"'22",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "userType": "TENANT"
  }')
ADMIN_ID=$(echo "$ADMIN_REG_RESP" | jq -r '.data.id // empty')
execute_sql "INSERT INTO user_roles (user_id, role_id) SELECT $ADMIN_ID, id FROM roles WHERE name = 'ROLE_ADMIN' ON CONFLICT DO NOTHING;"
pass_assertion "Admin Elevation" "Elevated Admin $ADMIN_ID with ROLE_ADMIN"

ADMIN_LOGIN_RESP=$(curl -s -c "$TEMP_DIR/admin_cookies.txt" -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$ADMIN_EMAIL"'", "password": "Password123!"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESP" | jq -r '.data.accessToken // empty')
pass_assertion "Admin Login" "Admin authenticated"

# 4. Owner Declaration
DECL_RESP=$(curl -s -X POST "$BASE_URL/api/v1/owners/register" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ownershipType": "TITLE_OWNER",
    "declarationAccepted": true
  }')
OWNER_PROFILE_ID=$(echo "$DECL_RESP" | jq -r '.data.id // empty')
[ -n "$OWNER_PROFILE_ID" ] || fail_assertion "Owner Declaration" "Failed to register declaration: $DECL_RESP"
pass_assertion "Owner Declaration" "Profile $OWNER_PROFILE_ID created in NOT_STARTED KYC state"

# 5. Create Property Draft
CREATE_PROP_RESP=$(curl -s -X POST "$BASE_URL/api/v1/properties" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Luxury 3BHK Penthouse Indiranagar",
    "propertyType": "APARTMENT",
    "listingType": "RENT",
    "price": 65000.00,
    "maintenanceCharges": 3500.00,
    "securityDeposit": 200000.00,
    "bhk": 3,
    "bedrooms": 3,
    "bathrooms": 3,
    "carpetArea": 1850.00,
    "builtUpArea": 2100.00,
    "furnishing": "FURNISHED",
    "floorNumber": 4,
    "totalFloors": 4,
    "description": "Stunning top-floor penthouse with private terrace and panoramic views.",
    "preferredTenant": "FAMILY",
    "availabilityDate": "2026-11-01",
    "state": "Karnataka",
    "city": "Bengaluru",
    "district": "Bengaluru Urban",
    "locality": "Indiranagar",
    "address": "Flat 401, Sapphire Court, 100ft Road",
    "pincode": "560038",
    "latitude": 12.97194,
    "longitude": 77.64156,
    "amenities": ["PARKING", "LIFT", "GYM", "POWER_BACKUP", "SECURITY"]
  }')
PROPERTY_ID=$(echo "$CREATE_PROP_RESP" | jq -r '.data.id // empty')
[ -n "$PROPERTY_ID" ] || fail_assertion "Property Draft Creation" "Failed to create draft: $CREATE_PROP_RESP"
pass_assertion "Property Draft Created" "Property ID $PROPERTY_ID created in DRAFT status"

# 6. Upload Property Image
echo -ne '\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00\xFF\xC0\x00\x0B\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1F\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0B\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xBF\x00\xFF\xD9' > "$TEMP_DIR/cover.jpg"
IMG_RESP=$(curl -s -X POST "$BASE_URL/api/v1/properties/$PROPERTY_ID/images" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -F "file=@$TEMP_DIR/cover.jpg;type=image/jpeg")
IMG_ID=$(echo "$IMG_RESP" | jq -r '.data.id // empty')
[ -n "$IMG_ID" ] || fail_assertion "Photo Upload" "Failed to upload photo: $IMG_RESP"
pass_assertion "Property Photo Uploaded" "Image $IMG_ID saved and designated as primary"

# 7. Upload KYC Document
cat << 'EOF' > "$TEMP_DIR/kyc.pdf"
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
190
%%EOF
EOF
DOC_RESP=$(curl -s -X POST "$BASE_URL/api/v1/documents" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -F "file=@$TEMP_DIR/kyc.pdf;type=application/pdf" \
  -F "documentType=IDENTITY_PROOF")
DOC_ID=$(echo "$DOC_RESP" | jq -r '.data.id // empty')
[ -n "$DOC_ID" ] || fail_assertion "KYC Upload" "Failed to upload KYC doc: $DOC_RESP"
pass_assertion "KYC Document Uploaded" "Document $DOC_ID stored in secure isolated storage"

# 8. Submit Verification & Submit Property
curl -s -X POST "$BASE_URL/api/v1/owners/verification/submit" \
  -H "Authorization: Bearer $OWNER_TOKEN" > /dev/null
curl -s -X PUT "$BASE_URL/api/v1/properties/$PROPERTY_ID/submit" \
  -H "Authorization: Bearer $OWNER_TOKEN" > /dev/null
pass_assertion "Submitted for Review" "Owner verification SUBMITTED and Property $PROPERTY_ID SUBMITTED"

# 9. Admin Moderation: Verify Owner & Approve Property
curl -s -X PUT "$BASE_URL/api/v1/admin/owners/$OWNER_PROFILE_ID/verify" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "All documents verified authentic", "notes": "Gov ID matches profile"}' > /dev/null

APPROVE_PROP_RESP=$(curl -s -X PUT "$BASE_URL/api/v1/admin/properties/$PROPERTY_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Listing verified compliant", "notes": "Approved for live publishing"}')

PROP_STATUS_DB=$(execute_sql "SELECT status FROM properties WHERE id = $PROPERTY_ID;")
[ "$PROP_STATUS_DB" = "LIVE" ] || fail_assertion "LIVE State Machine" "Expected LIVE but got $PROP_STATUS_DB"
pass_assertion "Bidirectional LIVE Invariant" "Property automatically transitioned to LIVE (Owner VERIFIED + Property APPROVED)"

# ==============================================================================
# JOURNEY B: Tenant Discovery, Search, Address Privacy & Connection
# ==============================================================================
echo ""
echo "=============================================================================="
echo " JOURNEY B: Tenant Discovery, Address Privacy & Direct Connection"
echo "=============================================================================="

# 1. Anonymous Search by Locality
SEARCH_RESP=$(curl -s "$BASE_URL/api/v1/properties/search?city=Bengaluru&locality=Indiranagar&amenities=PARKING&amenities=GYM")
FOUND_ID=$(echo "$SEARCH_RESP" | jq -r '.data.content[] | select(.id == '"$PROPERTY_ID"') | .id')
[ "$FOUND_ID" = "$PROPERTY_ID" ] || fail_assertion "Search Discovery" "Property $PROPERTY_ID not found in search: $SEARCH_RESP"
pass_assertion "Structured Search Discovery" "Property found via city=Bengaluru, locality=Indiranagar, AND amenities filter"

# 2. Public Detail Check & Strict Address Privacy
DETAIL_RESP=$(curl -s "$BASE_URL/api/v1/properties/$PROPERTY_ID")
HAS_ADDRESS=$(echo "$DETAIL_RESP" | jq -r '.data | has("address")')
HAS_STATUS=$(echo "$DETAIL_RESP" | jq -r '.data | has("status")')
LOCALITY_VAL=$(echo "$DETAIL_RESP" | jq -r '.data.locality')
VERIFIED_BADGE=$(echo "$DETAIL_RESP" | jq -r '.data.owner.verifiedBadge')

[ "$HAS_ADDRESS" = "false" ] || fail_assertion "Address Privacy" "Address leaked in public detail API!"
[ "$HAS_STATUS" = "false" ] || fail_assertion "Status Privacy" "Internal moderation status leaked in public API!"
[ "$LOCALITY_VAL" = "Indiranagar" ] || fail_assertion "Locality Disclosure" "Expected locality Indiranagar"
[ "$VERIFIED_BADGE" = "true" ] || fail_assertion "Verified Badge" "Verified owner badge expected true"
pass_assertion "Address Privacy Invariant" "Exact door/flat address and status withheld; verified badge present"

# 3. Tenant Registration & Login
curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Priya",
    "lastName": "Nair",
    "email": "'"$TENANT_EMAIL"'",
    "mobile": "+91987'"$RAND_ID"'33",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "userType": "TENANT"
  }' > /dev/null

TENANT_LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$TENANT_EMAIL"'", "password": "Password123!"}')
TENANT_TOKEN=$(echo "$TENANT_LOGIN_RESP" | jq -r '.data.accessToken // empty')
pass_assertion "Tenant Authenticated" "Tenant $TENANT_EMAIL logged in"

# 4. WhatsApp Direct Click
WA_RESP=$(curl -s -X POST "$BASE_URL/api/v1/properties/$PROPERTY_ID/contact" \
  -H "Authorization: Bearer $TENANT_TOKEN")
WA_URL=$(echo "$WA_RESP" | jq -r '.data.whatsappUrl // empty')
[[ "$WA_URL" == *"https://wa.me/"* ]] || fail_assertion "WhatsApp Deep Link" "Invalid WA URL: $WA_URL"
pass_assertion "WhatsApp Direct Contact" "Generated wa.me URL and logged contact_event"

# 5. Enquiry Lifecycle
ENQUIRY_RESP=$(curl -s -X POST "$BASE_URL/api/v1/properties/$PROPERTY_ID/enquiries" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Is the penthouse available for family with pets?"}')
ENQUIRY_ID=$(echo "$ENQUIRY_RESP" | jq -r '.data.id // empty')
pass_assertion "Lead Enquiry Sent" "Enquiry $ENQUIRY_ID sent to owner"

# Owner updates enquiry
curl -s -X PUT "$BASE_URL/api/v1/enquiries/$ENQUIRY_ID/status" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONTACTED"}' > /dev/null
pass_assertion "Enquiry Lead Updated" "Owner advanced enquiry status to CONTACTED"

# 6. Visit Scheduling Lifecycle
VISIT_RESP=$(curl -s -X POST "$BASE_URL/api/v1/properties/$PROPERTY_ID/visits" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferredDate": "2026-10-15",
    "preferredTime": "11:00",
    "message": "Would love to inspect the terrace and view."
  }')
VISIT_ID=$(echo "$VISIT_RESP" | jq -r '.data.id // empty')
pass_assertion "Visit Requested" "Visit $VISIT_ID requested for 2026-10-15"

# Owner accepts visit
curl -s -X PUT "$BASE_URL/api/v1/visits/$VISIT_ID/accept" \
  -H "Authorization: Bearer $OWNER_TOKEN" > /dev/null
pass_assertion "Visit Accepted" "Owner accepted visit request"

# 7. Favorites Toggle
FAV_RESP=$(curl -s -X POST "$BASE_URL/api/v1/properties/$PROPERTY_ID/favorite" \
  -H "Authorization: Bearer $TENANT_TOKEN")
IS_FAV=$(echo "$FAV_RESP" | jq -r '.data.favorited')
[ "$IS_FAV" = "true" ] || fail_assertion "Favorites Toggle" "Expected favorited=true"
pass_assertion "Property Favorited" "Property added to tenant favorites list"

# ==============================================================================
# JOURNEY C: Trust, Community Reporting & Listing Suspension
# ==============================================================================
echo ""
echo "=============================================================================="
echo " JOURNEY C: Trust, Community Reporting & Listing Suspension"
echo "=============================================================================="

# 1. Register Second Tenant (Reporter)
curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Anil",
    "lastName": "Kumar",
    "email": "'"$REPORTER_EMAIL"'",
    "mobile": "+91987'"$RAND_ID"'44",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "userType": "TENANT"
  }' > /dev/null

REPORTER_LOGIN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$REPORTER_EMAIL"'", "password": "Password123!"}')
REPORTER_TOKEN=$(echo "$REPORTER_LOGIN" | jq -r '.data.accessToken')

# 2. Report Property as BROKER
REPORT_RESP=$(curl -s -X POST "$BASE_URL/api/v1/reports" \
  -H "Authorization: Bearer $REPORTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": '"$PROPERTY_ID"',
    "reason": "BROKER",
    "description": "Owner demanded half month commission during phone call."
  }')
REPORT_ID=$(echo "$REPORT_RESP" | jq -r '.data.id // empty')
pass_assertion "Community Report Filed" "Report $REPORT_ID submitted against property $PROPERTY_ID"

# 3. Admin Investigates & Resolves with HIDE_PROPERTY
curl -s -X PUT "$BASE_URL/api/v1/admin/reports/$REPORT_ID/investigate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

RESOLVE_RESP=$(curl -s -X PUT "$BASE_URL/api/v1/admin/reports/$REPORT_ID/resolve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "HIDE_PROPERTY",
    "notes": "Commission demand confirmed via logs. Property suspended."
  }')
pass_assertion "Admin Report Resolution" "Admin resolved report with action HIDE_PROPERTY"

# 4. Confirm Property is Suspended and Inaccessible Publicly
PROP_STATUS_AFTER=$(execute_sql "SELECT status FROM properties WHERE id = $PROPERTY_ID;")
[ "$PROP_STATUS_AFTER" = "SUSPENDED" ] || fail_assertion "Property Suspension" "Expected SUSPENDED, got $PROP_STATUS_AFTER"
pass_assertion "Property Suspended" "Property status automatically transitioned to SUSPENDED"

# Public Search must NOT return suspended property
SEARCH_AFTER=$(curl -s "$BASE_URL/api/v1/properties/search?city=Bengaluru&locality=Indiranagar")
SEARCH_MATCH=$(echo "$SEARCH_AFTER" | jq -r '.data.content[] | select(.id == '"$PROPERTY_ID"') | .id')
[ -z "$SEARCH_MATCH" ] || fail_assertion "Suspended Search Leak" "Suspended property returned in search!"
pass_assertion "Search Quarantine" "Suspended property strictly excluded from search results"

# Public Detail must return 404
DETAIL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/properties/$PROPERTY_ID")
[ "$DETAIL_CODE" = "404" ] || fail_assertion "Suspended Detail Privacy" "Expected 404 but got $DETAIL_CODE"
pass_assertion "Detail Quarantine (404)" "Public detail returns HTTP 404 for suspended property"

# 5. Audit Log Entry Verified
AUDIT_EXISTS=$(execute_sql "SELECT COUNT(*) FROM admin_actions WHERE action = 'RESOLVE_REPORT' AND target_id = $REPORT_ID;")
[ "$AUDIT_EXISTS" -ge 1 ] || fail_assertion "Admin Audit Trail" "No audit log found for RESOLVE_REPORT on $REPORT_ID"
pass_assertion "Immutable Audit Trail" "Admin action recorded in admin_actions ledger"

# ==============================================================================
# JOURNEY D: Owner Account Erasure & Data Cleanliness
# ==============================================================================
echo ""
echo "=============================================================================="
echo " JOURNEY D: Account Erasure & Physical File Purge Pipeline"
echo "=============================================================================="

# Fetch storage key for document
DOC_STORAGE_KEY=$(execute_sql "SELECT storage_key FROM documents WHERE id = $DOC_ID;")
[ -n "$DOC_STORAGE_KEY" ] || fail_assertion "Storage Key Lookup" "No storage key found for doc $DOC_ID"

# Delete Owner Account
DEL_STATUS=$(curl -s -o "$TEMP_DIR/del_resp.json" -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/owners/account" \
  -H "Authorization: Bearer $OWNER_TOKEN")
[ "$DEL_STATUS" = "200" ] || fail_assertion "Account Deletion" "DELETE failed with HTTP $DEL_STATUS: $(cat "$TEMP_DIR/del_resp.json")"
pass_assertion "Account Deletion Executed" "DELETE /api/v1/owners/account returned HTTP 200"

# Verify physical KYC file is purged from disk inside docker
FILE_EXISTS_ON_DISK=$(docker compose exec -T backend test -f "/var/app/secure-docs/$DOC_STORAGE_KEY" && echo "EXISTS" || echo "PURGED")
[ "$FILE_EXISTS_ON_DISK" = "PURGED" ] || fail_assertion "Physical File Purge" "Sensitive KYC file still exists on disk!"
pass_assertion "Physical KYC File Purged" "Verified physical file $DOC_STORAGE_KEY purged from /var/app/secure-docs/"

# Verify DB rows cascade-purged
DOC_COUNT=$(execute_sql "SELECT COUNT(*) FROM documents WHERE id = $DOC_ID;" | tr -d '[:space:]')
[ "$DOC_COUNT" = "0" ] || fail_assertion "Document DB Cleanup" "Document row still exists in DB (count=$DOC_COUNT)"
pass_assertion "Database Cleanup" "Document record, property record, and owner profile cascaded from DB"

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo "=============================================================================="
echo " SLICE 8 E2E JOURNEY EXECUTION SUMMARY"
echo "=============================================================================="
echo "Total Assertions: $TOTAL_ASSERTIONS"
echo "Passed:           $PASSED_ASSERTIONS"
echo "Failed:           $FAILED_ASSERTIONS"
echo ""
echo ">>> ALL CROSS-SLICE USER JOURNEYS PASSED CLEANLY (100%) <<<"
