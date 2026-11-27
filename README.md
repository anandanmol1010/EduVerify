# EduVerify — Admission Process Automation System

An automated, integrity-driven admission processing and academic document verification platform developed for college and university higher education admissions.

EduVerify eliminates paper-intensive scrutiny, slow manual evaluations, and fraudulent qualifications through:
1. **Simulated DigiLocker Document Integration** with automated academic marks population.
2. **Manual Document Upload with OCR & PDF Parsing** (powered by Tesseract.js & pdf-parse) to flag discrepancies between form inputs and certificate text.
3. **Configurable Dynamic Eligibility Engine** evaluating minimum percentage cutoffs, mandatory qualifying subjects, and document presence.
4. **Streamlined 2-Role System (Student & Admin)** with comprehensive scrutiny, correction workflows, and formal admission decisions handled seamlessly within the Administration portal.
5. **Atomic Seat Allocation** preventing course capacity over-subscription.
6. **Downloadable PDF Admission Letters** featuring cryptographic verification tokens and scannable QR codes for public validation.

---

## 🏛️ Technical System Architecture & Design Principles

EduVerify is architected to balance real-world institutional rigor with modern full-stack web standards:

### 1. Decoupled Document Provider Pattern
- The simulated document retrieval layer (`server/src/services/digiLockerService.js`) abstracts all depository interactions behind a standard provider interface with an OAuth-style consent workflow (Account selection, OTP simulation `123456`, consent screen, and credential exchange).
- This design ensures the system can transition seamlessly from the mock provider to an official DigiLocker API or state academic depository without altering admission application models or client interfaces.

### 2. Configurable Dynamic Eligibility Engine
- Rather than hardcoding cutoff percentages or qualifying subjects inside frontend forms, eligibility rules are defined per course in MongoDB (`Course.eligibilityCriteria`).
- The backend engine (`server/src/services/eligibilityEngine.js`) evaluates candidate Class 10th and 12th marks, verifies mandatory subject compliance (e.g., Mathematics and Physics for Engineering), calculates standardized composite scores, and outputs a structured rule-by-rule pass/fail verdict.
- **Separation of Concerns:** Passing eligibility does *not* auto-admit a student; human administrative scrutiny and document verification are strictly mandatory prior to acceptance.

### 3. OCR & Discrepancy Auditing Pipeline
- When candidates upload certificates manually (PDF, PNG, JPG), Multer stores files securely while `pdf-parse` (for text PDFs) and `Tesseract.js` (for scanned images) extract raw text.
- Entity extraction heuristics extract candidate name, exam roll number, passing year, and board.
- The system automatically compares extracted values with form inputs, flagging mismatches directly on the Admin's scrutiny desk.

### 4. Concurrency-Safe Seat Allotment & QR Verification
- When an Administrator confirms an applicant, atomic seat incrementation checks current enrollment against `course.totalSeats` before finalizing admission, preventing over-allocation.
- Generates an official PDF admission letter using `PDFKit` with a cryptographic verification token and embeds a QR code pointing to `/verify-admission/:admissionId`.
- The public verification endpoint (`GET /api/letters/public-verify/:admissionId`) checks letter validity and displays the authenticated candidate's name (masked for privacy) and enrolled program.

---

## 🎨 Institutional Theme & Visual Identity

The user interface adheres to a mature, trustworthy college admission aesthetic:
- **Primary Color:** Deep Forest Green (`#254D3C`)
- **Main Background:** Warm Ivory (`#F7F6F2`)
- **Surface:** Off-White (`#FFFFFF`)
- **Accent:** Muted Bronze (`#B18B56`)
- **Borders:** Soft Warm Grey (`#DDDCD5`)
- **Typography:** *Libre Baskerville* for formal institutional headings paired with clean, readable *Source Sans 3* for forms, tables, and dashboards.
- **Tone:** Natural, student-friendly phrasing across all public pages, avoiding unnecessary technical jargon or AI-template clutter.

---

## 💻 Technology Stack

