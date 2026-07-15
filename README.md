# VCCC Management System

**A Web-Based Ministry Records Management and QR-Enabled Delegate Attendance Tracking System for Victory Chapel Christian Center – Davao**

## Description

The VCCC Management System is a web-based platform developed for Victory Chapel Christian Center – Davao to replace its manual, Excel-based method of tracking ministry records. It centralizes information on pastors, their spouses, disciples, churches, and districts into a single system with proper organizational hierarchy (district → church → pastor → disciples), while introducing QR-code technology to modernize how the church manages conference attendance and identification. Rather than manually producing paper meal-claim stubs for multi-day conferences or recreating ID designs in Canva for every event, the system generates a reusable QR code per delegate at the moment their record is created — the same code doubles as both their printable ID badge and their scannable meal/attendance stub for the entire event.

## Objectives

**General Objective:** To design and develop a centralized, web-based management system that digitizes Victory Chapel Christian Center – Davao's ministry records and automates delegate identification and attendance tracking during conferences.

**Specific Objectives:**
1. To eliminate the reliance on manually maintained Excel spreadsheets for tracking pastors, disciples, churches, and district assignments.
2. To provide a structured, relational record of ministry assignments — including pioneering, takeovers, transfers, and historical (legacy) records — with a complete, editable assignment history per pastor and per church.
3. To automatically generate a single QR code per delegate (pastor, spouse, or disciple) that serves two purposes: a printable identification badge and a scannable attendance/meal-claim credential, removing the need for physical paper stubs.
4. To replace manual, per-event ID design work in Canva with a flexible badge template system, where staff only need to adjust a background/layout once and the system auto-populates each delegate's photo, name, and QR code.
5. To provide a QR scanning interface for real-time attendance and meal-slot check-in during conferences, tracked per day and per time slot (Morning/Afternoon/Evening).
6. To generate configurable attendance and delegate reports, exportable to Excel, with user-selectable fields/columns per section.
7. To implement role-based user access (Admin/Staff) to control who can manage records versus who can only view or scan.

## Scope

**The system covers:**
- Management of Pastors, Wives, and Disciples, including profile details, contact information, and spiritual lineage (mentor/disciple relationships).
- Management of Churches and Districts, including church-district groupings and pastor assignment history (pioneering, takeover, transfer, legacy/backfilled records).
- Conference/Event management, including auto-generated conference days and time slots (Morning, Afternoon, Evening) tied to meal tracking.
- QR code generation for delegate badges, usable for both physical ID printing and event check-in.
- A QR scanning module for recording attendance/meal check-ins per conference day and time slot.
- Attendance reporting grouped by district and church, with search/filter and Excel export.
- Excel export of records across all major sections (Pastors, Churches, Districts, Disciples), with user-selectable columns.
- User account management with role-based access control (Admin, Staff).

**Out of scope:**
- Financial/donation management or accounting.
- Payroll or compensation tracking for pastors/staff.
- Native mobile applications (the system is a responsive web application, usable on mobile browsers but not distributed via app stores).
- Physical printing hardware integration — the system generates badge/QR designs digitally; printing is handled externally.

## Tech Stack

**Frontend**
- Vue 3 (Composition API) — core UI framework
- Vue Router — client-side routing/navigation
- Vite — build tool and dev server
- Tailwind CSS — utility-first styling

**Backend / Database**
- Supabase — hosted Postgres database, authentication, and file storage (used for pastor/disciple photos and badge assets)

**Key Libraries**
- `qrcode.vue` — QR code generation for badges/IDs
- `html5-qrcode` — camera-based QR scanning for attendance check-in
- `exceljs` + `file-saver` — Excel report generation and export
- `jspdf` + `jspdf-autotable` — PDF export (e.g., pastoral history)
- `html2canvas` / `dom-to-image-more` — rendering badge designs to downloadable images
- `jszip` — bulk badge/asset packaging
- `sweetalert2` — confirmation dialogs and alerts
- `axios` — HTTP requests

**Hosting/Deployment**
- Vercel — frontend hosting and continuous deployment from GitHub
- GitHub Actions — scheduled task (keeps the Supabase database active to avoid free-tier inactivity pausing)

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Requires a `.env.local` file in `frontend/` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
