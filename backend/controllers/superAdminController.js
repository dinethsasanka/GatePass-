const User = require("../models/User");
const bcrypt = require("bcryptjs");
const ErpLocation = require("../models/ErpLocation");

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const {
      userType,
      userId,
      password,
      serviceNo,
      name,
      designation,
      section,
      group,
      contactNo,
      role,
      email,
      branches,
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ userId });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      userType,
      userId,
      password: hashedPassword,
      serviceNo,
      name,
      designation,
      section,
      group,
      contactNo,
      role,
      email,
      branches: branches || [],
    });

    // Return user without password
    const newUser = await User.findById(user._id).select("-password");
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      userType,
      userId,
      serviceNo,
      name,
      designation,
      section,
      group,
      contactNo,
      role,
      email,
      password,
      branches,
    } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (userType) user.userType = userType;
    if (userId) user.userId = userId;
    if (serviceNo) user.serviceNo = serviceNo;
    if (name) user.name = name;
    if (designation) user.designation = designation;
    if (section) user.section = section;
    if (group) user.group = group;
    if (contactNo) user.contactNo = contactNo;
    if (role) user.role = role;
    if (email) user.email = email;
    if (branches !== undefined) user.branches = branches;

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(id).select("-password");
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get users by type (SLT or Non-SLT)
const getUsersByType = async (req, res) => {
  try {
    const { userType } = req.params;
    const users = await User.find({ userType }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Assign role & branches using ERP data (create if not exists)
const upsertUserRole = async (req, res) => {
  try {
    const {
      serviceNo,
      name,
      designation,
      section,
      group,
      contactNo,
      email,
      role,
      branches,
      gradeName,
      fingerScanLocation,
    } = req.body;

    const safeFingerScanLocation =
      fingerScanLocation && typeof fingerScanLocation === "string"
        ? fingerScanLocation.trim()
        : null;

    const safeEmail = email && email.trim() ? email.trim() : "Unknown";

    const safeSection = section && section.trim() ? section.trim() : "Unknown";

    let resolvedFingerScanLocation = null;

    if (fingerScanLocation && typeof fingerScanLocation === "string") {
      const loc = await ErpLocation.findOne({
        fingerscanLocation: fingerScanLocation.trim(),
      });

      if (loc) {
        resolvedFingerScanLocation = loc.locationId; // ✅ SAVE LOCATION ID
      }
    }

    if (!serviceNo || !role) {
      return res.status(400).json({
        message: "serviceNo and role are required",
      });
    }

    // Try to find user by service number
    let user = await User.findOne({ serviceNo });

    if (!user) {
      const defaultPassword = "12345678";
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      user = await User.create({
        userType: "SLT",
        userId: serviceNo,
        password: hashedPassword,
        serviceNo,
        name,
        designation,
        section: safeSection,
        group,
        contactNo,
        email: safeEmail,
        role,
        branches: Array.isArray(branches) ? branches : [],
        isActive: true,
        gradeName: gradeName ?? null,
        fingerScanLocation: safeFingerScanLocation,
      });
    } else {
      // UPDATE existing user
      user.role = role;
      user.branches = Array.isArray(branches) ? branches : user.branches;
      user.email = safeEmail;
      user.section = safeSection;
      user.gradeName = gradeName ?? user.gradeName ?? null;
      if (resolvedFingerScanLocation) {
        user.fingerScanLocation = resolvedFingerScanLocation;
      }

      await user.save();
    }

    const savedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,
      user: savedUser,
    });
  } catch (error) {
    console.error("Assign role error:", error);
    res.status(500).json({
      message: "Failed to assign role",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  getUsersByType,
  upsertUserRole,
};
