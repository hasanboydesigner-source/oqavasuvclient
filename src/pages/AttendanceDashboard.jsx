import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  BarChart3,
  Calendar,
  RefreshCw,
  Wifi,
  Activity,
  Edit2,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import socketService from "../services/socket.js";
import EditEmployeeModal from "../components/EditEmployeeModal.jsx";
import EmployeeAttendanceHistory from "../components/EmployeeAttendanceHistory.jsx";
import { API_URL as BASE_URL } from "../config";

const API_URL = `${BASE_URL}/api`;

const AttendanceDashboard = () => {
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [weeklyData, setWeeklyData] = useState([]);
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Employee edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Employee history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);

  // Hikvision integration state
  const [syncing, setSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("unknown");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);

  // Daily stats load qilish
  const loadDailyStats = async (date) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/attendance/daily-stats?date=${date}`
      );
      setStats(response.data.statistics);
      setEmployees(response.data.employees);
    } catch (error) {
      console.error("Stats load error:", error);
      toast.error("Davomat ma'lumotlarini yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  // Weekly stats load qilish
  const loadWeeklyStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/attendance/weekly-stats`);
      setWeeklyData(response.data);
    } catch (error) {
      console.error("Weekly stats error:", error);
    }
  };

  // Test Hikvision connection
  const testConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/hikvision/test-connection`);
      if (response.data.success) {
        setConnectionStatus("online");
      } else {
        setConnectionStatus("offline");
      }
    } catch (error) {
      setConnectionStatus("offline");
    }
  };

  // Sync with Hikvision device
  const syncWithHikvision = async () => {
    if (syncing) return;

    setSyncing(true);
    toast.loading("Hikvision qurilmasi bilan sinxronlashtirilmoqda...", {
      id: "hikvision-sync",
    });

    try {
      const response = await axios.post(`${API_URL}/hikvision/sync`);

      if (response.data.success) {
        toast.success(response.data.message, { id: "hikvision-sync" });
        setLastSyncTime(new Date().toISOString());

        // Show synced employees
        if (
          response.data.syncedEmployees &&
          response.data.syncedEmployees.length > 0
        ) {
          response.data.syncedEmployees.forEach((emp) => {
            toast.success(
              `${emp.name} - ${emp.action === "checkin" ? "Keldi" : "Ketdi"} (${
                emp.time
              })`
            );
          });
        }

        // Reload daily stats to show updated data
        await loadDailyStats(selectedDate);
      } else {
        toast.error("Sinxronlashda xatolik yuz berdi", {
          id: "hikvision-sync",
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error(
        error.response?.data?.error ||
          "Hikvision qurilmasiga ulanishda xatolik",
        { id: "hikvision-sync" }
      );
    } finally {
      setSyncing(false);
    }
  };

  // Load sync status
  const loadSyncStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/hikvision/sync-status`);
      setLastSyncTime(response.data.lastSyncTime);
    } catch (error) {
      console.error("Sync status error:", error);
    }
  };

  // Socket.IO Setup - Real-time time update without page reload
  useEffect(() => {
    // Connect to Socket.IO
    socketService.connect();

    // Listen for real-time attendance updates
    const handleAttendanceUpdate = (data) => {
      console.log("📡 Real-time update received:", data);

      // Update employee in the employees array without page reload
      setEmployees((prevEmployees) => {
        const updated = prevEmployees.map((emp) => {
          if (
            emp.id === data.employeeId ||
            emp.hikvisionEmployeeId === data.hikvisionEmployeeId
          ) {
            return {
              ...emp,
              checkInTime: data.checkInTime || emp.checkInTime,
              checkOutTime: data.checkOutTime || emp.checkOutTime,
              status: data.status || emp.status,
              lastUpdated: new Date(),
            };
          }
          return emp;
        });

        // Update stats count silently
        if (updated.length > 0) {
          const presentCount = updated.filter((e) => e.checkInTime).length;
          const absentCount = updated.filter((e) => !e.checkInTime).length;
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  present: presentCount,
                  absent: absentCount,
                  totalEmployees: updated.length,
                  attendancePercentage: Math.round(
                    (presentCount / updated.length) * 100
                  ),
                }
              : prev
          );
        }

        return updated;
      });

      // Highlight the updated employee
      setHighlightedEmployeeId(data.employeeId);
      setTimeout(() => setHighlightedEmployeeId(null), 2000);
    };

    // Listen for new employee registration
    const handleEmployeeRegistered = (data) => {
      console.log("🎉 Yangi xodim ro'yhatga olingan:", data);
      toast.success(`✨ ${data.name} ro'yhatga olingan!`);

      // Add new employee to list
      setEmployees((prev) => [...prev, data]);
      if (stats) {
        setStats((prev) =>
          prev
            ? {
                ...prev,
                totalEmployees: prev.totalEmployees + 1,
              }
            : prev
        );
      }
    };

    socketService.on("attendance:updated", handleAttendanceUpdate);
    socketService.on("employee:registered", handleEmployeeRegistered);

    return () => {
      socketService.off("attendance:updated", handleAttendanceUpdate);
      socketService.off("employee:registered", handleEmployeeRegistered);
    };
  }, [stats]);

  useEffect(() => {
    loadDailyStats(selectedDate);
    loadWeeklyStats();
    testConnection();
    loadSyncStatus();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  // Kechikish hisoblash funksiyasi (dars boshlanish: 9:30)
  const calculateLateTime = (checkInTime) => {
    if (!checkInTime) return null;

    const [hours, minutes] = checkInTime.split(":").map(Number);
    const checkInMinutes = hours * 60 + minutes;
    const startTimeMinutes = 9 * 60 + 30; // 9:30

    if (checkInMinutes > startTimeMinutes) {
      const lateMinutes = checkInMinutes - startTimeMinutes;
      const lateHours = Math.floor(lateMinutes / 60);
      const lateMins = lateMinutes % 60;

      if (lateHours > 0) {
        return `${lateHours} soat ${lateMins} daqiqa`;
      } else {
        return `${lateMins} daqiqa`;
      }
    }
    return null;
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Minimal Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Davomat
          {stats && (
            <span className="text-gray-500 text-lg ml-2">
              ({stats.totalEmployees} xodim)
            </span>
          )}
        </h1>
      </div>

      {/* Stats Cards - Minimal Design */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Jami</div>
            <div className="text-2xl font-semibold text-gray-900">
              {stats.totalEmployees}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Kelganlar</div>
            <div className="text-2xl font-semibold text-green-600">
              {stats.presentCount}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Kelmaganlar</div>
            <div className="text-2xl font-semibold text-red-600">
              {stats.absentCount}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Davomat %</div>
            <div
              className={`text-2xl font-semibold ${getAttendanceColor(
                stats.attendanceRate
              )}`}
            >
              {stats.attendanceRate}%
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar - All in one row */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="h-6 w-px bg-gray-300"></div>
            <input
              type="text"
              placeholder="Xodim qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 w-64"
            />
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <Wifi
                className={`w-4 h-4 ${
                  connectionStatus === "online"
                    ? "text-green-600"
                    : connectionStatus === "offline"
                    ? "text-red-600"
                    : "text-gray-400"
                }`}
              />
              <span className="text-sm text-gray-600">
                {connectionStatus === "online"
                  ? "Ulangan"
                  : connectionStatus === "offline"
                  ? "Ulanmagan"
                  : "Tekshirilmoqda"}
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-xs text-gray-500">
                {new Date(lastSyncTime).toLocaleTimeString("uz-UZ")}
              </span>
            )}
          </div>
          <button
            onClick={syncWithHikvision}
            disabled={syncing || connectionStatus === "offline"}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
              syncing || connectionStatus === "offline"
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Sinxronlash..." : "Sinxronlash"}</span>
          </button>
        </div>
      </div>

      {/* Main Table - Grid Layout */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div
          className="grid gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700"
          style={{
            gridTemplateColumns: "3fr 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr",
          }}
        >
          <div>Xodim</div>
          <div>Bo'lim</div>
          <div>Kelgan</div>
          <div>Ketgan</div>
          <div>Kechikish</div>
          <div>Status</div>
          <div className="text-center">Harakat</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {filteredEmployees && filteredEmployees.length > 0 ? (
            filteredEmployees
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((emp) => {
                const lateTime = calculateLateTime(emp.checkInTime);
                return (
                  <div
                    key={emp.id}
                    className={`grid gap-4 px-4 py-3 items-center text-sm hover:bg-gray-50 transition-colors ${
                      highlightedEmployeeId === emp.id ? "bg-blue-50" : ""
                    }`}
                    style={{
                      gridTemplateColumns:
                        "3fr 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr",
                    }}
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => {
                        setHistoryEmployee(emp);
                        setHistoryModalOpen(true);
                      }}
                      title="Davomat tarixini ko'rish"
                    >
                      <div className="w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                        {emp.avatar}
                      </div>
                      <span className="font-medium text-gray-900">
                        {emp.name}
                      </span>
                    </div>
                    <div className="text-gray-600">{emp.department}</div>
                    <div>
                      {emp.checkInTime ? (
                        <span
                          className={`font-medium ${
                            lateTime ? "text-orange-600" : "text-green-600"
                          }`}
                        >
                          {emp.checkInTime}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    <div>
                      {emp.checkOutTime ? (
                        <span className="text-gray-900">
                          {emp.checkOutTime}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    <div>
                      {lateTime ? (
                        <span className="text-red-600 font-medium text-xs">
                          {lateTime}
                        </span>
                      ) : emp.checkInTime ? (
                        <span className="text-green-600 text-xs">Vaqtida</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          emp.status === "present"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {emp.status === "present" ? "Keldi" : "Kelmadi"}
                      </span>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setEditModalOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="py-12 text-center text-gray-500">
              Ma'lumot topilmadi
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredEmployees && filteredEmployees.length > itemsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} /{" "}
              {filteredEmployees.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Orqaga
              </button>
              {Array.from(
                { length: Math.ceil(filteredEmployees.length / itemsPerPage) },
                (_, i) => i + 1
              )
                .filter((page) => {
                  const totalPages = Math.ceil(
                    filteredEmployees.length / itemsPerPage
                  );
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (page >= currentPage - 1 && page <= currentPage + 1)
                    return true;
                  return false;
                })
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-2 py-1 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === page
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      Math.ceil(filteredEmployees.length / itemsPerPage),
                      prev + 1
                    )
                  )
                }
                disabled={
                  currentPage ===
                  Math.ceil(filteredEmployees.length / itemsPerPage)
                }
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Employee Modal */}
      {selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedEmployee(null);
          }}
          onSave={(updatedEmployee) => {
            console.log("✅ Updated employee:", updatedEmployee);
            // Update employee in the list
            setEmployees((prevEmployees) =>
              prevEmployees.map((emp) =>
                emp._id === updatedEmployee._id ||
                emp.id === updatedEmployee._id
                  ? {
                      ...emp,
                      department: updatedEmployee.department,
                      salary: updatedEmployee.salary,
                      subject: updatedEmployee.subject,
                      shift: updatedEmployee.shift,
                      specialty: updatedEmployee.specialty,
                    }
                  : emp
              )
            );
            setSelectedEmployee(updatedEmployee);
            // Reload stats
            loadDailyStats(selectedDate);
          }}
        />
      )}

      {/* Employee Attendance History Modal */}
      <EmployeeAttendanceHistory
        employee={historyEmployee}
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryEmployee(null);
        }}
      />
    </div>
  );
};

export default AttendanceDashboard;
