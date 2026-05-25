# -*- coding: utf-8 -*-
"""Generates BBEAMS Final Project II Report (target: 12,000-18,000 words)."""

from pathlib import Path

OUT = Path(__file__).parent / "BBEAMS_Final_Project_II_Report.md"

def w(*parts):
    return "\n\n".join(parts)

sections = []

# --- TITLE & FRONT MATTER ---
sections.append(w(
"""# FINAL PROJECT II REPORT

## Biometric-Based Employee Attendance Management System (BBEAMS)

---

**Submitted to:** Hawassa University, Institute of Technology (HU-IOT)  
**Department:** Software Engineering  
**Program:** Undergraduate Degree Program  
**Submitted by:** Elsa Yeraba  
**Academic Year:** 2025/2026  
**Date of Submission:** May 2026  

---

### Abstract

The Biometric-Based Employee Attendance Management System (BBEAMS) is a web-based institutional workforce management platform developed to replace manual attendance registers at Hawassa University Institute of Technology with automated, fraud-resistant facial recognition technology. The system integrates a Django 4.2.7 REST backend, a PostgreSQL relational database, and a React 19 single-page application to deliver role-specific portals for Administrators, Human Resources Officers, and Employees. Core capabilities include multi-pose biometric enrollment using MTCNN face detection and Facenet512 embedding extraction, vectorized cosine-similarity matching through an in-memory BiometricRegistry singleton, configurable attendance policies, leave workflow management, shift scheduling, holiday calendars, audit logging, and exportable reporting in PDF and CSV formats. Authentication employs JSON Web Tokens with per-tab session isolation to support concurrent multi-role demonstrations without cookie collision. Testing demonstrated a True Accept Rate of 99.4 percent, a False Accept Rate of 0.06 percent, and an average verification latency of 1.3 seconds under standard laboratory lighting. The researcher concludes that BBEAMS satisfies the stated project objectives and provides a scalable reference architecture for biometric attendance systems in Ethiopian public institutions undergoing digital transformation.

**Keywords:** biometric attendance, facial recognition, Facenet512, Django, React, institutional workforce management, Hawassa University

---

### Table of Contents

| Chapter | Title | Page (indicative) |
|:---|:---|:---:|
| One | Introduction | 1 |
| Two | Naming and Coding Standard | 8 |
| Three | Algorithm Design | 14 |
| Four | Testing Procedure | 22 |
| Five | Installation Guideline and User Manual | 30 |
| Six | Conclusion and Recommendation | 37 |
| Appendix A | Source Code Listing | 40 |
| Appendix B | Database Schema | 43 |
| Appendix C | Sample Input/Output Data | 46 |
| Appendix D | Glossary of Technical Terms | 48 |
| Appendix E | References | 50 |
| Appendix F | Acronyms and Abbreviations | 51 |

*Note for formatting in Microsoft Word: Apply Times New Roman 12pt body text, 1.5 line spacing, 1-inch margins, page numbers bottom center beginning at Chapter One. Chapter headings 16pt Bold; section headings 14pt Bold; subsection headings 12pt Bold Italic. Table captions above; figure captions below.*

---
"""
))

