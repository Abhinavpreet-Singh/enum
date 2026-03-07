# ENUM360: Production Bug Simulation Platform

A modern, interactive learning platform designed to teach developers how to identify, diagnose, and fix real-world production bugs through hands-on simulations. ENUM360 bridges the gap between theoretical programming knowledge and practical debugging skills.

## 🎯 Problem We're Solving 

Most programming courses teach syntax and algorithms, but they don't prepare developers for the reality of production environments:

- **Hydration mismatches** in server-side rendered apps
- **Memory leaks** from improper event listener cleanup
- **Infinite loops** caused by missing useEffect dependencies
- **Race conditions** in async operations
- **API timeouts** and resource exhaustion
- **CORS errors** and security misconfiguration

Traditional learning platforms show the bug and solution side-by-side. **ENUM360 does something different**: it places you in a real browser-like sandbox environment where you can see the broken app in action, then fix it and watch it come back to life in real-time.

## ✨ Key Features

### 1. **Live Browser Preview**
- Embedded Sandpack-powered React sandbox
- Real-time rendering as you type
- See bugs and fixes immediately without page refresh
- Console output mirroring browser behavior

### 2. **Code Editor Integration**
- Monaco Editor with syntax highlighting
- Auto-detection of JSX/TSX files
- Multi-file editing support
- Resizable panels for optimal workflow

### 3. **Intelligent Simulation System**
- **Easy simulations** (5-15 min): Basic syntax errors
- **Medium simulations** (15-30 min): React hooks, event handling
- **Hard simulations** (30+ min): Race conditions, optimization
- Progressive difficulty with increasing XP rewards

### 4. **Guided Learning**
- Clear incident descriptions
- Step-by-step guides to troubleshoot
- Collapsible hints system
- Solution viewing with code explanation

### 5. **XP & Progress System**
- Earn XP for solving simulations
- Difficulty multiplier: Easy (30 XP) → Medium (80 XP) → Hard (100+ XP)
- Track progress across categories

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 16.1.6 with React 19.2.3
- **Editor**: Monaco Editor (VS Code engine)
- **Live Preview**: Sandpack (CodeSandbox's API)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Authentication**: JWT-based protected routes

### Project Structure
`
src/
├── app/sidebar/simulations/
│   ├── page.tsx                 # Simulations list
│   └── [id]/page.tsx            # Individual simulation
├── components/simulations/
│   ├── simulation-workspace.tsx # Main 3-panel workspace
│   └── live-preview.tsx         # Sandpack wrapper
├── data/
│   └── simulations.ts           # Simulation definitions
└── hooks/
    └── useAuth.ts               # Authentication
`

## 🎮 How It Works

### Frontend Simulations (Live Preview)
1. **Open editor** → See buggy React code
2. **Preview pane** → Shows broken app rendering
3. **Edit code** → Preview auto-updates (debounced)
4. **View error** → Inline error overlay shows issues
5. **Apply solution** → Load solution and see it work

### Backend Simulations (Console Output)
1. **Write code** → Node.js backend code
2. **Click Run** → Executes via /api/run
3. **View console** → Shows output
4. **Check solution** → Compare results

## 📚 Simulation Categories

### 🎨 Frontend Simulations
- Hydration Mismatches: SSR/CSR sync
- Memory Leaks: Event listener cleanup
- Infinite Loops: useEffect dependencies
- State Management: Context, closures
- Component Lifecycle: Timing issues

### ⚙️ Backend Simulations
- N+1 Query Problems: DB optimization
- Race Conditions: Async ordering
- API Timeout Handling: Degradation
- CORS Configuration: Security
- Resource Exhaustion: Memory/CPU

### 🔗 Fullstack Simulations
- Client-Server Mismatch: API contracts
- Data Serialization: Type mismatches
- Authentication Flows: Token expiry

### 🚀 DevOps Simulations
- Docker Issues: Runtime problems
- CI/CD Failures: Pipeline debugging
- Environment Variables: Config

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm
- Modern browser

### Installation

`ash
git clone <repo-url>
cd enum360
npm install
npm run dev
`

Open [http://localhost:3000](http://localhost:3000)

### First Simulation
1. Dashboard → Simulations
2. Click "Debug: Missing Console Output"
3. Add console.log(message)
4. Click "Run" to test
5. View solution to understand why

## 💾 Data Management

### Current: Local Data
- Simulations in src/data/simulations.ts
- 9+ simulations (easy → hard)
- Buggy code + solution + hints + XP reward
- Easy to extend

### Future: Backend-Driven
- Load from API
- Unlimited simulations
- User progress sync
- Real-time updates

## 🔧 Adding New Simulations

Each simulation needs:
- Unique ID and title
- Category (frontend/backend/fullstack/devops)
- Difficulty (easy/medium/hard)
- Description and incident explanation
- Initial buggy code files
- Solution code
- Progressive hints
- Estimated time and XP reward

See src/data/simulations.ts for examples.

## 🎓 Learning Outcomes

✅ Understand production bug patterns
✅ Debug using console, errors, analysis
✅ Fix common React/Node.js/API issues
✅ Recognize patterns (leaks, race conditions)
✅ Apply best practices

## 🔐 Authentication

- JWT-based authentication
- Protected routes
- Progress tracking
- Session persistence

## 📊 Progress Tracking

- Simulations completed
- XP earned by difficulty
- Category breakdown
- Future: Leaderboards, badges

## 🐛 Known Limitations

1. Sandpack: Limited npm packages
2. Backend: Node.js sandbox (not production)
3. Timeouts: 30 second limit
4. No persistent filesystem
5. No real external API calls

## 🚧 Roadmap

- [ ] Backend API integration
- [ ] User auth & progress sync
- [ ] Leaderboard system
- [ ] Custom simulation builder
- [ ] Mobile UI improvements
- [ ] Multiplayer challenges
- [ ] Multi-language support
- [ ] Performance profiling
- [ ] Pair debugging

## 📖 Resources

- [Sandpack Docs](https://sandpack.codesandbox.io/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Next.js](https://nextjs.org/docs/app)
- [React Hooks](https://react.dev/reference/react)

## 📝 License

MIT - Educational use
## 🤝 Contributing

1. Fork repository
2. Add simulations to src/data/simulations.ts
3. Test in development
4. Submit PR

**Built to make developers better at debugging.**
