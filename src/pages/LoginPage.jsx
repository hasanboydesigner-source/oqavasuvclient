import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Lock, User, ArrowRight, TrendingUp, Droplets } from "lucide-react";
import { API_URL as BASE_URL } from "../config";

const API_URL = `${BASE_URL}/api`;

const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Foydalanuvchi nomi talab qilinadi";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Parol talab qilinadi";
    } else if (formData.password.length < 6) {
      newErrors.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: formData.username,
        password: formData.password
      });

      if (response.data.success) {
        const { token, user } = response.data;

        // Save both to localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        toast.success("Muvaffaqiyatli kirildi!", {
          duration: 1500,
          position: "top-center",
        });

        setTimeout(() => {
          onLogin(user);
        }, 1000);
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.error || "Username yoki password noto'g'ri";

      toast.error(errorMessage, {
        duration: 3000,
        position: "top-center",
      });

      setErrors({
        general: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EDEDED] p-4 font-inter">
      {/* Main Container - Responsive layout */}
      <div className="w-full max-w-[1240px] bg-white rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row min-h-[520px]">

        {/* Left Side - Information Block (Responsive width) */}
        <div className="lg:w-[40%] relative p-8 md:p-10 flex flex-col justify-between overflow-hidden lg:min-h-full min-h-[240px]">
          {/* Mesh Gradient Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[#E0F2FE]"></div>
            <div className="absolute top-[-30%] right-[-20%] w-[120%] h-[120%] bg-[#0EA5E9] rounded-full blur-[100px] opacity-40"></div>
            <div className="absolute bottom-[-20%] left-[-20%] w-[100%] h-[100%] bg-[#06B6D4] rounded-full blur-[100px] opacity-50"></div>
            <div className="absolute top-[20%] left-[10%] w-[70%] h-[70%] bg-[#7DD3FC] rounded-full blur-[80px] opacity-35"></div>
          </div>

          {/* Logo Branding */}
          <div className="relative z-10 flex items-center gap-2">
            <div className="w-6 h-6 bg-[rgb(0,74,119)] rounded-lg flex items-center justify-center transform -rotate-12">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[13px] text-[#1A1A1A] leading-tight tracking-tighter">Davomat Tizimi</span>
              <span className="text-[8px] font-bold text-[#0284C7] uppercase tracking-widest">Attendance System</span>
            </div>
          </div>

          {/* Tagline */}
          <div className="relative z-10 mt-8 lg:mt-0">
            <h1 className="text-[24px] md:text-[32px] font-[800] text-[#1A1A1A] leading-[1.05] tracking-tight">
              Davomat boshqaruvida zamonaviy va qulay yechim.
            </h1>
          </div>
        </div>

        {/* Right Side - Login Form (Remaining space) */}
        <div className="flex-1 bg-white p-8 md:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-[360px] w-full mx-auto">
            {/* Asterisk Icon (Reference match) */}
            <div className="text-[#0EA5E9] text-4xl md:text-5xl font-serif leading-none mb-2 md:mb-4 select-none">*</div>

            <h2 className="text-[28px] md:text-[34px] font-extrabold text-[#1A1A1A] mb-2 md:mb-3 tracking-tighter">Tizimga kirish</h2>
            <p className="text-[#999999] text-[13px] md:text-[14px] leading-relaxed mb-6 md:mb-10 font-medium">
              Xodimlar davomati va hisobotlarni bir joyda boshqarish uchun tizimga kiring.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 mb-8">
              <div>
                <label className="block text-[13px] font-bold text-[#222222] mb-2 ml-0.5">Foydalanuvchi nomi</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 bg-white border border-[#F0F0F0] rounded-xl text-[15px] transition-all outline-none placeholder:text-[#BBBBBB] ${errors.username
                    ? "border-red-200 bg-red-50/50"
                    : "focus:border-[#1A1A1A] hover:border-gray-300"
                    }`}
                  placeholder="Username kiritng"
                />
                {errors.username && <p className="mt-2 ml-1 text-[11px] font-bold text-red-500">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#222222] mb-2 ml-0.5">Parol</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3.5 bg-white border border-[#F0F0F0] rounded-xl text-[15px] transition-all outline-none placeholder:text-[#BBBBBB] ${errors.password
                      ? "border-red-200 bg-red-50/50"
                      : "focus:border-[#1A1A1A] hover:border-gray-300"
                      }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#CCCCCC] hover:text-[#1A1A1A] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 ml-1 text-[11px] font-bold text-red-500">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[rgb(0,74,119)] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/10 hover:bg-[rgb(0,64,103)] transition-all active:scale-[0.98] mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[15px]">Kutilmoqda...</span>
                  </div>
                ) : (
                  <span className="text-[15px]">Kirish</span>
                )}
              </button>
            </form>



            <p className="text-center text-[13px] font-semibold text-[#BBBBBB]">
              Profilingiz yo'qmi? <span className="text-[#0EA5E9] hover:underline cursor-pointer ml-1">Admin bilan bog'laning</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
