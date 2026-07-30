# Enum Platform 

**Platform Purpose**: A competitive learning platform for DSA, System Design, Frontend, Backend, Linux, and Production Incident Simulations with real-time collaborative features. 
---

## 1. Frontend Pages & Features

### Location: `enum_frontend/src/app/` 

#### **Core Pages**

| Page Route               | File                                   | Purpose                             | Key Components                                                                                    |
| ------------------------ | -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Home**                 | `page.tsx`                             | Landing page with marketing content | `HeroSection`, `HowItWorksSection`, `LatestIncidentsSection`, `BenefitsSection`, `WhyEnumSection`, `FeaturesSection` |
| **Dashboard**            | `dashboard/page.tsx`                   | User hub                            | `DashboardContent` component                                                                      |
| **DSA Arena**            | `dashboard/dsa-arena/page.tsx`         | LeetCode-style problem solving      | `QuestionsList` (displays DSA problems)                                                           |
| **Simulations**          | `dashboard/simulations/page.tsx`       | Real-world incident simulations     | Interactive simulation list with filtering by category/difficulty                                 |
| **Incident Ops**         | `dashboard/incidents/page.tsx`         | Interactive incident fire fighting  | `IncidentSimulator` with service topologies, live metrics graphs, and diagnostic controls         |
| **Linux Arena**          | `dashboard/simulations/linux`          | Bash shell scripting challenges     | Embedded shell executor, stdout comparison, terminal workspace                                    |
| **Activity Log**         | `dashboard/activity/page.tsx`          | Chronological user history log      | Paginated listing of DSA, system design, incident, and simulation submissions with verdict icons  |
| **Profile**              | `dashboard/profile/page.tsx`           | User profile management             | `ProfileContent` component (view/edit user info)                                                  |
| **Leaderboard**          | `dashboard/leaderboard/`               | User rankings                       | XP-based rankings                                                                                 |
| **Tracks**               | `dashboard/tracks/`                    | Learning paths                      | Curated learning progression                                                                      |
| **Settings**             | `dashboard/settings/`                  | Account settings                    | User preferences                                                                                  |
| **Admin**                | `dashboard/admin/`                     | Admin panel                         | Question/simulation management                                                                    |
| **Login**                | `login/`                               | Authentication                      | Email/password login                                                                              |
| **OAuth Success**        | `oauth-success/`                       | OAuth callback handler              | Token storage after Google/GitHub login                                                           |
| **Collaborative Editor** | `collab/page.tsx` + `collab/[roomId]/` | Real-time code collaboration        | Socket.IO-powered shared coding                                                                   |
| **System Design**        | `systemDesign/`                        | Architecture design challenges      | React Flow-based diagram editor                                                                   |
| **About**                | `about/`                               | Platform information                | Static content                                                                                    |
| **Contact**              | `contact/`                             | Contact form                        | Support contact                                                                                   |
| **Privacy**              | `privacy/`                             | Privacy policy                      | Static content                                                                                    |
| **Terms**                | `terms/`                               | Terms of service                    | Static content                                                                                    |
| **Start/Demo**           | `start/`, `demo/`                      | Tutorial pages                      | Onboarding content                                                                                |
| **Linux Redirect**       | `linux-arena/page.tsx`                 | Redirection helper                  | Direct entry helper redirecting to the active Linux challenge                                     |

#### **Key Frontend Components** (Location: `enum_frontend/src/components/`)

**AI Chat Assistant** (`botpress/`):
- `BotpressChat.tsx` — Sleek, dark-mode compliant floating chat widget powered by Botpress Webchat API for onboarding and platform navigation assistance.

**DSA Arena Components** (`dsa/`):
- `code-editor.tsx` — Multi-language code editor (JavaScript, Python, Java, C++, C, Bash)
- `complexity-analysis-modal.tsx` — Shows time/space complexity analysis results
- `problem-tabs.tsx` — Tab navigation (Problem Description, Solutions, Submissions)
- `question-detail.tsx` — Full problem statement with test cases
- `questions-list.tsx` — Filterable problem list
- `submissions-list.tsx` — User's submission history
- `solutions-list.tsx` — Community solutions
- `publish-solution-modal.tsx` — Share solution with community

**Simulation Components** (`simulations/`):
- `SimulationContainer.tsx` — Main simulation workspace wrapper
- `simulation-workspace.tsx` — Complete simulation editing environment
- `CodeEditor.tsx` — Code editing for simulations
- `CollaborativeEditor.tsx` — Real-time collaborative editing
- `FileExplorer.tsx` — Browse simulation file structure
- `ConsolePanel.tsx` — Output/console display
- `live-preview.tsx` — Live preview for frontend simulations
- `browser/` — Browser simulation preview components
- `terminal-emulator.tsx` — Embedded terminal UI (xterm.js) for Linux/Bash simulations
- `bash-simulation-adapter.tsx` — UI glue to run/inspect Bash scripts and simulated filesystem tasks

**Home Page Components** (`home/`):
- `hero-section.tsx` — Main hero with CTA
- `features-section.tsx` — Interactive homepage catalog showing live previews for Frontend, Backend, System Design, Linux Shell, and DSA Arena
- `how-it-works-section.tsx` — Platform explanation
- `benefits-section.tsx` — Feature benefits
- `latest-incidents-section.tsx` — Recent incident simulations
- `why-enum-section.tsx` — Why choose Enum

**Dashboard Components** (`dashboard/`):
- `dashboard-content.tsx` — Main dashboard overview
- `profile-content.tsx` — Profile editor
- `sidebar.tsx` — Navigation sidebar
- `user-profile.tsx` — User profile card

