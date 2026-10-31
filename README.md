# VyaparOS AI (व्यापारOS)

> **“Aaj kya khareedun, kitna, aur kyun?”**  
> *(What should I buy next, how much, and why?)*

**Autonomous Retail Decision Intelligence & Paytm Merchant Growth Engine for Bharat**  
*Independent Hackathon Prototype developed for Paytm's Merchant Growth AI Track.*

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2_App_Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22_SQLite-2D3748?logo=prisma)](https://www.prisma.io/)
[![Claude Sonnet 4.6](https://img.shields.io/badge/LLM-Claude_Sonnet_4.6_(VyceAI)-7C3AED)](https://vyceai.com)
[![Whisper AI](https://img.shields.io/badge/Speech_STT-Local_Whisper_ONNX-00A67E)](https://github.com/xenova/transformers.js)
[![Tesseract OCR](https://img.shields.io/badge/Vision_OCR-Tesseract.js_On--Device-F59E0B)](https://tesseract.projectnaptha.com/)
[![Paytm Soundbox](https://img.shields.io/badge/Audio-Paytm_Soundbox_3.0-002E6E)](https://paytm.com)
[![Vitest](https://img.shields.io/badge/Tests-17%2F17_Passed-success)](https://vitest.dev)
[![Playwright](https://img.shields.io/badge/E2E-Playwright_Verified-green)](https://playwright.dev)

---

## 1. Executive Summary for Judges

Small retail shopkeepers across India lose significant daily profit to two chronic structural risks:
1. **Lost Revenue & Customer Churn:** Turning away walk-in customers because fast-moving stock is exhausted or customer requests were forgotten.
2. **Dead Capital & Cash Flow Traps:** Tying up scarce working capital in slow-moving speculative stock or arbitrary supplier bulk packs that exceed available cash.

**VyaparOS AI** eliminates guesswork by fusing:
- **Recorded sales & continuous double-entry stock ledger movements**
- **Unfulfilled customer requests (lost demand capture)**
- **Confirmed supplier wholesale quotes (MOQ, delivery freight, lead times)**
- **Real-time spendable purchasing budget**
- **Customer commitments with explicitly labelled uncertainty**

The merchant understands every proposed action through plain Hinglish/English rationales, visible leftover scenarios, and retains total control through an explicit human-in-the-loop approval workflow.

---

## 2. Key Capabilities & Screen Walkthrough

### 1. TODAY Workspace (Mission Control)
- **Real-Time Counters:** Live Spendable Purchasing Budget (e.g., ₹1,000), Sales Recorded Today (e.g., ₹1,680 across 3 sales), and Pending Customer Requests.
- **Top 3 Prioritized Action Cards:** Highlight urgent decisions (e.g., approving the A3 Sketchbook purchase to capture ₹450 contribution, or checking stock on depleted SKUs).
- **Quick Action Bar:** 1-click shortcuts to Record Sale, Record Missed Demand, or Add Supplier Quote.

### 2. RECORD (Unified Multimodal Capture)
- **Type Freely:** Clean keyboard input with instant parsing.
- **Speak (Voice):** Powered by on-device local Whisper AI (`@xenova/transformers` with `Xenova/whisper-tiny` ONNX). Records raw 16kHz PCM audio and transcribes locally with **zero external cloud dependency** and **zero firewall restrictions**.
- **Scan / Upload (Vision):** Integrated camera viewfinder and photo upload powered by on-device `Tesseract.js` OCR and Claude Sonnet 4.6 Vision.
- **100% Merchant Control:** An extracted draft **never** automatically modifies inventory or places an order. Extracted values load into an editable canvas and review form before final confirmation.

### 3. STOCK (Continuous Double-Entry Inventory Ledger)
- **Real-Time Unit Economics:** Exact product variant, on-hand quantity, reserved quantity, available quantity, recorded unit cost, and rule-based status badges (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`).
- **8 Ledger Movement Types:** `OPENING`, `PURCHASE_RECEIPT`, `SALE`, `CUSTOMER_RETURN`, `SUPPLIER_RETURN`, `DAMAGE`, `DISCARD`, and `PHYSICAL_COUNT_CORRECTION`.
- Continuous movement ledger prevents arbitrary monthly stock resets.

### 4. DEMAND (Lost Revenue Intelligence)
- Captures walk-in customer requests, phone enquiries, and WhatsApp pastes.
- Strict isolation of casual enquiries from confirmed customer commitments.
- Reasons for failure recorded (`OUT_OF_STOCK`, `INSUFFICIENT_QUANTITY`, `NOT_STOCKED`, `PRICE_UNMATCHED`).

### 5. PURCHASE PLAN (Autonomous Integer Paise Solver)
- Evaluates supplier quotes against spendable budget, minimum order quantities (MOQ), and delivery freight charges.
- Computes counterfactual leftover inventory scenarios:
  - **Confirmed Complete Scenario:** All demanded units sold; net contribution calculated.
  - **Speculative Leftover Scenarios:** Explicitly calculates risk if units remain unsold on shelf.
- **AI Strategic Briefing & WhatsApp Drafts:** Generates street-smart Hinglish voice scripts and pre-drafted WhatsApp messages for suppliers and customers.

### 6. ORDERS & FULFILLMENTS
- Tracks approved supplier purchase orders from dispatch to physical receipt.
- One-click physical stock check-in updates the continuous inventory ledger.
- Customer pickup fulfillments decrement reserved inventory and collect cash/UPI payments.

### 7. INTERACTIVE VISUAL REPORTS
- **Visual Analytics:** Interactive multi-bar timeline of gross sales revenue vs. net contribution (profit).
- **Payment Breakdown Donut:** UPI / Paytm QR vs. Cash vs. Khata Due.
- **Trade Sector Progress Meters:** Retail distribution across Kirana, Electronics, Healthcare, and Stationery.
- **Opportunity Loss Funnel:** Quantifies missed demand volume and lost revenue.

### 8. VYAPAROS COPILOT (Universal AI Assistant)
- Floating assistant available across all tabs.
- Powered by **Claude Sonnet 4.6** (via VyceAI) with a deep, humanized on-device retail intelligence engine.
- Accurately computes exact retail margins, wholesale rates, and merchandising tips for any queried item:
  - **Ballpoint Pens:** ₹100 MRP pack of 10 (₹10/pen), ₹65 cost (₹6.50/pen) &rarr; **35% to 45% margin** with checkout counter placement advice.
  - **Gel Pens:** 30% to 35% margin for student exam seasons.
  - **Atta / Kirana:** 8% to 11% gross margin with rapid 2–3 day inventory turnover velocity.
  - **65W GaN Mobile Chargers:** 48% to 55% margin generating high cash contribution.
- Spoken text-to-speech audio readback in Hindi and Indian English.

### 9. PAYTM MERCHANT GROWTH & SOUNDBOX 3.0
- **All-in-One UPI QR:** Live simulated counter QR supporting Paytm, PhonePe, GPay, and BHIM UPI.
- **Soundbox 3.0 Voice Alerts:** Authentic dual-tone audio chime (784Hz + 1046.5Hz) followed by spoken Hindi audio: *"Paytm par ₹X prapt hue"*.
- **T+0 Instant Settlement:** Real-time settlement switch that sweeps counter UPI receivables directly into the merchant's spendable purchasing budget.
- **B2B Vendor Payouts:** Simulated Instant NEFT/RTGS payouts to wholesale distributors with generated UTR tracking numbers.

---

## 3. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | React Server Components, TypeScript, Server Actions |
| **Styling** | Tailwind CSS | Accessible merchant design, warm white (`#FAF9F6`), dark navy (`#0F172A`), teal accents (`#0D9488`) |
| **Database** | Prisma ORM + SQLite | Single-instance ledger; automatically maps to `/tmp/dev.db` on Vercel |
| **Decision Engine** | Pure TypeScript | Deterministic integer paise constraint solver (zero float rounding drift) |
| **LLM & Copilot** | Claude Sonnet 4.6 (VyceAI) | Primary LLM via `https://vyceai.com/v1` with intelligent local fallback |
| **Voice STT** | Local Whisper AI | `@xenova/transformers` running `Xenova/whisper-tiny` ONNX on-device |
| **Vision OCR** | Tesseract.js + Claude Vision | On-device worker OCR parsing receipts, invoices, and challans |
| **Soundbox Engine** | Web Audio API + SpeechSynthesis | Paytm dual-tone chime (784Hz / 1046.5Hz) + Hindi voice alerts |
| **Unit Testing** | Vitest | 17/17 tests passing across business logic, integration, and Paytm services |
| **E2E Testing** | Playwright | Full critical merchant journey browser test (Today &rarr; Stock &rarr; Demand &rarr; Plan &rarr; Approve &rarr; Receive &rarr; Fulfill) |

---

## 4. Quickstart: Local Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Steps

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/vyaparos-ai.git
cd vyaparos-ai

# 2. Install dependencies
npm install

# 3. Synchronize database schema & seed initial retail catalog
npx prisma db push
npm run seed

# 4. Run tests
npm test            # Runs Vitest unit & integration tests (17 passed)
npm run test:e2e    # Runs Playwright browser E2E test

# 5. Start development server
npm run dev

# Or build & run production server:
npm run build
npm run start
```

Open **`http://localhost:3000`** in your browser.

---

## 5. Deployment Guide: Deploy to Vercel in 2 Minutes

This project is fully optimized for **Vercel Serverless** deployment with zero configuration.

### Option A: Via GitHub & Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git init -b main
   git add .
   git commit -m "feat: initial commit of VyaparOS AI"
   git remote add origin https://github.com/<your-username>/vyaparos-ai.git
   git push -u origin main
   ```

2. **Import into Vercel:**
   - Log in to [vercel.com](https://vercel.com).
   - Click **Add New... &rarr; Project**.
   - Select your GitHub repository (`vyaparos-ai`).

3. **Configure Environment Variables:**
   Under **Environment Variables**, add:
   ```env
   AI_BASE_URL=https://vyceai.com/v1
   AI_API_KEY=sk-ebc9907afa6ab56e75474b330a6dacc873b80983908f3ce7
   AI_MODEL=claude-sonnet-4-6
   ```

4. **Deploy:**
   - Click **Deploy**.
   - Vercel automatically runs the `vercel.json` build command (`npx prisma generate && npx prisma db push --skip-generate && next build`).
   - SQLite automatically binds to `/tmp/dev.db` and auto-seeds the demonstration retail mart on first request!
   - Share your live `.vercel.app` URL with judges!

---

## 6. Project Architecture & Directory Structure

```
munafa-ai/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # App layout, fonts, and global metadata
│   │   ├── page.tsx                  # Main workspace mounting all tabs & copilot
│   │   ├── globals.css               # Tailwind design system & merchant theme
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── ask/              # Copilot Q&A endpoint (Claude Sonnet 4.6 + engine)
│   │       │   └── briefing/         # Voice strategic briefing generator
│   │       ├── bootstrap/            # Auto-initialization and merchant state loader
│   │       ├── decision/
│   │       │   ├── evaluate/         # Integer paise purchase proposal solver
│   │       │   └── approve/          # 1-click PO creation and budget reservation
│   │       ├── events/
│   │       │   ├── sale/             # Confirmed sales recording endpoint
│   │       │   ├── stock/            # Continuous stock movement ledger endpoint
│   │       │   ├── demand/           # Missed customer demand capture endpoint
│   │       │   └── quote/            # Supplier wholesale quote intake endpoint
│   │       ├── extract/
│   │       │   ├── audio/            # Local Whisper AI on-device speech transcription
│   │       │   ├── bill/             # Tesseract.js on-device OCR & Claude Vision scanner
│   │       │   └── text/             # Natural language parser for typed notes
│   │       ├── orders/
│   │       │   └── [id]/
│   │       │       ├── receive/      # Physical stock receipt check-in
│   │       │       └── fulfill/      # Customer commitment fulfillment
│   │       ├── paytm/
│   │       │   ├── qr/               # All-in-One dynamic UPI QR generator
│   │       │   ├── settle/           # T+0 Instant Settlement credit to budget
│   │       │   ├── payout/           # B2B Supplier payout execution
│   │       │   └── status/           # Payment verification gateway
│   │       ├── reports/              # Aggregated audit reports & analytics
│   │       └── seed/reset/           # Demo state reset endpoint
│   ├── components/
│   │   ├── Navbar.tsx                # Brand header, budget pill, reset action
│   │   ├── TodayScreen.tsx           # Today dashboard & top 3 action cards
│   │   ├── RecordScreen.tsx          # Multimodal input (Type, Voice, Camera OCR)
│   │   ├── StockScreen.tsx           # Continuous stock movement ledger
│   │   ├── DemandScreen.tsx          # Unfulfilled customer demand manager
│   │   ├── PurchasePlanScreen.tsx    # Autonomous decision engine & scenario cards
│   │   ├── OrdersScreen.tsx          # Supplier orders & customer fulfillments
│   │   ├── ReportsScreen.tsx         # Interactive visual graphs & payment donut
│   │   ├── VyaparCopilotChat.tsx     # Floating Claude Sonnet 4.6 AI Copilot
│   │   ├── PaytmSoundboxModal.tsx    # Soundbox 3.0 audio chime & QR modal
│   │   └── AiAdvisorPanel.tsx        # Strategic Hinglish voice briefings & WhatsApp drafts
│   └── lib/
│       ├── ai-assistant.ts           # Claude Sonnet 4.6 + deep retail margin engine
│       ├── ai-extractor.ts           # Multilingual NLP parser (Hindi/Hinglish/English)
│       ├── bill-fixtures.ts          # Verified sample invoice fixtures
│       ├── db.ts                     # Prisma client with Vercel /tmp SQLite support
│       ├── decision-engine.ts        # Integer paise deterministic constraint solver
│       ├── local-whisper.ts          # On-device Whisper AI speech transcription
│       ├── paytm-service.ts          # Paytm All-in-One QR, Soundbox & T+0 Settlement
│       ├── seed-data.ts              # College Stationery & Retail Mart demonstration catalog
│       └── soundbox.ts               # Web Audio API Paytm audio chime synthesizer
├── prisma/
│   └── schema.prisma                 # Complete database schema (13 relational models)
├── e2e/
│   └── munafa.spec.ts                # Critical merchant journey Playwright test
├── vercel.json                       # Vercel deployment configuration
├── package.json                      # Scripts, dependencies, and metadata
└── README.md                         # Project documentation
```

---

## 7. Verification & Test Suite

The codebase includes comprehensive automated tests covering all business logic, mathematical decision boundaries, and UI journeys:

```bash
# 1. Run Vitest Unit & Integration Test Suite:
npm test

# Output:
# ✓ src/lib/integration.test.ts (5 tests)
# ✓ src/lib/decision-engine.test.ts (7 tests)
# ✓ src/lib/paytm.test.ts (5 tests)
# Test Files: 3 passed (3) | Tests: 17 passed (17)

# 2. Run Playwright End-to-End Critical Journey:
npm run test:e2e

# Output:
# ok 1 [chromium] › e2e/munafa.spec.ts › Step 1-8: Full demo walkthrough (Today → Stock → Demand → Plan → Approve → Receive → Fulfill)
# 1 passed
```

---

## 8. Hackathon Track Disclaimer

*VyaparOS AI is an independent prototype developed for Paytm's Merchant Growth AI Track. It is not an official Paytm product and does not imply official endorsement or production integration access. All payment simulations strictly adhere to high-fidelity sandbox protocols without executing real monetary transactions.*

---

**Developed with ❤️ for Bharat's Shopkeepers.**
