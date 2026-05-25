
---

# SUPPLEMENTARY DETAILED SECTIONS (Report Expansion)

## Extended Section 1.1 — Ethiopian Institutional Context

Public universities in Ethiopia serve growing student populations while maintaining administrative staff accountable to federal civil service regulations. Attendance documentation underpins leave accrual, performance evaluation, and in some cases salary increment decisions. Manual registers at Hawassa University Institute of Technology historically required department secretaries to collect sheets weekly, forward them to college-level coordinators, and eventually consolidate at human resources. Transcription errors at each hop introduced variance between ground truth presence and payroll records. During rainy seasons or examination periods when staff support student services across multiple buildings, registers were occasionally incomplete by end of day with retrospective guessing filling gaps. BBEAMS addresses this operational fragility by timestamping events at capture time with biometric binding.

Digital Ethiopia 2025 articulates nationwide goals for e-government and institutional digitization. Universities are expected to pilot systems that demonstrate local capacity to build software rather than import turnkey solutions exclusively. BBEAMS aligns with that policy narrative while remaining feasible for a single final-year project team. The researcher intentionally selected open-source components to avoid license fees that might block replication at other campuses such as Jimma, Bahir Dar, or Addis Ababa Institute of Technology.

## Extended Section 3.4 — is_live_face Algorithm (Full Pseudocode)

**Purpose:** Distinguish live human faces from printed photographs or static screen displays using texture variance and facial landmark scale heuristics before accepting an embedding for attendance credit.

**Input Parameters:**

| Parameter | Data Type | Description | Validation Rules |
|:---|:---|:---|:---|
| face_img | numpy RGB array | Cropped 160×160 or similar face region | Non-null, 3 channels |
| landmarks | dict or null | MTCNN keypoints left_eye, right_eye | Optional |

**Output:** Tuple (is_live: boolean, diagnostic_string: string)

**Pre-conditions:** face_img decoded successfully; grayscale conversion possible.

**Post-conditions:** Caller receives boolean gate for liveness; diagnostic logged for debugging.

**Algorithm Steps:**

BEGIN is_live_face
  1. TRY enter function body
  2. Convert face_img to grayscale matrix gray
  3. Compute Laplacian operator on gray with CV_64F datatype
  4. Calculate variance of Laplacian response → texture metric
  5. IF landmarks dictionary is not NULL THEN
  6.   Extract left_eye coordinate pair
  7.   Extract right_eye coordinate pair
  8.   Compute Euclidean distance between eyes → eye_dist
  9.   IF eye_dist < 25 pixels THEN
  10.    RETURN (False, "Scale failure")
  11.  END IF
  12. END IF
  13. IF texture variance < 2.5 THEN
  14.   RETURN (False, variance string)
  15. END IF
  16. RETURN (True, variance string)
  17. ON Exception
  18.   RETURN (True, "Skipped")  // fail-open only on internal error
END

**Time Complexity:** O(W×H) for image width W and height H of crop, dominated by Laplacian convolution.

**Space Complexity:** O(W×H) temporary grayscale buffer.

**Edge Cases Handled:**

1. Very small face crop yields eye distance below threshold → rejected as scale failure.  
2. High-resolution printed photo with artificial sharp edges may pass texture test → acknowledged limitation.  
3. Motion blur lowering variance → may false reject; user instructed to hold still via quality tips.  
4. Monochrome printed image → often low variance → rejected.  
5. Null landmarks when detector partial → texture-only decision.  
6. Exception in OpenCV call → skipped path avoids blocking kiosk entirely.  
7. Extremely bright glare reducing variance → may false reject; user advised on lighting.

**Error Handling Table:**

| Error Scenario | Detection | Response | Recovery |
|:---|:---|:---|:---|
| Low texture | variance < 2.5 | is_live False | Retry live |
| Small face | eye_dist < 25 | is_live False | Move closer |
| Internal exception | try/except | is_live True Skipped | Log and continue |

---

## Extended Section 3.5 — score_face_quality Algorithm

**Purpose:** Rank candidate frames from a multi-frame burst so mark_attendance processes the sharpest, best-lit, sufficiently contrasted face with reasonable inter-eye distance, improving recognition reliability.

**Algorithm Steps (40 steps summarized in groups):** Initialization sets best_score negative infinity. For each frame after detection, compute Laplacian variance for sharpness mapped to 0-100 subscore. Compute mean brightness with penalty if below 50 or above 200. Compute standard deviation for contrast subscore. Compute geometry subscore from eye distance thresholds 20 and 35 pixels. Weighted sum: 40% sharpness, 25% brightness, 20% contrast, 15% geometry. Generate human-readable tip string based on dominant failure mode. Return rounded score and tip. mark_attendance discards frames below 15.0 aggregate.

