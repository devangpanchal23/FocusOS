# FocusOS — Autonomous Personal Productivity Operating System

> **"Observe → Understand → Predict → Plan → Execute → Learn → Adapt"**

FocusOS is a unified, autonomous personal productivity operating system and extensible platform. It addresses modern attention fragmentation by continuously observing, predicting, planning, and optimizing the user's digital environment while keeping the human firmly in control through zero-trust governance.

---

## 🚀 Version Evolution

### Version 1 — Working Product
- **Multi-Device Telemetry**: Phone (Android/iOS) and Laptop (Windows/macOS) active vs. background usage ingestion.
- **Short-Form Content Intelligence**: Tracks Instagram Reels, YouTube Shorts, and doomscroll hotspots.
- **Screenshot AI/OCR Pipeline**: Pluggable `ScreenshotAnalyzer` with SHA-256 fingerprinting.
- **Verification Studio**: Human-in-the-loop review of telemetry prior to persistence.
- **Attention Score & Opportunity Cost**: Grounded 0–100 scoring with recoverable hour simulation.

### Version 2 — Advanced & Production-Ready
- **Focus Studio**: Customizable focus profiles (Deep Work, Study, Coding) with Pomodoro intervals.
- **App & Site Blocker**: Friction screens, scheduled blocks, and intentional friction overrides.
- **Routines Engine**: Daily time-blocked schedules with adherence analytics.
- **Smart Automations**: Condition-action rules triggered by telemetry thresholds.
- **Gamification**: Levels, XP rewards, achievements, and unbroken focus streaks.
- **Multi-Format Reports**: Export in CSV, JSON, and printable HTML digests.

### Version 3 — AI-Powered Intelligent Ecosystem
- **AI Telemetry Assistant**: Natural language inquiries grounded in verified telemetry facts.
- **AI Coach & Dynamic Personas**: Coaching profiles (Study, Coding, Deep Work, Wellness).
- **Predictive Analytics & Risk Engine**: Vulnerability forecasting and behavioral risk detection.
- **AI Daily Planner & SMART Goals**: Chronological plan generator and automated progress tracking.
- **Accountability Circles**: Privacy-preserving social circles and leaderboard.
- **Developer Platform & Privacy Center**: API keys, webhooks, AES-256 at rest, and audit logs.

### Version 4 — Autonomous Intelligence, Platform & Global Scale
- **Autonomous AI Agent Swarm**: 6 specialized agents (Productivity, Focus, Digital Wellness, Planning, Analytics, Automation).
- **Central AI Orchestrator**: Natural language goal decomposition, multi-agent dispatch, and grounded synthesis.
- **Human-in-the-Loop Control**: Three-tier risk classification (`READ_ONLY`, `LOW_RISK`, `HIGH_IMPACT`) with staged **Preview → Confirm → Execute → Result** gates.
- **Visual AI Workflow Studio**: Drag-and-drop node graph canvas (Trigger → Condition → AI Node → Action → Approval) with template library.
- **Personal Context & Knowledge Vault**: Differentiates Observed Telemetry, User Preferences, and AI Assumptions.
- **Universal Productivity Search (`Cmd/Ctrl + K`)**: Global instant search across apps, focus sessions, goals, notes, workflows, and chats.
- **Scenario Simulation ("What If?" Engine)**: Elasticity sliders estimating projected Attention Score gains and fatigue delta.
- **Adaptive Productivity Model**: Self-tuning optimal focus and break intervals based on session fatigue drop-offs.
- **Personal Productivity Home (`/os`)**: Intelligent 5-pillar operating system dashboard (Now, Next, Insights, Recommended, Progress).
- **Cross-Device Orchestration & Integrations**: Device registry with remote sync and integrations for Google Calendar, Spotify, Notion, GitHub, Slack, and Todoist.
- **Productivity App Marketplace**: Third-party plugins, focus packs, and anti-doomscroll agents with sandbox isolation.
- **SaaS Monetization & Enterprise**: Free, Pro, Premium, and Enterprise plans, mock invoices, SAML SSO/SCIM, and organization policies.
- **Chaos Resilience & APM Observability**: Fault injection testing (DB latency, AI outage, queue backpressure) and API p95 observability.

---

## 🏗️ Technology Architecture

- **Backend**: Node.js, Express, TypeScript, Prisma ORM (SQLite / PostgreSQL ready), JWT authentication, Multer for secure ingestion.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Framer Motion.
- **API Surface**: Cleanly segregated routes under `/api/*`, `/api/v3/*`, and `/api/v4/*`.
- **Testing**: 4 comprehensive automated test suites covering unit algorithms, studio features, intelligent ecosystem, and autonomous multi-agent orchestration.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js v18+
- npm v9+

### 2. Setup & Database Seed
```bash
# In backend/
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed

# In frontend/
npm install
```

### 3. Run Automated Tests
```bash
# In backend/
npm test           # Version 1 unit tests
npm run test:v3    # Version 3 ecosystem integration tests (23 passed)
npm run test:v4    # Version 4 autonomous platform tests (34 passed)
```

### 4. Run Development Environment
```bash
# Start backend on port 5000:
cd backend && npm run dev

# Start frontend on port 5173:
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser. Demo account is pre-seeded at `devang@focusintelligence.io`.
