# Biometric Attendance System (BBEAMS) - Final Defense Readiness Review

After analyzing the current backend architecture, frontend application, and database models, here is a comprehensive list of the remaining tasks, missing features, and critical performance improvements you need to address before your final year project defense. 

Implementing these will take the project from a "working prototype" to a "production-ready enterprise system"—ensuring you get top marks.

## 1. Core Attendance & Scheduling Architecture

- [ ] **Implement Automated Absence Logging (Background Task):** 
  - **Issue:** Currently, the system only logs when an employee *checks in* or *checks out*. It deduces "Absence" on the fly inside reporting views by checking if a record exists.
  - **Fix:** Integrate `Celery` or `APScheduler` to run a daily cron job at midnight. It should check who missed their shift for the day and explicitly create `AttendanceRecord` rows with a `status` of `ABSENT`.
- [ ] **Implement a Holiday/Academic Calendar System:**
  - **Issue:** In `scheduling/models.py`, `work_days` is just a string (`'Mon - Fri'`). The system cannot logically parse this, nor does it know about public holidays.
  - **Fix:** Create a `Holiday` model. Update the attendance report functions (like overtime and tardiness exports) to ignore absences on weekends and registered holidays.
- [ ] **Optimize N+1 Queries in Reporting:**
  - **Issue:** In `reporting/views.py`, functions like `overtime_report_export` and `tardiness_report_export` loop through every single attendance record and call `resolve_active_shift(user)`. This hits the database inside a `for` loop, causing major performance bottlenecks when viewing long date ranges.
  - **Fix:** Pre-fetch shifts and user assignments in bulk before the loop.

## 2. Removing Mock Data & Stubbed Endpoints

Several administrative endpoints in the backend exist but contain hardcoded "mock" logic. A defense panel testing these features will realize they don't do anything:

- [ ] **Dynamic Security Audits:** 
  - **Issue:** `run_security_audit` in `reporting/views.py` returns a hardcoded `{score: 100}` and an empty audit array.
  - **Fix:** Implement real logic (e.g., checking for weak passwords, users without biometric templates, missing check-outs).
- [ ] **Real System Health & Telemetry:**
  - **Issue:** `get_system_health` returns a hardcoded API latency of `'24ms'`. 
  - **Fix:** Calculate real latency or return actual CPU/Memory stats of the server hosting the Django instance.
- [ ] **Device Management Logic:**
  - **Issue:** `api_device_detail` and `api_device_list_create` are incomplete stubs (e.g., POST is not implemented, and Detail just returns `True`).
  - **Fix:** Complete the CRUD operations for IoT/Biometric Kiosk device management.

## 3. Facial Recognition Pipeline (Performance)

- [ ] **Synchronous Blocking of Recognitions:**
  - **Issue:** `mark_attendance` does OpenCV detection and DeepFace `160x160` embedding extraction synchronously. If 5 employees check-in at the exact same second across different kiosks, Django will block and the system will lag.
  - **Fix:** Offload embedding matching to a background Celery worker or optimize DeepFace by loading the model into GPU memory once during app startup instead of reloading it. Mentioning this optimization during your defense will guarantee a high grade.
- [ ] **Liveness Verification Edge Cases:**
  - The `Laplacian` variance threshold (`6.0`) is a basic 2D anti-spoofing mechanism. You must ensure you document its limitations (e.g., it can fail under low-light or with high-res photos) so the panel knows you understand security boundaries.

## 4. Frontend Polish & UX Improvements

- [ ] **Camera Error Flow:**
  - **Issue:** If the browser denies camera access or the PC lacks a webcam, does the app fail gracefully?
  - **Fix:** Add React error boundaries to display a "Camera Disconnected / Permission Denied" UI rather than a blank block.
- [ ] **Live Dashboard Notifications:**
  - **Issue:** The backend has a robust `generate_system_notifications_for_user`, but they are fetched via basic HTTP polls (or only on load).
  - **Fix:** Implement `setInterval` polling every 30-60 seconds in React, or move to WebSockets via Django Channels for real-time alerts.
- [ ] **Pagination for Large Datasets:**
  - **Issue:** The API arbitrarily limits exports to `[:100]` or returns all values (`.all()`). 
  - **Fix:** Implement standardized Django pagination. The React tables should have "Next/Previous" buttons rather than rendering thousands of rows in the DOM at once causing browser lag.

## 5. Security & Deployment Readiness

- [ ] **Role-Based Routing Checks:** Ensure that typing `/admin-dashboard` into the URL bar forcefully redirects an Employee user back to their dashboard if they are not `is_staff`.
- [ ] **Turn off DEBUG mode:** Make sure `DEBUG=False` in your `settings.py` when presenting, and ensure static files (css/js) are properly served by `WhiteNoise` or Nginx.
