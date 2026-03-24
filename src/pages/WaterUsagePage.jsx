import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Users,
  Download,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Edit2,
  FileText,
  MoreVertical,
} from "lucide-react";
import { io } from "socket.io-client";
import RoleSelectionModal from "../components/RoleSelectionModal.jsx"; // ✅ YANGI CHIROYLI MODAL
import EmployeeEditModal from "../components/EmployeeEditModal.jsx"; // ✅ EMPLOYEE EDIT MODAL
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL as BASE_URL } from "../config";
import * as XLSX from "xlsx";

const API_URL = BASE_URL;

const WaterUsagePage = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchQuery, setSearchQuery] = useState(""); // Xodim qidirish
  const [sortBy, setSortBy] = useState("name"); // New: sort by
  const [sortOrder, setSortOrder] = useState("asc"); // New: sort order
  const [water_usageData, setwater_usageData] = useState([]);
  const [faceRecords, setFaceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Mock data
  const mockwater_usageData = [
    {
      id: 1,
      name: "Ahmad Karimov",
      class: "10-A",
      checkIn: "08:15",
      checkOut: "14:30",
      status: "present",
      avatar: "AK",
      lateMinutes: 0,
    },
    {
      id: 2,
      name: "Malika Tosheva",
      class: "11-B",
      checkIn: "08:10",
      checkOut: "14:25",
      status: "present",
      avatar: "MT",
      lateMinutes: 0,
    },
    {
      id: 3,
      name: "Bobur Rashidov",
      class: "9-A",
      checkIn: "08:35",
      checkOut: null,
      status: "late",
      avatar: "BR",
      lateMinutes: 35,
    },
    {
      id: 4,
      name: "Nigora Saidova",
      class: "10-C",
      checkIn: null,
      checkOut: null,
      status: "absent",
      avatar: "NS",
      lateMinutes: 0,
    },
    {
      id: 5,
      name: "Anvar Abdullayev",
      class: "11-A",
      checkIn: "08:05",
      checkOut: "14:20",
      status: "present",
      avatar: "AA",
      lateMinutes: 0,
    },
  ];

  // Mock classes list - now fetched dynamically from students

  useEffect(() => {
    fetchStudents();

    // Socket.IO real-time updates uchun
    const socket = io(BASE_URL);

    // Employee yangilanganida ma'lumotlarni qayta yuklash
    socket.on("employee:updated", (updatedEmployee) => {
      console.log(
        "🔄 Employee updated via Socket.IO:",
        updatedEmployee.name,
        "role:",
        updatedEmployee.role,
      );
      // Ma'lumotlarni qayta yuklash
      setTimeout(() => {
        fetchStudents();
      }, 500); // Biroz kutib olish database'ga yozilishini kutish uchun
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  // Следим за изменением выбранной даты
  useEffect(() => {
    if (employees.length > 0) {
      fetchwater_usageDataWithEmployees(employees);
    }
  }, [selectedDate, employees]);

  // 📥 Загрузка данных посещаемости (с уже загруженными сотрудниками)
  const fetchwater_usageDataWithEmployees = async (employeesList) => {
    try {
      console.log(`📊 Loading water_usage data for date: ${selectedDate}`);
      const response = await axios.get(
        `${API_URL}/api/water_usage?date=${selectedDate}`,
      );

      const water_usageRecords = response.data.data || [];
      console.log(`📋 Found ${water_usageRecords.length} water_usage records`);
      console.log(`👥 Employees list has ${employeesList.length} employees`);

      // Debug: показать первые записи
      if (water_usageRecords.length > 0) {
        console.log("📝 First water_usage record:", water_usageRecords[0]);
      }
      if (employeesList.length > 0) {
        console.log("👤 First employee:", employeesList[0]);
      }

      // Обновляем данные с информацией о посещаемости
      const updatedData = employeesList.map((employee) => {
        // Ищем запись посещаемости для этого сотрудника по разным полям
        const water_usage = water_usageRecords.find((record) => {
          // Сопоставление по hikvisionEmployeeId
          const empHikId = employee.employeeId?.toString();
          const recHikId = record.hikvisionEmployeeId?.toString();
          const recEmpId = record.employeeId?.toString();

          // Debug logging for student role
          if (employee.role === "student") {
            console.log(`🔍 [water_usage] Matching student ${employee.name}:`, {
              empHikId,
              recHikId,
              recEmpId,
              recordName: record.name,
              employeeName: employee.name,
            });
          }

          const match =
            (recHikId && empHikId && recHikId === empHikId) ||
            (recEmpId && empHikId && recEmpId === empHikId) ||
            (record.name &&
              employee.name &&
              record.name.toLowerCase() === employee.name.toLowerCase());

          if (match && employee.role === "student") {
            console.log(
              `✅ [water_usage] Match found for student ${employee.name}`,
            );
          }

          return match;
        });

        if (water_usage) {
          console.log(
            `✅ Found water_usage for ${employee.name}: checkIn=${water_usage.checkIn}, checkOut=${water_usage.checkOut}`,
          );
          return {
            ...employee,
            checkIn: water_usage.checkIn || null,
            checkOut: water_usage.checkOut || null,
            status: water_usage.checkIn ? "present" : "absent",
            lateMinutes: water_usage.lateMinutes || 0,
          };
        }

        return {
          ...employee,
          checkIn: null,
          checkOut: null,
          status: "absent",
          lateMinutes: 0,
        };
      });

      setwater_usageData(updatedData);
    } catch (error) {
      console.error("❌ Error loading water_usage data:", error);
    }
  };

  // Форматирование времени
  const formatTime = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return null;
    }
  };

  // 📥 Загрузка данных посещаемости
  const fetchwater_usageData = async () => {
    try {
      console.log(`📊 Loading water_usage data for date: ${selectedDate}`);
      const response = await axios.get(
        `${API_URL}/api/water_usage?date=${selectedDate}`,
      );

      const water_usageRecords = response.data.records || [];
      console.log(`📋 Found ${water_usageRecords.length} water_usage records`);

      // Обновляем существующие данные с информацией о посещаемости
      setwater_usageData((prevData) =>
        prevData.map((employee) => {
          // Ищем запись посещаемости для этого сотрудника
          const water_usage = water_usageRecords.find(
            (record) =>
              record.hikvisionEmployeeId === employee.employeeId ||
              record.employeeId === employee.employeeId,
          );

          if (water_usage) {
            return {
              ...employee,
              checkIn: water_usage.firstCheckIn
                ? (() => {
                  const date = new Date(water_usage.firstCheckIn);
                  return isNaN(date.getTime())
                    ? null
                    : date.toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                })()
                : null,
              checkOut: water_usage.lastCheckOut
                ? (() => {
                  const date = new Date(water_usage.lastCheckOut);
                  return isNaN(date.getTime())
                    ? null
                    : date.toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                })()
                : null,
              status: water_usage.firstCheckIn ? "present" : "absent",
              lateMinutes: water_usage.lateMinutes || 0,
            };
          }

          // Если записи нет, сбрасываем на absent
          return {
            ...employee,
            checkIn: null,
            checkOut: null,
            status: "absent",
            lateMinutes: 0,
          };
        }),
      );
    } catch (error) {
      console.error("❌ Error loading water_usage data:", error);
      toast.error("Ошибка загрузки данных посещаемости");
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Faqat bitta API'dan barcha xodimlarni olish
      console.log("📡 Fetching all employees from /api/all-staff...");
      const response = await axios.get(`${API_URL}/api/all-staff`);

      const allEmployees = response.data.employees || [];
      console.log(`📊 Loaded ${allEmployees.length} employees from API`);

      // Debug: Show first few employees
      if (allEmployees.length > 0) {
        console.log(
          "📋 Sample employees:",
          allEmployees.slice(0, 3).map((emp) => ({
            name: emp.name,
            role: emp.role || "NO_ROLE",
          })),
        );
      }

      // Barcha xodimlarni use qilish - filtr yo'q
      const students = allEmployees.filter((emp) => emp.role === "student");
      const teachers = allEmployees.filter((emp) => emp.role === "teacher");
      const staff = allEmployees.filter((emp) => emp.role === "staff");
      const unassigned = allEmployees.filter((emp) => !emp.role);

      console.log(
        `📈 Roles: Students=${students.length}, Teachers=${teachers.length}, Staff=${staff.length}, Unassigned=${unassigned.length}`,
      );

      // Ma'lumotlarni saqlash va water_usage formatiga o'tkazish
      console.log("📊 Ma'lumotlar yuklandi:", {
        students: students.length,
        teachers: teachers.length,
        staff: staff.length,
        unassigned: unassigned.length,
        total: allEmployees.length,
      });

      // Faqat staff xodimlarni saqlash
      const staffOnly = allEmployees.filter(
        (emp) =>
          emp.role === "staff" || emp.role === null || emp.role === undefined,
      );
      setEmployees(staffOnly);

      // Classes not needed for water organization

      // Convert all staff to water_usage format
      const water_usageList = allEmployees.map((employee) => {
        // Use staffType as department display, fallback to department or "IT"
        const department = employee.staffType || employee.department || "IT";

        return {
          id: employee._id,
          name: employee.name,
          department: department,
          staffType: employee.staffType || employee.department || "IT",
          phone: employee.phone || "",
          role: "staff",
          employeeId: employee.employeeId,
          hikvisionEmployeeId: employee.hikvisionEmployeeId,
          checkIn: null,
          checkOut: null,
          status: "absent",
          avatar:
            employee.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase() || "??",
          lateMinutes: 0,
        };
      });

      setwater_usageData(water_usageList);

      // После загрузки сотрудников, загружаем данные посещаемости
      setTimeout(() => {
        fetchwater_usageDataWithEmployees(water_usageList);
      }, 100);
    } catch (error) {
      console.error("❌ Ma'lumotlarni yuklashda xato:", error);
      toast.error("Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };





  const handleEditEmployee = (employee) => {
    // Close all dropdowns first
    document.querySelectorAll(".action-dropdown").forEach((d) => d.classList.add("hidden"));

    // Use employee data directly
    setSelectedEmployee(employee);
    setEditModalOpen(true);
  };

  const handleSaveEmployee = async (updatedEmployee) => {
    try {
      console.log("💾 [FRONTEND] Employee saqlash boshlandi:", {
        id: updatedEmployee._id || updatedEmployee.id,
        name: updatedEmployee.name,
        phone: updatedEmployee.phone,
        staffType: updatedEmployee.staffType,
      });

      // 1. Server'ga API so'rov yuborish
      const employeeId = updatedEmployee.id || updatedEmployee._id;
      console.log("🆔 Employee ID:", employeeId, "from:", updatedEmployee);

      const saveResponse = await axios.put(
        `${API_URL}/api/employee/${employeeId}`,
        {
          phone: updatedEmployee.phone,
          staffType: updatedEmployee.staffType,
          department: updatedEmployee.department,
        },
      );

      console.log("✅ [FRONTEND] Server javob:", saveResponse.data);

      // 2. Local state'ni yangilash - telefon va lavozim bilan
      setwater_usageData((prevData) =>
        prevData.map((emp) => {
          if (emp.id === employeeId) {
            return {
              ...emp,
              phone: updatedEmployee.phone,
              staffType: updatedEmployee.staffType,
              department: updatedEmployee.staffType || emp.department,
            };
          }
          return emp;
        }),
      );

      // 3. Server'dan yangilangan ma'lumotlarni qayta yuklash
      console.log("🔄 [FRONTEND] Ma'lumotlarni qayta yuklash...");
      await fetchStudents();

      setEditModalOpen(false);
      setSelectedEmployee(null);

      toast.success(`✅ ${updatedEmployee.name} ma'lumotlari yangilandi!`, {
        duration: 3000,
      });

      console.log("🎉 [FRONTEND] Employee saqlash yakunlandi!");
    } catch (error) {
      console.error("❌ [FRONTEND] Employee saqlashda xato:", error);

      // User-friendly error message
      if (error.response && error.response.status === 404) {
        toast.error("❌ Xodim topilmadi!");
      } else if (error.response && error.response.status >= 500) {
        toast.error("❌ Server xatosi! Qayta urinib ko'ring.");
      } else {
        toast.error("❌ Ma'lumotlar saqlanmadi! Qayta urinib ko'ring.");
      }
      toast.error("Ma'lumotlarni yangilashda xato");
    }
  };

  // Filter water_usage data - only staff employees
  let filteredAndSortedwater_usage = water_usageData.filter((person) => {
    // Filter by search query (name)
    const matchesSearch =
      searchQuery === "" ||
      person.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.employeeNo?.toString().includes(searchQuery);

    return matchesSearch;
  });

  // Sort the filtered data
  filteredAndSortedwater_usage.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name?.localeCompare(b.name || "") || 0;
        break;
      case "role":
        const roleA = a.role || "";
        const roleB = b.role || "";
        comparison = roleA.localeCompare(roleB);
        break;
      case "class":
        const classA = a.class || "";
        const classB = b.class || "";
        comparison = classA.localeCompare(classB);
        break;
      case "status":
        const statusA = a.status || "";
        const statusB = b.status || "";
        comparison = statusA.localeCompare(statusB);
        break;
      case "department":
        const deptA = a.staffType || a.department || "";
        const deptB = b.staffType || b.department || "";
        comparison = deptA.localeCompare(deptB);
        break;
      default:
        break;
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  const filteredwater_usage = filteredAndSortedwater_usage;

  // Pagination logic
  const totalItems = filteredwater_usage.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedwater_usage = filteredwater_usage.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDate]);

  // Faqat staff (hodim) bilan ishlash

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4" />;
      case "late":
        return <AlertCircle className="w-4 h-4" />;
      case "absent":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "present":
        return "Keldi";
      case "late":
        return "Kech keldi";
      case "absent":
        return "Kelmadi";
      default:
        return "Noma'lum";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-green-50 text-green-700";
      case "late":
        return "bg-orange-50 text-orange-700";
      case "absent":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  // Statistics based on FILTERED water_usage
  const totalStudents = filteredwater_usage.length;
  const presentStudents = filteredwater_usage.filter(
    (s) => s.status === "present",
  ).length;
  const lateStudents = filteredwater_usage.filter(
    (s) => s.status === "late",
  ).length;
  const absentStudents = filteredwater_usage.filter(
    (s) => s.status === "absent",
  ).length;

  // Calculate percentage
  const water_usagePercentage =
    totalStudents > 0
      ? Math.round(((presentStudents + lateStudents) / totalStudents) * 100)
      : 0;

  // 📊 Kechikish hisoblash funksiyasi (9:30 asosida)
  const calculateLateInfo = (checkInTime) => {
    if (!checkInTime) return { isLate: false, lateMinutes: 0, lateText: "" };

    const LATE_THRESHOLD_HOUR = 9;
    const LATE_THRESHOLD_MINUTE = 30;

    const [hours, minutes] = checkInTime.split(":").map(Number);
    const checkInMinutes = hours * 60 + minutes;
    const thresholdMinutes = LATE_THRESHOLD_HOUR * 60 + LATE_THRESHOLD_MINUTE;

    if (checkInMinutes > thresholdMinutes) {
      const lateMinutes = checkInMinutes - thresholdMinutes;
      const lateHours = Math.floor(lateMinutes / 60);
      const remainingMinutes = lateMinutes % 60;

      let lateText = "";
      if (lateHours > 0) {
        lateText = `${lateHours} soat ${remainingMinutes} daq`;
      } else {
        lateText = `${lateMinutes} daqiqa`;
      }

      return { isLate: true, lateMinutes, lateText };
    }

    return { isLate: false, lateMinutes: 0, lateText: "" };
  };

  // 📊 Excel hisobotini yaratish
  const generateExcelReport = async (reportType, data, filename) => {
    try {
      // Ma'lumotlarni tayyorlash - faqat staff uchun
      const excelData = data.map((record) => {
        const lateInfo = calculateLateInfo(record.checkIn);
        return {
          "Xodim Ismi": record.name || "Noma'lum",
          "Bo'lim": record.department || "IT",
          "Kelgan vaqti": record.checkIn || "Kelmagan",
          "Ketgan vaqti": record.checkOut || "Ketmagan",
          Status: lateInfo.isLate
            ? "Kech keldi"
            : record.status === "present"
              ? "Keldi"
              : "Kelmadi",
          Sana: selectedDate,
        };
      });

      // Создание workbook и worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ustun kengliklarini sozlash
      const wscols = [
        { wch: 28 }, // Xodim Ismi
        { wch: 12 }, // Bo'lim
        { wch: 14 }, // Kelgan vaqti
        { wch: 14 }, // Ketgan vaqti
        { wch: 12 }, // Status
        { wch: 18 }, // Kechikish (text)
        { wch: 16 }, // Kechikish (minut)
        { wch: 12 }, // Sana
      ];
      ws["!cols"] = wscols;

      // Добавляем worksheet в workbook
      XLSX.utils.book_append_sheet(wb, ws, reportType);

      // Генерируем Excel файл
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Создаем download link
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Также отправляем на сервер для сохранения на C: диске
      await saveReportToServer(filename, excelBuffer);

      toast.success(`📊 ${reportType} отчет сохранен: ${filename}`);
    } catch (error) {
      console.error("Ошибка создания Excel отчета:", error);
      toast.error("Ошибка при создании отчета");
    }
  };

  // 💾 Сохранение отчета на сервере (C:/hisobot/)
  const saveReportToServer = async (filename, excelBuffer) => {
    try {
      const formData = new FormData();
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      formData.append("excelFile", blob, filename);
      formData.append("reportDate", selectedDate);

      await axios.post(`${API_URL}/api/reports/save-excel`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (error) {
      console.error("Ошибка сохранения на сервере:", error);
    }
  };

  // 🕰️ Автоматический экспорт в 19:00
  useEffect(() => {
    const scheduleAutoExport = () => {
      const now = new Date();
      const exportTime = new Date();
      exportTime.setHours(19, 0, 0, 0); // 19:00:00

      // Если время уже прошло, планируем на следующий день
      if (now > exportTime) {
        exportTime.setDate(exportTime.getDate() + 1);
      }

      const timeUntilExport = exportTime.getTime() - now.getTime();
      console.log(
        `⏰ Автоэкспорт запланирован через ${Math.round(
          timeUntilExport / 1000 / 60,
        )} минут`,
      );

      setTimeout(async () => {
        try {
          // Получаем актуальные данные за сегодня
          const currentDate = new Date().toISOString().split("T")[0];
          const allEmployeesResponse = await axios.get(
            `${API_URL}/api/all-staff`,
          );
          const water_usageResponse = await axios.get(
            `${API_URL}/api/water_usage?date=${currentDate}`,
          );

          const employees = allEmployeesResponse.data.employees || [];
          const water_usageRecords = water_usageResponse.data.records || [];

          // Группируем по ролям
          const students = employees.filter((emp) => emp.role === "student");
          const teachers = employees.filter((emp) => emp.role === "teacher");
          const staff = employees.filter((emp) => emp.role === "staff");

          // Формируем данные с посещаемостью
          const processGroup = (group) => {
            return group.map((emp) => {
              const water_usage = water_usageRecords.find(
                (att) => att.hikvisionEmployeeId === emp.hikvisionEmployeeId,
              );
              return {
                ...emp,
                checkIn: water_usage?.firstCheckIn || null,
                checkOut: water_usage?.lastCheckOut || null,
                status: water_usage ? "present" : "absent",
                lateMinutes: 0, // можно добавить логику подсчета опозданий
              };
            });
          };

          const studentData = processGroup(students);
          const teacherData = processGroup(teachers);
          const staffData = processGroup(staff);

          // Генерируем отчеты
          if (studentData.length > 0) {
            await generateExcelReport(
              "О'quvchilar",
              studentData,
              `Oquvchilar_Hisoboti_${currentDate}.xlsx`,
            );
          }

          if (teacherData.length > 0) {
            await generateExcelReport(
              "O'qituvchilar",
              teacherData,
              `Oqituvchilar_Hisoboti_${currentDate}.xlsx`,
            );
          }

          if (staffData.length > 0) {
            await generateExcelReport(
              "Xodimlar",
              staffData,
              `Xodimlar_Hisoboti_${currentDate}.xlsx`,
            );
          }

          toast.success("🎉 Автоматический экспорт выполнен успешно!");

          // Планируем следующий экспорт
          scheduleAutoExport();
        } catch (error) {
          console.error("Ошибка автоэкспорта:", error);
          toast.error("Ошибка автоматического экспорта");
        }
      }, timeUntilExport);
    };

    scheduleAutoExport();
  }, []); // Запускаем один раз при загрузке компонента

  // 📤 Ручной экспорт по кнопке
  const handleManualExport = async () => {
    try {
      // Группируем текущие данные по ролям
      const students = filteredwater_usage.filter(
        (emp) => emp.role === "student",
      );
      const teachers = filteredwater_usage.filter(
        (emp) => emp.role === "teacher",
      );
      const staff = filteredwater_usage.filter((emp) => emp.role === "staff");

      const currentDate = new Date().toISOString().split("T")[0];

      if (students.length > 0) {
        await generateExcelReport(
          "О'quvchilar",
          students,
          `Oquvchilar_Manual_${currentDate}.xlsx`,
        );
      }

      if (teachers.length > 0) {
        await generateExcelReport(
          "O'qituvchilar",
          teachers,
          `Oqituvchilar_Manual_${currentDate}.xlsx`,
        );
      }

      if (staff.length > 0) {
        await generateExcelReport(
          "Xodimlar",
          staff,
          `Xodimlar_Manual_${currentDate}.xlsx`,
        );
      }

      toast.success("📊 Ручной экспорт выполнен!");
    } catch (error) {
      console.error("Ошибка ручного экспорта:", error);
      toast.error("Ошибка ручного экспорта");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-4 md:py-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:items-center sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Davomat</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Xodimlar davomat qaydlarini real-vaqtda kuzatish
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualExport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-900/10"
            >
              <FileText className="w-4 h-4" />
              <span>Excel Export</span>
            </button>
          </div>
        </div>





        {/* Stats Cards - Dashboard style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
          {/* Jami */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-700">
                100%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Jami</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Ro'yxat:</span>
              <span className="text-sm font-semibold text-gray-600">
                {totalStudents} ta
              </span>
            </div>
          </div>

          {/* Keldi */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                {totalStudents > 0
                  ? Math.round((presentStudents / totalStudents) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {presentStudents}
            </p>
            <p className="text-sm text-gray-500 mt-1">Keldi</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Hozir:</span>
              <span className="text-sm font-semibold text-emerald-600">
                {presentStudents} ta
              </span>
            </div>
          </div>

          {/* Kech */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                {totalStudents > 0
                  ? Math.round((lateStudents / totalStudents) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{lateStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Kech</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Kechikkan:</span>
              <span className="text-sm font-semibold text-amber-600">
                {lateStudents} ta
              </span>
            </div>
          </div>

          {/* Yo'q */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-700">
                {totalStudents > 0
                  ? Math.round((absentStudents / totalStudents) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{absentStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Yo'q</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Kelmagan:</span>
              <span className="text-sm font-semibold text-red-600">
                {absentStudents} ta
              </span>
            </div>
          </div>

          {/* Suv Istamoli % */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${water_usagePercentage >= 90
                  ? "bg-green-50 text-green-700"
                  : water_usagePercentage >= 70
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
                  }`}
              >
                {water_usagePercentage >= 90
                  ? "Yaxshi"
                  : water_usagePercentage >= 70
                    ? "O'rtacha"
                    : "Past"}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {water_usagePercentage}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Davomat</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Foiz:</span>
              <span className="text-sm font-semibold text-blue-600">
                {water_usagePercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar - All in one line (like StaffPage) */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* Filters removed - only showing staff employees */}

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Ism</option>
              <option value="status">Status</option>
              <option value="department">Bo'lim</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Reset Button */}
            <button
              onClick={() => {
                setSearchQuery("");
                setSortBy("name");
                setSortOrder("asc");
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              Tozalash
            </button>
          </div>
        </div>

        {/* Clean Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                    Xodim Ismi
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                    Bo'lim
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                    Kelgan
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                    Ketgan
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedwater_usage.map((student) => {
                  const lateInfo = calculateLateInfo(student.checkIn);
                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${lateInfo.isLate
                        ? "bg-orange-50 hover:bg-orange-100"
                        : "hover:bg-gray-50"
                        }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: "#004A77" }}
                          >
                            {student.avatar}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                            {lateInfo.isLate && (
                              <div className="text-xs text-orange-600 flex items-center mt-0.5 font-medium">
                                <Clock className="w-3 h-3 mr-0.5" />
                                {lateInfo.lateText} kech
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {student.department || "IT"}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4 text-gray-800 font-medium">
                        {student.checkIn || "—"}
                      </td>
                      <td className="text-center py-3 px-4 text-gray-800 font-medium">
                        {student.checkOut || "—"}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold ${student.status === "present"
                            ? "bg-green-100 text-green-800"
                            : student.status === "late"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                            }`}
                        >
                          {getStatusIcon(student.status)}
                          <span>{getStatusText(student.status)}</span>
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {/* Direct Edit Button */}
                        <button
                          onClick={() => handleEditEmployee(student)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>Tahrirlash</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Ko'rsatish:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-500">
                  {startIndex + 1}-{Math.min(endIndex, totalItems)} /{" "}
                  {totalItems} ta
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ««
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${currentPage === pageNum
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »»
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredwater_usage.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Ma'lumot topilmadi
            </h3>
            <p className="text-sm text-gray-500">
              Tanlangan sana uchun davomat ma'lumotlari mavjud emas
            </p>
          </div>
        )}

        {/* Employee Edit Modal */}
        <EmployeeEditModal
          employee={selectedEmployee}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedEmployee(null);
          }}
          onSave={handleSaveEmployee}
        />
      </div>
    </div >
  );
};

export default WaterUsagePage;
