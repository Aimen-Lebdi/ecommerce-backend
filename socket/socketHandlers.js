// Socket event handlers for different activities
class SocketHandlers {
  constructor(io) {
    this.io = io;
  }

  // Handle activity-related events
  handleActivityEvents(socket) {
    // When admin joins dashboard, send recent activities
    socket.on("join_dashboard", async () => {
      if (socket.user.role === "admin") {
        try {
          const ActivityLog = require("../models/activityLogModel");

          // Get last 20 activities for initial load
          const recentActivities = await ActivityLog.find({})
            .sort({ createdAt: -1 })
            .limit(20)
            .select({
              type: 1,
              activity: 1,
              user: 1,
              description: 1,
              status: 1,
              amount: 1,
              createdAt: 1,
            });

          // Send initial activities to the admin
          socket.emit("initial_activities", {
            activities: recentActivities,
            timestamp: new Date(),
          });

          console.log(`Admin ${socket.user.name} received initial activities`);
        } catch (error) {
          console.error("Error fetching initial activities:", error);
          socket.emit("activity_error", {
            message: "Failed to load activities",
          });
        }
      }
    });

    // Handle activity filters
    socket.on("filter_activities", async (filters) => {
      if (socket.user.role === "admin") {
        try {
          const ActivityLog = require("../models/activityLogModel");

          let query = {};

          // Apply filters
          if (filters.type && filters.type !== "all") {
            query.type = filters.type;
          }

          if (filters.timeframe) {
            const now = new Date();
            let startDate = new Date();

            switch (filters.timeframe) {
              case "1h":
                startDate.setHours(now.getHours() - 1);
                break;
              case "24h":
                startDate.setDate(now.getDate() - 1);
                break;
              case "7d":
                startDate.setDate(now.getDate() - 7);
                break;
              case "30d":
                startDate.setDate(now.getDate() - 30);
                break;
            }

            if (filters.timeframe !== "all") {
              query.createdAt = { $gte: startDate };
            }
          }

          const filteredActivities = await ActivityLog.find(query)
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

          socket.emit("filtered_activities", {
            activities: filteredActivities,
            filters: filters,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error filtering activities:", error);
          socket.emit("activity_error", {
            message: "Failed to filter activities",
          });
        }
      }
    });

    // Handle real-time activity requests
    socket.on("request_activity_stats", async () => {
      if (socket.user.role === "admin") {
        try {
          const ActivityLog = require("../models/activityLogModel");

          const now = new Date();
          const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          // Get activity stats for last 24 hours
          const stats = await ActivityLog.aggregate([
            {
              $match: {
                createdAt: { $gte: last24h },
              },
            },
            {
              $group: {
                _id: "$type",
                count: { $sum: 1 },
              },
            },
          ]);

          const totalActivities = await ActivityLog.countDocuments({
            createdAt: { $gte: last24h },
          });

          socket.emit("activity_stats", {
            stats: stats,
            total: totalActivities,
            timeframe: "24h",
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error getting activity stats:", error);
          socket.emit("activity_error", { message: "Failed to get stats" });
        }
      }
    });
  }

  // Handle user-specific events
  handleUserEvents(socket) {
    // When user wants to see their own activities
    socket.on("get_my_activities", async () => {
      try {
        const ActivityLog = require("../models/activityLogModel");

        const userActivities = await ActivityLog.find({
          "user.id": socket.user._id,
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .select({
            type: 1,
            activity: 1,
            description: 1,
            status: 1,
            amount: 1,
            createdAt: 1,
          });

        socket.emit("my_activities", {
          activities: userActivities,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error getting user activities:", error);
        socket.emit("activity_error", {
          message: "Failed to load your activities",
        });
      }
    });
  }

  // Setup all handlers
  setupHandlers(socket) {
    this.handleActivityEvents(socket);
    this.handleUserEvents(socket);

    // Add more handler categories as needed
    // this.handleOrderEvents(socket);
    // this.handleProductEvents(socket);
  }
}

module.exports = SocketHandlers;
