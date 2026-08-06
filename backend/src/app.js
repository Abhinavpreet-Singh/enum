import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import compression from "compression"
import passport from "passport"
import { env } from "./config/env.js"

const app = express()

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1)
}
app.disable("x-powered-by")

const normalizeOrigin = (origin = "") =>
    String(origin).trim().replace(/\/+$/, "");

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://enum.live",
    "https://www.enum.live",
    "https://exam.enum.live",
    "https://enum0.vercel.app",
    env.FRONTEND_URL,
    ...(env.FRONTEND_URLS || []),
]
    .filter(Boolean)
    .map(normalizeOrigin);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    return allowedOrigins.includes(normalizeOrigin(origin));
};

app.use(
    cors({
        origin: function (origin, callback) {
            // Never throw — a thrown error skips CORS headers and the browser
            // reports a misleading "No Access-Control-Allow-Origin" failure.
            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Set-Cookie",
            "X-Enum-Client",
        ],
        exposedHeaders: ["Set-Cookie"],
        optionsSuccessStatus: 204,
    }),
)

// Ensure API error responses still include CORS headers for allowed browsers.
app.use((req, res, next) => {
    const origin = req.get("Origin");
    if (origin && isAllowedOrigin(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Vary", "Origin");
    }
    next();
})

// Health checks are registered before the body parsers, cookie parser and
// Passport so the container probe (every 30s) does no avoidable work. They stay
// after the CORS middleware so a browser can still read them cross-origin.
const healthHandler = (_req, res) => {
  res.status(200).json({ status: "ok" });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// gzip responses. This API returns large JSON (question sets with test cases and
// starter code, simulation file contents, leaderboards, submission history with
// full source), which compresses by roughly 70-85%.
app.use(
    compression({
        // Below ~1KB the header and CPU overhead outweigh the saving.
        threshold: 1024,
        filter: (req, res) => {
            // Escape hatch for clients that need an identity-encoded response.
            if (req.headers["x-no-compression"]) return false;
            return compression.filter(req, res);
        },
    }),
)

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(cookieParser())

app.use(passport.initialize())

console.log("[app] Passport initialized");

app.get("/", (req, res) => {
	res.send("Hello from the Enum server!")
})

import userRouter from "./routes/user.route.js"
import adminRouter from "./routes/admin.route.js"
import questionRouter from "./routes/questions.route.js"
import linuxQuestionsRouter from "./routes/linuxQuestions.js"
import solutionRouter from "./routes/solution.route.js";
import judgeRoutes from "./routes/judge.route.js";
import editorialRoute from "./routes/editorial.route.js";
import simulationRouter from "./routes/simulation.route.js";
import simulationProgressRouter from "./routes/simulationProgress.route.js";
import simulationEngineRouter from "./routes/simulationEngine.route.js";
import compilerRouter from "./routes/compiler.route.js";
import submissionRouter from "./routes/submission.route.js";
import complexityRouter from "./routes/complexity.route.js";
import systemDesignRouter from "./routes/systemDesign.route.js";
import incidentRouter from "./routes/incident.route.js";
import authRouter from "./routes/auth.routes.js";
import newAuthRouter from "./auth/routes/auth.routes.js";
import organizationRouter from "./routes/organization.route.js";
import unifiedLoginRouter from "./routes/unified-login.route.js";
import assessmentRouter from "./routes/assessment.route.js";
import questionBankRouter from "./routes/question-bank.route.js";
import bankQuestionRouter from "./routes/bank-question.route.js";
import questionImportRouter from "./routes/question-import.route.js";
import organizationDashboardRouter from "./routes/organization-dashboard.route.js";
import assessmentInviteRouter from "./routes/assessment-invite.route.js";
import desktopRouter from "./routes/desktop.route.js";
import maintenanceRouter from "./routes/maintenance.route.js";
import billingRouter from "./routes/billing.route.js";
import competitionRouter from "./routes/competition.route.js";
import { getPublicSettings, getPublicAnnouncements } from "./middlewares/feature-gate.middleware.js";

app.use("/api/auth", authRouter)
app.use("/auth", authRouter)
console.log("[app] Auth routes mounted at /api/auth and /auth")
app.use("/api/v1/users", userRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/questions", questionRouter)
app.use("/api/v1", linuxQuestionsRouter)
app.use("/api/v1/solutions", solutionRouter);
app.use("/api/v1/judge", judgeRoutes);
app.use("/api/editorial", editorialRoute);
app.use("/api/v1/simulations", simulationRouter);
app.use("/api/v1/simulation-progress", simulationProgressRouter);
app.use("/api/v1/simulation-engine", simulationEngineRouter);
app.use("/api/v1/compiler", compilerRouter);
app.use("/api/v1/submissions", submissionRouter);
app.use("/api/v1/complexity", complexityRouter);
app.use("/api/v1/system-design", systemDesignRouter);
app.use("/api/v1/incidents", incidentRouter);
app.use("/api/v1/organizations", organizationRouter);
app.use("/api/v1/companies", organizationRouter);
// New session-based auth endpoints (login, refresh, me, logout, sessions)
app.use("/api/v1/auth", newAuthRouter);
// Legacy unified-login routes (password-reset and old session endpoint) — kept as aliases
app.use("/api/v1/auth", unifiedLoginRouter);
app.use("/api/v1/assessments", assessmentRouter);
app.use("/api/v1/assessments", assessmentInviteRouter);
app.use("/api/v1/question-banks", questionImportRouter);
app.use("/api/v1/question-banks", questionBankRouter);
app.use("/api/v1/question-banks", bankQuestionRouter);
app.use("/api/v1/organization-dashboard", organizationDashboardRouter);
app.use("/api/v1/desktop", desktopRouter);
app.use("/api/v1/maintenance", maintenanceRouter);
app.use("/api/v1/billing", billingRouter);
app.use("/api/v1/competitions", competitionRouter);

// Public platform-settings + announcements (no auth required)
app.get("/api/v1/platform/settings", getPublicSettings);
app.get("/api/v1/platform/announcements", getPublicAnnouncements);

// Return JSON for unknown API routes instead of Express' default HTML page.
app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            statusCode: 404,
            message: `Route not found: ${req.method} ${req.originalUrl}`,
        });
    }
    return next();
});

// ── Global error handler ─────────────────────────────────────────────────────
// Must be last — converts ApiError (and any other thrown error) to a JSON
// response so no route ever returns an HTML error page.
app.use((err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || [],
    });
});

export { app }