**Other Components**:
- `header.tsx` — Navigation header with updated sidebar toggle, layout animations, and responsive navigation
- `footer.tsx` — Redesigned footer with modern layout links
- `loading-bar.tsx` — Progress indicator

#### **Frontend Services** (`src/services/`)
- `cloudinary.ts` — Cloudinary image upload integration
- `dockerExecutor.ts` — Docker execution for simulations
- `proxy.js` — Backend API proxy configuration

#### **Frontend Hooks & Utils** (`src/hooks/`, `src/lib/`, `src/utils/`)
- Custom React hooks for state management
- Utility functions for API calls, formatting
- Type definitions in `src/types/`

---

## 2. Backend API Endpoints

### Location: `enum_backend/src/routes/`

#### **User Management** (`user.route.js`)
```
POST   /api/v1/users/send-otp                — Send OTP for email verification
POST   /api/v1/users/register                — Create new user account
POST   /api/v1/users/login                   — User login (email/password)
GET    /api/v1/users/getUserById/:id         — Fetch user by ID
POST   /api/v1/users/logout                  — Logout (invalidate token, requires auth)
PUT    /api/v1/users/forgotPassword          — Password reset via OTP
GET    /api/v1/users/profile                 — Get current user profile (requires auth)
PUT    /api/v1/users/profile                 — Update user profile (requires auth)
POST   /api/v1/users/avatar                  — Upload user avatar to Cloudinary (requires auth)
PATCH  /api/v1/users/award-browser-xp       — Award XP for browser activity (requires auth)
GET    /api/v1/users/leaderboard             — Get global leaderboard by XP
GET    /api/v1/users/activity                — Get paginated user activity history logs (requires auth)
```

#### **Authentication (OAuth)** (`auth.routes.js`)
```
GET    /auth/google                          — Initiate Google OAuth flow
GET    /auth/google/callback                 — Google OAuth callback handler
GET    /auth/github                          — Initiate GitHub OAuth flow
GET    /auth/github/callback                 — GitHub OAuth callback handler
```

#### **DSA Questions** (`questions.route.js`)
```
GET    /api/v1/questions/getQuestion         — Fetch question details (ID, constraints, test cases)
```

#### **Judge/Code Execution** (`judge.route.js`)
```
POST   /api/v1/judge/run                     — Execute user code against test cases
                                              Languages: Java, C++, C, Python, Bash (shell scripts)
                                              Returns: Test results, verdict, runtime
```

#### **Code Submissions** (`submission.route.js`)
```
POST   /api/v1/submissions/save              — Save submission when all tests pass (requires auth)
GET    /api/v1/submissions/my/:questionId    — Get user's submissions for a question (requires auth)
GET    /api/v1/submissions/recent            — Get recent 3 distinct submissions for dashboard (requires auth)
```

#### **Solutions (Community Code)** (`solution.route.js`)
```
POST   /api/v1/solutions/publish             — Publish solution to community (requires auth)
GET    /api/v1/solutions/question/:questionId — Get all solutions for a question
GET    /api/v1/solutions/my                  — Get current user's solutions (requires auth)
PATCH  /api/v1/solutions/upvote/:solutionId — Upvote a solution (requires auth)
```

#### **Editorials** (`editorial.route.js`)
```
POST   /editorial/create                     — Create editorial explanation for question
GET    /editorial/:questionId                — Get editorial for question (includes approach, algorithm, complexity)
```

#### **Simulations & Linux Arena** (`simulation.route.js` + `linuxQuestions.js`)
```
GET    /api/v1/simulations/getSimulations    — List all incident simulations (optional auth)
GET    /api/v1/simulations/getSimulation/:id — Get simulation details by ID
GET    /api/v1/simulations/getSimulationFiles/:id — Get simulation file contents
POST   /api/v1/simulations/adminPostSimulation — Create new simulation (admin only)
PUT    /api/v1/simulations/editSimulation/:id — Edit simulation (admin only)
DELETE /api/v1/simulations/deleteSimulation/:id — Delete simulation (admin only)
POST   /api/v1/simulations/uploadFiles/:id  — Upload simulation files to Cloudinary (admin only)
GET    /api/v1/simulations/linux             — List all Linux / Bash shell scripting challenges
GET    /api/v1/simulations/linux/:id         — Fetch specific Linux / Bash challenge details
POST   /api/v1/simulations/linux/submit      — Evaluate Linux challenge shell submission
```

#### **Incident Simulator (Ops)** (`incident.route.js`)
```
GET    /api/v1/incidents/                    — List all interactive production incidents (optional auth)
GET    /api/v1/incidents/:id                 — Fetch comprehensive incident template by ID
POST   /api/v1/incidents/:id/session         — Start or resume an active fire fighting session (requires auth)
GET    /api/v1/incidents/:id/session/:sessionId — Retrieve current simulation tick metrics/logs (requires auth)
POST   /api/v1/incidents/:id/session/:sessionId/tick — Advance simulation timeline, trigger dynamic metrics changes (requires auth)
POST   /api/v1/incidents/:id/session/:sessionId/diagnose — Submit diagnostic root cause hypothesis (requires auth)
POST   /api/v1/incidents/:id/session/:sessionId/action — Deploy manual/automation recovery action to restore metrics (requires auth)
POST   /api/v1/incidents/:id/session/:sessionId/complete — Submit post-incident report and grade final score (requires auth)
POST   /api/v1/incidents/:id/session/:sessionId/stop — Quit session and discard active simulation state (requires auth)
```

