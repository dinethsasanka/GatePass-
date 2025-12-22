// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path"); 
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const healthRouter = require('./routes/health');   // DEVOPS Change 12/16/2025

// 1) Load env first
dotenv.config();

// 2) Mongoose config + DB connect
mongoose.set("strictQuery", false);
connectDB();

// 3) Init express BEFORE any app.use(...)
const app = express();
const server = http.createServer(app); 
// 4) Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// 5) Make io accessible to routes
app.set("io", io);

// 6) Middleware - ORDER MATTERS!
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ADD THIS for form data
app.use(cors());


app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
//console.log('📁 Static files serving from:', path.join(__dirname, 'uploads'));

// 7) Route imports
const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");
const userRoutes = require("./routes/userRoutes");
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

// 8) Mount routes (only ONCE each)
app.use('/api', healthRouter);  // DEVOPS Change 12/16/2025
app.use("/api/auth", authRoutes);
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

// 9) Health check (optional)
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// 10) Socket.IO connection handling
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

// 11) Error handling middleware (for multer and other errors)
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File is too large. Maximum size is 5MB per file.'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      message: 'Too many files uploaded.'
    });
  }
  
  // Generic error
  res.status(error.status || 500).json({
    message: error.message || 'Something went wrong!'
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for real-time updates`);
  
});

// TEST 3. update 12/23