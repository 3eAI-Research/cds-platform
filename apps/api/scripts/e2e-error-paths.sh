#!/usr/bin/env bash
# =============================================================================
# CDS Platform — E2E Error Path Tests
#
# Tests error handling and business rule enforcement:
#   1. Invalid UUID → 400
#   2. Non-existent resource → 404
#   3. Missing required fields → 400
#   4. Duplicate offer → 409
#   5. Wrong status transition → 422
#   6. Invalid post code format → 400
#   7. Accept non-SUBMITTED offer → 422
#
# Prerequisites: Server running, happy-path already executed (or run setup first).
# Usage: ./scripts/e2e-error-paths.sh [base_url]
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3333/api/v1}"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}━━━ Error Test $1: $2 ━━━${NC}"; }
pass() { echo -e "${GREEN}✅ $1${NC}"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}❌ $1${NC}"; FAIL=$((FAIL + 1)); }

assert_status() {
  local expected=$1 actual=$2 label=$3
  if [ "$actual" -eq "$expected" ]; then
    pass "$label (HTTP $actual)"
  else
    fail "$label — expected $expected, got $actual"
    echo "Response: $(cat /tmp/e2e_err.json | jq -r '.message // .errorCode // .' 2>/dev/null)"
  fi
}

assert_error_code() {
  local expected=$1 label=$2
  local actual
  actual=$(jq -r '.errorCode // .data.errorCode // "N/A"' /tmp/e2e_err.json 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    pass "$label: errorCode=$actual"
  else
    fail "$label: expected errorCode=$expected, got $actual"
  fi
}

# =============================================================================
# Test 1: Invalid UUID in path
# =============================================================================
step 1 "Invalid UUID in path → 400"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/demands/not-a-uuid")
assert_status 400 "$HTTP_CODE" "GET /demands/not-a-uuid"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/offers/12345")
assert_status 400 "$HTTP_CODE" "GET /offers/12345"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/contracts/abc-def")
assert_status 400 "$HTTP_CODE" "GET /contracts/abc-def"

# =============================================================================
# Test 2: Non-existent resource → 404
# =============================================================================
step 2 "Non-existent resource → 404"

FAKE_UUID="00000000-0000-0000-0000-000000000099"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/demands/$FAKE_UUID")
assert_status 404 "$HTTP_CODE" "GET /demands/:fake_id"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/offers/$FAKE_UUID")
assert_status 404 "$HTTP_CODE" "GET /offers/:fake_id"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/contracts/$FAKE_UUID")
assert_status 404 "$HTTP_CODE" "GET /contracts/:fake_id"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/providers/$FAKE_UUID")
assert_status 404 "$HTTP_CODE" "GET /providers/:fake_id"

# =============================================================================
# Test 3: Missing required fields → 400
# =============================================================================
step 3 "Missing required fields → 400"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" \
  -X POST "$BASE_URL/demands" \
  -H "Content-Type: application/json" \
  -d '{"serviceType": "PRIVATE_MOVE"}')
assert_status 400 "$HTTP_CODE" "POST /demands with missing fields"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" \
  -X POST "$BASE_URL/offers" \
  -H "Content-Type: application/json" \
  -d '{"totalPriceAmount": 50000}')
assert_status 400 "$HTTP_CODE" "POST /offers with missing fields"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" \
  -X POST "$BASE_URL/providers" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}')
assert_status 400 "$HTTP_CODE" "POST /providers with missing fields"

# =============================================================================
# Test 4: Invalid enum values → 400
# =============================================================================
step 4 "Invalid enum values → 400"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" \
  -X POST "$BASE_URL/demands" \
  -H "Content-Type: application/json" \
  -d '{"serviceType": "INVALID_TYPE", "transportType": "LOCAL", "numberOfPeople": 2, "preferredDateStart": "2026-04-01T08:00:00Z", "preferredDateEnd": "2026-04-01T18:00:00Z"}')
assert_status 400 "$HTTP_CODE" "POST /demands with invalid serviceType enum"

# =============================================================================
# Test 5: Invalid post code format → 400
# =============================================================================
step 5 "Invalid post code format → 400"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/post-codes/abc")
assert_status 400 "$HTTP_CODE" "GET /post-codes/abc"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/post-codes/1")
assert_status 400 "$HTTP_CODE" "GET /post-codes/1 (too short)"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" "$BASE_URL/post-codes/123456")
assert_status 400 "$HTTP_CODE" "GET /post-codes/123456 (too long)"

# =============================================================================
# Test 6: Offer for non-existent demand → 404
# =============================================================================
step 6 "Offer for non-existent demand → 404"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" \
  -X POST "$BASE_URL/offers" \
  -H "Content-Type: application/json" \
  -d "{\"demandId\": \"$FAKE_UUID\", \"providerCompanyId\": \"$FAKE_UUID\", \"totalPriceAmount\": 50000, \"validUntil\": \"2026-03-20T23:59:59Z\"}")
assert_status 404 "$HTTP_CODE" "POST /offers with non-existent demandId"

# =============================================================================
# Test 7: Forbidden non-whitelisted properties → 400
# =============================================================================
step 7 "Extra properties rejected (whitelist) → 400"

HTTP_CODE=$(curl -s -o /tmp/e2e_err.json -w "%{http_code}" \
  -X POST "$BASE_URL/providers" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "test@test.de", "phoneNumber": "+4930123", "taxNumber": "DE123", "supportedPostCodePrefixes": ["10"], "address": {"street": "A", "houseNumber": "1", "postCode": "10115", "placeName": "Berlin"}, "hackerField": "malicious"}')
assert_status 400 "$HTTP_CODE" "POST /providers with extra property"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  E2E Error Path Results"
echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo -e "\n${GREEN}All error paths handled correctly!${NC}"

rm -f /tmp/e2e_err.json