- **Frontend:** React.js 18 with Vite, React Router v6, Tailwind CSS
- **Icons & Charts:** Lucide React, Recharts
- **Backend:** Node.js & Express.js (Modular ES Modules Architecture)
- **Database:** MongoDB Atlas with Mongoose
- **Authentication:** JWT (JSON Web Tokens) with HTTP Bearer Authorization & bcrypt password hashing
- **File & Document Processing:** Multer for file uploads, PDFKit for PDF generation, QRCode for verification badges, Tesseract.js & pdf-parse for OCR extraction

---

## 👥 User Roles & Access Control

The platform enforces clean, role-based access control across two distinct portals:

| Role | Access Level | Key Capabilities |
| :--- | :--- | :--- |
| **Student** | `/student/*` | Browse courses, connect to DigiLocker Demo or upload manually, auto-populate marks, fill complete personal & address records, check eligibility, save drafts, track application lifecycle, respond to correction requests with remarks, and download official admission letters. |
| **Admin** | `/admin/*` | Full institutional oversight: view real-time database dashboard statistics, manage course offerings and eligibility cutoffs, scrutinize incoming applications, preview uploaded certificates & OCR extractions, verify/reject documents, request corrections, make final admission decisions, and monitor seat quotas. |

---

## 🔐 Pre-Configured Demo Credentials

Use any of these pre-configured accounts to sign in immediately:

| Role | Email | Password environment variable |
| :--- | :--- | :--- |
| **Administrator** | `admin@eduverify.ac.in` | `SEED_ADMIN_PASSWORD` |
| **Student Applicant** | `student@eduverify.ac.in` | `SEED_STUDENT_PASSWORD` |

*(Prospective students can also click **Apply Now** on the homepage to register new accounts).*

---

## 📂 Simulated DigiLocker Integration

Official DigiLocker API requires statutory government approval and organizational clearances outside the scope of an academic demonstration. 

EduVerify provides an interchangeable, decoupled **Mock DigiLocker Provider** styled with a reference-matched light lavender interface, 6-digit OTP verification, and an explicit per-document consent screen. It is seeded with **six fictional student records** across CBSE, ICSE/ISC, and State Boards.

### 📱 Fictional Demo Mobile Numbers for Testing

| Demo Mobile Identifier | Associated Candidates | Board & Stream | Depository Documents & Scenario |
| :--- | :--- | :--- | :--- |
| `0000000001` | **Aarav Sharma**<br>**Priya Venkatesh** | CBSE (Science PCM)<br>CBSE (Science PCB) | Aadhaar Demo, Class 10, Class 12, Passing, Migration, Transfer.<br>Complete documentation; high-merit profiles. |
| `0000000002` | **Rohan Banerjee**<br>**Ananya Deshmukh** | ICSE/ISC (Commerce)<br>Maharashtra State (Science) | Aadhaar Demo, Class 10, Class 12, Passing, Migration.<br>Ideal for BBA vs B.Tech qualification checks. |
| `0000000003` | **Vikramaditya Rao**<br>**Meera Kulkarni** | CBSE (Science PCM)<br>Karnataka State (Science) | **Vikramaditya Rao has NO Aadhaar in demo depository** — ideal for testing the mandatory identity document **manual upload fallback**. |
| `0000000004` | **Harshvardhan Singh**<br>**Nisha Agarwal** | UP State Board<br>CBSE (Humanities) | **Nisha Agarwal has NO Aadhaar in demo depository** — tests manual upload fallback for Arts/Economics programs. |

> **Demonstration OTP:** Enter `123456` on the 6-digit verification screen (or click the *"Quick-fill (123456)"* helper button). No real SMS messages or telephone numbers are used.

### 🛡️ 5-Stage DigiLocker User Journey

1. **Screen 1 — Demo Mobile Login:** Enter fictional identifier (e.g. `0000000001`) with fixed `+91` prefix.
2. **Screen 2 — Select Account:** Choose the associated candidate profile (displays initials avatar, masked name like `A***v S***a`, and verification badge).
3. **Screen 3 — 6-Digit OTP Verification:** Enter demo OTP `123456` across six auto-advancing segmented input boxes with backspace navigation and countdown timer.
4. **Screen 4 — Document Selection & Explicit Consent:** All checkboxes start unchecked. Selectively check the **Aadhaar Demo Identity Document**, Class 10th Marksheet, Class 12th Marksheet, etc., and click **"Allow & Share Selected Documents"**.
5. **Screen 5 — Document Processing:** Displays an active progress bar while the backend exchanges credentials, retrieves authorized documents, and populates Stage 1 (Personal Details) and Stage 2 (Academic Details).