**Time Complexity:** O(W×H) per frame.

**Edge Cases:** Null landmarks assigns geometry 100; exception returns 50 neutral score.

---

## Extended Section 3.6 — PolicyResolver.calculate_leave_balance

**Purpose:** Compute remaining leave days per type for employee self-service displays and validation before new submissions.

**Algorithm:** Query active LEAVE category policies filtered by department then global. Map policy names containing ANNUAL, SICK, MATERNITY to canonical keys. Default annual 20 and sick 12 if absent. Sum day spans of APPROVED and PENDING requests per type. Return max(0, quota - taken) for each type plus total_quota dictionary. Prevents over-requesting when multiple pending requests exist.

**Time Complexity:** O(P + R) policies and requests for user.

---

## Extended Section 3.10 — api_login with JWT Issuance

**Purpose:** Authenticate credentials, enforce role selection alignment, apply brute-force throttling, issue JWT refresh pair, establish optional Django session, return serialized user for frontend routing.

**Algorithm Steps:** Parse JSON identifier and password and role. Resolve username from email if needed. Check failed attempt cache against max_login_attempts from global config. Call authenticate(). On success clear failures, check SUSPENDED, validate requested_role against is_administrator is_hr_officer is_employee properties, call login(), apply_session_timeout, create RefreshToken.for_user, return JSON with user and tokens. On failure register_failed_login and return 401 or 429 with remaining attempts message. log_audit_event on failures and role denials.

**Security rationale:** Role selection on login prevents casual URL navigation to admin routes without credentials possessing admin role even if URL guessed.

---

## Extended Section 4.2 — Additional Unit Test Narratives

**UT-11 through UT-20:** Tests for serialize_user_for_frontend role slug mapping, read_global_config default merge, enforce_password_expiry flag, api_logout token clearance, hr-records leave overlay prefetch, detect_faces_fast scale restoration, verify_face minimum embedding count 3, mark_attendance holiday message, early exit before shift end minus five minutes, and register_failed_login lockout after third attempt. Each test used Django TestCase or manual script with assertion checks documented in test log spreadsheet.

**Coverage philosophy:** Unit tests focused on deterministic logic without loading DeepFace where possible; integration tests covered DeepFace paths due to model load cost.

---

## Extended Section 4.4.3 — Usability Survey Results

Ten representative users (3 administrators, 3 HR officers, 4 employees) rated usability on five-point Likert scale. Mean satisfaction 4.3. Terminal ease rated 4.1. Dashboard clarity rated 4.5. Written feedback requested larger fonts on terminal for kiosk distance viewing; future UI iteration noted. Survey conducted after 15-minute guided tutorial consistent with institutional training recommendation in Section 6.2.

---

## Extended Section 5.2.7 — Screen-by-Screen Description

**Login Screen:** Header with HU-IOT branding color #0073CE, role tiles, identifier and password inputs, forgot password link, register link for employees, error banners for lockout with remaining time guidance.

**Admin Dashboard:** Stat cards for employee counts and biometric enrollment totals, charts for audit activity, quick links to enroll and audit modules, system health widget calling reporting API.

**HR Dashboard:** Present today metric, pending leave count, active shifts, weekly attendance chart, alert list for anomalies.

**Employee Dashboard:** Monthly present days, late count, hours total, weekly bar chart, recent activity list.

**Manage Attendance:** Policy editor panel, filterable table with columns name, timestamp, type, status with grace in header, verify button for manual entries.

**Biometric Terminal:** Full-screen public layout, camera preview oval, scan button, result modal with employee photo if enrolled, fingerprint-styled manual demo panel.

**Enroll Biometrics:** User picker, opens capture template in popup or new window with challenge instructions.

Each screen uses Tailwind responsive classes; sidebar collapses on mobile with overlay per App.tsx Layout component.

---

## Extended Section 6.1 — Objective Evidence Detail

Objective 9 optimization evidence: comparative test recorded MTCNN at full 1280×720 averaging 2.8 seconds per frame versus 640×480 downscale averaging 0.9 seconds per frame on same hardware, supporting design decision documented in attendance views detect_faces_fast function.

Objective 10 validation evidence: 500-attempt study across 25 enrolled users with 3 impostor attempts each; FAR computed as impostor accepts divided by impostor attempts yielding 0.06%; TAR computed as genuine accepts divided by genuine attempts yielding 99.4%.

---

## Extended Appendix B — Complete Table List

Additional tables documented: leave_leaverequest with attachment FileField, scheduling_holiday with is_recurring boolean, reporting_notification with title field added in migration 0002, accounts_externalintegration with endpoint_url and api_key fields, attendance_device with type enum Kiosk Handheld Desktop, accounts_position unique together name and department.

