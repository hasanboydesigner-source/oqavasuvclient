import { useState, useEffect } from "react";
import {
  Briefcase,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Wifi,
  Database,
  Server,
} from "lucide-react";
import { API_URL } from "../config";

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalStaff: 0,
    staffPresent: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [employeesRes, attendanceRes] = await Promise.all([
        fetch(`${API_URL}/api/all-staff`),
        fetch(`${API_URL}/api/attendance`),
      ]);

      if (!employeesRes.ok || !attendanceRes.ok) {
        throw new Error("Network response was not ok");
      }

      const employeesData = await employeesRes.json();
      const attendanceData = await attendanceRes.json();

      const employees =
        employeesData.employees || employeesData.data || employeesData || [];
      const attendance =
        attendanceData.records || attendanceData.data || attendanceData || [];

      const today = new Date().toISOString().split("T")[0];
      const todayAttendance = attendance.filter(
        (record) => record.date === today,
      );

      const staff = employees.filter((emp) => emp.role === "staff");

      const staffPresent = todayAttendance.filter((record) =>
        staff.some((s) => s.hikvisionEmployeeId === record.hikvisionEmployeeId),
      ).length;

      setStats({
        totalStaff: staff.length,
        staffPresent,
      });

      const recentRecords = todayAttendance
        .slice(-10)
        .reverse()
        .map((record) => {
          const employee = employees.find(
            (emp) => emp.hikvisionEmployeeId === record.hikvisionEmployeeId,
          );
          return {
            id: record._id,
            name: employee?.name || record.name || "Unknown",
            role: employee?.role || record.role || "unknown",
            action: record.lastCheckOut ? "Chiqdi" : "Kirdi",
            time: record.lastCheckOut
              ? record.lastCheckOut
              : record.firstCheckIn,
            avatar:
              employee?.name?.substring(0, 2).toUpperCase() ||
              record.name?.substring(0, 2).toUpperCase() ||
              "?",
          };
        });

      setRecentActivity(recentRecords);
    } catch (error) {
      console.error("Dashboard ma'lumotlarini olishda xatolik:", error);
    }
  };

  const currentDate = new Date().toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentDay = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long",
  });

  // Calculate percentages - ONLY for staff
  const totalPeople = stats.totalStaff;
  const totalPresent = stats.staffPresent;
  const attendancePercent =
    totalPeople > 0 ? Math.round((totalPresent / totalPeople) * 100) : 0;

  const getRoleLabel = (role) => {
    switch (role) {
      case "staff":
        return "Xodim";
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-4 md:py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {currentDay}, {currentDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-green-700">
                Real-time
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-6">
        {/* Overall Attendance Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <span
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                attendancePercent > 0
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {attendancePercent}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalPresent}</p>
          <p className="text-sm text-gray-500 mt-1">Umumiy Davomat</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Jami:</span>
            <span className="text-sm font-semibold text-indigo-600">
              {totalPeople}
            </span>
          </div>
        </div>

        {/* Staff */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-violet-50 rounded-xl">
              <Briefcase className="w-5 h-5 text-violet-600" />
            </div>
            <span
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                stats.staffPresent > 0
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {stats.totalStaff > 0
                ? Math.round((stats.staffPresent / stats.totalStaff) * 100)
                : 0}
              %{stats.staffPresent > 0 && <ArrowUpRight className="w-3 h-3" />}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
          <p className="text-sm text-gray-500 mt-1">Xodimlar</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Bugun:</span>
            <span className="text-sm font-semibold text-violet-600">
              {stats.staffPresent}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                So'nggi Faollik
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">Ism</div>
            <div className="col-span-3">Lavozim</div>
            <div className="col-span-3 text-center">Status</div>
            <div className="col-span-2 text-right">Vaqt</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 10).map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-3 hover:bg-gray-50 transition-colors items-center border-b sm:border-b-0 border-gray-50 last:border-b-0"
                >
                  {/* Name */}
                  <div className="col-span-2 sm:col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold bg-violet-500 shrink-0">
                      {activity.avatar}
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {activity.name}
                    </span>
                  </div>

                  {/* Role */}
                  <div className="sm:col-span-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] sm:text-xs font-medium bg-violet-50 text-violet-700">
                      <Briefcase className="w-3 h-3" />
                      {getRoleLabel(activity.role)}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-3 sm:text-center flex sm:block justify-start">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        activity.action === "Kirdi"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {activity.action === "Kirdi" ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {activity.action}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="sm:col-span-2 text-right flex sm:block justify-end">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Bugun hali faollik yo'q</p>
                <p className="text-xs mt-1">
                  Kirish/chiqish ma'lumotlari bu yerda ko'rinadi
                </p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Tizim Holati
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Status Items */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Server className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Server
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-green-600">Faol</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Database className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Database
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-green-600">Faol</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wifi className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Hikvision
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-green-600">
                  Ulangan
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="px-4 pb-4">
            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Bugungi Statistika
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Umumiy davomat</span>
                  <span className="text-sm font-bold text-slate-800">
                    {attendancePercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Jami hodimlar</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {totalPeople}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hozir o'rin</span>
                  <span className="text-sm font-semibold text-green-600">
                    {totalPresent}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