---

## 🚀 Installation & Local Execution

### Prerequisites
- Node.js (v18+ or v20+ recommended)
- npm or yarn

### 1. Backend Setup
```bash
cd server
npm install
```
Configure your environment variables in `server/.env` (an `.env.example` is also provided):
```env
PORT=5000
MONGODB_URI=mongodb+srv://<database-user>:<encoded-password>@<cluster>.mongodb.net/eduverify?retryWrites=true&w=majority
JWT_SECRET=<random-secret>
NODE_ENV=development
BASE_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
```
In Atlas, give the database user read/write access to `eduverify` and add the backend's outbound IP to the project's IP access list. Use the hostname from **Connect ? Drivers** and URL-encode the username and password. [Atlas driver connection guide](https://www.mongodb.com/docs/atlas/driver-connection/)

For demo workflows, set `SEED_ADMIN_PASSWORD` and `SEED_STUDENT_PASSWORD` in `server/.env`, then run `npm run seed` from `server`. Use at least 12 characters for each password. The command adds missing demo users, courses, settings and DigiLocker fixtures. You can rerun it while preserving existing records and PDFs.

#### MongoDB schema

| Collection | Stores | Key constraints and access paths |
| --- | --- | --- |
| `users` | Student and admin accounts, bcrypt password hashes | Unique email |
| `studentprofiles` | Personal details, addresses, Class 10 and 12 results | Unique user reference |
| `courses` | Course catalogue, seat counts and embedded eligibility rules | Unique course code |
| `applications` | Student and course references, submitted snapshots, eligibility evaluation, document references and status history | Unique application number. Indexed by student, course lookup and review status. |
| `documents` | Upload metadata, OCR results and verification state | Indexed for student listings and application and document type lookups |
| `admissionletters` | Issued letter metadata and verification token | Unique admission ID, application reference and token. Student listing index. |
| `notifications` | Recipient, message and read state | Indexed for recent and unread notifications |
| `admissionsettings` | Institution details and admission window | Single settings record by application convention |
| `mockstudentrecords` | Fictional DigiLocker candidates and available document metadata | Unique reference ID and sparse unique demo account ID |
| `digilockersessions` | Mock verification, consent and document-fetch sessions | Unique session ID. TTL index expires sessions by `expiresAt`. |

Mongoose owns field validation and index definitions. The API initializes the models at startup. MongoDB stores file paths and metadata. Uploaded documents and admission-letter PDFs are stored under `server/uploads/`, which needs persistent storage alongside the hosted API. The database credential belongs in the backend environment.

### 2. Frontend Setup
```bash
cd ../client
npm install
```

### 3. Run Development Servers
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd server
node src/server.js
```
The server starts on `http://localhost:5000` once MongoDB and the model indexes are ready. `GET /api/health` checks the live database connection.

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```
The client starts on `http://localhost:5173`.

---

## 🔄 Complete End-to-End Walkthrough

1. **Student Registration / Sign In:**
   - Go to `http://localhost:5173/login` and log in as `student@eduverify.ac.in` (use the value of `SEED_STUDENT_PASSWORD`).
2. **Start Admission Application:**
   - Click **"Apply Now"** or browse **"Courses"**.
   - Choose a program (e.g., **B.Tech in Computer Science & Engineering**).
3. **Simulated DigiLocker Auto-Fill (or Manual Upload):**
   - In **Stage 1 (Personal Details)** or **Stage 2 (Academic Details)**, click **"Connect to DigiLocker Demo"**.
   - **Screen 1:** Click `+91 0000000001` or type any demo mobile $\rightarrow$ Click **Continue**.
   - **Screen 2:** Select an account (e.g., **Aarav Sharma** `A***v S***a`).
   - **Screen 3:** Enter 6-digit OTP `123456` (or use Quick-fill) $\rightarrow$ Click **Verify**.
   - **Screen 4:** Selectively check the **Aadhaar Demo Identity Document**, Class 10th Marksheet, and Class 12th Marksheet $\rightarrow$ Click **"Allow & Share Selected Documents"**.
   - Observe automatic population of Stage 1 (Name, DOB, Gender, Address, PIN code) and Stage 2 (Class 10/12 roll numbers, marks, and subjects).
   - Enter missing details (such as School Name) manually.
4. **Mandatory Identity Document & Document Scrutiny:**
   - In **Stage 3 (Documents)**, review the checklist. The **Aadhaar Demo Identity Document** is mandatory. If an applicant denies consent or has an account without Aadhaar (e.g. `0000000003`), they can manually upload a sample identity document (PDF/PNG/JPG).
5. **Eligibility Check & Submission:**
   - In Stage 4, click **"Run Eligibility Check & Review"** to preview qualifications against cutoff rules.
   - Click **"Submit Final Application"**; application transitions to `Pending Verification`.
6. **Admin Scrutiny & Document Verification:**
   - Log out and log in as `admin@eduverify.ac.in` (use the value of `SEED_ADMIN_PASSWORD`).
   - Navigate to **"Applications"** (`/admin/applications`) and select the submitted application.
   - Scrutinize documents, preview PDFs, compare OCR extracted entities, and click **"Mark Verified"** on each mandatory document (including Aadhaar).
   - *(Optional)* If corrections are needed, click **"Request Correction"** with detailed remarks; the student receives a notification and can update documents and resubmit.
7. **Final Acceptance & Seat Allocation:**
   - With all mandatory documents verified, click **"Accept & Grant Admission"**.
   - The system atomically increments course allocated seats and generates an official PDF Admission Letter with a cryptographically signed QR code.
8. **Public QR Verification:**
   - Scan the QR code or visit `/verify-admission/:admissionId` to inspect the public verification record (masked for student privacy).

---

## 🧪 Automated Regression & Acceptance Test Suites

EduVerify provides two comprehensive test suites:

### 1. Updated DigiLocker Demo & Aadhaar Verification Suite (22 Tests)
Validates mobile login, account selection, 6-digit OTP, explicit document consent, demographic & academic auto-fill, mandatory Aadhaar enforcement, and manual upload fallback:
```bash
cd server
node test_updated_digilocker.js
```
*(Result: 22 / 22 Tests PASSED)*

### 2. Full System Simplification Regression Test Suite (38 Scenarios)
Validates the entire simplified 2-role lifecycle from registration to public QR admission letter validation:
```bash
cd server
node test_simplification.js
```
*(Result: 38 / 38 Scenarios PASSED)*
Output:
```text
===============================================================
   EduVerify Final Simplification & Regression Test Suite     
===============================================================

[Scenario 01] ✓ PASS: Student registration and login
[Scenario 02] ✓ PASS: Admin login with seed administrator credentials
[Scenario 03] ✓ PASS: Student is forbidden from Admin endpoints
[Scenario 04] ✓ PASS: Course creation and editing work
[Scenario 05] ✓ PASS: Course eligibility requirements are configurable
[Scenario 06] ✓ PASS: New applications initialize empty without hardcoded defaults
[Scenario 07] ✓ PASS: Complete personal details with demographics and address
[Scenario 08] ✓ PASS: Draft saving and retrieval persistence
[Scenario 09] ✓ PASS: DigiLocker Demo authentication & consent workflow
[Scenario 10] ✓ PASS: Selected documents retrieved from backend
[Scenario 11] ✓ PASS: Imported personal and academic fields populate correctly
[Scenario 12] ✓ PASS: Missing fields can be completed manually (e.g. School Name)
[Scenario 13] ✓ PASS: Dynamic subject lists with custom obtained and maximum marks
[Scenario 14] ✓ PASS: Manual-only admission works without DigiLocker
[Scenario 15] ✓ PASS: Mixed document submission (DigiLocker + Manual) works
[Scenario 16] ✓ PASS: Basic PDF text extraction and OCR supported for documents
[Scenario 17] ✓ PASS: Mandatory missing documents block final submission
[Scenario 18] ✓ PASS: Eligibility checking evaluates conditions accurately
[Scenario 19] ✓ PASS: Passing eligibility does NOT automatically accept application
[Scenario 20] ✓ PASS: Submitted application status transitions to Pending Verification
[Scenario 22] ✓ PASS: Final acceptance is blocked when documents are unverified
[Scenario 21] ✓ PASS: Admin can preview and verify individual documents
[Scenario 23] ✓ PASS: Correction requested with remarks and status updated
[Scenario 24] ✓ PASS: Resubmitted application returns to Pending Verification
[Scenario 25] ✓ PASS: Student cannot approve their own application (RBAC enforced)
[Scenario 26] ✓ PASS: Admin explicitly accepts eligible, verified application
[Scenario 27] ✓ PASS: Admin can reject an application with remarks
[Scenario 28] ✓ PASS: Seat allocated atomically upon acceptance without exceeding capacity
[Scenario 29] ✓ PASS: Pending applications cannot generate admission letters
[Scenario 30] ✓ PASS: Accepted applicant can access and download admission letter
[Scenario 31] ✓ PASS: Public QR-based admission letter verification works
[Scenario 32] ✓ PASS: Application status notifications are visible to student
[Scenario 33] ✓ PASS: Admin dashboard statistics reflect actual database records
[Scenario 34] ✓ PASS: Removed pages and navigation links are absent
[Scenario 35] ✓ PASS: No retained functionality depends on deleted APIs or models
[Scenario 36] ✓ PASS: Data persists across sessions and re-login
[Scenario 37] ✓ PASS: Frontend production build compiles cleanly without errors
[Scenario 38] ✓ PASS: Backend starts and connects cleanly to database

===============================================================
Results: 38 / 38 Scenarios PASSED
===============================================================
```

---

## 🏛️ Project Directory Structure

```
EduVerify/
├── client/                      # React + Vite Frontend
│   ├── src/
│   │   ├── components/          # Navbar, Footer, StatusBadge, DigiLockerModal, Layout
│   │   ├── context/             # AuthContext (Student & Admin)
│   │   ├── pages/
│   │   │   ├── admin/           # AdminDashboard, AdminApplicationListPage, AdminApplicationReviewPage, CourseManagementPage, SettingsPage
│   │   │   ├── student/         # StudentDashboard, AdmissionWizard, ApplicationsPage, ApplicationDetailPage, DocumentsPage, LettersPage, ProfilePage
│   │   │   ├── HomePage.jsx     # Institutional landing page
│   │   │   ├── CoursesPage.jsx  # Academic program browser
│   │   │   ├── GuidelinesPage.jsx # Admission guidelines
│   │   │   ├── LoginPage.jsx    # Authentication page
│   │   │   ├── RegisterPage.jsx # Student registration
│   │   │   └── AdmissionVerificationPage.jsx # Public QR verification page
│   │   ├── services/            # Axios API client
│   │   ├── App.jsx              # Application routing & route protection
│   │   ├── index.css            # Tailwind CSS rules & institutional tokens
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js       # Forest-green & ivory design system
│   └── vite.config.js
│
├── server/                      # Node.js + Express REST API
│   ├── src/
│   │   ├── config/              # MongoDB connection and health check
│   │   ├── middleware/          # JWT auth middleware (protect, authorize)
│   │   ├── models/              # User, Course, Application, Document, AdmissionLetter, Notification, AdmissionSetting, MockStudentRecord, DigiLockerSession
│   │   ├── routes/              # authRoutes, courseRoutes, applicationRoutes, documentRoutes, adminRoutes, admissionLetterRoutes, notificationRoutes, digiLockerRoutes
│   │   ├── services/            # digiLockerService, eligibilityEngine, ocrService
│   │   ├── utils/               # admissionLetterGenerator, auditLogger
│   │   ├── seeds/               # seed.js (initial admin, student, courses, settings, mock student records)
│   │   └── server.js            # Express server bootstrap
│   ├── uploads/                 # Static uploaded files and generated admission letters
│   ├── test_simplification.js   # 38-scenario regression test runner
│   └── package.json
└── README.md                    # Project documentation
```

---

## 🛡️ License & Academic Declaration
EduVerify is developed as a college-level Full-Stack Development capstone project demonstrating institutional admission automation, intelligent document integration, and robust full-stack architecture.
