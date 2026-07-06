#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  V4 rebrand PitchFinder -> MatchUp. Add: dark/light theme, keyboard input focus fix (critical UX),
  friends system, polls in chat, chat photo sharing, share group link, leave group, clickable profiles,
  post-match ratings, security OTP/MFA screens, legal pages, map view (react-native-maps native / mock web).

backend:
  - task: "Auth login/register + Google + push register"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Already covered in V1/V2 tests. Demo users now under @matchup.app emails."

  - task: "Friends system (request / accept / decline / remove / list / status)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Backend endpoints added in V4 backend pass — needs full integration test."

  - task: "Polls in chat (create via /messages with poll payload, vote via /messages/{id}/poll/vote)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Message.type=poll with poll.question, poll.options[], poll.votes{}. Verify single-vote per user + vote update."

  - task: "Match ratings (POST /matches/{id}/ratings, GET /matches/{id}/ratings/mine)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Level/punctuality/fairplay 1-5 per player. Rating self should fail."

  - task: "Leave group (POST /groups/{id}/leave)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Removes membership; admin cannot leave own group (or transfers?). Verify behavior."

  - task: "OTP security (request + verify email/phone/mfa; dev accepts 000000)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "requestOtp + verifyOtp for email/phone/mfa. Dev code 000000."

  - task: "Change password (POST /users/me/password)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Requires current+new. Enforce >=6 chars."

frontend:
  - task: "Keyboard input focus (chat + forms) via react-native-keyboard-controller"
    implemented: true
    working: "NA"
    file: "frontend/app/_layout.tsx, frontend/app/chat/[id].tsx, frontend/app/(auth)/sign-in.tsx, sign-up.tsx, create-group.tsx, edit-profile.tsx, security.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "KeyboardProvider at root, KeyboardAwareScrollView for forms, KeyboardAvoidingView + keyboardDidShow auto-scroll in chat. Input must never be hidden by keyboard on any screen."

  - task: "Group detail V4 wiring (Share modal, Leave with confirm, Field location card, clickable members, Rating trigger)"
    implemented: true
    working: "NA"
    file: "frontend/app/group/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Menu opens with 5 items (Share/Leave/Rate/Report/Block). Location card opens Google Maps link. Member avatars route to /profile/[id]."

  - task: "Chat V4 (Poll create + vote, Photo attach with permissions, Location button, Clickable avatars)"
    implemented: true
    working: "NA"
    file: "frontend/app/chat/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PollComposer + PollCard wired. Image picker with graceful denied+settings fallback. keyboardDidShow scrolls list to bottom."

  - task: "Map screen (native maps on iOS/Android via platform-split component, mock on web)"
    implemented: true
    working: true
    file: "frontend/app/map.tsx, frontend/src/components/NativeMap.native.tsx, NativeMap.web.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Verified in browser preview — mock renders with pins + list of groups. Real map requires native build."

  - task: "Security screen (OTP request/verify + password change)"
    implemented: true
    working: "NA"
    file: "frontend/app/security.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Uses KeyboardAwareScrollView. In dev accepts 000000."

metadata:
  created_by: "main_agent"
  version: "4.0"
  test_sequence: 4
  run_ui: false

test_plan:
  current_focus:
    - "Friends system (request / accept / decline / remove / list / status)"
    - "Polls in chat (create via /messages with poll payload, vote via /messages/{id}/poll/vote)"
    - "Match ratings (POST /matches/{id}/ratings, GET /matches/{id}/ratings/mine)"
    - "Leave group (POST /groups/{id}/leave)"
    - "OTP security (request + verify email/phone/mfa; dev accepts 000000)"
    - "Change password (POST /users/me/password)"
    - "Group detail V4 wiring (Share modal, Leave with confirm, Field location card, clickable members, Rating trigger)"
    - "Chat V4 (Poll create + vote, Photo attach with permissions, Location button, Clickable avatars)"
    - "Keyboard input focus (chat + forms) via react-native-keyboard-controller"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      V4 wave complete: rebrand + keyboard fix + polls + photos + share/leave + ratings + map + security.
      Please test the V4 backend endpoints listed under `current_focus`, then the frontend flows.
      Test creds: demo@matchup.app / demo1234 (also sarah/leo/tom @matchup.app).
      Dev OTP code: 000000 for email/phone/mfa.
      For frontend: verify (a) chat input remains visible when keyboard opens on any TextInput screen,
      (b) group detail menu shows Share/Leave/Rate/Report/Block, (c) leave group prompts confirm alert,
      (d) tapping a chat avatar navigates to /profile/[id], (e) polls can be created & voted,
      (f) map screen renders (web mock is fine — react-native-maps needs a native build).
