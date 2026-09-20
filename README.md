# Focus Intelligence (FocusOS) — Version 1

> **"Understand your time. Control your attention. Build better days."**

Focus Intelligence is a personal digital-behavior analytics platform designed to solve one of the greatest modern attention challenges: **uncontrolled short-form scrolling across multiple devices**.

Instead of manual data entry, users take screenshots of their device telemetry (Android Digital Wellbeing, Windows/macOS Battery & App Usage, Reels Tracker) at bedtime. Focus Intelligence analyzes the images via AI/OCR, structures and normalizes the metrics, provides a human-in-the-loop review stage, and populates an executive analytics dashboard.

---

## 🌟 Key Features (Version 1: Phases 1 to 8)

1. **Multi-Device Screen-Time Telemetry**:
   - Ingests data from smartphones (Android / iOS) and laptops (Windows / macOS).
   - Distinguishes **Active Usage** vs. **Background Usage** (e.g., Brave Browser: 1h 01m active, 1h 31m background).
   - Tracks phone unlocks and notification counts.

2. **Short-Form Content Intelligence (Signature Feature)**:
   - Tracks Instagram Reels, YouTube Shorts, and Snapchat Spotlight.
   - Monitors reel counts (e.g. 698 Reels) and shorts duration (3h 25m).
   - **24-Hour Attention Flow & Hotspot Detection**: Pinpoints exact hours of peak scrolling vulnerability (e.g. 8:00 PM – 10:00 PM).

3. **Screenshot Intelligence & OCR Pipeline**:
   - Pluggable `ScreenshotAnalyzer` interface with automated classifier (`ANDROID_DIGITAL_WELLBEING`, `WINDOWS_BATTERY_USAGE`, `SHORT_FORM_TRACKER`).
   - SHA-256 fingerprinting for duplicate screenshot detection and conflict resolution.
   - Per-field confidence scoring.

4. **Human Verification & Verification Studio**:
   - Interactive side-by-side view with original screenshot preview alongside detected applications and durations.
   - In-place editing allows users to adjust app names, durations, and categories prior to permanent persistence.

5. **Attention Score (Non-Blackbox)**:
   - Transparent score from 0 to 100 based on verifiable evidence:
     - `+Focused Work`
     - `+Target Adherence`
     - `-Excessive Reels/Shorts`
     - `-Frequent Phone Unlocks`
   - Detailed factor explanation modal answers *"Why is my Attention Score 72?"*

6. **Opportunity Scroll Cost & Recovery Simulator**:
   - Translates hours lost to algorithms into practical equivalents (deep learning hours, 90-min coding blocks, books read).
   - Interactive simulator projects recovered hours if daily reels scrolling is reduced by 30 min (+182.5 hours/year).

---

## 🏗️ Technology Architecture

- **Backend**: Node.js, Express, TypeScript, Prisma ORM (SQLite for instant zero-dependency local execution, fully compatible with PostgreSQL for production), JWT authentication, Multer for secure uploads.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Framer Motion.
- **Database**: Normalized relational schema covering `User`, `Profile`, `Device`, `Screenshot`, `Extraction`, `ExtractionField`, `Application`, `Category`, `UsageRecord`, and `DailyMetric`.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js v18+ (Tested on v24)
- npm v9+

### 2. Quick Start

#### Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed    # Pre-loads demo user, categories, devices, and 7 days of sample data
npm run dev           # Starts API server on http://localhost:5000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev           # Starts Vite dev server on http://localhost:5173
```

### 3. Demo Credentials
Focus Intelligence comes with a pre-configured demo account matching real-world telemetry:
- **Email**: `devang@focusintelligence.io`
- **Password**: `Password123!`
*(You can also use the one-click "Instant Demo Sign-in" button on the login screen).*

---

## 🧪 Testing & Verification

Run backend unit tests:
```bash
cd backend
npm test
```
Verifies duration parsers, attention score calculations, and scroll cost translations.
"# FocusOS" 
