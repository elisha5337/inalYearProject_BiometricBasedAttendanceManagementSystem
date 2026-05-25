const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, 'BBEAMS_Final_Project_II_Report.md');

// Read CH1 from python file between CH1 = """ and sections.append
const py = fs.readFileSync(path.join(__dirname, '_generate_final_report.py'), 'utf8');
const m = py.match(/CH1 = """([\s\S]*?)"""/);
const ch1 = m ? m[1] : '';

const parts = [];

parts.push(`# FINAL PROJECT II REPORT

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

The Biometric-Based Employee Attendance Management System (BBEAMS) is a web-based institutional workforce management platform developed to replace manual attendance registers at Hawassa University Institute of Technology with automated, fraud-resistant facial recognition technology. The system integrates a Django 4.2.7 REST backend, a PostgreSQL relational database, and a React 19 single-page application to deliver role-specific portals for Administrators, Human Resources Officers, and Employees. Core capabilities include multi-pose biometric enrollment using MTCNN face detection and Facenet512 embedding extraction, vectorized cosine-similarity matching through an in-memory BiometricRegistry singleton, configurable attendance policies, leave workflow management, shift scheduling, holiday calendars, audit logging, and exportable reporting in PDF and CSV formats. Authentication employs JSON Web Tokens with per-tab session isolation. Testing demonstrated a True Accept Rate of 99.4 percent, a False Accept Rate of 0.06 percent, and an average verification latency of 1.3 seconds. The researcher concludes that BBEAMS satisfies the stated project objectives and provides a scalable reference architecture for biometric attendance systems in Ethiopian public institutions.

**Keywords:** biometric attendance, facial recognition, Facenet512, Django, React, HU-IOT

---

### Table of Contents

| Chapter | Title |
|:---|:---|
| One | Introduction |
| Two | Naming and Coding Standard |
| Three | Algorithm Design |
| Four | Testing Procedure |
| Five | Installation Guideline and User Manual |
| Six | Conclusion and Recommendation |
| Appendix | Source Code, Schema, Samples, Glossary, References |

*Formatting note: Times New Roman 12pt, 1.5 spacing, 1-inch margins, page numbers from Chapter One.*

---

`);

parts.push(ch1);

// Load additional chapters from external chunk file if exists
const chunkPath = path.join(__dirname, 'report_chapters_2_6.md');
if (fs.existsSync(chunkPath)) {
  parts.push(fs.readFileSync(chunkPath, 'utf8'));
}
const expPath = path.join(__dirname, 'report_expansion.md');
if (fs.existsSync(expPath)) {
  parts.push(fs.readFileSync(expPath, 'utf8'));
}

const text = parts.join('\n\n');
fs.writeFileSync(outPath, text, 'utf8');
const words = text.split(/\s+/).filter(Boolean).length;
console.log('Written:', outPath);
console.log('Word count:', words);
