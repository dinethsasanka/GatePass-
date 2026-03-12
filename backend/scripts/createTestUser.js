const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/gatepass", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const createTestUser = async () => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ userId: "testuser" });
    
    if (existingUser) {
      console.log("ℹ️ Test user already exists");
      console.log("📋 Login Credentials:");
      console.log("   User Type: SLT");
      console.log("   User ID: testuser");
      console.log("   Password: test123");
      console.log("   Service No:", existingUser.serviceNo);
      console.log("   Role:", existingUser.role);
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("test123", salt);

    // Create test user
    const testUser = new User({
      userType: "SLT",
      userId: "testuser",
      password: hashedPassword,
      serviceNo: "TEST001",
      name: "Test User",
      designation: "Test Manager",
      section: "Test Section",
      group: "Test Group",
      contactNo: "0771234567",
      email: "testuser@slt.com.lk",
      gradeName: "A.3",
      fingerScanLocation: "Head Office",
      branches: ["Head Office"],
      role: "User",
    });

    await testUser.save();

    console.log("✅ Test user created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("   User Type: SLT");
    console.log("   User ID: testuser");
    console.log("   Password: test123");
    console.log("   Service No: TEST001");
    console.log("   Role: User");
    console.log("\n🚀 You can now login with these credentials!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test user:", error);
    process.exit(1);
  }
};

createTestUser();
