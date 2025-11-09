import { Router } from "express";
import jwt from "jsonwebtoken";
import { Admin } from "../models/adminModels.js";
import { login, logout, me } from "../controllers/authControllers.js";
import { JWT_SECRET } from "../config/jwtConfig.js";
import { listAdmins, createAdmin, deleteAdmin, updateAdmin } from "../controllers/adminControllers.js";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoryControllers.js";
import { createFeedback, listFeedbacks, updateFeedbackStatus, deleteFeedback } from "../controllers/feedbackControllers.js";
import { createShowroomCustomer, listShowroomCustomers, updateShowroomCustomer, deleteShowroomCustomer, listShowrooms, listShowroomsPublic, createShowroom, updateShowroom, deleteShowroom, getShowroomCustomer } from "../controllers/showroomControllers.js";
import { showroomSummary, showroomReport, showroomDaily } from "../controllers/analyticsControllers.js";

// Test route for analytics
const testAnalytics = async (req, res) => {
  try {
    const customers = await ShowroomCustomer.find().limit(5);
    const feedbacks = await Feedback.find().limit(5);
    const showrooms = await Showroom.find().limit(5);

    return res.json({
      customerCount: await ShowroomCustomer.countDocuments(),
      feedbackCount: await Feedback.countDocuments(),
      showroomCount: await Showroom.countDocuments(),
      sampleData: {
        customers,
        feedbacks,
        showrooms
      }
    });
  } catch (e) {
    console.error('Test analytics error:', e);
    return res.status(500).json({ error: e.message });
  }
};
import { getMessageSettings, updateMessageSettings } from "../controllers/settingsControllers.js";
import { createSale, listSales } from "../controllers/salesControllers.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);

//  auth middleware

export const requireAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const cookieToken = req.cookies?.token || "";
    const token = bearer || cookieToken;

    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Admin.findById(decoded.id).select("username email role status");

    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.status === "Suspend") return res.status(403).json({ message: "Account suspended" });

    req.user = { id: user._id, role: user.role };
    next();
  } catch (e) {
    // Only log unexpected errors, not invalid tokens (which are expected)
    if (e.message !== "invalid signature" && e.message !== "jwt expired" && e.message !== "jwt malformed") {
      console.error('Auth middleware error:', e.message);
    }
    return res.status(401).json({ message: "Authentication failed" });
  }
};


router.get("/me", requireAuth, me);

// Test route to verify data
router.get("/analytics/test", requireAuth, testAnalytics);

// Analytics routes
router.get("/analytics/showroom-summary", requireAuth, showroomSummary);
router.get("/analytics/showroom-report", requireAuth, showroomReport);
router.get("/analytics/showroom-daily", requireAuth, showroomDaily);

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
};

const requireShowroomOrAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (role === "admin" || role === "showroom") return next();
  return res.status(403).json({ message: "Forbidden" });
};

// Allow feedback viewing for admin, officeAdmin, and showroom roles
const requireFeedbackAccess = (req, res, next) => {
  const role = req.user?.role;
  if (role === "admin" || role === "officeAdmin" || role === "showroom") return next();
  return res.status(403).json({ message: "Forbidden" });
};

// Cache control helpers
const setPrivateShortCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=30");
  next();
};

const setPublicLongCache = (req, res, next) => {
  res.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=60");
  next();
};

// Admin management routes (admin-only)
router.get("/admins", requireAuth, requireAdmin, setPrivateShortCache, listAdmins);
router.post("/admins", requireAuth, requireAdmin, createAdmin);
router.delete("/admins/:id", requireAuth, requireAdmin, deleteAdmin);
router.put("/admins/:id", requireAuth, requireAdmin, updateAdmin);

// Category management routes (admin-only)
router.get("/categories", requireAuth, requireAdmin, setPublicLongCache, listCategories);
router.post("/create-categories", requireAuth, requireAdmin, createCategory);
router.put("/categories/:id", requireAuth, requireAdmin, updateCategory);
router.delete("/categories/:id", requireAuth, requireAdmin, deleteCategory);

// Public categories listing (for feedback form)
router.get("/categories-public", setPublicLongCache, listCategories);

// Showrooms: public list and admin management
router.get("/showrooms-public", setPublicLongCache, listShowroomsPublic);
router.get("/showrooms", requireAuth, requireAdmin, setPrivateShortCache, listShowrooms);
router.post("/showrooms", requireAuth, requireAdmin, createShowroom);
router.put("/showrooms/:id", requireAuth, requireAdmin, updateShowroom);
router.delete("/showrooms/:id", requireAuth, requireAdmin, deleteShowroom);

// Public submit endpoint
router.post("/feedback", createFeedback);
// Listing endpoint: accessible by admin, officeAdmin, showroom
router.get("/feedbacks", requireAuth, requireFeedbackAccess, setPrivateShortCache, listFeedbacks);

// Admin-only management endpoints
router.put("/feedbacks/:id/status", requireAuth, requireAdmin, updateFeedbackStatus);
router.delete("/feedbacks/:id", requireAuth, requireAdmin, deleteFeedback);

// Showroom: add customer and send SMS (allow showroom, officeAdmin, admin)
router.post("/showroom/customers", requireAuth, requireFeedbackAccess, createShowroomCustomer);
// Showroom: list/update/delete entries (allow showroom, officeAdmin, admin)
router.get("/showroom/customers", requireAuth, requireFeedbackAccess, listShowroomCustomers);
router.get("/showroom/customers/:id", requireAuth, requireFeedbackAccess, getShowroomCustomer);
router.put("/showroom/customers/:id", requireAuth, requireFeedbackAccess, updateShowroomCustomer);
router.delete("/showroom/customers/:id", requireAuth, requireFeedbackAccess, deleteShowroomCustomer);

// Analytics (admin and officeAdmin and showroom allowed for summary/report viewing)
router.get("/analytics/showroom-summary", requireAuth, requireFeedbackAccess, setPrivateShortCache, showroomSummary);
router.get("/analytics/showroom-report", requireAuth, requireFeedbackAccess, setPrivateShortCache, showroomReport);
router.get("/analytics/showroom-daily", requireAuth, requireFeedbackAccess, setPrivateShortCache, showroomDaily);

// Admin: message settings (SMS provider/API key/Sender ID/Feedback URL)
router.get("/message-settings", requireAuth, requireAdmin, setPrivateShortCache, getMessageSettings);
router.put("/message-settings", requireAuth, requireAdmin, updateMessageSettings);

// Sales: allow admin, officeAdmin, showroom to create and list within range
router.post("/sales", requireAuth, requireFeedbackAccess, createSale);
router.get("/sales", requireAuth, requireFeedbackAccess, setPrivateShortCache, listSales);

export default router;
