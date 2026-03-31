import React, { useState, useEffect, useRef } from "react";
import {
  LogOut,
  Menu,
  X,
  User,
  MapPin,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import loginImage from "../assets/SLTMobitel_Logo.svg";
import transzentLogo from "../assets/transzent-logo.png";
import { useLocation, useNavigate, Link, NavLink } from "react-router-dom";
import { useToast } from "../components/ToastProvider";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [userBranch, setUserBranch] = useState("");
  const [userServiceNo, setUserServiceNo] = useState("");
  const { showToast } = useToast();
  const userMenuRef = useRef(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const trimmedRole = storedRole ? storedRole.trim() : "";
    setUserRole(trimmedRole);

    // Get user data from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Extract full name
        setUserName(user.name || "User");
        // Set service number
        setUserServiceNo(user.serviceNo || user.userId || "");
        // Handle branches - show only the first branch
        if (Array.isArray(user.branches) && user.branches.length > 0) {
          setUserBranch(user.branches[0]);
        } else if (typeof user.branches === "string") {
          setUserBranch(user.branches);
        } else {
          setUserBranch("Not Assigned");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, [location.pathname]);

  // Fetch branch name from erplocations when user branch ID is available
  useEffect(() => {
    const fetchBranchName = async () => {
      if (userBranch && userBranch !== "Not Assigned") {
        const isLocationId = /^L\d+$/i.test(userBranch.trim());
        if (!isLocationId) return;

        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          // Call API to get branch name
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/erp/branch/${encodeURIComponent(
              userBranch,
            )}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.branchName) {
              // Update userBranch with actual branch name
              setUserBranch(data.data.branchName);
            }
          } else {
            // If API fails, keep the location ID as fallback
            console.log("Branch name not found, using location ID:", userBranch);
          }
        } catch (error) {
          console.error("Error fetching branch name:", error);
          // Keep the location ID if fetch fails
        }
      }
    };

    fetchBranchName();
  }, [userBranch]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isLoginPage = location.pathname === "/";
  const logoTargetPath = isLoginPage ? "/" : "/myrequests";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    setUserRole("");
    setIsUserMenuOpen(false);
    showToast("Logout successful!", "success");
    navigate("/");
  };

  const getMenuItems = () => {
    switch (userRole) {
      case "SuperAdmin":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Request Details", path: "/request-details" },
          { title: "Executive Approve", path: "/executiveApproval" },
          { title: "Verify", path: "/verify" },
          { title: "Petrol leader", path: "/dispatch" },
          { title: "Receive", path: "/receive" },
          { title: "Admin", path: "/admin" },
        ];
      case "Admin":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Executive Approve", path: "/executiveApproval" },
          { title: "Verify", path: "/verify" },
          { title: "Petrol leader", path: "/dispatch" },
          { title: "Receive", path: "/receive" },
          { title: "Admin", path: "/admin" },
        ];
      case "User":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Receive", path: "/receive" },
        ];
      case "Approver":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Executive Approve", path: "/executiveApproval" },
          { title: "Receive", path: "/receive" },
        ];

      case "Security Officer":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Verify", path: "/verify" },
          { title: "Petrol leader", path: "/dispatch" },
          { title: "Receive", path: "/receive" },
        ];

      case "Pleader":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Verify", path: "/verify" },
          { title: "Petrol leader", path: "/dispatch" },
          { title: "Receive", path: "/receive" },
        ];
      case "Dispatcher":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Receive", path: "/receive" },
        ];
      default:
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Receive", path: "/receive" },
        ];
    }
  };

  const menuItems = getMenuItems();

  // --- UI improvement helpers (active tab + underline effect) ---
  const navItemClass = ({ isActive }) =>
    [
      "px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ease-in-out relative group rounded-md whitespace-nowrap",
      isActive ? "font-semibold" : "hover:text-white",
    ].join(" ");

  const navItemStyle = (isActive) => ({
    color: isActive ? "#fff" : "rgba(203,213,225,0.85)",
    background: isActive ? "rgba(59,130,246,0.18)" : "transparent",
    boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.3)" : "none",
  });

  const underlineClass = (isActive) =>
    [
      "absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-300",
      isActive ? "w-full bg-blue-400" : "w-0 group-hover:w-full group-hover:bg-blue-500/60",
    ].join(" ");
  // ----------------------------------------------------------------

  return (
    <nav className="fixed w-full z-20 top-0 left-0" style={{ height: "68px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)", borderBottom: "1px solid rgba(59,130,246,0.2)", boxShadow: "0 4px 24px rgba(0,0,0,0.45)" }}>
      <div className="max-w-screen-xl mx-auto px-6" style={{ height: "68px", display: "flex", alignItems: "center" }}>
        <div className="flex items-center justify-between w-full relative">
          {/* Brand Logos — pinned left, never shrinks */}
          <Link to={logoTargetPath} className="flex items-center group flex-shrink-0" style={{ textDecoration: "none" }}>
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-300"
              style={{
                background: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(148,163,184,0.18)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              {/* SLT Mobitel */}
              <img
                src={loginImage}
                className="transition-transform duration-300 group-hover:scale-105"
                alt="SLT Mobitel"
                style={{ height: "34px", width: "auto", filter: "brightness(1.1) contrast(1.05)" }}
              />
              {/* Divider */}
              <div style={{
                width: "1.5px",
                height: "26px",
                background: "linear-gradient(to bottom, transparent, rgba(148,163,184,0.5), transparent)",
                flexShrink: 0,
              }} />
              {/* Transzent */}
              <img
                src={transzentLogo}
                className="transition-transform duration-300 group-hover:scale-105"
                alt="Transzent"
                style={{ height: "28px", width: "auto", filter: "brightness(1.1)" }}
              />
            </div>
          </Link>

          {/* Desktop menu — absolutely centered in navbar */}
          {!isLoginPage && (
            <div
              className="hidden md:flex items-center space-x-0.5"
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={navItemClass}
                  style={({ isActive }) => navItemStyle(isActive)}
                  end
                >
                  {({ isActive }) => (
                    <>
                      {item.title}
                      <span className={underlineClass(isActive)} />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}

          {/* Right side - User Profile Dropdown */}
          {!isLoginPage && (
            <div className="hidden md:flex items-center ml-auto flex-shrink-0">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.13)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                >
                  {/* Avatar Circle */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 10px rgba(99,102,241,0.5)" }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold leading-tight" style={{ color: "#f1f5f9" }}>
                      {userName}
                    </span>
                    <span className="text-xs leading-tight" style={{ color: "rgba(148,163,184,0.8)" }}>
                      {userRole}
                    </span>
                  </div>

                  {/* Dropdown Icon */}
                  <ChevronDown
                    size={18}
                    className={`text-slate-600 dark:text-slate-400 transition-transform duration-300 ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Section */}
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 border-b border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            {userName}
                          </p>
                          {userServiceNo && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {userServiceNo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="px-4 py-3 space-y-2.5 border-b border-slate-200 dark:border-slate-700">
                      {/* Role */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Briefcase
                            size={16}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Role
                          </p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {userRole}
                          </p>
                        </div>
                      </div>

                      {/* Branch */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <MapPin
                            size={16}
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Branch
                          </p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {userBranch}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-200 group"
                      >
                        <LogOut
                          size={18}
                          className="transform group-hover:translate-x-1 transition-transform duration-200"
                        />
                        <span className="font-medium text-sm">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile menu button */}
          {!isLoginPage && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {!isLoginPage && (
          <div className={`${isMenuOpen ? "block" : "hidden"} md:hidden mt-4`}>
            <ul className="flex flex-col space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      [
                        "block px-3 py-2 transition-colors duration-200",
                        "text-slate-600 dark:text-slate-300",
                        "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400",
                        isActive
                          ? "bg-blue-100/70 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-semibold rounded-t-md"
                          : "rounded-lg",
                      ].join(" ")
                    }
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.title}
                  </NavLink>
                </li>
              ))}

              <li className="pt-4 border-t border-slate-200 dark:border-slate-700">
                {/* Mobile User Info Card */}
                <div className="mx-3 mb-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 border border-blue-200 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {userName}
                      </p>
                      {userServiceNo && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {userServiceNo}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Role & Branch Info */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                      <Briefcase
                        size={14}
                        className="text-blue-600 dark:text-blue-400"
                      />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Role
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {userRole}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                      <MapPin
                        size={14}
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Branch
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {userBranch}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md"
                  >
                    <LogOut size={18} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
