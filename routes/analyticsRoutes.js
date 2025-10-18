const express = require("express");
const {
  getDashboardCards,
  getDashboardTablesController,
  getGrowthRate,
  getCompleteDashboard,
  getRevenueAnalytics,
  getCustomersAnalytics,
  getOrdersAnalytics,
  getTopProductAnalytics,
} = require("../controllers/analyticsController");

// Assuming you have auth middleware
const authService = require("../services/authServices");

const router = express.Router();

// Apply authentication and authorization middleware to all routes
router.use(authService.protectRoute);
router.use(authService.allowTo("admin"));

/**
 * Complete dashboard data (cards + tables)
 * GET /api/v1/analytics/dashboard
 */
router.get("/dashboard", getCompleteDashboard);

/**
 * Dashboard cards only (revenue, customers, orders, top product)
 * GET /api/v1/analytics/dashboard/cards
 */
router.get("/dashboard/cards", getDashboardCards);

/**
 * Dashboard tables only (best orders, top customers, best products)
 * GET /api/v1/analytics/dashboard/tables
 */
router.get("/dashboard/tables", getDashboardTablesController);

/**
 * Growth rate chart data
 * GET /api/v1/analytics/growth-rate?days=90
 * Query params: days (7, 30, or 90) - defaults to 90
 */
router.get("/growth-rate", getGrowthRate);

/**
 * Individual metric endpoints with custom date ranges
 */

/**
 * Revenue analytics
 * GET /api/v1/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31
 */
router.get("/revenue", getRevenueAnalytics);

/**
 * Customers analytics
 * GET /api/v1/analytics/customers?startDate=2024-01-01&endDate=2024-12-31
 */
router.get("/customers", getCustomersAnalytics);

/**
 * Orders analytics
 * GET /api/v1/analytics/orders?startDate=2024-01-01&endDate=2024-12-31
 */
router.get("/orders", getOrdersAnalytics);

/**
 * Top product analytics
 * GET /api/v1/analytics/top-product?startDate=2024-01-01&endDate=2024-12-31
 */
router.get("/top-product", getTopProductAnalytics);

module.exports = router;