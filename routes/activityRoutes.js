const express = require("express");
const {
  getAllActivities,
  getOneActivity,
  getDashboardActivities,
  getActivitiesByType,
  getUserActivities,
  getActivityStats,
  cleanupOldActivities,
} = require("../services/activityServices");


const authService = require("../services/authServices");

const router = express.Router();

// Protect all routes - only authenticated users can access
router.use(authService.protectRoute);

// Dashboard activities (last 50) - for real-time dashboard
router.get("/dashboard", authService.allowTo("admin"), getDashboardActivities);

// Activity statistics
router.get("/stats", authService.allowTo("admin"), getActivityStats);

// Get activities by type
router.get("/type/:type", authService.allowTo("admin"), getActivitiesByType);

// Get user activities
router.get("/user/:userId", authService.allowTo("admin"), getUserActivities);

// Cleanup old activities
router.delete("/cleanup", authService.allowTo("admin"), cleanupOldActivities);

// CRUD operations
router.route("/").get(authService.allowTo("admin"), getAllActivities);

router.route("/:id").get(authService.allowTo("admin"), getOneActivity);

module.exports = router;
