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
          { title: "Approve", path: "/executiveApproval" },      // TEST 5: Change 12/24 11.05PM Executive Approve to Approve
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
      case "Verifier":
      case "RO1":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
          { title: "Verify", path: "/verify" },
          { title: "Receive", path: "/receive" },
        ];
      case "Pleader":
      case "RO2":
        return [
          { title: "New Request", path: "/newrequest" },
          { title: "My Request", path: "/myrequests" },
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
      "px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out relative group",
      "text-slate-600 dark:text-slate-300",
      "hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800",
      isActive
        ? "bg-blue-100/70 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-semibold rounded-t-md"
        : "rounded-lg",
    ].join(" ");

  const underlineClass = (isActive) =>
    [
      "absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300",
      isActive ? "w-full" : "w-0 group-hover:w-full",
    ].join(" ");
  // ----------------------------------------------------------------

  return (
    <nav className="fixed w-full h-20 z-20 top-0 left-0 bg-white dark:bg-slate-900 backdrop-blur-lg bg-opacity-80 dark:bg-opacity-80">
      <div className="max-w-screen-xl mx-auto p-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <div className="relative">
              <img
                src={loginImage}
                className="h-10 mr-3 rounded-lg transform group-hover:scale-105 transition-transform duration-300"
                alt="Logo"
              />
              <div className="absolute inset-0 bg-blue-500 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
          </Link>

          {/* Desktop menu */}
          {!isLoginPage && (
            <div className="hidden md:flex items-center space-x-2 flex-1 justify-center">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={navItemClass}
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
            <div className="hidden md:flex items-center absolute right-4 top-1/2 -translate-y-1/2">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 hover:from-blue-100 hover:to-purple-100 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-blue-200 dark:border-slate-600 transition-all duration-300 hover:shadow-lg group"
                >
                  {/* Avatar Circle */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {userName.charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                      {userName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
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