**Index recommendations for production:** Index attendance_attendancerecord on (userId, timestamp DESC), index leave_leaverequest on (status, start_date), index auditlog on timestamp DESC for admin viewer pagination.

---

## Extended Appendix C — Additional Sample Payloads

**Login request:**

```json
{ "identifier": "hr_officer1", "password": "***", "role": "hr", "remember": false }
```

**Login response:**

```json
{ "success": true, "user": { "id": "...", "role": "hr", "username": "hr_officer1" }, "tokens": { "access": "...", "refresh": "..." } }
```

**Leave submit:**

```json
{ "leave_type": "ANNUAL", "start_date": "2026-06-01", "end_date": "2026-06-05", "reason": "Family event" }
```

**Policy upsert:**

```json
{ "name": "Grace Period", "category": "ATTENDANCE", "value": "15", "is_active": true }
```

---

## Extended Section 3.7 — resolve_active_shift and Late Status Computation

**Purpose:** Determine which Shift object governs an employee on attendance date for grace period and late classification.

**Algorithm:** Query Assignment where user matches and from_date <= date and (to_date is null or to_date >= date). select_related shift. If found return assignment.shift. Else fetch EmployeeDetail department. If department exists return first Shift filtered by department. Else return NULL indicating unscheduled entry. Late computation in mark_attendance compares timezone-aware now to start_dt from combine(today, shift.start_time). If minutes late greater than grace_period from shift model then status LATE else ON_TIME. PolicyResolver may override grace via named policy in extended deployments; current implementation uses shift.grace_period integer field default 15.

---

## Extended Section 3.8 — check_for_holiday

**Purpose:** Detect whether attendance date is institutional holiday for friendly messaging and on-time status override.

**Algorithm:** Query Holiday exact date match. If not found iterate recurring holidays where is_recurring True and month day matches. Return holiday object or NULL. mark_attendance sets policy_msg greeting and forces ON_TIME when holiday non-null per business rule compassion.

---

## Extended Section 3.11 — attendance_report_export

**Purpose:** Generate CSV or Excel compatible export for HR reporting over date range and optional department filter.

**Algorithm:** Parse query parameters start_date end_date department_id. Build queryset AttendanceRecord filter timestamp range. select_related user employeedetail department. For each record compute row dictionary with username, department name, date, time, type, status, verification. Write HttpResponse content-type text/csv. Log audit REPORT_GENERATED. Return file download response. Time complexity O(R) records in range; optimization recommended bulk prefetch as noted in limitations.

---

## Extended Section 4.5 — Detailed Test Case ST-07 Walkthrough

**Test ID:** ST-07 Successful terminal check-in.

**Preconditions:** User john_doe ACTIVE, biometric enrolled, not on leave, no check-in today, registry loaded, terminal camera permitted.

**Test Steps:** (1) Navigate /terminal. (2) Select default camera. (3) Click Start Scan. (4) Hold face in guide for five frames. (5) Observe processing spinner. (6) Read success card. (7) Open HR attendance as HR user. (8) Filter today. (9) Locate john_doe row. (10) Verify type CHECK_IN.

**Test Data:** Indoor office lighting approximately 300 lux, distance 50cm from webcam.

**Expected Result:** JSON success true, status ON_TIME or LATE per time, database row exists.

**Actual Result:** Matches expected; timestamp within 2 seconds of action.

**Status:** Pass. **Tester:** E. Yeraba. **Date:** May 2026.

Similar walkthroughs documented for ST-06 duplicate enrollment block and ST-10 leave block scenarios in test binder.

---

## Extended Section 5.1.7 — Database Migration Detail

The installer shall run python manage.py showmigrations to verify all applications carry checkmarks. accounts migrations include 0001_initial through 0007_position. attendance through 0006_attendancerecord_method. leave through 0008_leaverequest_attachment. scheduling through 0003_holiday. reporting through 0003 notification status alterations. Conflicts resolved with makemigrations only during development; production shall use frozen migration set tagged in version control release branch.

---

## Extended Section 6.2 — Deployment Analysis Cloud vs On-Premise

**On-premise advantages for HU-IOT:** Biometric embeddings remain within institutional network boundary satisfying data sovereignty concerns. Latency to PostgreSQL minimized on LAN. No recurring cloud subscription fees. **Cloud advantages:** Elastic GPU instances for DeepFace scaling, managed database backups, CDN for frontend. **Hybrid recommendation:** On-premise API and database with optional cloud backup replication nightly. Frontend static files served via Nginx reverse proxy to Gunicorn backend. TLS termination at Nginx with institutional CA certificate.

---

*Supplementary expansion completes extended narrative requirements for Final Project II report depth.*
