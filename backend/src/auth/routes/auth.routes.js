import { Router } from "express";
import { verifyCsrfOrigin } from "../middleware/csrf.js";
import { requireAuth } from "../middleware/verifyAccessToken.js";
import {
  login,
  refresh,
  me,
  logout,
  logoutAll,
  listSessions,
  deleteSession,
} from "../controllers/auth.controller.js";

const router = Router();

// Public — protected by CSRF origin check
router.post("/login", verifyCsrfOrigin, login);
router.post("/refresh", verifyCsrfOrigin, refresh);
router.get("/me", me);
router.post("/logout", verifyCsrfOrigin, logout);

// Require valid access token
router.post("/logout-all", requireAuth, verifyCsrfOrigin, logoutAll);
router.get("/sessions", requireAuth, listSessions);
router.delete("/sessions/:sessionId", requireAuth, deleteSession);

export default router;
