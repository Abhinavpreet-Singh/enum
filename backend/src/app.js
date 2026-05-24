import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import passport from "passport"
import { env } from "./config/env.js"

const app = express()

const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");

const allowedOrigins = [
    "http://localhost:3000",
    "https://enum.live/",
    "https://www.enum.live/",
    "https://enum0.vercel.app",
    ...(env.FRONTEND_URLS || []),
]
    .filter(Boolean)
    .map(normalizeOrigin);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const normalizedOrigin = normalizeOrigin(origin);

        if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"));
        }
    },
    credentials: true,
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"]
}));

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(cookieParser())

app.use(passport.initialize())

app.get("/", (req, res) => {
	res.send("Hello from the server!")
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
import submissionRouter from "./routes/submission.route.js";
import complexityRouter from "./routes/complexity.route.js";
import systemDesignRouter from "./routes/systemDesign.route.js";
import authRouter from "./routes/auth.routes.js";

app.use("/auth", authRouter)
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
app.use("/api/v1/submissions", submissionRouter);
app.use("/api/v1/complexity", complexityRouter);
app.use("/api/v1/system-design", systemDesignRouter);

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
