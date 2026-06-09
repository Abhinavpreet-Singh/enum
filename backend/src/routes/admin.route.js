import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  requireAdmin,
  getAdminPrev,
  getStats,
  getAllUsers, getUserById, deleteUser,
  getAllOrganizations, getOrganizationById, updateOrganizationApproval, deleteOrganization,
} from "../controllers/admin.controller.js";

const router = Router();

// All admin routes require valid JWT + admin role
router.use(verifyJWT, requireAdmin);

// Admin data should always be fetched fresh.
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Stats
router.get("/stats", getStats);
router.get("/getAdminPrev", getAdminPrev);

// Users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUser);

// Organizations
router.get("/organizations", getAllOrganizations);
router.get("/organizations/:id", getOrganizationById);
router.patch("/organizations/:id/approval", updateOrganizationApproval);
router.delete("/organizations/:id", deleteOrganization);

// Legacy aliases used by older frontend builds
router.get("/companies", getAllOrganizations);
router.get("/companies/:id", getOrganizationById);
router.patch("/companies/:id/approval", updateOrganizationApproval);
router.delete("/companies/:id", deleteOrganization);

export default router;
