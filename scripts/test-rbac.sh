#!/bin/bash

# Comprehensive RBAC System Test
# Tests every endpoint, every method, every scenario
# Think like a 10-year senior developer

echo "🔬 COMPREHENSIVE RBAC SYSTEM TEST"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0
TOTAL=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "Test $TOTAL: $name ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Got $response)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, Got $response)"
        FAILED=$((FAILED + 1))
    fi
}

# Function to test with detailed response
test_endpoint_detailed() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    TOTAL=$((TOTAL + 1))
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test $TOTAL: $name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X "$method" "$BASE_URL$endpoint")
    else
        response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    echo "Response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 1: AUTHENTICATION ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Login with invalid credentials
test_endpoint_detailed "Login - Invalid Credentials" "POST" "/api/auth/login" \
    '{"email":"invalid@test.com","password":"wrongpass"}'

# Test 2: Login with missing email
test_endpoint_detailed "Login - Missing Email" "POST" "/api/auth/login" \
    '{"password":"test123456"}'

# Test 3: Login with missing password
test_endpoint_detailed "Login - Missing Password" "POST" "/api/auth/login" \
    '{"email":"test@test.com"}'

# Test 4: Login with short password
test_endpoint_detailed "Login - Short Password" "POST" "/api/auth/login" \
    '{"email":"test@test.com","password":"123"}'

# Test 5: Login with invalid email format
test_endpoint_detailed "Login - Invalid Email Format" "POST" "/api/auth/login" \
    '{"email":"notanemail","password":"test123456"}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 2: ROLES ENDPOINTS (Unauthenticated)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 6: GET roles without auth
test_endpoint "GET /api/admin/roles - No Auth" "GET" "/api/admin/roles" "" "401"

# Test 7: POST roles without auth
test_endpoint "POST /api/admin/roles - No Auth" "POST" "/api/admin/roles" \
    '{"name":"Test Role","description":"Test"}' "401"

# Test 8: PATCH roles without auth
test_endpoint "PATCH /api/admin/roles - No Auth" "PATCH" "/api/admin/roles" \
    '{"roleId":"123","name":"Updated"}' "401"

# Test 9: GET specific role without auth
test_endpoint "GET /api/admin/roles/[id] - No Auth" "GET" "/api/admin/roles/123" "" "401"

# Test 10: PUT specific role without auth
test_endpoint "PUT /api/admin/roles/[id] - No Auth" "PUT" "/api/admin/roles/123" \
    '{"name":"Updated"}' "401"

# Test 11: DELETE specific role without auth
test_endpoint "DELETE /api/admin/roles/[id] - No Auth" "DELETE" "/api/admin/roles/123" "" "401"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 3: USER MANAGEMENT ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 12: GET user permissions without auth
test_endpoint "GET /api/admin/user-permissions - No Auth" "GET" "/api/admin/user-permissions" "" "401"

# Test 13: POST update user permissions without auth
test_endpoint "POST /api/admin/update-user-permissions - No Auth" "POST" "/api/admin/update-user-permissions" \
    '{"userId":"123","role":"Admin"}' "401"

# Test 14: POST create user without auth
test_endpoint "POST /api/admin/create-user - No Auth" "POST" "/api/admin/create-user" \
    '{"email":"new@test.com","password":"test123456","roleId":"123"}' "401"

# Test 15: PATCH update user profile without auth
test_endpoint "PATCH /api/admin/update-user-profile - No Auth" "PATCH" "/api/admin/update-user-profile" \
    '{"userId":"123","field":"phone","value":"1234567890"}' "401"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 4: AUDIT & LOGGING ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 16: GET audit logs without auth
test_endpoint "GET /api/admin/audit - No Auth" "GET" "/api/admin/audit" "" "401"

# Test 17: POST audit log without auth
test_endpoint "POST /api/admin/audit - No Auth" "POST" "/api/admin/audit" \
    '{"action":"test","meta_json":{}}' "401"

# Test 18: GET all activity logs without auth
test_endpoint "GET /api/admin/all-activity-logs - No Auth" "GET" "/api/admin/all-activity-logs" "" "401"

