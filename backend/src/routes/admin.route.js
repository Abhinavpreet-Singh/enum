import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  requireAdmin,
  getAdminPrev,
  getStats,
  getAllUsers, getUserById, deleteUser,
  getAllOrganizations, getOrganizationById, updateOrganizationApproval, deleteOrganization,
  getContentStats, getRecentActivity,
} from "../controllers/admin.controller.js";
import {
  getViolations,
  getAnalytics,
  getUserActivity, suspendUser,
  getSettings, updateSetting,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getAuditLogs,
} from "../controllers/admin-advanced.controller.js";
import {
  getAllMaintenancePages,
  createMaintenancePage,
  updateMaintenancePage,
  deleteMaintenancePage,
} from "../controllers/maintenance.controller.js";

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
router.get("/content-stats", getContentStats);
router.get("/activity", getRecentActivity);
router.get("/getAdminPrev", getAdminPrev);

// Users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUser);
router.get("/users/:id/activity", getUserActivity);
router.patch("/users/:id/suspend", suspendUser);

// Violations / proctoring
router.get("/violations", getViolations);

// Analytics
router.get("/analytics", getAnalytics);

// Settings
router.get("/settings", getSettings);
router.patch("/settings/:key", updateSetting);

// Announcements
router.get("/announcements", getAnnouncements);
router.post("/announcements", createAnnouncement);
router.patch("/announcements/:id", updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

// Audit log
router.get("/audit", getAuditLogs);

// Organizations
router.get("/organizations", getAllOrganizations);
router.get("/organizations/:id", getOrganizationById);
router.patch("/organizations/:id/approval", updateOrganizationApproval);
router.delete("/organizations/:id", deleteOrganization);

// Page maintenance
router.get("/maintenance-pages", getAllMaintenancePages);
router.post("/maintenance-pages", createMaintenancePage);
router.patch("/maintenance-pages/:id", updateMaintenancePage);
router.delete("/maintenance-pages/:id", deleteMaintenancePage);

// Legacy aliases used by older frontend builds
router.get("/companies", getAllOrganizations);
router.get("/companies/:id", getOrganizationById);
router.patch("/companies/:id/approval", updateOrganizationApproval);
router.delete("/companies/:id", deleteOrganization);

export default router;
