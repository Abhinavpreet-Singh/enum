import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  requireAdmin,
  getStats,
  getAllUsers, getUserById, deleteUser,
  getAllOrganizations, getOrganizationById, updateOrganizationApproval, deleteOrganization,
} from "../controllers/admin.controller.js";

const router = Router();

// All admin routes require valid JWT + admin role
router.use(verifyJWT, requireAdmin);

// Stats
router.get("/stats", getStats);

// Users
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUser);

// Organizations
router.get("/organizations", getAllOrganizations);
router.get("/organizations/:id", getOrganizationById);
router.patch("/organizations/:id/approval", updateOrganizationApproval);
router.delete("/organizations/:id", deleteOrganization);

export default router;