#### **Simulation Engine** (`simulationEngine.route.js`)
```
POST   /api/v1/simulation-engine/run         — Execute simulation files and compare output
                                              Bundles files, runs in Docker or Linux sandbox (supports Node, frontend bundles, and Bash/shell scripts)
                                              Supports running `sh`/`bash` scenarios in isolated containers or pty-backed sandboxes for interactive terminal simulations
                                              Returns: Score, logs, verdict, exitCode, and optional terminal session transcript
```

#### **Simulation Progress** (`simulationProgress.route.js`)
```
GET    /api/v1/simulation-progress/all       — Get all progress for current user (requires auth)
GET    /api/v1/simulation-progress/:simulationId — Get progress for specific simulation (requires auth)
POST   /api/v1/simulation-progress/:simulationId — Update/track progress (requires auth)
```

#### **System Design** (`systemDesign.route.js`)
```
GET    /api/v1/system-design/simulations     — List system design challenges (optional auth)
GET    /api/v1/system-design/simulations/:id — Get challenge details
POST   /api/v1/system-design/submit          — Submit architecture design (requires auth)
                                              Payload: nodes, edges, explanation, replayEvents
                                              Evaluates against rules, awards XP
GET    /api/v1/system-design/my-submissions  — Get user's submissions (requires auth)
GET    /api/v1/system-design/submissions/:simulationId — Get all submissions for challenge (requires auth)
GET    /api/v1/system-design/submission/:id  — Get specific submission (requires auth)
POST   /api/v1/system-design/simulations     — Create new system design challenge (admin + auth)
```

#### **Complexity Analyzer** (`complexity.route.js`)
```
POST   /api/v1/complexity/analyze            — Analyze code complexity (time/space)
                                              Modes: 'full', 'static-only', 'benchmark-only'
                                              Returns: time complexity, space complexity, explanation, patterns
GET    /api/v1/complexity/job/:queueType/:jobId — Check async job status
GET    /api/v1/complexity/health             — Health check for analyzer subsystems
GET    /api/v1/complexity/ml/stats           — Get ML classifier statistics
GET    /api/v1/complexity/ml/export          — Export training data as CSV
```

#### **Admin** (`admin.route.js`)
```
GET    /api/v1/admin/getAdminPrev            — Check admin privileges
POST   /api/v1/admin/adminPostQuestion       — Create question (admin only)
PUT    /api/v1/admin/editQuestion/:id        — Edit question (admin only)
DELETE /api/v1/admin/deleteQuestion/:id      — Delete question (admin only)
```

#### **Middleware**
- `auth.middleware.js` — `verifyJWT` (required auth), `optionalAuth` (optional JWT parsing)

---

## 3. Database Schema (Prisma + PostgreSQL)

### Location: `enum_backend/prisma/schema.prisma`

#### **Core Models**

**User**
- `id` (cuid String) — Primary key
- `username` (String, unique)
- `email` (String, unique)
- `password` (String, optional for OAuth users)
- `refreshToken` (String, for JWT)
- `displayName`, `bio`, `location`, `resume` — Profile data
- `role` (String) — Default: "Student"
- `avatar` (String) — Cloudinary URL
- `provider` (String) — OAuth provider (google, github)
- `skills` (String[]) — Technology skills
- `links` (UserLinks) — GitHub, LinkedIn, website URLs
- `certs` (UserCert[]) — Certifications
- **XP System**:
  - `xp` (Int) — Total experience points
  - `browserXpClaims` (String[]) — Claims array for browser activity
  - `systemDesignXpClaims`, `incidentXpClaims`, `questionXpClaims`, `simulationXpClaims` (String[]) — Claims arrays for different challenges
  - `currentStreak` (Int) — Consecutive days active
  - `lastActivityDate` (DateTime) — Last activity timestamp
- **Relations**: Solutions[], Submissions[], SimulationProgress[], SystemDesignSubmissions[], IncidentSession[], UserActivityLog[], UserXpAward[]

**UserXpAward**
- `id` (cuid String)
- `userId` (cuid String) — Links to User
- `awardKey` (String) — Unique award key identifier (prevents duplicate XP claims)
- `xpAmount` (Int) — Granted XP

**UserActivityLog**
- `id` (cuid String)
- `userId` (cuid String) — Links to User
- `activityType` (String) — `dsa` | `simulation` | `system_design` | `incident` | `browser`
- `resourceId` (cuid String) — ID of problem/simulation
- `resourceTitle` (String) — Name of the resource
- `outcome` (String) — `correct` | `partial` | `incorrect`
- `xpEarned` (Int) — Awarded XP
- `score` / `maxScore` (Int, optional) — Submission score details
- `detail` (String) — Explanatory details (e.g. "Passed 8/10 testcases")
- `createdAt` (DateTime) — Timestamp

**OtpVerification**
- `id` (cuid String)
- `email` (String)
- `otp` (String)
- `expiresAt` (DateTime)

**Question** (DSA Problems)
- `id` (cuid String)
- `title`, `desc` (String) — Problem name and description
- `level` (String) — "Easy", "Medium", "Hard"
- `testcases` (Json[]) — Array of test cases with input/output
- `constraints` (String)
- `topic` (String) — DSA topic
- `functionName` (String) — Function signature
- `parameterNames`, `parameterTypes` (String[])
- `returnType` (String)
- `initialCode` (Json[]) — Starter code in multiple languages
- **Relations**: Solutions[], Submissions[], Editorials[]

