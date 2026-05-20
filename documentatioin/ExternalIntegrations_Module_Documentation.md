# External Integrations Module
### BBEAMS — Biometric-Based Employee Attendance Management System

---

## What Is This Module?

The External Integrations module is the **bridge between BBEAMS and the outside world**.

In a real university or company, the attendance system does not work alone. It needs to share data with other systems — for example, the payroll department needs to know how many hours each employee worked so they can calculate salaries. The HR department may use a separate system to manage employee records. The security team may have their own access control gateway.

This module allows the BBEAMS administrator to **register, configure, connect, and sync** those external systems — all from one screen.

---

## Aim of This Module

> **To allow BBEAMS to send verified attendance data to external enterprise systems (Payroll, ERP, HR, Security) without leaving the admin dashboard.**

Specifically, the module aims to:

1. Give administrators a central place to manage all third-party connections
2. Ensure only verified, biometric-confirmed attendance data is shared externally
3. Provide a clear audit trail of when each system was last synced
4. Be production-ready — the sync logic is fully built, only the live HTTP transmission is disabled for demo purposes

---

## The Five Core Functions

### 1. Register a New Integration
The administrator can add any external system by giving it a name, selecting its type (Payroll, ERP, HR System, Security, or Communication), and writing a short description. The system is saved as **Disconnected** until the admin activates it.

> Example: Register "Hawassa University Payroll System" as a PAYROLL type connector.

---

### 2. Connect / Disconnect
Once registered, the admin can toggle the integration between **Connected** and **Disconnected** with one click. Only Connected integrations can receive synced data.

> This represents establishing or terminating the data-sharing agreement with the external system.

---

### 3. Configure Endpoint & API Key
Each integration has a settings panel where the admin enters:
- **Endpoint URL** — the web address of the external system's API
- **API Key / Secret** — the authentication token that proves BBEAMS is allowed to send data

> Example: `https://payroll.hawassauniversity.edu.et/api/attendance-sync` with a Bearer token.

---

### 4. Sync Attendance Data
This is the most important function. When the admin clicks the **Sync** button on a Connected integration, the system:

1. Reads all active employees from the database
2. Calculates each employee's **total worked hours** and **days present** for the last 30 days using their biometric check-in/check-out records
3. Packages this into a structured payload marked `BIOMETRIC_VERIFIED`
4. Sends (or in demo mode, prepares) the payload to the external system
5. Updates the **Last Sync** timestamp on the card

The data sent per employee looks like this:
```
Employee:   john.doe
Period:     Dec 01 – Dec 31
Hours:      168.5 hrs
Days:       22 days
Verified:   BIOMETRIC_VERIFIED
```

---

### 5. Delete an Integration
If a connection is no longer needed, the admin can permanently remove it from the system via the Configure panel.

---

## How the Sync Works — Step by Step

```
Admin clicks Sync on "Cloud ERP Connector"
            │
            ▼
Button shows spinning icon (processing...)
            │
            ▼
Backend reads all ACTIVE employees
            │
            ▼
For each employee → calculate hours from check-in/check-out records
            │
            ▼
Build payload: [{ employee_id, username, total_hours, days_present, BIOMETRIC_VERIFIED }, ...]
            │
            ▼
        [Demo Mode]                     [Production Mode]
   Show result message              HTTP POST → external API
   Update last_sync timestamp       Update last_sync timestamp
            │
            ▼
Frontend shows "Demo Mode" banner with employee names and record count
Last Sync timestamp updates on the card
```

---

## What the Examiner Sees During Demo

When you click **Sync** on a connected integration card, a yellow banner appears at the top of the page showing:

> **Demo Mode** — Sync payload built from live attendance data — 3 employee record(s): john, mary, samuel. No real HTTP request was made.

This confirms that:
- The backend **actually queried the database** and found real attendance records
- The payload was **correctly built** with biometric-verified data
- The system is **production-ready** — only the final HTTP transmission step is disabled since no external payroll server exists in the demo environment

The **Last Sync** timestamp on the card also updates live, showing the exact time the sync ran.

---

## Demo Walkthrough for Examiners

Follow these steps to demonstrate the module during your defense:

| Step | Action | What to Point Out |
|:-----|:--------|:------------------|
| 1 | Open Admin → External Integrations | Show the three pre-loaded connectors with their status badges |
| 2 | Click the gear icon on "Payroll Hub Pro" | Show the Configure modal — endpoint URL and API key fields |
| 3 | Click Connect, then Save Config | Status badge changes from Disconnected → Active (green) |
| 4 | Click the Sync (↻) button on the now-connected card | Button spins, then the Demo Mode banner appears with real employee names |
| 5 | Point to the Last Sync timestamp | It updated to the current time — the backend ran and processed real data |
| 6 | Click Add Integration | Show the form — name, type dropdown, description |
| 7 | Add a new "Communication" type connector | It appears in the grid as Disconnected |
| 8 | Delete it via Configure → trash icon | It disappears from the grid |

---

## Integration Types Supported

| Type | Real-World Example | Icon |
|:-----|:-------------------|:-----|
| Payroll | University salary processing system | Database |
| HR System | Employee records management platform | People |
| ERP | Enterprise resource planning (SAP, Oracle) | People |
| Security | Access control and firewall gateway | Shield |
| Communication | Slack, Teams, email notification service | Cloud |

---

## Why Demo Mode Instead of Real Sync?

The sync service is **fully implemented**. It queries real data, builds a correctly structured payload, and has the HTTP POST code written. It is commented out for one reason only:

> There is no live external payroll or ERP server available in the university lab environment to receive the request.

In a production deployment, enabling real sync requires only uncommenting two lines in `accounts/utils.py` and providing a valid endpoint URL and API key in the Configure panel.

The demo mode is **honest** — it tells the examiner exactly what it did and did not do, and shows the real data it would have sent.

---

## Files Involved

| File | What It Does |
|:-----|:-------------|
| `screens/admin/ExternalIntegrations.tsx` | The entire UI — cards, modals, sync button, demo banner |
| `lib/admin.ts` | Sends API requests and maps responses to TypeScript types |
| `accounts/views.py` | Handles all 6 API endpoints (list, create, toggle, config, sync, delete) |
| `accounts/models.py` | Stores integration records in the database |
| `accounts/utils.py` | Builds the attendance payload and runs the sync logic |
