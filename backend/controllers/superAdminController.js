const User = require("../models/User");
const bcrypt = require("bcryptjs");
const PLeader = require("../models/PLeader");

// Import user enrichment helpers
const { 
  getAllUsersWithERPData, 
  getUserWithERPData 
} = require('../utils/userHelpers');
const ErpLocation = require("../models/ErpLocation");

const resolveBranchNames = async (branches) => {
  const raw = Array.isArray(branches) ? branches : [];
  const ids = raw.map((b) => String(b || "").trim()).filter(Boolean);

  if (!ids.length) return [];

  const locs = await ErpLocation.find({ locationId: { $in: ids } })
    .select({ locationId: 1, fingerscanLocation: 1 })
    .lean();

  const byId = new Map(
    locs.map((l) => [String(l.locationId).trim(), l.fingerscanLocation])
  );

  return ids
    .map((id) => byId.get(id) || id)
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => v.trim());
};

const normalizeBranchesForUser = async (branches) => {
  if (branches === undefined) return undefined;
  return await resolveBranchNames(branches);
};

const syncPLeaderFromUser = async (user, previousServiceNo = null) => {
  if (!user) return;

  const serviceNo = user.serviceNo ? String(user.serviceNo).trim() : "";
  const prevServiceNo = previousServiceNo
    ? String(previousServiceNo).trim()
    : "";

  if (prevServiceNo && prevServiceNo !== serviceNo) {
    await PLeader.deleteOne({ employeeNumber: prevServiceNo });
  }

  if (user.role !== "Pleader") {
    if (serviceNo) {
      await PLeader.deleteOne({ employeeNumber: serviceNo });
    }
    return;
  }

  if (!serviceNo) return;

  const branches = await resolveBranchNames(user.branches);

  await PLeader.findOneAndUpdate(
    { employeeNumber: serviceNo },
    {
      name: user.name || "",
      employeeNumber: serviceNo,
      branches,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// Get all users WITH ERP DATA
const getAllUsers = async (req, res) => {
  try {
    // Use enriched helper to get users with ERP details
    const dbUsers = await User.find().select("-password").lean();
    const enrichedUsers = await getAllUsersWithERPData({}, true);
    res.json(enrichedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const normalizedBranches = await normalizeBranchesForUser(branches);

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
      branches: normalizedBranches || [],
    });

    await syncPLeaderFromUser(user);

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

    const previousServiceNo = user.serviceNo;

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
    if (branches !== undefined) {
      user.branches = await normalizeBranchesForUser(branches);
    }

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    await syncPLeaderFromUser(user, previousServiceNo);

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
    if (user.serviceNo) {
      await PLeader.deleteOne({ employeeNumber: String(user.serviceNo).trim() });
    }
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

// Get users by type WITH ERP DATA
const getUsersByType = async (req, res) => {
  try {
    const { userType } = req.params;
    // Fetch users with ERP enrichment
    const enrichedUsers = await getAllUsersWithERPData({ userType }, true);
    res.json(enrichedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    const normalizedBranches = await normalizeBranchesForUser(branches);

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
        branches: normalizedBranches || [],
        isActive: true,
        gradeName: gradeName ?? null,
        fingerScanLocation: safeFingerScanLocation,
      });
    } else {
      // UPDATE existing user
      user.role = role;
      if (branches !== undefined) {
        user.branches = normalizedBranches || [];
      }
      user.email = safeEmail;
      user.section = safeSection;
      user.gradeName = gradeName ?? user.gradeName ?? null;
      if (resolvedFingerScanLocation) {
        user.fingerScanLocation = resolvedFingerScanLocation;
      }

      await user.save();
    }

    await syncPLeaderFromUser(user);

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