**LinuxQuestion** (Bash Arena Challenges)
- `id` (cuid String)
- `slug` (String, unique) — Reference slug
- `title`, `description` (String) — Challenge details
- `difficulty` (String) — "easy" | "medium" | "hard"
- `examples` (Json[]) — Input/output examples
- `starterCode` (String) — Bash script stub
- `expectedOutput` (String) — Expected stdout result
- `constraints` (String[]) — Structural/command constraints
- `hints` (String[]) — Available hints
- `language` (String) — Default: "bash"

**Solution** (Community Solutions)
- `id` (cuid String)
- `questionId`, `userId` (cuid String, foreign keys)
- `code` (String)
- `language` (String) — Default: "javascript"
- `upvotes` (Int) — Community votes
- `createdAt`, `updatedAt` (DateTime)

**Submission** (Problem Attempts)
- `id` (cuid String)
- `questionId`, `userId` (cuid String)
- `code` (String)
- `language` (String)
- `verdict` (String) — "accepted", "wrong_answer", "runtime_error", "compile_error", "error", "partial"
- `passedCount`, `totalCount` (Int) — Test case results
- `runtime` (Float, optional)
- `createdAt`, `updatedAt` (DateTime)

**Editorial** (Problem Explanations)
- `id` (cuid String)
- `questionId` (cuid String, unique) — One editorial per question
- `title`, `intuition`, `approach`, `algorithm`, `code` (String)
- `timeComplexity`, `spaceComplexity` (String)
- `createdAt`, `updatedAt` (DateTime)

**Simulation** (Real-world Challenges)
- `id` (cuid String)
- `title`, `description`, `incident` (String)
- `category` (String) — "frontend", "backend", "fullstack", "devops"
- `difficulty` (String) — "easy", "medium", "hard"
- `steps` (SimulationStep[]) — Incident timeline
- `initialFiles` (SimulationFile[]) — File structure with content, language, Cloudinary URLs
- `solution` (Json) — Expected solution
- `hints` (String[]) — Help hints
- `estimatedTime` (Int) — Minutes
- `tags` (String[])
- `xpReward` (Int)
- `entryFile`, `expectedOutput` (String)
- `createdAt`, `updatedAt` (DateTime)
- **Relations**: UserSimulationProgress[]

**UserSimulationProgress**
- `id` (cuid String)
- `userId`, `simulationId` (cuid String)
- `solved` (Boolean)
- `attempts` (Int)
- `lastAttemptAt` (DateTime)
- `modifiedFiles` (Json) — User's edits
- `createdAt`, `updatedAt` (DateTime)
- **Unique**: userId + simulationId

**SystemDesignSimulation** (Architecture Challenges)
- `id` (cuid String)
- `title`, `description` (String)
- `difficulty` (String)
- `evaluationRules` (EvaluationRule[]) — Scoring rubric
- `maxScore` (Int) — Max points
- `tags`, `templateUrl` (String[]/String)
- `createdAt`, `updatedAt` (DateTime)
- **Relations**: SystemDesignSubmission[]

**SystemDesignSubmission** (Architecture Submissions)
- `id` (cuid String)
- `simulationId`, `userId` (cuid String)
- `nodes`, `edges` (Json) — React Flow diagram export
- `explanation` (String) — User's rationale
- `replayEvents` (Json, optional) — Diagram drawing sequence
- `score`, `maxScore` (Int)
- `feedback` (SDFeedbackItem[]) — Per-rule feedback
- `createdAt`, `updatedAt` (DateTime)

**IncidentSimulation** (Production Outage Simulations)
- `id` (cuid String)
- `title`, `description` (String)
- `difficulty` (String) — "easy" | "medium" | "hard"
- `durationSeconds` (Int) — Simulation active length
- `estimatedTime` (Int) — Estimated run duration in minutes
- `xpReward` (Int) — XP Reward
- `initialServices` (IncidentService[]) — Services status list (healthy, degraded, critical, down)
- `initialMetrics` (Json) — Latency, CPU, throughput snapshots
- `initialLogs` (String[]) — Initial startup/error logs
- `realIncidentName`, `realIncidentDesc`, `realIncidentLink` (String) — Deep historical reference alignment
- `revealTitle`, `revealText` (String) — Historical context details revealed on completion
- `rootCauseOptions` (IncidentRootCauseOption[]) — List of multiple-choice root cause options
- `actionOptions` (IncidentActionOption[]) — Available remediation actions to deploy
- **Relations**: IncidentSession[], IncidentTimelineEvent[]

**IncidentSession** (Active Outage Attempt)
- `id` (cuid String)
- `userId`, `incidentId` (cuid String)
- `elapsedTime` (Int) — Current running duration (seconds)
- `isActive` (Boolean) — Session active state
- `isCompleted` (Boolean) — Resolution state
- `xpAwarded` (Boolean) — Status of XP claiming
- `attempts` (Int) — Submission attempts count
- `selectedRootCauseId` (String) — Diagnosed root cause option ID
- `diagnosedAt` (DateTime) — Diagnosed timestamp
- `correctDiagnosis` (Boolean) — Diagnosis validity flag
- `actionsTaken` (Json[]) — Log of deployed actions
- `diagnosticScore`, `actionScore`, `timeBonusScore`, `totalScore` (Int) — Breakdown of session grade points
- **Relations**: IncidentSessionState

**IncidentSessionState** (Real-time Outage Tick Data)
- `id` (cuid String)
- `sessionId` (cuid String) — Links to IncidentSession
- `currentTime` (Int) — Running tick counter (seconds)
- `services` (IncidentService[]) — Current service statuses
- `metrics` (Json) — Dynamic metric states (CPU, Latency)
- `logs` (String[]) — Dynamic accumulated terminal/error logs
- `activeAlerts` (String[]) — List of active system alarms

