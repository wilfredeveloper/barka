const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const logger = require("./utils/logger");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const superAdminRoutes = require("./routes/superAdmin");
const organizationRoutes = require("./routes/organizations");
const subscriptionRoutes = require("./routes/subscriptions");
const clientRoutes = require("./routes/clients");
const conversationRoutes = require("./routes/conversations");
const messageRoutes = require("./routes/messages");
const documentRoutes = require("./routes/documents");
const agentRoutes = require("./routes/agent");
const dashboardRoutes = require("./routes/dashboard");
const todoRoutes = require("./routes/todos");
const debugRoutes = require("./routes/debug");
const memoryRoutes = require("./routes/memory");
const teamMemberRoutes = require("./routes/teamMembers");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const analyticsRoutes = require("./routes/analytics");
const waitlistRoutes = require("./routes/waitlist");

// Import WebSocket utilities
const websocket = require("./utils/websocket");

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers

// Configure CORS with environment variable
const corsOrigin = process.env.CORS_ORIGIN;
console.log('CORS_ORIGIN environment variable:', process.env.CORS_ORIGIN);
console.log('CORS configured with origin:', corsOrigin);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    console.log('CORS check - Request origin:', origin);
    console.log('CORS check - Allowed origin:', corsOrigin);

    // Temporarily allow all origins for debugging
    // TODO: Remove this and use strict origin checking in production
    console.log('CORS check - Allowing all origins for debugging');
    return callback(null, true);

    // Original strict checking (commented out for debugging)
    // if (origin === corsOrigin) {
    //   console.log('CORS check - Origin allowed');
    //   return callback(null, true);
    // } else {
    //   console.log('CORS check - Origin denied');
    //   return callback(new Error('Not allowed by CORS'));
    // }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions)); // Enable CORS with proper configuration

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')} - User-Agent: ${req.get('User-Agent')?.substring(0, 100)}`);

  // Log CORS headers being sent
  const originalSend = res.send;
  res.send = function(data) {
    console.log('Response CORS headers:', {
      'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
      'Access-Control-Allow-Methods': res.get('Access-Control-Allow-Methods'),
    });
    return originalSend.call(this, data);
  };

  next();
});

app.use(express.json()); // Parse JSON bodies

// Import models to register them with Mongoose
require("./models/Project");
require("./models/TeamMember");
require("./models/Task");
require("./models/Waitlist");

// Database connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/orka_pro"
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/team-members", teamMemberRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/waitlist", waitlistRoutes);

// Debug routes - only available in development environment
if (process.env.NODE_ENV !== "production") {
  app.use("/api/debug", debugRoutes);
  console.log("Debug routes enabled - DO NOT USE IN PRODUCTION");
}

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Onboarding Agent API");
});

// CORS test endpoint
app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS test successful",
    origin: req.get('Origin'),
    corsOrigin: process.env.CORS_ORIGIN,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .send({ message: "Something went wrong!", error: err.message });
});

// Create HTTP server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize WebSocket server
try {
  websocket.initWebSocket(server);
  logger.info("WebSocket server initialized successfully");
} catch (error) {
  logger.error(`Failed to initialize WebSocket server: ${error.message}`);
  logger.error(`WebSocket error stack trace: ${error.stack}`);
}

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`WebSocket server available at ws://localhost:${PORT}`);
});

module.exports = app;