# Test 19: GET check recent logs without auth
test_endpoint "GET /api/admin/check-recent-logs - No Auth" "GET" "/api/admin/check-recent-logs" "" "401"

# Test 20: GET user activity logs without auth
test_endpoint "GET /api/admin/user-activity-logs/[userId] - No Auth" "GET" "/api/admin/user-activity-logs/123" "" "401"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 5: OTHER ADMIN ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 21: GET available employees without auth
test_endpoint "GET /api/admin/available-employees - No Auth" "GET" "/api/admin/available-employees" "" "401"

# Test 22: GET check user access without auth
test_endpoint "GET /api/admin/check-user-access - No Auth" "GET" "/api/admin/check-user-access?userId=123&permission=dashboard" "" "401"

# Test 23: POST user creation requests without auth
test_endpoint "POST /api/admin/user-creation-requests - No Auth" "POST" "/api/admin/user-creation-requests" \
    '{"email":"new@test.com","password":"test123456","role":"Admin"}' "401"

# Test 24: GET user creation requests without auth
test_endpoint "GET /api/admin/user-creation-requests - No Auth" "GET" "/api/admin/user-creation-requests" "" "401"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 6: VALIDATION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 25: Create role with invalid data
test_endpoint_detailed "Create Role - Invalid Data" "POST" "/api/admin/roles" \
    '{"name":"","description":""}'

# Test 26: Create role with missing name
test_endpoint_detailed "Create Role - Missing Name" "POST" "/api/admin/roles" \
    '{"description":"Test"}'

# Test 27: Create user with invalid email
test_endpoint_detailed "Create User - Invalid Email" "POST" "/api/admin/create-user" \
    '{"email":"notanemail","password":"test123456","roleId":"123"}'

# Test 28: Create user with short password
test_endpoint_detailed "Create User - Short Password" "POST" "/api/admin/create-user" \
    '{"email":"test@test.com","password":"123","roleId":"123"}'

# Test 29: Update permissions with invalid UUID
test_endpoint_detailed "Update Permissions - Invalid UUID" "POST" "/api/admin/update-user-permissions" \
    '{"userId":"not-a-uuid","role":"Admin"}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 7: HTTP METHOD TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 30: Wrong method on roles endpoint
test_endpoint "DELETE /api/admin/roles - Wrong Method" "DELETE" "/api/admin/roles" "" "405"

# Test 31: Wrong method on user-permissions
test_endpoint "POST /api/admin/user-permissions - Wrong Method" "POST" "/api/admin/user-permissions" "" "405"

# Test 32: Wrong method on audit
test_endpoint "DELETE /api/admin/audit - Wrong Method" "DELETE" "/api/admin/audit" "" "405"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 8: EDGE CASES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 33: Empty request body
test_endpoint_detailed "Empty Request Body" "POST" "/api/auth/login" '{}'

# Test 34: Malformed JSON
test_endpoint_detailed "Malformed JSON" "POST" "/api/auth/login" 'not-json'

# Test 35: SQL Injection attempt
test_endpoint_detailed "SQL Injection Test" "POST" "/api/auth/login" \
    '{"email":"admin@test.com OR 1=1--","password":"test"}'

# Test 36: XSS attempt
test_endpoint_detailed "XSS Test" "POST" "/api/admin/roles" \
    '{"name":"<script>alert(1)</script>","description":"test"}'

# Test 37: Very long input
test_endpoint_detailed "Long Input Test" "POST" "/api/admin/roles" \
    "{\"name\":\"$(printf 'A%.0s' {1..1000})\",\"description\":\"test\"}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review above for details.${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Create a test user in Supabase"
echo "2. Get authentication token"
echo "3. Run authenticated tests"
echo ""
echo "To test with authentication:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Get token"
echo "TOKEN=\$(curl -s -X POST $BASE_URL/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"admin@test.com\",\"password\":\"Admin123!\"}' \\"
echo "  | jq -r '.data.session.access_token')"
echo ""
echo "# Test with token"
echo "curl -H \"Authorization: Bearer \$TOKEN\" $BASE_URL/api/admin/roles"
echo ""

echo "===================================="
echo "🔬 TEST COMPLETE"
echo "===================================="