#### **Database Relationships**

```
User ──1:N── Solution (one user has many solutions)
     ──1:N── Submission (one user has many submissions)
     ──1:N── SystemDesignSubmission (one user has many submissions)
     ──1:N── UserSimulationProgress
     ──1:N── IncidentSession
     ──1:N── UserActivityLog
     ──1:N── UserXpAward

Question ──1:N── Solution
       ──1:N── Submission
       ──1:1── Editorial

Simulation ──1:N── UserSimulationProgress
SystemDesignSimulation ──1:N── SystemDesignSubmission
IncidentSimulation ──1:N── IncidentSession
                   ──1:N── IncidentTimelineEvent
```

---

## 4. Key Features & Controllers

### Location: `enum_backend/src/controllers/`

#### **User Management** (`user.controller.js`)
- **OTP-based Registration**: sendOtp, registerUser
- **Email/Password Authentication**: loginUser, userForgetPassword
- **JWT Token Generation**: generateAccessAndRefreshToken
- **Profile Management**: getProfile, updateProfile
- **Avatar Upload**: uploadAvatar (to Cloudinary)
- **XP System**: awardBrowserXp (gamification)
- **Leaderboard**: getLeaderboard (global rankings by XP)
- **Streak Tracking**: currentStreak, lastActivityDate updates

#### **Activity Logger** (`activity.controller.js`)
- **Unified Activity History**: Fetches paginated activity log records (`UserActivityLog`) containing comprehensive details of user DSA submissions, interactive incident results, and simulations.

#### **Code Judge** (`judge.controller.js`)
- **Multi-language Code Execution**: Java (runJavaJudge), C++ (runCppJudge), C (runCJudge), Python (runPythonJudge), Bash
- **Test Case Evaluation**: Compares output with expected results
- **Modes**: "run" (first 3 test cases) vs "submit" (all test cases)
- **Verdict Types**: accepted, wrong_answer, runtime_error, compile_error, error
- **Metrics**: passedCount, totalCount, runtime

#### **Linux Controller** (`linuxController.js`)
- **Bash Shell Script Evaluator**: Serves Linux/Bash challenges, executes script submissions in isolated shell sandboxes, validates output results, filters illegal command payloads, and awards progress points.

#### **Incident Operations Controller** (`incident.controller.js`)
- **Live Incidents Life-cycle**: Manages active sessions (`IncidentSession`), spawns runtime snapshots (`IncidentSessionState`), processes timeline event ticks (`IncidentTimelineEvent`), applies degradation/restoration algorithms to system metrics dynamically depending on taken remediation actions, evaluates root-cause diagnostics, and calculates comprehensive grades (diagnostic correctness + time bonus + action efficiency).

#### **Complexity Analyzer** (`complexity.controller.js`)
- **Time Complexity Analysis**: Estimates O(n) notation
- **Space Complexity Analysis**: Memory usage estimation
- **Three Analysis Modes**:
  - `full` — Static analysis + Runtime benchmarking + AI explanation
  - `static-only` — AST analysis only (fast, no Docker)
  - `benchmark-only` — Runtime execution + explanation (needs Docker)
- **Rate Limiting**: Per-user limits via Redis
- **ML Integration**: ML classifier for complexity class prediction
- **Async Jobs**: Bull queue support for long-running analyses
- **Health Checks**: Subsystem diagnostics (Redis, Docker, queue status)

#### **Simulation Engine** (`simulationEngine.controller.js`)
- **File Bundling**: Combines uploaded files into executable code
- **Docker Execution**: Sends code to external compiler service (`enumcompiler.duckdns.org`)
- **Node Module Resolution**: Symlinks node_modules for npm packages
- **CJS/ESM Compatibility**: Enforces CommonJS for require() statements
- **Output Comparison**: Compares execution output with expectedOutput
- **Scoring**: Calculates pass percentage
- **XP Rewards**: Awards points on success

#### **System Design Evaluator** (`systemDesign.controller.js` + `evaluators/systemDesignEvaluator.js`)
- **Graph Validation**: Checks React Flow diagram for required components/edges
- **Rule-based Scoring**: Each rule has points (e.g., "include load balancer" = 2 pts)
- **Feedback Generation**: Per-rule pass/fail messages
- **XP Calculation**: Points scaled by difficulty × score percentage
- **Streak Updates**: Maintains user activity streaks
- **Preset Rules**: Default rules for common architectures (e.g., URL Shortener)

#### **Solution Management** (`solution.controllers.js`)
- **Publish Solution**: Share working code to community
- **List Solutions**: All solutions for a question
- **My Solutions**: User's published solutions
- **Upvoting**: Community votes (karma system)

#### **Submissions** (`submission.controller.js`)
- **Save Submission**: Only on full test pass (not intermediate attempts)
- **Fetch History**: User's submission timeline
- **Recent Submissions**: Last 3 distinct problems for dashboard

#### **Simulations** (`simulation.controller.js`)
- **List/Fetch**: Get all or specific simulation
- **Admin Create/Edit/Delete**: Manage incident challenges
- **File Upload**: Upload files to Cloudinary
- **File Retrieval**: Fetch file contents from Cloudinary

#### **Questions** (`questions.controller.js`)
- **Get Question**: Fetch problem details with test cases and constraints

#### **Editorial** (`editorial.controller.js`)
- **Create Editorial**: Add explanation for question
- **Fetch Editorial**: Retrieve tutorial/explanation

#### **Simulation Progress** (`simulationProgress.controller.js`)
- **Track Progress**: Record attempts, completion status
- **Fetch Progress**: Get user's progress across simulations

