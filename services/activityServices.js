const ActivityLog = require("../models/activityLogModel");
const factory = require("./handlersFactory");
const expressAsyncHandler = require("express-async-handler");

// Get all activities with filtering and pagination
const getAllActivities = factory.getAll(
  ActivityLog,
  ["activity", "description", "user.name"], // Search fields
  null // No population needed
);

// Get activity by ID
const getOneActivity = factory.getOne(ActivityLog);

// Get activities for dashboard - last 50 activities
const getDashboardActivities = expressAsyncHandler(async (req, res) => {
  const activities = await ActivityLog.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .select({
      type: 1,
      activity: 1,
      user: 1,
      description: 1,
      status: 1,
      amount: 1,
      createdAt: 1,
    });

  res.status(200).json({
    result: activities.length,
    activities,
  });
});

// Get activities by type
const getActivitiesByType = expressAsyncHandler(async (req, res) => {
  const { type } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const activities = await ActivityLog.find({ type })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await ActivityLog.countDocuments({ type });

  res.status(200).json({
    result: activities.length,
    total,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    activities,
  });
});

// Get user activities
const getUserActivities = expressAsyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const activities = await ActivityLog.find({ "user.id": userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await ActivityLog.countDocuments({ "user.id": userId });

  res.status(200).json({
    result: activities.length,
    total,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    activities,
  });
});

// Get activity statistics
const getActivityStats = expressAsyncHandler(async (req, res) => {
  const { timeframe = "7d" } = req.query;

  // Calculate date range based on timeframe
  const now = new Date();
  let startDate = new Date();

  switch (timeframe) {
    case "1d":
      startDate.setDate(now.getDate() - 1);
      break;
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  // Aggregate activities by type
  const typeStats = await ActivityLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Aggregate activities by day
  const dailyStats = await ActivityLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Get total activities count
  const totalActivities = await ActivityLog.countDocuments({
    createdAt: { $gte: startDate },
  });

  res.status(200).json({
    timeframe,
    totalActivities,
    typeStats,
    dailyStats,
  });
});

// Delete old activities (cleanup)
const cleanupOldActivities = expressAsyncHandler(async (req, res) => {
  const { days = 90 } = req.body; // Default: keep last 90 days

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await ActivityLog.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  res.status(200).json({
    message: `Cleaned up ${result.deletedCount} old activity records`,
    deletedCount: result.deletedCount,
  });
});

module.exports = {
  getAllActivities,
  getOneActivity,
  getDashboardActivities,
  getActivitiesByType,
  getUserActivities,
  getActivityStats,
  cleanupOldActivities,
};
