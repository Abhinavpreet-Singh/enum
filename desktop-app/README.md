# ENUM Desktop App

A **Next.js + Tauri** secure desktop examination client for the ENUM platform.

## Architecture

```
desktop-app/
├── src/
│   ├── app/           ← Next.js pages (splash, login, pre-exam, exam, submitted)
│   ├── components/    ← UI components (exam, security, pre-exam)
│   ├── lib/           ← API client & Tauri bridge
│   ├── services/      ← Security, heartbeat, autosave, violations
│   ├── store/         ← Zustand exam state
│   └── types/         ← Shared TypeScript types
└── src-tauri/         ← Rust / Tauri native layer
    └── src/commands/  ← Security detection, system info, window control
```

## Backend

Uses the **single shared ENUM backend**. No duplicate APIs or databases.

New desktop-specific endpoints added at `/api/v1/desktop/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/assessment/:testCode` | Public — validate test code |
| POST | `/login` | Candidate authentication |
| POST | `/attempt/start` | Start/resume attempt |
| PUT | `/attempt/:id/heartbeat` | Live heartbeat |
| PUT | `/attempt/:id/autosave` | Save answers |
| POST | `/attempt/:id/violation` | Log violation |
| POST | `/attempt/:id/submit` | Final submission |

## Development

### Prerequisites

- Node.js 20+
- Rust (rustup) — https://www.rust-lang.org/tools/install
- Tauri CLI v2: `npm install -g @tauri-apps/cli`

### Setup

```bash
cd desktop-app
npm install
cp .env.example .env.local
# Edit .env.local with your backend URL
```

### Development (web only)

```bash
npm run dev
# Open http://localhost:3000
```

### Development (Tauri)

```bash
npm run tauri:dev
```

### Build

```bash
npm run tauri:build
# Installer in: src-tauri/target/release/bundle/
```

## Application Flow

1. **Splash** — Animated ENUM branding
2. **Login** — Enter test code / assessment link → candidate credentials
3. **Pre-Exam** — Automated system checks (camera, VM, monitors, internet, etc.)
4. **Exam** — Question navigator + Monaco editor + real-time security monitoring
5. **Submitted** — Score display + session cleanup

## Security Features

All security settings are **dynamically read from the backend** (`AssessmentSetting`). No hardcoded restrictions.

- Force fullscreen (Tauri + browser fullscreen API)
- DevTools detection (window size heuristic)
- Copy/paste monitoring
- Tab switch / focus loss detection
- VM detection (WMIC/SMBIOS heuristics via Rust)
- Remote desktop detection
- Multi-monitor check
- Keyboard shortcut blocking
- Context menu disabled
- Heartbeat (proctor can see live/offline)
- Violation logging with severity escalation

## Icons

Generate with:
```bash
npx @tauri-apps/cli icon src-tauri/icons/source.png
```