#### **Admin** (`admin.controllers.js`)
- **Manage Questions**: Create, edit, delete DSA problems
- **Check Privilege**: Verify admin role

---

## 5. Third-Party Integrations

### **Authentication (OAuth 2.0)**
- **Google OAuth**: `auth/passport.js` uses `passport-google-oauth20`
  - Scope: profile, email
  - Configured via `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
  - Callback: `/auth/google/callback` → redirects with JWT token
- **GitHub OAuth**: Uses `passport-github2`
  - Scope: user:email
  - Configured via `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
  - Callback: `/auth/github/callback` → redirects with JWT token
- **JWT Tokens**: Custom token generation in `utils/generateToken.js`
  - Access token: Short-lived (environment configurable)
  - Refresh token: Longer-lived, stored in database

### **AI Assistant (Botpress)**
- **Botpress Webchat integration**: Interactive conversational AI assistant loaded via iframe widget from Botpress Content cloud. Provides platform onboarding walkthroughs, quick tips, and navigations.

### **File Storage (Cloudinary)**
- **Service**: Cloud media storage and CDN
- **Use Cases**:
  - User avatar uploads (`uploadAvatarToCloudinary`)
  - Simulation file storage (`uploadFileToCloudinary`)
  - Public file URLs for downloads (`fetchFileFromCloudinary`)
  - File deletion (`deleteFileFromCloudinary`)
- **Configuration**: `utils/cloudinary.js` initializes with `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET`
- **File Organization**: Simulations stored under `simulations/{simulationId}/`

### **Email Service (Resend)**
- **Service**: Transactional email provider
- **Use Cases**:
  - OTP delivery for authentication (`sendOtpEmail`)
  - Password reset confirmations
- **Configuration**: `utils/resendEmail.js` (environment-based API key)

### **Database (PostgreSQL)**
- **Provider**: PostgreSQL (self-hosted on Dokploy)
- **Client**: Prisma ORM (`db/index.js`)
- **Models**: Defined in `prisma/schema.prisma`
- **Connection**: `DATABASE_URL` environment variable (single connection string)

### **Cache & Queue (Redis)**
- **Used For**:
  - Rate limiting (complexity analyzer: 10 requests/min per user)
  - Job queue management (async complexity analysis)
  - ML training data caching
- **Modules**: `complexity/cache/redis.js`, `complexity/cache/queue.js`

### **Code Compilation Service (enumcompiler.duckdns.org)**
- **External HTTP Service**: Remote code execution environment
- **Use Cases**:
  - Simulation file execution
  - Test output capture
- **Implementation**: `simulationEngine.controller.js` sends bundled ESM code via POST

### **Terminal & Shell Integration**
- **Frontend Terminal**: `xterm.js` (embedded terminal UI) used for interactive Linux/Bash simulations and replaying transcripts.
- **Backend PTY**: `node-pty` (or similar) to spawn pseudo-terminals inside isolated sandboxes or Docker containers; sessions are proxied over Socket.IO events (`terminal:data`).
- **Security**: PTYs run inside ephemeral containers or restricted chroots; transcripts are sanitized before storage.

---

## 6. Real-Time Features (WebSocket/Socket.IO)

### Location: `enum_backend/src/socket/index.js`

#### **Setup**
- Integrated with HTTP server in `index.js`
- CORS configured to match Express origins
- Auto-reconnect: Ping every 25s, timeout after 20s

#### **Collaborative Code Editor**
- **Room-based Architecture**: Multiple code sharing rooms
- **Events**:

| Event              | Direction            | Payload                             | Purpose                                       |
| ------------------ | -------------------- | ----------------------------------- | --------------------------------------------- |
| `room:join`        | Client → Server      | `{roomId, userId, username, tabId}` | Join a collaboration room, get color          |
| `room:users`       | Server → Client      | Array of users with colors          | Broadcast participant list                    |
| `code:sync`        | Server → Client      | `{code: string}`                    | Send code snapshot to joining user            |
| `code:update`      | Client → Server      | Code changes                        | Broadcast code changes to room                |
| `cursor:move`      | Client → Server      | Cursor position + user info         | Share cursor positions for awareness          |
| `room:leave`       | On disconnect        | N/A                                 | Clean up room state                           |
| `terminal:connect` | Client → Server      | `{roomId, termId, cols, rows}`      | Open/attach to a shared terminal session      |
| `terminal:data`    | Bi-directional       | `{termId, data}`                    | Stream terminal I/O (pty bridge)              |
| `terminal:close`   | Client/Server → Both | `{termId}`                          | Close terminal session and persist transcript |
| `file:lock`        | Client → Server      | `{filePath, userId}`                | Lock a file for exclusive edits               |
| `file:unlock`      | Client → Server      | `{filePath, userId}`                | Release file lock                             |

#### **State Management**
- **In-Memory Rooms Map**: `Map<roomId, Map<socketId, {userId, username, color, tabId}>>`
- **Code Snapshots**: Latest code per room cached
- **Color Assignment**: Random HSL colors for user cursors
- **Auto Cleanup**: Empty rooms deleted automatically
- **Terminal/PTYSessions**: `Map<termId, {ptyProcess, roomId, viewers, transcript}>` for shared shell sessions
- **File Locks**: `Map<filePath, socketId>` to prevent write conflicts

