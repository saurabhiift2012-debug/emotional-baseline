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

user_problem_statement: "TherapiShots emotional wellbeing app. This session: (1) Twilio Verify real SMS OTP restricted to Indian +91 numbers, (2) Razorpay real payments for 15-min psychologist calls, (3) Dark/Light/System theming across all screens, (4) custom TherapiShots logo on icon/splash + in-app."

backend:
  - task: "Twilio Verify OTP (Indian +91 only) — request-otp / verify-otp"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Replaced mock OTP with Twilio Verify. _ensure_indian_phone enforces 10-digit 6-9 start, normalises to +91. Test number +919999900000 uses static code 123456 (returns dev_code). Real numbers use Twilio Verify send/check. Verified locally: request+verify with test number returns token; invalid phone rejected 400."
  - task: "Razorpay order creation + signature verification for bookings"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /bookings/order creates real Razorpay order (verified locally, real order_id returned) + pending booking. POST /bookings/verify validates HMAC-SHA256 signature then confirms. list_bookings only returns confirmed/cancelled. Cannot complete real card payment via automation; test order creation + that verify rejects an invalid signature (400)."

frontend:
  - task: "Dark/Light/System theming across all screens"
    implemented: true
    working: true
    file: "frontend/src/ThemeContext.tsx, theme.ts, ui.tsx, all screens"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "New ThemeProvider (system/light/dark, persisted). ui.tsx primitives + all ~17 screens converted to makeStyles(colors)+useTheme. Appearance toggle in Me tab. Verified via screenshot: Me screen toggled to dark correctly (tab bar, cards, switches all themed)."
  - task: "Razorpay WebView checkout flow on psychologist detail"
    implemented: true
    working: "NA"
    file: "frontend/src/RazorpayCheckout.tsx, app/psychologist/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Pay now -> /bookings/order -> RazorpayCheckout WebView (checkout.js) -> onSuccess -> /bookings/verify -> confirmation. Needs verification that order call fires and checkout modal opens."
  - task: "TherapiShots logo (icon/splash + onboarding/login/register)"
    implemented: true
    working: true
    file: "frontend/app.json, src/Logo.tsx, onboarding/login/register"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Logo mark on icon/splash/adaptive/favicon. Logo component shown on onboarding + auth. Verified via screenshot on onboarding."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Twilio Verify OTP (Indian +91 only) — request-otp / verify-otp"
    - "Razorpay order creation + signature verification for bookings"
    - "Razorpay WebView checkout flow on psychologist detail"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Please test: (A) BACKEND — OTP flow with test number +919999900000 / code 123456 (request-otp returns dev_code, verify-otp returns token+user); Indian phone validation rejects non-Indian/short numbers (400); auth-protected endpoints work with token; /bookings/order returns real Razorpay order (order_id, key_id, amount) for a valid psychologist+slot+15-min Call; /bookings/verify rejects an invalid signature (400). (B) FRONTEND — login with demo number lands on Today; Me tab Appearance toggle switches Light/Dark/System and persists; navigating to a psychologist and tapping 'Pay now' calls /bookings/order and opens the Razorpay checkout WebView (do NOT attempt to complete a real card payment). Credentials in /app/memory/test_credentials.md. Razorpay is TEST mode."
