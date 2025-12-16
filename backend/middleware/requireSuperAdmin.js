module.exports = function requireSuperAdmin(req, res, next) {
  try {
    const role = String(req?.user?.role || "")
      .trim()
      .toLowerCase();
    if (role !== "superadmin") {
      return res.status(403).json({ message: "SuperAdmin only." });
    }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