#### **Real-Time Features**
1. **Presence Awareness**: See who's in the room
2. **Cursor Decorations**: Visual cursor positions with user colors
3. **Code Synchronization**: Share code as edits happen
4. **Multi-tab Support**: Tab IDs for multi-window sessions
5. **Shared Terminal Sessions**: Real-time terminal streams for Linux/Bash simulations (interactive replay, transcript, per-user permissions)
6. **File-level Locking**: Prevent concurrent conflicting edits on simulation files

---

## 7. Core Algorithms & Processing

### **Complexity Analyzer System**
Location: `enum_backend/src/complexity/`

#### **Architecture** (Orchestrator: `index.js`)
```
Input Code
    ↓
[Cache Check] → Return if cached
    ↓
[Static Analysis] → AST parsing per language
    ↓
[Runtime Benchmarking] → Docker-based execution
    ↓
[Hybrid Estimation] → Combine static + runtime
    ↓
[ML Classification] → Predict complexity class
    ↓
[Explanation Generation] → AI-generated rationale
    ↓
[Cache Storage] → Store result
    ↓
[Output: ComplexityAnalysisResponse]
```

#### **Components**
**1. Language Analyzers** (`analyzer/`)
- `javascript.analyzer.js` — AST parsing via Acorn
- `python.analyzer.js` — AST via Python-based parser
- `java.analyzer.js` — Java bytecode/source analysis
- `cpp.analyzer.js` — C++ source analysis
- `patterns.js` — Detects algorithmic patterns:
  - Two-pointers, Sliding window, Binary search
  - Hashmap lookup, Divide & conquer, DP
  - Sorting, BFS/DFS, Greedy, Recursion
  - Backtracking, Brute force, Prefix sum
  - Monotonic stack

**2. Static Estimator** (`estimator/`)
- Loop depth analysis (O(n) per level)
- Recursion detection
- Data structure usage (array, hash, tree)
- Common patterns matching
- Edge case handling

**3. Runtime Benchmarking** (`benchmark/`)
- `runner.js` — Docker execution environment
- Tests code with increasing input sizes
- Measures time/memory consumption
- Plots performance curves
- Estimates O notation from measurements

**4. ML Classifier** (`ml/`)
- `feature-extractor.js` — Extracts features from code
- `classifier.js` — ML model for complexity class prediction
- Training data management
- Model evaluation metrics

**5. Explanation Generator** (`explanation/`)
- AI-powered description of time/space complexity
- Plain-English reasoning
- Pattern-specific explanations

**6. Cache Layer** (`cache/`)
- Redis-backed caching
- Queue management via Bull
- Job status tracking

#### **Supported Complexity Classes**
```javascript
O(1)       // Constant
O(log n)   // Logarithmic
O(n)       // Linear
O(n log n) // Linearithmic
O(n²)      // Quadratic
O(n³)      // Cubic
O(2^n)     // Exponential
O(n!)      // Factorial
Unknown    // Cannot determine
```

#### **Analysis Modes**
- **Full** (default): Static + Runtime + Explanation + ML
- **Static-only**: AST parsing only (no Docker needed, ~100ms)
- **Benchmark-only**: Runtime execution only (needs Docker, ~5s)

#### **Rate Limiting**
- Per-user: 10 requests/minute (Redis-backed)
- Prevents abuse of expensive Docker execution

---

### **Simulation Engine**
Location: `enum_backend/src/controllers/simulationEngine.controller.js`

#### **Execution Pipeline**
```
User's Edited Files
    ↓
[Fetch Original Files from Cloudinary]
    ↓
[Merge/Overlay User Changes]
    ↓
[Bundle into ESM Bootstrap Script]
    ↓
[Send to enumcompiler Service (HTTP POST)]
    ↓
[Docker Execution in Sandbox]
    ↓
[Capture Output/Logs]
    ↓
[Compare with expectedOutput]
    ↓
[Return Score & Feedback]
```

#### **Key Features**
- **CJS/ESM Bridge**: Converts ESM simulator to CJS for user code compatibility
- **Module Resolution**: Symlinks node_modules so `require("express")` works
- **Timeout Protection**: 8-second execution limit
- **Streaming Output**: Captures console.log and errors
- **Scoring**: Pass percentage based on output match

#### **Supported Simulation Categories**
- Frontend (HTML/CSS/JS)
- Backend (Node.js server challenges)
- Full Stack (Combined challenges)
- DevOps (Deployment scenarios)
- System Design (Architecture diagrams)
- Linux / Bash (Shell scripting, command-line debugging, file-system tasks)

---

### **System Design Evaluator**
Location: `enum_backend/src/evaluators/systemDesignEvaluator.js`

#### **Evaluation Rules**
Rules define requirements for architecture diagrams:
```javascript
{
  description: "Include a load balancer",
  requiredComponent: "load_balancer",  // Component ID type
  requiredEdge: "client→load_balancer", // Source→Target edge
  points: 2                              // Points if rule passes
}
```

#### **Scoring Logic**
1. Parse React Flow `nodes` and `edges`
2. Build component lookups
3. Evaluate each rule:
   - Check if required component exists
   - Check if required edge exists
   - Award points if passed
4. Sum total score
5. Generate feedback per rule (passed/failed, message)

#### **XP Award Calculation**
```
XP = (Score / MaxScore) × BaseXP × DifficultyMultiplier
```
- BaseXP by difficulty: easy=50, medium=100, hard=150
- Example: 80% score on medium = 0.8 × 100 = 80 XP

#### **Preset Rules**
- URL Shortener architecture
- Cache layer validation
- Database requirements
- Load balancing patterns

---

### **Incident Simulation Engine**
Location: `enum_backend/src/controllers/incident.controller.js`

