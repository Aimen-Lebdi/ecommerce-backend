const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const dotenv = require("dotenv");
const http = require("http");

// ====================================
// FIX: Load correct environment file
// ====================================
const envFile = process.env.NODE_ENV === "production" 
  ? ".env.production" 
  : ".env.development";

dotenv.config({ path: path.resolve(__dirname, envFile) });

// Verify critical environment variables
console.log("🔧 Environment Configuration:");
console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`📄 Loading from: ${envFile}`);
console.log(`✅ PORT: ${process.env.PORT}`);
console.log(`✅ MONGO_DB_URI: ${process.env.MONGO_DB_URI ? "Loaded" : "Missing"}`);
console.log(`✅ STRIPE_SECRET: ${process.env.STRIPE_SECRET ? "Loaded (length: " + process.env.STRIPE_SECRET.length + ")" : "Missing"}`);

// Exit if critical variables are missing
if (!process.env.STRIPE_SECRET) {
  console.error("❌ CRITICAL: STRIPE_SECRET is not defined!");
  console.error(`   Check if ${envFile} exists and contains STRIPE_SECRET`);
  process.exit(1);
}

if (!process.env.MONGO_DB_URI) {
  console.error("❌ CRITICAL: MONGO_DB_URI is not defined!");
  process.exit(1);
}

console.log("✅ All critical environment variables loaded successfully\n");
// ====================================

const connectdb = require("./config/connectdb");
const globalErrorMiddleware = require("./middlewares/globalErrorMiddlewares");
const mountRoutes = require("./routes");
const endpointError = require("./utils/endpointError");
const { webhookCheckout } = require("./services/orderServices");

// Socket.IO imports
const SocketConfig = require("./socket/socketConfig");
const socketEmitter = require("./utils/socketEmitter");
const cookieParser = require("cookie-parser");

connectdb();

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const socketConfig = new SocketConfig(server);
socketEmitter.setSocket(socketConfig);

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : [
      "http://localhost:5173", // local Vite frontend
      "http://localhost",      // Docker frontend
      "http://localhost:80",   // Docker frontend explicit port
    ];

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// compress all responses
app.use(compression());

// Checkout webhook
app.post(
  "/webhook-checkout",
  express.raw({ type: "application/json" }),
  webhookCheckout
);

app.use(cookieParser());

// Middlewares
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}

// Limit each IP to 100 requests per `window` (here, per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message:
    "Too many accounts created from this IP, please try again after an hour",
});

// Apply the rate limiting middleware to all requests
app.use("/api", limiter);

// Middleware to protect against HTTP Parameter Pollution attacks
app.use(
  hpp({
    whitelist: [
      "price",
      "sold",
      "quantity",
      "ratingsAverage",
      "ratingsQuantity",
    ],
  })
);

mountRoutes(app);

app.all("*splat", (req, res, next) => {
  next(new endpointError("can't find this route", 404));
});

app.use(globalErrorMiddleware);

const PORT = process.env.PORT || 5000;

// Use the HTTP server instead of app.listen
server.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.IO server is ready`);
  console.log(`📡 Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log(`🌍 CORS Origins: ${allowedOrigins.join(", ")}\n`);
});

process.on("unhandledRejection", (err) => {
  console.log(`Unhandled error: ${err.name} | ${err.message}`);
  server.close(() => {
    console.log("Shutting down the server ...");
    process.exit(1);
  });
});

// Export server for testing purposes
module.exports = server;