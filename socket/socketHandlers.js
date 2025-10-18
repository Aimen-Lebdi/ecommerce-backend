// Socket event handlers for different activities
class SocketHandlers {
  constructor(io) {
    this.io = io;
  }

  // Handle activity-related events
  handleActivityEvents(socket) {
    // FIXED: Separate handler for join_dashboard - only send activities after joining
    socket.on("join_dashboard", async () => {
      if (socket.user.role !== "admin") {
        socket.emit("dashboard_error", {
          message: "Access denied: Admin role required",
        });
        return;
      }

      try {
        // Join the dashboard room first
        socket.join("dashboard");
        console.log(`📊 Admin ${socket.user.name} joined dashboard room`);
        
        // Emit join confirmation
        socket.emit("dashboard_joined", {
          message: "Successfully joined dashboard",
        });

        // THEN send initial activities (only if not already sent)
        if (!socket.hasReceivedInitialActivities) {
          const ActivityLog = require("../models/activityLogModel");

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

          socket.hasReceivedInitialActivities = true;

          socket.emit("initial_activities", {
            activities: recentActivities,
            timestamp: new Date(),
          });

          console.log(`✅ Admin ${socket.user.name} received ${recentActivities.length} initial activities`);
        }
      } catch (error) {
        console.error("Error in join_dashboard:", error);
        socket.emit("activity_error", {
          message: "Failed to join dashboard or load activities",
        });
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

          console.log(`🔍 Filtered ${filteredActivities.length} activities for ${socket.user.name}`);
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

          console.log(`📊 Sent activity stats to ${socket.user.name}`);
        } catch (error) {
          console.error("Error getting activity stats:", error);
          socket.emit("activity_error", { message: "Failed to get stats" });
        }
      }
    });

    // FIXED: Explicit handler for requesting initial activities
    socket.on("request_initial_activities", async () => {
      if (socket.user.role !== "admin") {
        socket.emit("activity_error", {
          message: "Access denied: Admin role required",
        });
        return;
      }

      // Check if user is in dashboard room
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes("dashboard")) {
        socket.emit("activity_error", {
          message: "Please join dashboard first",
        });
        return;
      }

      try {
        if (socket.hasReceivedInitialActivities) {
          console.log(`⏭️ Admin ${socket.user.name} already received initial activities`);
          return;
        }

        const ActivityLog = require("../models/activityLogModel");

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

        socket.hasReceivedInitialActivities = true;

        socket.emit("initial_activities", {
          activities: recentActivities,
          timestamp: new Date(),
        });

        console.log(`✅ Admin ${socket.user.name} received ${recentActivities.length} initial activities`);
      } catch (error) {
        console.error("Error fetching initial activities:", error);
        socket.emit("activity_error", {
          message: "Failed to load activities",
        });
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

        console.log(`📝 Sent ${userActivities.length} activities to ${socket.user.name}`);
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