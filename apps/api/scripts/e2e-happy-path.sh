#!/usr/bin/env bash
# =============================================================================
# CDS Platform — E2E Happy Path Test
#
# Tests the full MVP flow:
#   1. Register provider company
#   2. Create demand (Umzugsanfrage)
#   3. Submit offer
#   4. Accept offer → auto-creates contract
#   5. Customer accepts contract
#   6. Provider accepts contract → ACTIVE
#
# Prerequisites: Server running on $BASE_URL, DB seeded.
# Usage: ./scripts/e2e-happy-path.sh [base_url]
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3333/api/v1}"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

step() { echo -e "\n${YELLOW}━━━ Step $1: $2 ━━━${NC}"; }
pass() { echo -e "${GREEN}✅ $1${NC}"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}❌ $1${NC}"; FAIL=$((FAIL + 1)); }

assert_status() {
  local expected=$1 actual=$2 label=$3
  if [ "$actual" -eq "$expected" ]; then
    pass "$label (HTTP $actual)"
  else
    fail "$label — expected $expected, got $actual"
    echo "Response body:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
  fi
}

assert_field() {
  local field=$1 expected=$2 label=$3
  local actual
  actual=$(echo "$BODY" | jq -r "$field")
  if [ "$actual" = "$expected" ]; then
    pass "$label: $field = $actual"
  else
    fail "$label: expected $field=$expected, got $actual"
  fi
}

# =============================================================================
# Step 0: Fetch seed data IDs
# =============================================================================
step 0 "Fetch seed data IDs"

HTTP_CODE=$(curl -s -o /tmp/e2e_estate_types.json -w "%{http_code}" "$BASE_URL/estate-types")
assert_status 200 "$HTTP_CODE" "GET /estate-types"
ESTATE_TYPE_ID=$(jq -r '.data.items[0].id' /tmp/e2e_estate_types.json)
echo "  Estate Type ID: $ESTATE_TYPE_ID"

# Get parts for this estate type
HTTP_CODE=$(curl -s -o /tmp/e2e_parts.json -w "%{http_code}" "$BASE_URL/estate-types/$ESTATE_TYPE_ID/parts")
assert_status 200 "$HTTP_CODE" "GET /estate-types/:id/parts"
PART_TYPE_ID=$(jq -r '.data.items[0].id' /tmp/e2e_parts.json)
echo "  Part Type ID: $PART_TYPE_ID"

# Get furniture types
HTTP_CODE=$(curl -s -o /tmp/e2e_furniture.json -w "%{http_code}" "$BASE_URL/furniture-types")
assert_status 200 "$HTTP_CODE" "GET /furniture-types"
FURNITURE_TYPE_ID=$(jq -r '.data.items[0].id' /tmp/e2e_furniture.json)
echo "  Furniture Type ID: $FURNITURE_TYPE_ID"

# =============================================================================
# Step 1: Register provider company
# =============================================================================
step 1 "Register provider company"