#### **Outage Timeline Tick & Metric Degradation**
When an incident is started:
1. Spawns an isolated session (`IncidentSession`) and sets active timeline variables.
2. Advance simulation ticks asynchronously. At pre-defined seconds (`timeSecond`), specific incident timeline events (`IncidentTimelineEvent`) are triggered (e.g. queue saturation, server outage, DB freeze).
3. **Decay Algorithm**: System metrics (latency, CPU, throughput) decay progressively over time based on active outage parameters.
4. **Remediation Influence**: If a user runs a correct remediation action (e.g. rollback, restart, scale up), a specific metric restoration curve triggers, recovering system health.
5. **Grading Mechanics**: 
   ```
   Final Score = Diagnostic Score (Correctness of selected root cause) 
               + Action Score (Efficiency and correctness of remediation actions deployed)
               + Time Bonus (Speed of resolution)
   ```

---

## 8. Development & Build Configuration

### **Backend**
- **Language**: Node.js (JavaScript/ES modules)
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.IO
- **Package Manager**: npm
- **Key Dependencies**:
  - `express`, `cors`, `passport` (auth)
  - `@prisma/client` (database)
  - `socket.io` (real-time)
  - `cloudinary` (file storage)
  - `bcrypt`, `jsonwebtoken` (security)
  - `bull`, `redis` (queuing, caching)

### **Frontend**
- **Language**: TypeScript/JavaScript (React)
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS, PostCSS
- **State**: React hooks
- **Real-time**: Socket.IO client
- **Package Manager**: npm
- **Key Dependencies**:
  - `next`, `react`
  - `socket.io-client` (real-time)
  - `axios` (HTTP client)
  - `lucide-react` (icons)
  - `tailwindcss` (styling)

### **Containerization**
- **Backend**: Dockerfile for production deployment
- **External Compiler**: Remote Docker service (`enumcompiler.duckdns.org`)

---

## 9. Security Features

1. **Authentication**:
   - JWT-based (access + refresh tokens)
   - OAuth 2.0 (Google, GitHub)
   - OTP email verification for signup

2. **Authorization**:
   - Role-based access (Student, Admin)
   - Protected routes via `verifyJWT` middleware

3. **Encryption**:
   - Password hashing with bcrypt
   - HTTPS for external services

4. **Rate Limiting**:
   - Per-user complexity analyzer requests (Redis)

5. **Validation**:
   - Input validation in controllers
   - Prisma schema constraints

---

## 10. Gamification & Engagement

1. **XP System & Prevention of Duplicate Claims**:
   - Awarded on DSA problem solving, simulations, system design, and production incident fire fighting.
   - Verified via `UserXpAward` records preventing multiple claims for the same activity completion key.
   - Scales by difficulty metrics.

2. **Streaks**:
   - Track consecutive active days
   - Maintenance via `lastActivityDate`
   - Reset on gap > 1 day

3. **Leaderboard**:
   - Global rankings by XP
   - Public profile visibility

4. **Solutions**:
   - Community code sharing
   - Upvote system (karma)
   - Filter by language

5. **Unified Activity log**:
   - Comprehensive track of all historic DSA, simulations, system design and incident response activities in one unified chronological stream.

---

## 11. Data Flow Diagram

```
┌─ FRONTEND (Next.js) ─────────────────────────┐
│  Pages | Components | Services | ChatWidget  │
│  ├─ DSA Arena (Code Editor)                  │
│  ├─ Simulations (File Explorer, PTY term)    │
│  ├─ System Design (React Flow Graph)         │
│  ├─ Collab Editor (Socket.IO Real-time)      │
│  ├─ Incident Ops (Topology, live charts)     │
│  ├─ Unified Activity Log (Paginated stream)  │
│  └─ Dashboard (User Streaks, Leaderboard)    │
└──────────────────────┬───────────────────────┘
                       │
             HTTP APIs / Socket Events
                       │
                       ▼
┌─ BACKEND (Express + Socket.IO) ──────────────┐
│  Controllers | Services | Websocket Handlers │
│  ├─ Judge (Code execution sandboxes)         │
│  ├─ Complexity (Acorn AST + Benchmarking)    │
│  ├─ Simulation Engine (ESM overlay/bundler)  │
│  ├─ System Design (Graph validation rules)   │
│  ├─ Incident Ops (Outage tick decays)        │
│  ├─ Activity Logger (Log record storage)     │
│  └─ User (Auth, JWT, Streak tracking)        │
└──────────────┬───────────────┬───────────────┘
               │               │
               ▼               ▼
         [ Cache / Queue ]  [ External Services ]
         └─ Redis (Bull)    ├─ Cloudinary (Files)
                            ├─ Resend (OTP Emails)
                            ├─ Botpress Chat (AI Assist)
                            └─ compiler (Sandbox execution)
```

---

## Summary Statistics

| Aspect                          | Count                                                         |
| ------------------------------- | ------------------------------------------------------------- |
| **Frontend Pages**              | 19+                                                           |
| **API Endpoints**               | 65+                                                           |
| **Database Models**             | 16                                                            |
| **Controllers**                 | 15                                                            |
| **Routes**                      | 15                                                            |
| **Real-time Events**            | 11+                                                           |
| **Supported Languages**         | 6 (JS, Python, Java, C++, C, Bash)                            |
| **Authentication Methods**      | 3 (Email, Google, GitHub)                                     |
| **Third-party Services**        | 6 (Cloudinary, Resend, PostgreSQL, Botpress, compiler, xterm)    |
| **Analysis Complexity Classes** | 9                                                             |
| **Algorithmic Patterns**        | 15+                                                           |

---

**Generated**: May 26, 2026
