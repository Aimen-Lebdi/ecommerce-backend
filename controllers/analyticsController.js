const asyncHandler = require("express-async-handler");
const {
  getDashboardAnalytics,
  getDashboardTables,
  getGrowthRateData,
  calculateTotalRevenue,
  calculateNewCustomers,
  calculateTotalOrders,
  getTopProduct,
} = require("../services/analyticsService");

/**
 * @desc    Get dashboard cards analytics (revenue, customers, orders, top product)
 * @route   GET /api/v1/analytics/dashboard/cards
 * @access  Private/Admin
 */
exports.getDashboardCards = asyncHandler(async (req, res) => {
  const data = await getDashboardAnalytics();

  res.status(200).json({
    status: "success",
    data: data.cards,
  });
});

/**
 * @desc    Get dashboard tables (best orders, top customers, best products)
 * @route   GET /api/v1/analytics/dashboard/tables
 * @access  Private/Admin
 */
exports.getDashboardTablesController = asyncHandler(async (req, res) => {
  const data = await getDashboardTables();

  res.status(200).json({
    status: "success",
    data,
  });
});

/**
 * @desc    Get growth rate chart data
 * @route   GET /api/v1/analytics/growth-rate
 * @access  Private/Admin
 * @query   days - Number of days (7, 30, or 90)
 */
exports.getGrowthRate = asyncHandler(async (req, res) => {
  const { days } = req.query;
  const allowedDays = [7, 30, 90];
  const selectedDays = allowedDays.includes(parseInt(days)) ? parseInt(days) : 90;

  const data = await getGrowthRateData(selectedDays);

  res.status(200).json({
    status: "success",
    data: {
      period: `${selectedDays}d`,
      chartData: data,
    },
  });
});

/**
 * @desc    Get complete dashboard data (cards + tables)
 * @route   GET /api/v1/analytics/dashboard
 * @access  Private/Admin
 */
exports.getCompleteDashboard = asyncHandler(async (req, res) => {
  const [cardsData, tablesData] = await Promise.all([
    getDashboardAnalytics(),
    getDashboardTables(),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      cards: cardsData.cards,
      tables: tablesData,
    },
  });
});

/**
 * @desc    Get revenue analytics for custom date range
 * @route   GET /api/v1/analytics/revenue
 * @access  Private/Admin
 * @query   startDate, endDate
 */
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const data = await calculateTotalRevenue(start, end);

  res.status(200).json({
    status: "success",
    data,
  });
});

/**
 * @desc    Get customers analytics for custom date range
 * @route   GET /api/v1/analytics/customers
 * @access  Private/Admin
 * @query   startDate, endDate
 */
exports.getCustomersAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const data = await calculateNewCustomers(start, end);

  res.status(200).json({
    status: "success",
    data,
  });
});

/**
 * @desc    Get orders analytics for custom date range
 * @route   GET /api/v1/analytics/orders
 * @access  Private/Admin
 * @query   startDate, endDate
 */
exports.getOrdersAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const data = await calculateTotalOrders(start, end);

  res.status(200).json({
    status: "success",
    data,
  });
});

/**
 * @desc    Get top product analytics for custom date range
 * @route   GET /api/v1/analytics/top-product
 * @access  Private/Admin
 * @query   startDate, endDate
 */
exports.getTopProductAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const data = await getTopProduct(start, end);

  res.status(200).json({
    status: "success",
    data,
  });
});