PROVIDER_BODY=$(cat <<EOF
{
  "name": "E2E Umzug GmbH",
  "email": "e2e@umzug.de",
  "phoneNumber": "+49301234567",
  "taxNumber": "DE123456789",
  "supportedPostCodePrefixes": ["10", "12", "13"],
  "address": {
    "street": "Teststraße",
    "houseNumber": "42",
    "postCode": "10115",
    "placeName": "Berlin"
  }
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/e2e_provider.json -w "%{http_code}" \
  -X POST "$BASE_URL/providers" \
  -H "Content-Type: application/json" \
  -H "X-User-Role: provider" \
  -d "$PROVIDER_BODY")
assert_status 201 "$HTTP_CODE" "POST /providers"

PROVIDER_ID=$(jq -r '.data.id' /tmp/e2e_provider.json)
assert_field '.data.status' 'PENDING' "Provider status"
echo "  Provider ID: $PROVIDER_ID"

# =============================================================================
# Step 2: Create demand
# =============================================================================
step 2 "Create demand (Umzugsanfrage)"

DEMAND_BODY=$(cat <<EOF
{
  "serviceType": "PRIVATE_MOVE",
  "transportType": "LOCAL",
  "numberOfPeople": 2,
  "preferredDateStart": "2026-04-01T08:00:00Z",
  "preferredDateEnd": "2026-04-01T18:00:00Z",
  "additionalNotes": "E2E test demand",
  "from": {
    "address": {
      "street": "Alexanderplatz",
      "houseNumber": "1",
      "postCode": "10178",
      "placeName": "Berlin"
    },
    "estate": {
      "estateTypeId": "$ESTATE_TYPE_ID",
      "totalSquareMeters": 65,
      "numberOfRooms": 3,
      "elevatorType": "PERSONAL",
      "parts": [
        {
          "estatePartTypeId": "$PART_TYPE_ID",
          "furnitureItems": [
            { "furnitureTypeId": "$FURNITURE_TYPE_ID", "quantity": 1 }
          ]
        }
      ]
    }
  },
  "to": {
    "address": {
      "street": "Kurfürstendamm",
      "houseNumber": "100",
      "postCode": "10709",
      "placeName": "Berlin"
    },
    "estate": {
      "estateTypeId": "$ESTATE_TYPE_ID",
      "totalSquareMeters": 80,
      "numberOfRooms": 4,
      "elevatorType": "FREIGHT",
      "parts": [
        {
          "estatePartTypeId": "$PART_TYPE_ID",
          "furnitureItems": [
            { "furnitureTypeId": "$FURNITURE_TYPE_ID", "quantity": 1 }
          ]
        }
      ]
    }
  }
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/e2e_demand.json -w "%{http_code}" \
  -X POST "$BASE_URL/demands" \
  -H "Content-Type: application/json" \
  -d "$DEMAND_BODY")
assert_status 201 "$HTTP_CODE" "POST /demands"

DEMAND_ID=$(jq -r '.data.id' /tmp/e2e_demand.json)
assert_field '.data.status' 'PUBLISHED' "Demand status"
echo "  Demand ID: $DEMAND_ID"

# =============================================================================
# Step 3: Submit offer
# =============================================================================
step 3 "Submit offer"

OFFER_BODY=$(cat <<EOF
{
  "demandId": "$DEMAND_ID",
  "providerCompanyId": "$PROVIDER_ID",
  "totalPriceAmount": 85000,
  "message": "E2E test offer — 850 EUR inkl. Verpackung",
  "validUntil": "2026-03-20T23:59:59Z"
}
EOF
)

HTTP_CODE=$(curl -s -o /tmp/e2e_offer.json -w "%{http_code}" \
  -X POST "$BASE_URL/offers" \
  -H "Content-Type: application/json" \
  -H "X-User-Role: provider" \
  -d "$OFFER_BODY")
assert_status 201 "$HTTP_CODE" "POST /offers"

OFFER_ID=$(jq -r '.data.id' /tmp/e2e_offer.json)
assert_field '.data.status' 'SUBMITTED' "Offer status"
assert_field '.data.commissionRate' '0.04' "Commission rate"
echo "  Offer ID: $OFFER_ID"
echo "  Total: $(jq -r '.data.totalPriceAmount' /tmp/e2e_offer.json) cents"
echo "  Commission: $(jq -r '.data.commissionAmount' /tmp/e2e_offer.json) cents"
echo "  Provider net: $(jq -r '.data.providerNetAmount' /tmp/e2e_offer.json) cents"

# Verify demand status changed to OFFERED
HTTP_CODE=$(curl -s -o /tmp/e2e_demand_check.json -w "%{http_code}" "$BASE_URL/demands/$DEMAND_ID")
assert_status 200 "$HTTP_CODE" "GET /demands/:id"
assert_field '.data.status' 'OFFERED' "Demand status after offer"

# =============================================================================
# Step 4: Accept offer → auto-creates contract
# =============================================================================
step 4 "Accept offer"

HTTP_CODE=$(curl -s -o /tmp/e2e_accept.json -w "%{http_code}" \
  -X PATCH "$BASE_URL/offers/$OFFER_ID/accept" \
  -H "Content-Type: application/json")
assert_status 200 "$HTTP_CODE" "PATCH /offers/:id/accept"
assert_field '.data.status' 'ACCEPTED' "Offer status after accept"

# =============================================================================
# Step 5: Verify contract was auto-created
# =============================================================================
step 5 "Verify auto-created contract"

HTTP_CODE=$(curl -s -o /tmp/e2e_contracts.json -w "%{http_code}" "$BASE_URL/contracts")
assert_status 200 "$HTTP_CODE" "GET /contracts"

CONTRACT_ID=$(jq -r '.data.items[0].id' /tmp/e2e_contracts.json)
CONTRACT_STATUS=$(jq -r '.data.items[0].status' /tmp/e2e_contracts.json)

if [ "$CONTRACT_ID" != "null" ] && [ -n "$CONTRACT_ID" ]; then
  pass "Contract auto-created: $CONTRACT_ID"
  echo "  Contract status: $CONTRACT_STATUS"
else
  fail "No contract found after offer acceptance"
  exit 1
fi

# =============================================================================
# Step 6: Customer accepts contract
# =============================================================================
step 6 "Customer accepts contract"

HTTP_CODE=$(curl -s -o /tmp/e2e_cust_accept.json -w "%{http_code}" \
  -X PATCH "$BASE_URL/contracts/$CONTRACT_ID/customer-accept" \
  -H "Content-Type: application/json")
assert_status 200 "$HTTP_CODE" "PATCH /contracts/:id/customer-accept"
assert_field '.data.status' 'PENDING_PROVIDER' "Contract status after customer accept"

# =============================================================================
# Step 7: Provider accepts contract → ACTIVE
# =============================================================================
step 7 "Provider accepts contract"

HTTP_CODE=$(curl -s -o /tmp/e2e_prov_accept.json -w "%{http_code}" \
  -X PATCH "$BASE_URL/contracts/$CONTRACT_ID/provider-accept" \
  -H "Content-Type: application/json" \
  -H "X-User-Role: provider")
assert_status 200 "$HTTP_CODE" "PATCH /contracts/:id/provider-accept"
assert_field '.data.status' 'ACTIVE' "Contract status after both accept"

# =============================================================================
# Step 8: Verify final state
# =============================================================================
step 8 "Verify final state"

# Demand should be ACCEPTED
HTTP_CODE=$(curl -s -o /tmp/e2e_final_demand.json -w "%{http_code}" "$BASE_URL/demands/$DEMAND_ID")
BODY=$(cat /tmp/e2e_final_demand.json)
assert_status 200 "$HTTP_CODE" "GET /demands/:id (final)"
assert_field '.data.status' 'ACCEPTED' "Final demand status"

# Contract should be ACTIVE
HTTP_CODE=$(curl -s -o /tmp/e2e_final_contract.json -w "%{http_code}" "$BASE_URL/contracts/$CONTRACT_ID")
BODY=$(cat /tmp/e2e_final_contract.json)
assert_status 200 "$HTTP_CODE" "GET /contracts/:id (final)"
assert_field '.data.status' 'ACTIVE' "Final contract status"

# Check notifications were created
HTTP_CODE=$(curl -s -o /tmp/e2e_notifs.json -w "%{http_code}" "$BASE_URL/notifications")
assert_status 200 "$HTTP_CODE" "GET /notifications"
NOTIF_COUNT=$(jq -r '.data.total' /tmp/e2e_notifs.json)
echo "  Notifications created: $NOTIF_COUNT"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  E2E Happy Path Results"
echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo -e "\n${GREEN}🎉 Full happy path completed successfully!${NC}"
echo "  Provider: $PROVIDER_ID"
echo "  Demand:   $DEMAND_ID"
echo "  Offer:    $OFFER_ID"
echo "  Contract: $CONTRACT_ID (ACTIVE)"

# Cleanup temp files
rm -f /tmp/e2e_*.json
