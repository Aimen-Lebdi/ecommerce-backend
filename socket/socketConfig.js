const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const SocketHandlers = require("./socketHandlers");

class SocketConfig {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: ["http://localhost:5173"], // Your frontend URLs
        credentials: true,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.socketHandlers = new SocketHandlers(this.io);
    this.setupMiddlewares();
    this.setupConnections();
  }

  setupMiddlewares() {
    // Authentication middleware for socket connections
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "") ||
          socket.handshake.query.token;

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        // FIXED: Use JWT_ACCESS_SECRET_KEY for access tokens
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET_KEY);

        // Get user from database
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }

        // Check if user is active
        if (!user.active) {
          return next(new Error("Authentication error: Account deactivated"));
        }

        // Check if password was changed after token was issued
        if (user.passwordChangedAt) {
          const passChangedTimestamp = parseInt(
            user.passwordChangedAt.getTime() / 1000,
            10
          );
          
          if (passChangedTimestamp > decoded.iat) {
            return next(new Error("Authentication error: Password recently changed"));
          }
        }

        // Attach user to socket
        socket.user = user;
        next();
      } catch (error) {
        console.error("Socket authentication error:", error.message);
        
        // Better error messages
        if (error.name === "TokenExpiredError") {
          return next(new Error("Authentication error: Token expired"));
        }
        if (error.name === "JsonWebTokenError") {
          return next(new Error("Authentication error: Invalid token"));
        }
        
        next(new Error("Authentication error: " + error.message));
      }
    });
  }

  setupConnections() {
    this.io.on("connection", (socket) => {
      console.log(
        `✅ User ${socket.user.name} (${socket.user.role}) connected with socket ID: ${socket.id}`
      );

      // Join user to personal room based on role
      if (socket.user.role === "admin") {
        socket.join("admin_room");
        console.log(`👑 Admin ${socket.user.name} joined admin room`);

        // Send connection confirmation
        socket.emit("admin_connected", {
          message: "Connected to admin panel",
          user: {
            id: socket.user._id,
            name: socket.user.name,
            role: socket.user.role,
          },
        });
      } else {
        socket.join(`user_${socket.user._id}`);
        console.log(`👤 User ${socket.user.name} joined personal room`);

        // Send connection confirmation
        socket.emit("user_connected", {
          message: "Connected successfully",
          user: {
            id: socket.user._id,
            name: socket.user.name,
          },
        });
      }

      // Setup event handlers
      this.socketHandlers.setupHandlers(socket);

      // Handle dashboard join requests from frontend
      socket.on("join_dashboard", () => {
        if (socket.user.role === "admin") {
          socket.join("dashboard");
          console.log(
            `📊 Admin ${socket.user.name} joined dashboard room`
          );
          socket.emit("dashboard_joined", {
            message: "Successfully joined dashboard",
          });
        } else {
          socket.emit("dashboard_error", {
            message: "Access denied: Admin role required",
          });
        }
      });

      socket.on("leave_dashboard", () => {
        socket.leave("dashboard");
        console.log(`👋 User ${socket.user.name} left dashboard room`);
        socket.emit("dashboard_left", { message: "Left dashboard room" });
      });

      // Handle ping/pong for connection health
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: new Date() });
      });

      // Handle disconnect
      socket.on("disconnect", (reason) => {
        console.log(`❌ User ${socket.user.name} disconnected: ${reason}`);
      });

      // Error handling
      socket.on("error", (error) => {
        console.error(`⚠️ Socket error for user ${socket.user.name}:`, error);
      });
    });
  }

  // Method to emit to specific rooms
  emitToAdmins(event, data) {
    this.io.to("admin_room").emit(event, data);
  }

  emitToDashboard(event, data) {
    this.io.to("dashboard").emit(event, data);
  }

  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  // Get IO instance
  getIO() {
    return this.io;
  }

  // Get connected clients info
  getConnectedClients() {
    return {
      total: this.io.engine.clientsCount,
      admins: this.io.sockets.adapter.rooms.get("admin_room")?.size || 0,
      dashboard: this.io.sockets.adapter.rooms.get("dashboard")?.size || 0,
    };
  }
}

module.exports = SocketConfig;