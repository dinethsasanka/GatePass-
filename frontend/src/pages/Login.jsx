import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService.js";
import loginImage from "../assets/SLTMobitel_Logo.svg";
import { motion } from "framer-motion";
import { useToast } from "../components/ToastProvider.jsx";

const Login = () => {
  const [userType, setUserType] = useState("SLT");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAzureLoading, setIsAzureLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(false); 
    try {
      const data = await authService.login(userId, password, userType);
      if (data.token) {
        localStorage.setItem("user", JSON.stringify(data));
        const roleToStore = String(data.role).trim();
        localStorage.setItem("role", roleToStore);
        const token = String(data.token).trim();
        localStorage.setItem("token", token);

        showToast("Login successful! Redirecting...", "success");
        
        setTimeout(() => {
          navigate("/newrequest");
        }, 100);
      } else {
        setLoginError(true);
        if(userId === "" || password === ""){
          //showToast("Please enter your username and password.", "error");
        }else{
          showToast("Invalid credentials. Please try again.", "error");
        }
        setUserId('');
        setPassword('');
      }
    } catch (error) {
      setLoginError(true);
      showToast("Login failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setIsAzureLoading(true);
    try {
      const data = await authService.azureLogin();
      if (data.token) {
        localStorage.setItem("user", JSON.stringify(data));
        const roleToStore = String(data.role).trim();
        localStorage.setItem("role", roleToStore);
        const token = String(data.token).trim();
        localStorage.setItem("token", token);

        showToast("Azure login successful! Redirecting...", "success");
        
        setTimeout(() => {
          navigate("/newrequest");
        }, 100);
      }
    } catch (error) {
      console.error('Azure login error:', error);
      showToast("Azure login failed. Please try again.", "error");
    } finally {
      setIsAzureLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-tr from-indigo-900 via-blue-800 to-blue-600">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5 backdrop-blur-sm"
            style={{
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 15}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex justify-center items-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-4xl flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/10"
        >
          {/* Left side - Branding */}
          <div className="w-full md:w-5/12 bg-gradient-to-br from-blue-900 to-indigo-900 p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-blue-500/20 blur-2xl" />
            <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 backdrop-blur-sm" />
            
            {/* Content */}
            <div className="relative z-10 space-y-6">
              <div className="flex justify-center py-6">
                <img
                  src={loginImage}
                  alt="SLT Mobitel"
                  className="w-3/4 drop-shadow-lg filter brightness-110"
                />
              </div>
              
              <div className="space-y-4 text-white">
                <h2 className="text-2xl font-bold tracking-tight">Welcome to Gate Pass Portal</h2>
                <p className="opacity-80 leading-relaxed">
                  Secure, efficient, and user-friendly access management for SLT premises.
                </p>
              </div>
            </div>
            
            <div className="relative z-10 mt-auto">
              <div className="h-1 w-16 bg-blue-400 mb-6" />
              <p className="text-blue-100 text-sm">
                © 2025 SLT-MOBITEL. All rights reserved.
              </p>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="w-full md:w-7/12 bg-white p-8 md:p-12">
            <div className="max-w-md mx-auto">
              <h1 className="text-3xl font-extrabold mb-5 text-gray-800">
                Sign In
              </h1>
              <p className={`mb-8 ${loginError ? 'text-red-500 font-bold' : 'text-gray-500 font-bold'}`}>
                  {loginError ? "Please enter your correct username and password." : "Enter your credentials to access your account"}
              </p>

              {/* Azure Login Button */}
              <div className="mb-6">
                <button
                  onClick={handleAzureLogin}
                  disabled={isAzureLoading}
                  className="w-full flex items-center justify-center py-3 px-6 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1 mb-4"
                >
                  {isAzureLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in with Azure...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                      </svg>
                      Sign in with Microsoft
                    </>
                  )}
                </button>
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogin} className="!block space-y-6">
                {/* User ID */}
                <div className="space-y-2">
                  <label htmlFor="userId" className="text-sm font-medium text-gray-700">
                    User ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      
                    </div>
                    <input
                      id="userId"
                      type="text"
                      placeholder="Enter your ID"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className={`pl-10 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all1`}
                      
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2 mb-12">
                  <div className="flex justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      
                    </div>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <a href="#" className="font-medium text-blue-600 hover:text-blue-800 transition-colors">
                    Contact administrator
                  </a>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
