// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
const helmet = require("helmet");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// 1) Load env first
dotenv.config();

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// Configure allowed origins based on environment
// Production: Only https://gatepass.slt.lk
// Development: Allow localhost for testing
const ALLOWED_ORIGINS = isDevelopment 
  ? ['http://localhost:5173', 'http://localhost:3000', 'https://gatepass.slt.lk']
  : ['https://gatepass.slt.lk'];

console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🔒 Allowed CORS origins:`, ALLOWED_ORIGINS);

// 2) Mongoose config + DB connect
mongoose.set("strictQuery", false);
connectDB();

// 3) Init express BEFORE any app.use(...)
const app = express();

// Disable X-Powered-By header to prevent server fingerprinting
app.disable("x-powered-by");

const server = http.createServer(app);

// 4) Setup Socket.IO with hardened security configuration
// Production: WebSocket only, single origin
// Development: Allow polling fallback and localhost origins for testing
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Security: WebSocket-only in production, allow polling in development
  transports: isDevelopment ? ["websocket", "polling"] : ["websocket"],
  // Disable legacy Engine.IO protocol versions
  allowEIO3: false,
});

// 5) Make io accessible to routes
app.set("io", io);

// 6) Security Middleware - MUST BE APPLIED BEFORE ROUTES!
// All security headers are configured here to ensure protection for all endpoints
// This addresses OWASP ZAP findings for missing security headers

// Configure Helmet with strict Content Security Policy
// Addresses OWASP ZAP Medium findings:
//   - CSP: Failure to Define Directive with No Fallback (frame-ancestors, form-action)
//   - Content Security Policy (CSP) Header Not Set
//   - Missing Anti-clickjacking Header
// Addresses OWASP ZAP Low findings:
//   - Strict-Transport-Security Header Not Set
//   - X-Content-Type-Options Header Missing
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],       // Block inline event handlers
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", "https://login.microsoftonline.com"],
        objectSrc: ["'none'"],           // Block <object>, <embed>, <applet>
        baseUri: ["'self'"],             // Restrict <base> tag
        // These directives do NOT fall back to default-src and MUST be explicitly defined
        frameAncestors: ["'none'"],      // Anti-clickjacking (replaces X-Frame-Options)
        formAction: ["'self'", "https://login.microsoftonline.com"],
        upgradeInsecureRequests: [],     // Auto-upgrade HTTP to HTTPS
      },
    },
    // HSTS: Force HTTPS for 1 year
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // X-Frame-Options: DENY (backup to CSP frame-ancestors)
    frameguard: { action: "deny" },
    // X-Content-Type-Options: nosniff
    noSniff: true,
    // Referrer-Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: { allow: false },
    // Hide X-Powered-By
    hidePoweredBy: true,
    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  })
);

// CORS configuration with environment-based origins
// Production: Strict single origin (https://gatepass.slt.lk)
// Development: Allow localhost for testing
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 7) Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache-Control hardening for ALL routes
// Prevents sensitive data from being cached by browsers or proxies
// Addresses OWASP ZAP Informational finding: Re-examine Cache-control Directives
app.use((req, res, next) => {
  // Static assets (JS/CSS/images) should be cached; everything else should not
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);
  if (!isStaticAsset) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// 8) Static file serving
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// Stricter CORS configuration specifically for authentication endpoints
// Allows POST for login/register and GET for Azure OAuth URL endpoint
// Development: Allow localhost for testing
const authCorsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"], // GET needed for Azure login URL endpoint
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 600, // 10 minutes preflight cache
};

// 9) Route imports
const executiveRoutes = require("./routes/executiveRoutes");

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const myReceiptRoutes = require("./routes/myReceiptRoutes");
const myRequestRoutes = require("./routes/myRequestRoutes");
const approveRoutes = require("./routes/approvalRoutes");
const verifyRoutes = require("./routes/verifyRoutes");
const dispatchRoutes = require("./routes/dispatchroutes");
const adminRouters = require("./routes/adminRoutes");
const receiveRoutes = require("./routes/receiveRoutes");
const emailRoutes = require("./routes/emailRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const adminRequestRoutes = require("./routes/adminRequestRoutes");
const erpRoutes = require("./routes/erpRoutes");
const intranetRoutes = require("./routes/intranetRoutes");

// 10) Mount routes
// Authentication routes have stricter CORS policy applied
app.use("/api/auth", cors(authCorsOptions), authRoutes);
const requestRoutes = require("./routes/requestRoutes");
app.use("/api/executives", executiveRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/reicept", myReceiptRoutes);
app.use("/api/approve", approveRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/admin", adminRouters);
app.use("/api/myRequest", myRequestRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/receive", receiveRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/admin", adminRequestRoutes);
app.use("/api/erp", erpRoutes);
app.use("/api/intranet", intranetRoutes);

// 11) Health check (optional)
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// 12) Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join user-specific room based on service number
  socket.on("join-user-room", (serviceNo) => {
    if (serviceNo) {
      socket.join(`user-${serviceNo}`);
      console.log(`User ${serviceNo} joined their room`);
    }
  });

  // Join role-specific rooms
  socket.on("join-role-room", (role) => {
    if (role) {
      socket.join(`role-${role}`);
      console.log(`User joined role room: ${role}`);
    }
  });

  // Join branch-specific rooms
  socket.on("join-branch-room", (branch) => {
    if (branch) {
      socket.join(`branch-${branch}`);
      console.log(`User joined branch room: ${branch}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// 13) Error handling middleware (for multer and other errors)
app.use((error, req, res, next) => {
  console.error("Error:", error);

  // Multer errors
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File is too large. Maximum size is 5MB per file.",
    });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      message: "Too many files uploaded.",
    });
  }

  // Generic error
  res.status(error.status || 500).json({
    message: error.message || "Something went wrong!",
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for real-time updates`);
});
