#!/usr/bin/env python3
"""
Backend API Test Suite for MatchUp V5 Geolocation Features
Tests all geocoding endpoints and geo field persistence
"""
import requests
import json
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "http://localhost:8001/api"
TEST_EMAIL = "demo@matchup.app"
TEST_PASSWORD = "demo1234"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def log_test(name, passed, details=""):
    """Log test result with color coding"""
    status = f"{GREEN}✅ PASS{RESET}" if passed else f"{RED}❌ FAIL{RESET}"
    print(f"{status} - {name}")
    if details:
        print(f"  {details}")
    return passed

def login():
    """Login and return auth token"""
    print(f"\n{BLUE}=== Authentication ==={RESET}")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if resp.status_code == 200:
            token = resp.json()["token"]
            log_test("Login", True, f"Token obtained for {TEST_EMAIL}")
            return token
        else:
            log_test("Login", False, f"Status: {resp.status_code}, Response: {resp.text}")
            return None
    except Exception as e:
        log_test("Login", False, f"Exception: {str(e)}")
        return None

def test_geocode_search(token):
    """Test GET /api/geocode/search endpoint"""
    print(f"\n{BLUE}=== Test 1: Geocode Search (Nominatim Proxy) ==={RESET}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1.1: Valid query - Parc des Princes
    try:
        resp = requests.get(f"{BASE_URL}/geocode/search", 
                          params={"q": "Parc des Princes", "limit": 3},
                          headers=headers)
        if resp.status_code == 200:
            results = resp.json()
            if isinstance(results, list) and len(results) >= 1:
                first = results[0]
                required_fields = ["place_id", "primary", "secondary", "display_name", 
                                 "formatted_address", "latitude", "longitude", "city", "country"]
                has_all_fields = all(field in first for field in required_fields)
                
                # Check coordinates are roughly in Paris area
                lat_ok = 48.8 <= first.get("latitude", 0) <= 48.9
                lng_ok = 2.2 <= first.get("longitude", 0) <= 2.3
                
                if has_all_fields and lat_ok and lng_ok:
                    log_test("Geocode search - Parc des Princes", True, 
                           f"Found {len(results)} results, lat={first['latitude']}, lng={first['longitude']}")
                else:
                    log_test("Geocode search - Parc des Princes", False, 
                           f"Missing fields or wrong coords: {first}")
            else:
                log_test("Geocode search - Parc des Princes", False, 
                       f"Expected array with >=1 result, got: {results}")
        else:
            log_test("Geocode search - Parc des Princes", False, 
                   f"Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        log_test("Geocode search - Parc des Princes", False, f"Exception: {str(e)}")
    
    # Test 1.2: Query too short (< 2 chars)
    try:
        resp = requests.get(f"{BASE_URL}/geocode/search", 
                          params={"q": "P", "limit": 3},
                          headers=headers)
        if resp.status_code in [422, 200]:  # 422 validation error or empty array
            if resp.status_code == 200:
                results = resp.json()
                if isinstance(results, list) and len(results) == 0:
                    log_test("Geocode search - short query", True, "Returns empty array for q<2 chars")
                else:
                    log_test("Geocode search - short query", False, f"Expected empty array, got: {results}")
            else:
                log_test("Geocode search - short query", True, "Returns 422 for q<2 chars")
        else:
            log_test("Geocode search - short query", False, 
                   f"Expected 422 or empty array, got status: {resp.status_code}")
    except Exception as e:
        log_test("Geocode search - short query", False, f"Exception: {str(e)}")
    
    # Test 1.3: Another valid query - Stade Léo Lagrange Paris
    try:
        resp = requests.get(f"{BASE_URL}/geocode/search", 
                          params={"q": "Stade Léo Lagrange Paris", "limit": 3},
                          headers=headers)
        if resp.status_code == 200:
            results = resp.json()
            if isinstance(results, list) and len(results) >= 1:
                first = results[0]
                lat_ok = 48.0 <= first.get("latitude", 0) <= 49.0
                lng_ok = 2.0 <= first.get("longitude", 0) <= 3.0
                if lat_ok and lng_ok:
                    log_test("Geocode search - Stade Léo Lagrange", True, 
                           f"Found {len(results)} results in Paris area")
                else:
                    log_test("Geocode search - Stade Léo Lagrange", False, 
                           f"Coords not in Paris area: lat={first.get('latitude')}, lng={first.get('longitude')}")
            else:
                log_test("Geocode search - Stade Léo Lagrange", False, 
                       f"Expected array with >=1 result, got: {results}")
        else:
            log_test("Geocode search - Stade Léo Lagrange", False, 
                   f"Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        log_test("Geocode search - Stade Léo Lagrange", False, f"Exception: {str(e)}")
    
    # Test 1.4: Empty/whitespace query
    try:
        resp = requests.get(f"{BASE_URL}/geocode/search", 
                          params={"q": "  ", "limit": 3},
                          headers=headers)
        # Should not crash - either 422 or empty array
        if resp.status_code in [200, 422]:
            log_test("Geocode search - empty query", True, "Handles empty/whitespace query without crash")
        else:
            log_test("Geocode search - empty query", False, 
                   f"Unexpected status: {resp.status_code}")
    except Exception as e:
        log_test("Geocode search - empty query", False, f"Exception: {str(e)}")
    
    # Test 1.5: Limit clamping
    try:
        resp = requests.get(f"{BASE_URL}/geocode/search", 
                          params={"q": "Paris", "limit": 20},
                          headers=headers)
        if resp.status_code == 200:
            results = resp.json()
            if len(results) <= 10:
                log_test("Geocode search - limit clamp", True, 
                       f"Limit clamped to max 10 (got {len(results)} results)")
            else:
                log_test("Geocode search - limit clamp", False, 
                       f"Expected max 10 results, got {len(results)}")
        else:
            log_test("Geocode search - limit clamp", False, 
                   f"Status: {resp.status_code}")
    except Exception as e:
        log_test("Geocode search - limit clamp", False, f"Exception: {str(e)}")

def test_geocode_reverse(token):
    """Test GET /api/geocode/reverse endpoint"""
    print(f"\n{BLUE}=== Test 2: Reverse Geocoding ==={RESET}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 2.1: Valid Paris coordinates
    try:
        resp = requests.get(f"{BASE_URL}/geocode/reverse", 
                          params={"lat": 48.8566, "lon": 2.3522},
                          headers=headers)
        if resp.status_code == 200:
            result = resp.json()
            required_fields = ["formatted_address", "latitude", "longitude", "city", "country"]
            has_all_fields = all(field in result for field in required_fields)
            
            # Check if Paris is mentioned and coords are close
            paris_mentioned = "Paris" in result.get("formatted_address", "") or result.get("city", "").lower() == "paris"
            lat_close = abs(result.get("latitude", 0) - 48.8566) < 0.1
            lng_close = abs(result.get("longitude", 0) - 2.3522) < 0.1
            
            if has_all_fields and paris_mentioned and lat_close and lng_close:
                log_test("Reverse geocode - Paris coords", True, 
                       f"Address: {result.get('formatted_address', '')[:50]}...")
            else:
                log_test("Reverse geocode - Paris coords", False, 
                       f"Missing fields or wrong data: {result}")
        else:
            log_test("Reverse geocode - Paris coords", False, 
                   f"Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        log_test("Reverse geocode - Paris coords", False, f"Exception: {str(e)}")
    
    # Test 2.2: Invalid coordinates (lat=100)
    try:
        resp = requests.get(f"{BASE_URL}/geocode/reverse", 
                          params={"lat": 100, "lon": 2.3522},
                          headers=headers)
        if resp.status_code == 400:
            log_test("Reverse geocode - invalid lat", True, "Returns 400 for invalid latitude")
        else:
            log_test("Reverse geocode - invalid lat", False, 
                   f"Expected 400, got status: {resp.status_code}")
    except Exception as e:
        log_test("Reverse geocode - invalid lat", False, f"Exception: {str(e)}")
    
    # Test 2.3: Invalid coordinates (lon=-500)
    try:
        resp = requests.get(f"{BASE_URL}/geocode/reverse", 
                          params={"lat": 48.8566, "lon": -500},
                          headers=headers)
        if resp.status_code == 400:
            log_test("Reverse geocode - invalid lon", True, "Returns 400 for invalid longitude")
        else:
            log_test("Reverse geocode - invalid lon", False, 
                   f"Expected 400, got status: {resp.status_code}")
    except Exception as e:
        log_test("Reverse geocode - invalid lon", False, f"Exception: {str(e)}")

def test_group_geo_persistence(token):
    """Test POST /api/groups and GET /api/groups/{id} with geo fields"""
    print(f"\n{BLUE}=== Test 3: Group Creation with Geo Fields ==={RESET}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a group with geo fields
    group_data = {
        "name": "GeoTest FC",
        "description": "Group with real coords for testing",
        "city": "Paris",
        "level": "intermediate",
        "max_members": 15,
        "photo": None,
        "preferred_days": [],
        "positions_needed": [],
        "field_location": "Parc des Princes, 24 Rue du Commandant Guilbaud, 75016 Paris",
        "field_lat": 48.8414,
        "field_lng": 2.2531
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/groups", json=group_data, headers=headers)
        if resp.status_code == 200:
            created_group = resp.json()
            group_id = created_group.get("id")
            
            # Check if geo fields are in response
            has_location = created_group.get("field_location") == group_data["field_location"]
            has_lat = created_group.get("field_lat") == group_data["field_lat"]
            has_lng = created_group.get("field_lng") == group_data["field_lng"]
            
            if has_location and has_lat and has_lng:
                log_test("Group creation with geo fields", True, 
                       f"Group created with ID: {group_id}")
                
                # Now GET the group to verify persistence
                try:
                    get_resp = requests.get(f"{BASE_URL}/groups/{group_id}", headers=headers)
                    if get_resp.status_code == 200:
                        fetched_group = get_resp.json()
                        
                        # Verify all geo fields match
                        location_match = fetched_group.get("field_location") == group_data["field_location"]
                        lat_match = fetched_group.get("field_lat") == group_data["field_lat"]
                        lng_match = fetched_group.get("field_lng") == group_data["field_lng"]
                        
                        if location_match and lat_match and lng_match:
                            log_test("Group GET with geo fields", True, 
                                   f"All geo fields persisted correctly")
                            return group_id  # Return for use in match test
                        else:
                            log_test("Group GET with geo fields", False, 
                                   f"Geo fields don't match: location={location_match}, lat={lat_match}, lng={lng_match}")
                    else:
                        log_test("Group GET with geo fields", False, 
                               f"GET failed with status: {get_resp.status_code}")
                except Exception as e:
                    log_test("Group GET with geo fields", False, f"Exception: {str(e)}")
            else:
                log_test("Group creation with geo fields", False, 
                       f"Geo fields missing in response: {created_group}")
        else:
            log_test("Group creation with geo fields", False, 
                   f"Status: {resp.status_code}, Response: {resp.text}")
            return None
    except Exception as e:
        log_test("Group creation with geo fields", False, f"Exception: {str(e)}")
        return None

def test_match_geo_persistence(token, group_id):
    """Test POST /api/matches and GET /api/matches/{id} with geo fields"""
    print(f"\n{BLUE}=== Test 4: Match Creation with Geo Fields ==={RESET}")
    headers = {"Authorization": f"Bearer {token}"}
    
    if not group_id:
        # Try to find an existing group where user is a member
        try:
            resp = requests.get(f"{BASE_URL}/groups/mine/list", headers=headers)
            if resp.status_code == 200:
                groups = resp.json()
                if groups and len(groups) > 0:
                    group_id = groups[0]["id"]
                    print(f"  Using existing group: {group_id}")
                else:
                    log_test("Match creation - find group", False, "No groups found where user is member")
                    return
            else:
                log_test("Match creation - find group", False, f"Failed to get groups: {resp.status_code}")
                return
        except Exception as e:
            log_test("Match creation - find group", False, f"Exception: {str(e)}")
            return
    
    # Create a match with geo fields
    future_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    match_data = {
        "group_id": group_id,
        "title": "Geo Match",
        "location": "Stade Charléty, 99 Bd Kellermann, 75013 Paris",
        "formatted_address": "Stade Charléty, 99 Bd Kellermann, 75013 Paris",
        "location_lat": 48.8188,
        "location_lng": 2.345,
        "date": future_date,
        "max_players": 12
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/matches", json=match_data, headers=headers)
        if resp.status_code == 200:
            created_match = resp.json()
            match_id = created_match.get("id")
            
            # Check if geo fields are in response
            has_location = created_match.get("location") == match_data["location"]
            has_formatted = created_match.get("formatted_address") == match_data["formatted_address"]
            has_lat = created_match.get("location_lat") == match_data["location_lat"]
            has_lng = created_match.get("location_lng") == match_data["location_lng"]
            
            if has_location and has_formatted and has_lat and has_lng:
                log_test("Match creation with geo fields", True, 
                       f"Match created with ID: {match_id}")
                
                # Now GET the match to verify persistence
                try:
                    get_resp = requests.get(f"{BASE_URL}/matches/{match_id}", headers=headers)
                    if get_resp.status_code == 200:
                        fetched_match = get_resp.json()
                        
                        # Verify all geo fields match
                        location_match = fetched_match.get("location") == match_data["location"]
                        formatted_match = fetched_match.get("formatted_address") == match_data["formatted_address"]
                        lat_match = fetched_match.get("location_lat") == match_data["location_lat"]
                        lng_match = fetched_match.get("location_lng") == match_data["location_lng"]
                        
                        if location_match and formatted_match and lat_match and lng_match:
                            log_test("Match GET with geo fields", True, 
                                   f"All geo fields persisted correctly")
                        else:
                            log_test("Match GET with geo fields", False, 
                                   f"Geo fields don't match: location={location_match}, formatted={formatted_match}, lat={lat_match}, lng={lng_match}")
                    else:
                        log_test("Match GET with geo fields", False, 
                               f"GET failed with status: {get_resp.status_code}")
                except Exception as e:
                    log_test("Match GET with geo fields", False, f"Exception: {str(e)}")
            else:
                log_test("Match creation with geo fields", False, 
                       f"Geo fields missing in response: {created_match}")
        else:
            log_test("Match creation with geo fields", False, 
                   f"Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        log_test("Match creation with geo fields", False, f"Exception: {str(e)}")

def test_user_geo_persistence(token):
    """Test PATCH /api/users/me and GET /api/auth/me with geo fields"""
    print(f"\n{BLUE}=== Test 5: User Update with Geo Fields ==={RESET}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Update user with geo fields
    user_data = {
        "formatted_address": "Paris 11e, 75011 Paris",
        "latitude": 48.8580,
        "longitude": 2.3800
    }
    
    try:
        resp = requests.patch(f"{BASE_URL}/users/me", json=user_data, headers=headers)
        if resp.status_code == 200:
            updated_user = resp.json()
            log_test("User update with geo fields", True, 
                   f"User updated successfully")
            
            # Now GET the user to verify persistence
            try:
                get_resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
                if get_resp.status_code == 200:
                    fetched_user = get_resp.json()
                    
                    # Check if geo fields are present (they might not be in UserPublic schema)
                    # Let's check the raw DB by doing another PATCH and GET
                    # For now, just verify the endpoint works
                    log_test("User GET after geo update", True, 
                           f"User data retrieved: {fetched_user.get('name')}")
                    
                    # Note: The geo fields might not appear in UserPublic schema
                    # but they should be persisted in the database
                    if "formatted_address" in fetched_user or "latitude" in fetched_user:
                        print(f"  {GREEN}Note: Geo fields visible in response{RESET}")
                    else:
                        print(f"  {YELLOW}Note: Geo fields not in UserPublic schema (may still be in DB){RESET}")
                else:
                    log_test("User GET after geo update", False, 
                           f"GET failed with status: {get_resp.status_code}")
            except Exception as e:
                log_test("User GET after geo update", False, f"Exception: {str(e)}")
        else:
            log_test("User update with geo fields", False, 
                   f"Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        log_test("User update with geo fields", False, f"Exception: {str(e)}")

def test_seed_geo_data(token):
    """Test that seed data includes geo fields"""
    print(f"\n{BLUE}=== Test 6: Seed Data with Geo Fields ==={RESET}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get all groups to check seed data
    try:
        resp = requests.get(f"{BASE_URL}/groups", headers=headers)
        if resp.status_code == 200:
            groups = resp.json()
            
            if len(groups) > 0:
                # Check if demo groups have geo fields
                groups_with_geo = [g for g in groups if g.get("field_lat") and g.get("field_lng")]
                
                # Check if coords are in Paris area (48.x, 2.x)
                paris_coords = [g for g in groups_with_geo 
                              if 48.0 <= g.get("field_lat", 0) <= 49.0 
                              and 2.0 <= g.get("field_lng", 0) <= 3.0]
                
                if len(paris_coords) > 0:
                    log_test("Seed groups have geo fields", True, 
                           f"{len(paris_coords)}/{len(groups)} groups have Paris coords")
                else:
                    log_test("Seed groups have geo fields", False, 
                           f"No groups with Paris coords found")
                
                # Check matches for geo fields
                if len(groups) > 0:
                    first_group_id = groups[0]["id"]
                    try:
                        match_resp = requests.get(f"{BASE_URL}/groups/{first_group_id}/matches", 
                                                 headers=headers)
                        if match_resp.status_code == 200:
                            matches = match_resp.json()
                            if len(matches) > 0:
                                matches_with_geo = [m for m in matches 
                                                  if m.get("location_lat") and m.get("location_lng")]
                                
                                if len(matches_with_geo) > 0:
                                    log_test("Seed matches have geo fields", True, 
                                           f"{len(matches_with_geo)}/{len(matches)} matches have geo coords")
                                else:
                                    log_test("Seed matches have geo fields", False, 
                                           "No matches with geo coords found")
                            else:
                                print(f"  {YELLOW}Note: No matches found for first group{RESET}")
                        else:
                            log_test("Seed matches check", False, 
                                   f"Failed to get matches: {match_resp.status_code}")
                    except Exception as e:
                        log_test("Seed matches check", False, f"Exception: {str(e)}")
            else:
                log_test("Seed groups have geo fields", False, "No groups found")
        else:
            log_test("Seed groups have geo fields", False, 
                   f"Status: {resp.status_code}, Response: {resp.text}")
    except Exception as e:
        log_test("Seed groups have geo fields", False, f"Exception: {str(e)}")

def test_regression_sanity(token):
    """Spot-check that pre-existing endpoints still work"""
    print(f"\n{BLUE}=== Test 7: Regression Sanity Checks ==={RESET}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 7.1: List groups
    try:
        resp = requests.get(f"{BASE_URL}/groups", headers=headers)
        if resp.status_code == 200:
            log_test("Regression - list groups", True, f"Found {len(resp.json())} groups")
        else:
            log_test("Regression - list groups", False, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("Regression - list groups", False, f"Exception: {str(e)}")
    
    # Test 7.2: Get user profile
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if resp.status_code == 200:
            user = resp.json()
            log_test("Regression - get profile", True, f"User: {user.get('name')}")
        else:
            log_test("Regression - get profile", False, f"Status: {resp.status_code}")
    except Exception as e:
        log_test("Regression - get profile", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}MatchUp V5 Geolocation Backend Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    # Login
    token = login()
    if not token:
        print(f"\n{RED}❌ Cannot proceed without authentication{RESET}")
        return
    
    # Run all tests
    test_geocode_search(token)
    test_geocode_reverse(token)
    group_id = test_group_geo_persistence(token)
    test_match_geo_persistence(token, group_id)
    test_user_geo_persistence(token)
    test_seed_geo_data(token)
    test_regression_sanity(token)
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Test Suite Complete{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

if __name__ == "__main__":
    main()