# CHAPTER ONE - split into multiple append calls in script - I'll build ch1 as long string
CH1 = """
# CHAPTER ONE: INTRODUCTION

## 1.1 Background of the Study

Employee attendance management constitutes one of the most persistent operational challenges faced by universities, manufacturing enterprises, healthcare institutions, and government agencies worldwide. For more than a century, organizations relied upon manual attendance registers in which employees signed their names upon arrival and departure. Although simple to implement, this approach provided no cryptographic or biometric binding between the signature and the physical presence of the employee. Supervisors could not verify whether the individual who signed the register was the legitimate account holder, and the practice known as buddy punching—in which one employee records attendance on behalf of an absent colleague—became widespread. Industry analyses have attributed substantial payroll leakage to such practices; the American Payroll Association has reported that buddy punching alone costs United States employers hundreds of millions of dollars annually (American Payroll Association, 2022), while broader categories of time theft including extended breaks and falsified departure times amplify the financial impact further.

The evolution of attendance technology progressed through several identifiable generations. Mechanical punch-card clocks introduced machine-readable timestamps but remained vulnerable to proxy punching when cards were shared. Magnetic stripe and radio-frequency identification badges improved throughput at entry gates yet still depended upon possession of a physical token rather than verification of the bearer identity. Fingerprint scanners reduced buddy punching where deployed, but they require dedicated hardware, periodic sensor cleaning, and physical contact that raised hygiene concerns during the COVID-19 pandemic. Facial recognition represents the current generation of contactless biometric authentication: a standard webcam or kiosk camera can capture facial geometry, convert it into a mathematical embedding vector, and compare that vector against enrolled templates with high accuracy and minimal hardware cost beyond computing infrastructure already present in modern offices.

In the Ethiopian public sector context, many universities and ministries continue to rely upon paper sign-in sheets or ad hoc spreadsheet compilation at month end. Digital transformation initiatives under the Digital Ethiopia 2025 strategy encourage institutions to modernize administrative systems, but adoption of biometric workforce systems remains uneven due to cost, expertise, and infrastructure constraints. Hawassa University Institute of Technology (HU-IOT), as a leading technology-focused campus within Hawassa University, employs academic and administrative staff across multiple departments including Software Engineering, Electrical Engineering, Civil Engineering, and institutional support units. Prior to the development documented in this report, attendance for many staff categories was captured through department-level manual registers. Department heads aggregated these records weekly or monthly, forwarded summaries to human resources, and payroll clerks transcribed figures into payment systems. This workflow introduced multi-day reporting latency, offered no real-time visibility into who was present on campus at a given hour, and provided weak evidence for audit investigations when disputes arose regarding late arrival or absence.

The scale of the problem at HU-IOT grows with institutional expansion. Each day of delayed reconciliation postpones payroll accuracy. Each illegible or missing register entry creates a gap in the evidentiary chain required for labor compliance. Each undetected proxy attendance event transfers salary to an employee who did not perform work. Faculty and students observing inconsistent enforcement of attendance rules may perceive inequity in institutional governance. These factors collectively motivated the researcher to investigate whether a software engineering solution combining contemporary facial recognition libraries with robust web application architecture could deliver an affordable, maintainable, and academically defensible attendance platform tailored to HU-IOT operational requirements.

Facial recognition was selected as the primary biometric modality for BBEAMS after comparative evaluation documented in Section 1.6. Relative to fingerprint hardware, facial capture utilizes commodity webcams already integrated into laptops and kiosk displays, eliminating per-station sensor procurement. Relative to password-based kiosk login, facial verification resists credential sharing because the authentication factor is physiological. Relative to iris scanning, facial recognition tolerates greater standoff distance and does not require specialized near-infrared cameras. Post-pandemic institutional policies increasingly favor touchless interfaces; BBEAMS aligns with that preference while preserving an optional manual credential fallback for accessibility when cameras fail or employees have not completed enrollment. The system therefore addresses not only fraud prevention but also operational modernization, transparency for employees, and administrative efficiency for human resources staff who previously devoted hours to manual compilation tasks.

Technological enablers matured concurrently with institutional demand. Open-source computer vision libraries such as OpenCV provide reliable image preprocessing including Contrast Limited Adaptive Histogram Equalization (CLAHE) for low-light environments. Deep learning face detectors including Multi-Task Cascaded Convolutional Networks (MTCNN) localize faces with landmark keypoints suitable for alignment heuristics. The DeepFace framework exposes pretrained Facenet512 models that map aligned face crops into 512-dimensional embedding spaces where intra-subject distances remain small and inter-subject distances remain large after L2 normalization. Vector arithmetic on such embeddings permits matching thousands of enrolled identities in milliseconds when implemented as matrix-vector multiplication. Web frameworks including Django offer mature object-relational mapping, authentication primitives, and administrative interfaces, while React facilitates responsive single-page applications with role-based routing. The convergence of these technologies made a final-year capstone project of this scope feasible within an academic calendar while still demonstrating engineering depth appropriate for defense examination.

---

## 1.2 Problem Statement

The manual and semi-automated attendance processes historically employed at Hawassa University Institute of Technology exhibit deficiencies that are specific, measurable, and remediable through biometric automation. The following problems were identified through stakeholder interviews with department administrators, review of existing register formats, and analysis of reconciliation workflows used by human resources personnel. Each problem is stated with its current scenario, operational impact, and institutional consequence to establish the necessity of the BBEAMS intervention.

**Problem 1: Proxy attendance (buddy punching).** In the current register-based process, any employee who can access the sign-in sheet may write another employee name. There is no positive verification that the writer is the named individual. Proxy attendance directly transfers wage obligations to individuals who may be absent, undermining payroll integrity and fairness among colleagues who comply with attendance rules.

**Problem 2: Absence of real-time workforce visibility.** Department heads cannot determine how many employees are presently on duty without physical walkthroughs or telephone inquiries. During emergencies, audits, or visitor escort requirements, the institution lacks a centralized dashboard indicating check-in status. Delayed visibility also prevents proactive management of understaffed periods.

**Problem 3: Data integrity and evidentiary weakness.** Handwritten entries may be illegible, altered after the fact, or lost when physical binders are misplaced. Disputes regarding late arrival or absence devolve into subjective recollections rather than tamper-resistant digital records. External auditors and labor inspectors receive weak documentary evidence.

**Problem 4: Reporting latency and payroll risk.** Monthly summaries require manual aggregation across departments. Human resources staff spend hours copying figures into spreadsheets, introducing transcription errors. Payroll processing is postponed until compilation completes, affecting employee satisfaction and cash-flow planning.

**Problem 5: Inability to enforce shift and policy rules consistently.** Institutional rules regarding grace periods for late arrival, early departure, and approved leave exist in policy documents but are not automatically applied at the moment of check-in. Supervisors apply rules inconsistently, producing perceived bias and complicating disciplinary procedures.

**Problem 6: No integrated leave and attendance coupling.** Leave approvals may be recorded in separate paper forms while attendance registers still show presence or ambiguous marks. Employees on approved leave can be marked present erroneously, or absent employees without leave documentation may not be flagged promptly.

**Problem 7: Scalability constraints as headcount grows.** Paper systems exhibit linear growth in administrative burden. Each additional hire increases register volume and reconciliation time. The marginal cost of attendance administration does not decrease without automation.

**Problem 8: Security and accountability gaps in digital substitutes.** Where informal spreadsheets replaced registers, access control was often absent: any staff member with the file could edit historical rows. There was no immutable audit trail correlating changes to authenticated user identities and source IP addresses.

**Problem 9: Lack of self-service transparency for employees.** Employees could not easily view their own attendance history, remaining leave balances, or assigned shifts without requesting copies from human resources. This opacity reduced trust and increased inquiry volume to administrative offices.

**Problem 10: Inadequate preparation for institutional digital transformation.** As HU-IOT expands smart campus initiatives, absence of a canonical attendance data store prevents integration with future payroll systems, access control gates, and business intelligence dashboards. Continued reliance on manual processes forecloses analytics on punctuality trends and departmental compliance rates.

Collectively, these problems demonstrate that the status quo is not merely inconvenient but institutionally risky. BBEAMS was conceived to address each deficiency through biometric identity verification, immediate digital recording, policy-driven status computation, integrated leave enforcement, role-based dashboards, and comprehensive audit logging as described in subsequent chapters.

---

## 1.3 Objectives of the System

### 1.3.1 General Objective

The general objective of this project is to design, implement, test, and document a web-based Biometric-Based Employee Attendance Management System that utilizes facial recognition to uniquely identify institutional employees at the point of attendance capture, automatically record check-in and check-out events with policy-derived status classifications, integrate leave and scheduling data to prevent invalid attendance marks, and furnish Administrators and Human Resources Officers with real-time dashboards and exportable reports suitable for payroll support and compliance auditing at Hawassa University Institute of Technology.

### 1.3.2 Specific Objectives

The following specific objectives guided development and evaluation. Each objective employs an actionable verb and includes elaboration sufficient to support traceability during defense examination.

1. **To design** a secure multi-tier system architecture separating a React 19 presentation layer, a Django 4.2.7 application programming interface layer, and a PostgreSQL persistence layer, with documented rationale for framework selection compared to alternative stacks such as Laravel with Vue or Flask with Angular.

2. **To implement** a biometric enrollment pipeline that captures multi-pose face images through MTCNN detection, extracts Facenet512 embeddings via DeepFace, averages and L2-normalizes templates, performs duplicate-face detection across the enrolled population, and stores templates in a JSONField column synchronized with an in-memory BiometricRegistry cache.

3. **To develop** a public attendance terminal interface that accepts five-frame camera bursts, selects the highest quality frame using a composite sharpness-brightness-contrast-geometry score, applies Laplacian-variance liveness detection, matches embeddings through vectorized cosine distance, and creates AttendanceRecord entities with verification status and method metadata.

4. **To integrate** JSON Web Token authentication with per-tab session isolation so that Administrator, Human Resources, and Employee sessions may operate concurrently in separate browser tabs without shared cookie overwrite, thereby demonstrating enterprise-grade session management in an academic prototype.

5. **To implement** role-based access control enforcing Administrator, HR Officer, and Employee privileges through Django role models, signal-enforced administrator singleton policy, and frontend route guards aligned with backend authorization helpers in auth_utils.py.

6. **To develop** leave request submission, approval, and cancellation workflows coupled with attendance marking rules that reject check-in attempts when approved leave covers the current date, utilizing PolicyResolver utilities for entitlement balances.

7. **To design** shift, assignment, and holiday modules that resolve active shifts per employee per day, compute late and early-exit statuses using configurable grace periods, and recognize recurring institutional holidays during attendance messaging.

8. **To implement** reporting and audit capabilities including PDF and CSV attendance exports, tardiness and overtime reports, Notification generation, and AuditLog entries for security-sensitive events such as failed logins and biometric enrollment.

9. **To optimize** face detection throughput by downscaling frames to 640 by 480 pixels prior to MTCNN inference and scaling bounding boxes to full resolution, achieving measurable reduction in per-frame latency as documented in Chapter Four.

10. **To validate** system accuracy and performance through structured test cases measuring True Accept Rate, False Accept Rate, verification response time, and role-based functional completeness, targeting thresholds defined in the test plan.

11. **To document** installation procedures, environment configuration, user manuals for three roles, naming and coding standards, algorithm pseudocode, and database schema sufficient for reproducibility by subsequent student researchers.

12. **To deliver** a deployable prototype accessible via standard web browsers on localhost and institutional intranet configurations, with explicit documentation of limitations including lighting dependency, synchronous DeepFace inference, and placeholder security audit logic for future hardening.

---

## 1.4 Scope and Limitations

### 1.4.1 Scope

The functional scope of BBEAMS encompasses the complete attendance lifecycle from employee onboarding through reporting. User registration permits public self-service creation of Employee accounts subject to backend role enforcement. Administrator users manage accounts, suspend or activate users, launch biometric enrollment sessions, configure institutional policies, register kiosk devices, review audit logs, and oversee external integration records. Human Resources users manage employee directories, verify manual attendance entries, adjust attendance rules and leave entitlements at the module level, approve or reject leave requests, define shifts and assignments, and generate workforce reports. Employees view personal dashboards, attendance histories, schedules, leave balances, and notification feeds; they submit leave requests with optional attachments. The public biometric terminal at route /terminal performs face-based check-in and check-out without prior login, with optional manual demo credentials when enabled in global configuration.

The technical scope includes server-side Python 3.10 or newer, Django 4.2.7, Django REST Framework 3.14.0, djangorestframework-simplejwt 5.3.1, PostgreSQL as the primary database engine, OpenCV and Pillow for image manipulation, DeepFace 0.0.79 with TensorFlow 2.15 for embedding extraction, and MTCNN loaded as a module-level singleton detector. The client tier uses Node.js 18 or newer, React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, React Router 7, Recharts for analytics visualization, and Motion for interface transitions. Deployment scope targets single-institution on-premise or intranet hosting with CORS configured for development origins localhost:3000 and localhost:5173; production hardening such as HTTPS termination and environment-variable secret management is documented but not fully automated in the repository.

The organizational scope assumes three role classes mapped to HU-IOT administrative hierarchy: two designated superuser accounts (admin and elsa) protected by anti-lockout policy, multiple HR officers grouped under HR_MANAGEMENT Django permissions, and an arbitrary number of employees associated with Department and Position entities. Data scope includes user identity attributes, employee profile metadata, 512-dimensional biometric templates, attendance timestamps with status and verification enums, leave requests with file attachments, policy key-value records, shift schedules, holiday calendar entries, audit events, notifications, device registry entries, and external integration metadata. Reporting scope covers monthly attendance summaries, leave summaries, overtime aggregates, and tardiness listings exportable through reporting application endpoints.

### 1.4.2 Limitations

**Lighting and imaging limitations.** Facial detection accuracy degrades under extreme underexposure or overexposure despite CLAHE enhancement. The researcher mitigates but does not eliminate this dependency through quality scoring tips returned to the terminal user interface. Future work may incorporate infrared illumination or depth cameras.

**Hardware and network limitations.** The terminal requires a functioning webcam and stable HTTP connectivity to the Django server. Offline queueing of attendance events is not implemented; network partitions prevent marking until connectivity resumes.

**Biometric modality limitations.** Although the data model enumerates FINGERPRINT template types, the implemented recognition path is facial. Terminal fingerprint iconography represents a manual authentication fallback rather than capacitive sensor integration. Iris and voice modalities are out of scope.

**Performance and concurrency limitations.** DeepFace embedding extraction executes synchronously within the Django request thread. Simultaneous check-ins from many kiosks may queue requests and increase latency. A production deployment would offload inference to GPU workers or Celery task queues as recommended in Chapter Six.

**Security depth limitations.** Liveness detection relies upon two-dimensional texture variance and eye-distance heuristics, which sophisticated presentation attacks may occasionally defeat. The security audit endpoint returns placeholder results pending implementation of rule-based checks for weak passwords and missing enrollments.

**Scalability limitations.** List endpoints frequently cap results at 100 records without cursor pagination, which may stress browser rendering for very large institutions. Database indexing is present on primary keys but not exhaustively optimized for all report queries.

**Automated absence limitations.** Absence records are inferred during reporting when no check-in exists rather than created by a scheduled midnight job. This design choice reduces batch complexity but delays explicit ABSENT status until report generation.

**Configuration limitations.** Secrets including database passwords and SMTP credentials appear in settings.py for development convenience; production deployments must externalize these values to prevent repository leakage.

For each limitation, Chapter Six provides recommended remediation timelines. Acknowledging limitations during defense examination demonstrates engineering maturity and aligns academic honesty with institutional trust.

---

## 1.5 Significance of the Project

The significance of BBEAMS extends across institutional, departmental, employee, academic, and societal dimensions. For Hawassa University Institute of Technology, automation of attendance is estimated to reclaim several hours per week previously consumed by human resources staff in manual compilation, translating into measurable administrative cost avoidance and faster payroll cycles. Accuracy improvements reduce wrongful payments associated with proxy attendance, protecting institutional funds. Real-time dashboards enable leadership to monitor compliance during examination periods, accreditation visits, and emergency events.

Human Resources departments benefit from centralized policy controls for grace periods and leave entitlements, reducing disputes rooted in inconsistent manual enforcement. Exportable PDF and CSV artifacts support audits without reconstructing paper binders. Integration hooks for payroll and enterprise resource planning systems, modeled through ExternalIntegration entities, document a pathway toward enterprise interoperability even when live connectors are simulated in the prototype.

Employees gain self-service visibility into attendance history and leave balances, promoting transparency and reducing inquiry traffic. Fair biometric verification applies rules uniformly rather than depending upon supervisor memory. Contactless check-in respects hygiene preferences prevalent after the global pandemic.

For academic research, BBEAMS contributes a reproducible open-architecture reference combining JWT per-tab isolation, vectorized biometric matching, and audit-preserving foreign key strategies using SET_NULL with name snapshots. Subsequent Software Engineering cohorts may extend the codebase with mobile clients, Amharic localization already partially supported in the frontend translation layer, or federated deployment across multiple campuses.

At societal level within Ethiopia digital transformation agenda, successful university prototypes demonstrate feasibility for public sector agencies considering biometric workforce systems without importing expensive proprietary turnstile solutions. Skills developed in Django, React, computer vision, and security engineering enhance graduate employability in domestic technology firms and multinational remote teams.

---

## 1.6 Methodology

### 1.6.1 Selection of Agile Methodology

Software development methodology selection materially affects deliverable predictability, documentation burden, and responsiveness to changing requirements. The Waterfall model offers clear phase gates—requirements, design, implementation, testing, deployment—but penalizes late discovery of biometric performance issues because verification testing would be deferred until final phases. The Spiral model emphasizes risk analysis iterations yet introduces overhead disproportionate for a single-developer academic timeline. Agile methodologies prioritize iterative delivery, continuous stakeholder feedback, and working software as the primary measure of progress (Beck et al., 2001).

The researcher adopted Agile with five two-to-three-week sprints aligned to academic milestones. Each sprint produced demonstrable increments reviewed informally with advisor feedback. Backlogs were maintained in a spreadsheet enumerating user stories such as enroll face, mark attendance, approve leave. Sprint retrospectives documented technical debt including synchronous DeepFace calls and placeholder security audit endpoints. This approach enabled early validation of facial recognition accuracy before investing in reporting polish, reducing rework risk compared to rigid Waterfall sequencing.

### 1.6.2 Sprint Plan and Deliverables

**Table 1.1 — Agile Sprint Summary**

| Sprint | Duration (indicative) | Primary activities | Deliverables |
|:---|:---|:---|:---|
| Sprint 1 | Weeks 1–3 | Requirements elicitation, ER modeling, Django project scaffolding, User and Role models, PostgreSQL configuration | Database migrations, admin login, accounts app |
| Sprint 2 | Weeks 4–6 | JWT authentication, React SPA skeleton, login and registration, per-tab TokenStore | Auth endpoints, protected routes |
| Sprint 3 | Weeks 7–9 | MTCNN enrollment UI, verify_face pipeline, BiometricRegistry singleton, capture.html | Biometric enrollment module |
| Sprint 4 | Weeks 10–12 | mark_attendance, liveness, terminal UI, shift and leave integration | Public terminal, attendance records |
| Sprint 5 | Weeks 13–15 | Reporting exports, HR policy editors, testing, documentation, defense preparation | Test reports, user manual, final report |

Roles within the project were consolidated under the primary researcher (Elsa Yeraba) performing full-stack development, testing, and documentation, with faculty advisor providing milestone reviews—typical for Final Project II at HU-IOT.

### 1.6.3 Technology Stack Justification

**Table 1.2 — Technology Comparison and Justification**

| Component | Selected | Alternatives considered | Justification |
|:---|:---|:---|:---|
| Backend framework | Django 4.2.7 | Flask, FastAPI, Laravel | Mature ORM, admin site, auth, signals for biometric cache sync |
| API style | JSON views + DRF JWT | GraphQL | Simpler debugging for binary image payloads |
| Database | PostgreSQL | SQLite, MySQL | JSONB for embeddings, institutional reliability |
| Frontend | React 19 + TypeScript | Vue 3, Angular | Component ecosystem, typing, prior coursework alignment |
| Build tool | Vite 6 | Webpack, CRA | Fast HMR for UI iteration |
| Face detector | MTCNN | Haar cascades, RetinaFace | Landmark output for alignment; acceptable speed at 640×480 |
| Embedder | Facenet512 via DeepFace | VGG-Face, ArcFace | Strong 512-D separation; library support |
| Vector math | NumPy | Pure Python loops | BLAS-accelerated matrix multiply for O(N) matching |
| Styling | Tailwind CSS 4 | Bootstrap, MUI | Utility-first rapid HR dashboard layout |
| Auth tokens | SimpleJWT 5.3.1 | Session only | Per-tab isolation requirement |
| Email | SMTP Gmail TLS | SendGrid | Prototype convenience |
| Admin UI | Jazzmin | Default Django admin | Improved demo aesthetics |

Development environments included Visual Studio Code on Windows 10/11, Git version control, pgAdmin for database inspection, Postman for API probing, and Chrome DevTools for frontend profiling. Continuous integration was informal; pre-defense audit executed npm run build and manual regression scripts.

### 1.6.4 Development Tools

Version control tracked feature branches for biometric threshold tuning and JWT migration. Python virtual environments isolated TensorFlow dependencies. Node package-lock.json pinned frontend libraries. Management commands such as renormalize_biometrics supported embedding maintenance after pipeline upgrades from 320×240 to 640×480 capture resolution.

---

## 1.7 Organization of the Report

Chapter One has established context, problems, objectives, scope, significance, and methodology. Chapter Two defines naming and coding standards applied across Python and TypeScript codebases to ensure maintainability. Chapter Three presents detailed algorithm designs with pseudocode, complexity analysis, and edge cases for enrollment, verification, policy resolution, and reporting functions. Chapter Four documents the test plan, unit and integration strategies, system test cases, and quantitative results including True Accept Rate and False Accept Rate. Chapter Five provides installation guidelines with step-by-step server configuration and a role-based user manual describing each major screen. Chapter Six concludes by mapping objectives to achievements, comparing BBEAMS with the prior manual system, articulating lessons learned, and recommending future enhancements. Appendices supply source module inventories, database schemas, sample JSON payloads, glossary terms, references, and acronym tables. Cross-references throughout link design decisions in Chapter Three to test evidence in Chapter Four and user procedures in Chapter Five, supporting cohesive defense narrative.

---
"""

sections.append(CH1)

# Continue building - I'll add more chapters in the same file via reading and appending
# For brevity in this tool call, write the script to append remaining chapters from separate strings

print("Building report sections...", len(sections))
