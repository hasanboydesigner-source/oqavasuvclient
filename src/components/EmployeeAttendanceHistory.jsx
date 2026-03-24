import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, TrendingUp, Download } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_URL as BASE_URL } from "../config";

const API_URL = `${BASE_URL}/api`;

const EmployeeAttendanceHistory = ({ employee, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7 kun oldin
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen && employee) {
      loadHistory();
    }
  }, [isOpen, employee, startDate, endDate]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const employeeId = employee._id || employee.id;
      console.log("Loading history for employee ID:", employeeId);
      const response = await axios.get(
        `${API_URL}/attendance/employee-history/${employeeId}?startDate=${startDate}&endDate=${endDate}`
      );
      setHistory(response.data.history);
      setStats(response.data.stats);
    } catch (error) {
      console.error("History load error:", error);
      toast.error("suv istamoli tarixini yuklashda xato");
    } finally {
      setLoading(false);
    }
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

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      if (history.length === 0) {
        toast.error("Eksport qilish uchun ma'lumot yo'q");
        return;
      }

      const dayNames = [
        "Yakshanba",
        "Dushanba",
        "Seshanba",
        "Chorshanba",
        "Payshanba",
        "Juma",
        "Shanba",
      ];

      // Prepare headers and data
      const headers = [
        "Sana",
        "Kun",
        "Kelgan",
        "Ketgan",
        "Kechikish",
        "Ish vaqti",
        "Status",
      ];

      const rows = history.map((record) => {
        const date = new Date(record.date);
        const lateTime = calculateLateTime(record.firstCheckIn);

        return [
          new Date(record.date).toLocaleDateString("uz-UZ"),
          dayNames[date.getDay()],
          record.firstCheckIn || "-",
          record.lastCheckOut || "-",
          lateTime || (record.firstCheckIn ? "Vaqtida" : "-"),
          record.workDuration || "-",
          record.status === "present"
            ? "Kelgan"
            : record.status === "late"
            ? "Kechikkan"
            : "Kelmagan",
        ];
      });

      // Create CSV content with semicolon separator
      const separator = ";";

      // Add employee info and stats as header
      const employeeInfo = [
        `Xodim: ${employee?.name || ""}`,
        `Bo'lim: ${employee?.department || ""}`,
        "",
        `Davr: ${new Date(startDate).toLocaleDateString("uz-UZ")} - ${new Date(
          endDate
        ).toLocaleDateString("uz-UZ")}`,
        `Jami kunlar: ${stats?.totalDays || 0}`,
        `Kelgan kunlar: ${stats?.presentDays || 0}`,
        `Kelmagan kunlar: ${stats?.absentDays || 0}`,
        `suv istamoli: ${stats?.attendanceRate || 0}%`,
        "",
        "",
      ];

      const csvContent = [
        ...employeeInfo,
        headers.join(separator),
        ...rows.map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(separator)
        ),
      ].join("\n");

      // Create blob and download with BOM for UTF-8
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const fileName = `suv istamoli_${employee?.name?.replace(
        /\s+/g,
        "_"
      )}_${startDate}_${endDate}.csv`;

      link.href = url;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("Ma'lumotlar Excel ga eksport qilindi");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Eksport qilishda xato: " + error.message);
    }
  };

  if (!isOpen) return null;

  console.log("EmployeeAttendanceHistory - employee:", employee);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 p-6 flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">
              {employee?.name || "Xodim nomi"}
            </h2>
            <p className="text-yellow-300 text-xl font-bold">
              {employee?.department || "Bo'lim"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors !text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="bg-gray-50 p-4 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Sanadan:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Sanagacha:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleExportToExcel}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Excel ga eksport</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalDays}
              </div>
              <div className="text-sm text-gray-600 mt-1">Jami kunlar</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-green-600">
                {stats.presentDays}
              </div>
              <div className="text-sm text-gray-600 mt-1">Kelgan kunlar</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-red-600">
                {stats.absentDays}
              </div>
              <div className="text-sm text-gray-600 mt-1">Kelmagan kunlar</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">
                {stats.attendanceRate}%
              </div>
              <div className="text-sm text-gray-600 mt-1">suv istamoli</div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 400px)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center p-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Tanlangan davr uchun ma'lumot topilmadi
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold text-gray-700">
                    Sana
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-700">
                    Kun
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-700">
                    Kelgan
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-700">
                    Ketgan
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-700">
                    Kechikish
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-700">
                    Ish vaqti
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => {
                  const date = new Date(record.date);
                  const dayNames = [
                    "Yakshanba",
                    "Dushanba",
                    "Seshanba",
                    "Chorshanba",
                    "Payshanba",
                    "Juma",
                    "Shanba",
                  ];
                  const lateTime = calculateLateTime(record.firstCheckIn);

                  return (
                    <tr
                      key={index}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString("uz-UZ")}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-600">
                          {dayNames[date.getDay()]}
                        </div>
                      </td>
                      <td className="text-center p-4">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span
                            className={`text-sm font-medium ${
                              lateTime ? "text-orange-600" : ""
                            }`}
                          >
                            {record.firstCheckIn || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="text-center p-4">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium">
                            {record.lastCheckOut || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="text-center p-4">
                        {lateTime ? (
                          <span className="text-sm font-medium text-red-600">
                            {lateTime}
                          </span>
                        ) : record.firstCheckIn ? (
                          <span className="text-sm text-green-600">
                            Vaqtida
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center p-4">
                        <span className="text-sm text-gray-600">
                          {record.workDuration || "-"}
                        </span>
                      </td>
                      <td className="text-center p-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            record.status === "present"
                              ? "bg-green-100 text-green-700"
                              : record.status === "late"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {record.status === "present"
                            ? "Kelgan"
                            : record.status === "late"
                            ? "Kechikkan"
                            : "Kelmagan"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceHistory;

