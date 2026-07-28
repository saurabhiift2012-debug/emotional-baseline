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

user_problem_statement: "Real-time appointment booking workflow (Phase 1) on MongoDB+FastAPI (no Supabase). Booking creates an appointment + reserves the slot atomically (idempotent, no double-book), processes Razorpay payment, routes to the assigned psychologist. New in-app Psychologist mode (phone+OTP login) shows bookings in realtime (WebSocket) with Accept/Decline/Reschedule. User is notified of every status change via in-app notifications + push (Emergent-managed). Notification delivery attempts/failures recorded in an audit log. Admin can add/manage multiple doctors, each with their own login phone that receives notifications. Deferred: email, calendar invites, reminders."

backend:
  - task: "Atomic + idempotent slot booking (no double-book under concurrency)"
    implemented: true
    working: true
    file: "backend/routes/bookings.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "POST /bookings/order reserves the slot via unique index on slot_locks(psychologist_id,slot_id). Verified by curl: 2nd concurrent order for same slot -> 409; replay with same idempotency_key -> same booking_id. Razorpay order failure releases the lock. verify-otp signature check unchanged; on success status becomes awaiting_confirmation and notifies psychologist + user."
  - task: "Psychologist portal: /psy/bookings, accept, decline, reschedule (role-gated)"
    implemented: true
    working: true
    file: "backend/routes/psy.py, backend/security.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "get_psychologist dependency (role=psychologist). Seeded Dr. Ruchi login +919999900001 / 123456. Integration test: psy sees a seeded awaiting_confirmation booking, accept -> status accepted, user gets in-app notification 'Your session is confirmed', audit has in_app=success + push=failure (placeholder key). Decline releases slot lock; reschedule moves lock atomically."
  - task: "Notifications + audit log (in-app + realtime + push) with delivery audit"
    implemented: true
    working: true
    file: "backend/services/notifications.py, backend/routes/notifications.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "notify_user writes in-app notification, broadcasts over WS, attempts push, and records EVERY channel attempt in notification_audit (success/failure). GET /notifications, unread-count, read, read-all implemented + verified."
  - task: "Realtime WebSocket endpoint /api/ws?token=JWT"
    implemented: true
    working: "NA"
    file: "backend/routes/ws.py, backend/services/realtime.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "JWT via query param; ConnectionManager keyed by user_id. Broadcasts booking_new/booking_updated/notification. Needs verification that WS upgrade works through the ingress proxy; REST refetch-on-focus is the fallback."
  - task: "Admin psychologist CRUD (add doctors with own login phone)"
    implemented: true
    working: true
    file: "backend/routes/admin.py, backend/services/psychologists.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: true
          agent: "main"
          comment: "GET/POST/PUT/DELETE /admin/psychologists (admin-token). Creating a doctor links a user account (role=psychologist) to their login phone so they can log in + receive booking alerts. seed_psychologists made non-destructive (won't delete admin-added doctors on restart)."
  - task: "Push register relay /api/register-push (Emergent-managed)"
    implemented: true
    working: "NA"
    file: "backend/routes/push.py, backend/services/push.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Backend relay per Emergent push playbook. EMERGENT_PUSH_KEY=placeholder (deployer replaces at build). Push delivery only works on real device builds — cannot be validated in preview; audit records push=failure with placeholder, which is expected."

frontend:
  - task: "Psychologist dashboard screen (realtime + accept/decline/reschedule)"
    implemented: true
    working: "NA"
    file: "frontend/app/psy-dashboard.tsx, frontend/app/login.tsx, frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Login with +919999900001 / 123456 routes to /psy-dashboard (role-based). Lists new requests with Accept/Decline/Reschedule; WS live indicator; reschedule slot picker modal. Needs E2E verification."
  - task: "User notifications inbox + bell entry (from Appointments)"
    implemented: true
    working: "NA"
    file: "frontend/app/notifications.tsx, frontend/app/appointments.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Bell icon in Appointments header -> /notifications inbox (marks read on view). Appointments now shows new statuses (awaiting_confirmation/accepted/rescheduled/declined/cancelled)."
  - task: "Admin add/manage doctors UI"
    implemented: true
    working: "NA"
    file: "frontend/src/AdminPsychologists.tsx, frontend/app/admin.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "In admin dashboard (passcode Kanha@1983): 'Add doctor' form (name, +91 login phone, quals, specializations, languages, price, available days, slot hours) + list with delete. Needs E2E verification that a created doctor appears in the public psychologist list and can log in."
  - task: "Push wiring (module-scope handlers, tap, nudge, registration)"
    implemented: true
    working: "NA"
    file: "frontend/app/_layout.tsx, frontend/src/push.ts, frontend/src/AppContext.tsx, frontend/app.json"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "expo-notifications handlers at module scope; tap + cold-start routing; denied-permission weekly nudge; registerForPush on login+app-open. Cannot be validated in preview/Expo Go (needs real build + google-services.json)."

metadata:
  created_by: "main_agent"
  version: "3.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Atomic + idempotent slot booking (no double-book under concurrency)"
    - "Psychologist portal: /psy/bookings, accept, decline, reschedule (role-gated)"
    - "Notifications + audit log (in-app + realtime + push) with delivery audit"
    - "Admin psychologist CRUD (add doctors with own login phone)"
    - "Psychologist dashboard screen (realtime + accept/decline/reschedule)"
    - "User notifications inbox + bell entry (from Appointments)"
    - "Admin add/manage doctors UI"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Phase 1 realtime booking workflow built on MongoDB+FastAPI (NO Supabase). Please test BOTH backend + frontend. Credentials: demo user +919999900000/123456; psychologist Dr. Ruchi +919999900001/123456; admin passcode Kanha@1983 (Me->About->long-press version). BACKEND focus: (1) slot double-book prevention (two /bookings/order for same slot -> 2nd 409) and idempotency (same idempotency_key -> same booking_id) [already curl-verified]; (2) psychologist role gating: non-psychologist token on /psy/* -> 403; (3) accept/decline/reschedule change status and create a user notification + notification_audit entries (in_app success, push failure expected on placeholder key); (4) admin psychologist CRUD requires admin token, created doctor appears in public GET /psychologists and gets a linked psychologist user; (5) GET /notifications + read-all. NOTE: Razorpay signature can't be completed via automation — to seed an awaiting_confirmation booking for psychologist tests, insert directly into db.bookings + db.slot_locks (see how main agent did it) OR test the psy endpoints against a manually-seeded booking. FRONTEND focus: login as psychologist routes to /psy-dashboard and lists bookings with Accept/Decline/Reschedule; admin dashboard 'Add doctor' creates a doctor that then appears under /psychologists; Appointments bell opens /notifications. PUSH and WebSocket realtime may NOT work in the web preview — verify REST fallbacks (refetch on focus) instead; do not fail push (placeholder key, real-build only). Razorpay is TEST mode; do not complete a card payment."

