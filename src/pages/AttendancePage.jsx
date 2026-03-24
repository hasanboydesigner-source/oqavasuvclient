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
import RealFaceRecognition from "../components/RealFaceRecognition";
import RoleSelectionModal from "../components/RoleSelectionModal.jsx"; // ✅ YANGI CHIROYLI MODAL
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL as BASE_URL } from "../config";
import * as XLSX from "xlsx";

const API_URL = BASE_URL;

const AttendancePage = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedRole, setSelectedRole] = useState(""); // New: role filter
  const [searchQuery, setSearchQuery] = useState(""); // New: search filter
  const [sortBy, setSortBy] = useState("name"); // New: sort by
  const [sortOrder, setSortOrder] = useState("asc"); // New: sort order
  const [attendanceData, setAttendanceData] = useState([]);
  const [faceRecords, setFaceRecords] = useState([]);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allClasses, setAllClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Mock data
  const mockAttendanceData = [
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
    fetchFaceRecords();

    // Socket.IO real-time updates uchun
    const socket = io(BASE_URL);

    // Employee yangilanganida ma'lumotlarni qayta yuklash
    socket.on("employee:updated", (updatedEmployee) => {
      console.log(
        "🔄 Employee updated via Socket.IO:",
        updatedEmployee.name,
        "role:",
        updatedEmployee.role
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
    if (attendanceData.length > 0) {
      fetchAttendanceDataWithEmployees(attendanceData);
    }
  }, [selectedDate]);

  // 📥 Загрузка данных посещаемости (с уже загруженными сотрудниками)
  const fetchAttendanceDataWithEmployees = async (employeesList) => {
    try {
      console.log(`📊 Loading attendance data for date: ${selectedDate}`);
      const response = await axios.get(
        `${API_URL}/api/attendance?date=${selectedDate}`
      );

      const attendanceRecords = response.data.records || [];
      console.log(`📋 Found ${attendanceRecords.length} attendance records`);
      console.log(`👥 Employees list has ${employeesList.length} employees`);

      // Debug: показать первые записи
      if (attendanceRecords.length > 0) {
        console.log("📝 First attendance record:", attendanceRecords[0]);
      }
      if (employeesList.length > 0) {
        console.log("👤 First employee:", employeesList[0]);
      }

      // Обновляем данные с информацией о посещаемости
      const updatedData = employeesList.map((employee) => {
        // Ищем запись посещаемости для этого сотрудника по разным полям
        const attendance = attendanceRecords.find((record) => {
          // Сопоставление по hikvisionEmployeeId
          const empHikId = employee.employeeId?.toString();
          const recHikId = record.hikvisionEmployeeId?.toString();
          const recEmpId = record.employeeId?.toString();

          // Debug logging for student role
          if (employee.role === "student") {
            console.log(`🔍 [ATTENDANCE] Matching student ${employee.name}:`, {
              empHikId,
              recHikId,
              recEmpId,
              recordName: record.name,
              employeeName: employee.name,
            });
          }

          const match = (recHikId && empHikId && recHikId === empHikId) ||
            (recEmpId && empHikId && recEmpId === empHikId) ||
            (record.name &&
              employee.name &&
              record.name.toLowerCase() === employee.name.toLowerCase());

          if (match && employee.role === "student") {
            console.log(`✅ [ATTENDANCE] Match found for student ${employee.name}`);
          }

          return match;
        });

        if (attendance) {
          console.log(
            `✅ Found attendance for ${employee.name}: checkIn=${attendance.firstCheckIn}, checkOut=${attendance.lastCheckOut}`
          );
          return {
            ...employee,
            checkIn: attendance.firstCheckIn || null,
            checkOut: attendance.lastCheckOut || null,
            status: attendance.firstCheckIn ? "present" : "absent",
            lateMinutes: attendance.lateMinutes || 0,
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

      setAttendanceData(updatedData);
    } catch (error) {
      console.error("❌ Error loading attendance data:", error);
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
  const fetchAttendanceData = async () => {
    try {
      console.log(`📊 Loading attendance data for date: ${selectedDate}`);
      const response = await axios.get(
        `${API_URL}/api/attendance?date=${selectedDate}`
      );

      const attendanceRecords = response.data.records || [];
      console.log(`📋 Found ${attendanceRecords.length} attendance records`);

      // Обновляем существующие данные с информацией о посещаемости
      setAttendanceData((prevData) =>
        prevData.map((employee) => {
          // Ищем запись посещаемости для этого сотрудника
          const attendance = attendanceRecords.find(
            (record) =>
              record.hikvisionEmployeeId === employee.employeeId ||
              record.employeeId === employee.employeeId
          );

          if (attendance) {
            return {
              ...employee,
              checkIn: attendance.firstCheckIn
                ? (() => {
                  const date = new Date(attendance.firstCheckIn);
                  return isNaN(date.getTime())
                    ? null
                    : date.toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                })()
                : null,
              checkOut: attendance.lastCheckOut
                ? (() => {
                  const date = new Date(attendance.lastCheckOut);
                  return isNaN(date.getTime())
                    ? null
                    : date.toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                })()
                : null,
              status: attendance.firstCheckIn ? "present" : "absent",
              lateMinutes: attendance.lateMinutes || 0,
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
        })
      );
    } catch (error) {
      console.error("❌ Error loading attendance data:", error);
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
          }))
        );
      }

      // Barcha xodimlarni use qilish - filtr yo'q
      const students = allEmployees.filter((emp) => emp.role === "student");
      const teachers = allEmployees.filter((emp) => emp.role === "teacher");
      const staff = allEmployees.filter((emp) => emp.role === "staff");
      const unassigned = allEmployees.filter((emp) => !emp.role);

      console.log(
        `📈 Roles: Students=${students.length}, Teachers=${teachers.length}, Staff=${staff.length}, Unassigned=${unassigned.length}`
      );

      // Ma'lumotlarni saqlash va attendance formatiga o'tkazish
      console.log("📊 Ma'lumotlar yuklandi:", {
        students: students.length,
        teachers: teachers.length,
        staff: staff.length,
        unassigned: unassigned.length,
        total: allEmployees.length,
      });

      // Store all employees
      setStudents(allEmployees);

      // Extract unique classes from students (class yoki className dan)
      const classes = [
        ...new Set(allEmployees.filter((emp) => emp.class || emp.className).map((s) => s.class || s.className)),
      ];
      setAllClasses(classes.sort());

      // Convert ALL employees to attendance format
      const attendanceList = allEmployees.map((employee) => {
        // Role asosida to'g'ri bo'lim nomini aniqlash
        let department;

        // Debug: Role check qilish
        console.log(
          `👤 ${employee.name}: role="${employee.role}", department="${employee.department}", class="${employee.class || employee.className}"`
        );

        // Role mavjud bo'lsa, unga mos bo'lim nomini aniqlash
        if (employee.role === "student") {
          department = employee.class || employee.className || "Sinf belgilanmagan";
        } else if (employee.role === "teacher") {
          department = employee.subject || "O'qituvchi";
        } else if (employee.role === "staff") {
          department = "Xodim";
        } else if (employee.role === "admin") {
          department = "Administrator";
        } else {
          // Role belgilanmagan bo'lsa, default department yoki "Bosh"
          department =
            employee.department && employee.department !== "Bosh"
              ? employee.department
              : "Lavozim belgilanmagan";
        }

        console.log(`📋 ${employee.name}: Final department="${department}"`);

        return {
          id: employee._id,
          name: employee.name,
          class: department,
          role: employee.role || null, // Role belgilanmagan bo'lsa null
          employeeId: employee.employeeId,
          hikvisionEmployeeId: employee.hikvisionEmployeeId, // Hikvision ID qo'shildi
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

      setAttendanceData(attendanceList);

      // После загрузки сотрудников, загружаем данные посещаемости
      setTimeout(() => {
        fetchAttendanceDataWithEmployees(attendanceList);
      }, 100);
    } catch (error) {
      console.error("❌ Ma'lumotlarni yuklashda xato:", error);
      toast.error("Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const fetchFaceRecords = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/attendance/face-records?date=${selectedDate}`
      );
      const records = response.data.records || [];
      setFaceRecords(records);

      // Update attendance data with face records
      updateAttendanceWithRecords(records);
    } catch (error) {
      console.log("Face records yuklashda xato:", error.message);
    }
  };

  const updateAttendanceWithRecords = (records) => {
    setAttendanceData((prev) =>
      prev.map((student) => {
        const record = records.find(
          (r) => r.employeeId === student.employeeId && r.date === selectedDate
        );
        if (record) {
          return {
            ...student,
            checkIn: record.checkInTime,
            checkOut: record.checkOutTime,
            status: record.status,
            lateMinutes: record.lateMinutes || 0,
          };
        }
        return student;
      })
    );
  };

  const handleFaceRecognition = (person) => {
    console.log("Face recognized:", person);
    fetchFaceRecords();
  };

  const handleEditEmployee = (employee) => {
    // Find full employee data from students list
    const fullEmployee = students.find((s) => s._id === employee.id);
    if (fullEmployee) {
      setSelectedEmployee(fullEmployee);
      setEditModalOpen(true);
    }
  };

  const handleSaveEmployee = async (updatedEmployee) => {
    try {
      console.log("� [FRONTEND] Employee saqlash boshlandi:", {
        id: updatedEmployee._id,
        name: updatedEmployee.name,
        role: updatedEmployee.role,
      });

      // 1. Server'ga API so'rov yuborish
      const saveResponse = await axios.put(
        `${API_URL}/api/employee/${updatedEmployee._id}`,
        updatedEmployee
      );

      console.log("✅ [FRONTEND] Server javob:", saveResponse.data);

      // 2. Local state'ni yangilash
      setAttendanceData((prevData) =>
        prevData.map((emp) => {
          if (emp.id === updatedEmployee._id) {
            // Role asosida yangi bo'lim nomini aniqlash
            let newDepartment = "Bosh";

            if (updatedEmployee.role === "student") {
              newDepartment = updatedEmployee.class || "O'quvchi";
            } else if (updatedEmployee.role === "teacher") {
              if (updatedEmployee.subject) {
                newDepartment = `${updatedEmployee.subject} o'qituvchisi`;
              } else {
                newDepartment = "O'qituvchi";
              }
            } else if (updatedEmployee.role === "staff") {
              if (updatedEmployee.staffType) {
                const staffTypes = {
                  cleaner: "Tozolovchi",
                  guard: "Qorovul",
                  cook: "Oshpaz",
                  director: "Direktor",
                  vice_director: "Zavuch",
                  hr: "HR/Kadrlar",
                };
                newDepartment =
                  staffTypes[updatedEmployee.staffType] || "Xodim";
              } else {
                newDepartment = "Xodim";
              }
            }

            console.log(
              `📋 [FRONTEND] ${emp.name}: role "${updatedEmployee.role}" -> department "${newDepartment}"`
            );

            return {
              ...emp,
              role: updatedEmployee.role,
              class: newDepartment, // Bo'lim ustuni yangilanadi
            };
          }
          return emp;
        })
      );

      // 3. Server'dan yangilangan ma'lumotlarni qayta yuklash
      console.log("🔄 [FRONTEND] Ma'lumotlarni qayta yuklash...");
      await fetchStudents();

      setEditModalOpen(false);
      setSelectedEmployee(null);

      // 4. Rol bo'yicha muvaffaqiyatli xabar
      const roleMessages = {
        student: {
          emoji: "📚",
          text: "O'quvchilar sahifasida ko'ring!",
          path: "/students",
        },
        teacher: {
          emoji: "👨‍🏫",
          text: "O'qituvchilar sahifasida ko'ring!",
          path: "/teachers",
        },
        staff: {
          emoji: "👔",
          text: "Xodimlar sahifasida ko'ring!",
          path: "/staff",
        },
      };

      const roleInfo = roleMessages[updatedEmployee.role];
      if (roleInfo) {
        toast.success(
          `✅ ${updatedEmployee.name} - ${roleInfo.emoji} ${updatedEmployee.role === "student"
            ? "O'quvchi"
            : updatedEmployee.role === "teacher"
              ? "O'qituvchi"
              : "Xodim"
          } sifatida saqlandi!`,
          { duration: 3000 }
        );

        // 1 soniyadan keyin sahifaga o'tish haqida xabar
        setTimeout(() => {
          toast.success(`${roleInfo.emoji} ${roleInfo.text}`, {
            duration: 4000,
            icon: "👉",
          });
        }, 1500);
      } else {
        toast.success("✅ Ma'lumotlar muvaffaqiyatli yangilandi!");
      }

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

  // Filter and sort attendance data
  let filteredAndSortedAttendance = attendanceData.filter((person) => {
    // Filter by class
    const matchesClass =
      selectedClass === "" ||
      selectedClass === "Barcha sinflar" ||
      person.class === selectedClass;

    // Filter by role
    let matchesRole = selectedRole === "";
    if (!matchesRole) {
      if (selectedRole === "student") {
        matchesRole = person.role === "student";
      } else if (selectedRole === "teacher") {
        matchesRole = person.role === "teacher";
      } else if (selectedRole === "staff") {
        matchesRole =
          person.role === "staff" ||
          person.role === null ||
          person.role === undefined;
      }
    }

    // Filter by search query (name)
    const matchesSearch =
      searchQuery === "" ||
      person.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.employeeNo?.toString().includes(searchQuery);

    return matchesClass && matchesRole && matchesSearch;
  });

  // Sort the filtered data
  filteredAndSortedAttendance.sort((a, b) => {
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
      default:
        break;
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  const filteredAttendance = filteredAndSortedAttendance;

  // Pagination logic
  const totalItems = filteredAttendance.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAttendance = filteredAttendance.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, selectedClass, searchQuery, selectedDate]);

  // Dynamically create class options
  const classOptions = ["Barcha sinflar", ...allClasses];

  // Role options
  const roleOptions = [
    { value: "", label: "Barchasi" },
    { value: "student", label: "O'quvchilar" },
    { value: "teacher", label: "O'qituvchilar" },
    { value: "staff", label: "Xodimlar" },
  ];

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

  // Statistics based on FILTERED attendance
  const totalStudents = filteredAttendance.length;
  const presentStudents = filteredAttendance.filter(
    (s) => s.status === "present"
  ).length;
  const lateStudents = filteredAttendance.filter(
    (s) => s.status === "late"
  ).length;
  const absentStudents = filteredAttendance.filter(
    (s) => s.status === "absent"
  ).length;

  // Calculate percentage
  const attendancePercentage =
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
      // Ma'lumotlarni tayyorlash
      const excelData = data.map((record) => {
        const lateInfo = calculateLateInfo(record.checkIn);
        return {
          "F.I.O": record.name || "Noma'lum",
          "Lavozim":
            record.role === "student"
              ? "O'quvchi"
              : record.role === "teacher"
                ? "O'qituvchi"
                : record.role === "staff"
                  ? "Xodim"
                  : "Noma'lum",
          "Sinf/Bo'lim": record.class || "Noma'lum",
          "Kelgan vaqti": record.checkIn || "Kelmagan",
          "Ketgan vaqti": record.checkOut || "Ketmagan",
          "Status":
            lateInfo.isLate
              ? "Kech keldi"
              : record.status === "present"
                ? "Keldi"
                : "Kelmadi",
          "Kechikish": lateInfo.lateText || "-",
          "Kechikish (minut)": lateInfo.lateMinutes || 0,
          "Sana": selectedDate,
        };
      });

      // Создание workbook и worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ustun kengliklarini sozlash
      const wscols = [
        { wch: 28 }, // F.I.O
        { wch: 12 }, // Lavozim
        { wch: 15 }, // Sinf/Bo'lim
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
          timeUntilExport / 1000 / 60
        )} минут`
      );

      setTimeout(async () => {
        try {
          // Получаем актуальные данные за сегодня
          const currentDate = new Date().toISOString().split("T")[0];
          const allEmployeesResponse = await axios.get(
            `${API_URL}/api/all-staff`
          );
          const attendanceResponse = await axios.get(
            `${API_URL}/api/attendance?date=${currentDate}`
          );

          const employees = allEmployeesResponse.data.employees || [];
          const attendanceRecords = attendanceResponse.data.records || [];

          // Группируем по ролям
          const students = employees.filter((emp) => emp.role === "student");
          const teachers = employees.filter((emp) => emp.role === "teacher");
          const staff = employees.filter((emp) => emp.role === "staff");

          // Формируем данные с посещаемостью
          const processGroup = (group) => {
            return group.map((emp) => {
              const attendance = attendanceRecords.find(
                (att) => att.hikvisionEmployeeId === emp.hikvisionEmployeeId
              );
              return {
                ...emp,
                checkIn: attendance?.firstCheckIn || null,
                checkOut: attendance?.lastCheckOut || null,
                status: attendance ? "present" : "absent",
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
              `Oquvchilar_Hisoboti_${currentDate}.xlsx`
            );
          }

          if (teacherData.length > 0) {
            await generateExcelReport(
              "O'qituvchilar",
              teacherData,
              `Oqituvchilar_Hisoboti_${currentDate}.xlsx`
            );
          }

          if (staffData.length > 0) {
            await generateExcelReport(
              "Xodimlar",
              staffData,
              `Xodimlar_Hisoboti_${currentDate}.xlsx`
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
      const students = filteredAttendance.filter(
        (emp) => emp.role === "student"
      );
      const teachers = filteredAttendance.filter(
        (emp) => emp.role === "teacher"
      );
      const staff = filteredAttendance.filter((emp) => emp.role === "staff");

      const currentDate = new Date().toISOString().split("T")[0];

      if (students.length > 0) {
        await generateExcelReport(
          "О'quvchilar",
          students,
          `Oquvchilar_Manual_${currentDate}.xlsx`
        );
      }

      if (teachers.length > 0) {
        await generateExcelReport(
          "O'qituvchilar",
          teachers,
          `Oqituvchilar_Manual_${currentDate}.xlsx`
        );
      }

      if (staff.length > 0) {
        await generateExcelReport(
          "Xodimlar",
          staff,
          `Xodimlar_Manual_${currentDate}.xlsx`
        );
      }

      toast.success("📊 Ручной экспорт выполнен!");
    } catch (error) {
      console.error("Ошибка ручного экспорта:", error);
      toast.error("Ошибка ручного экспорта");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Davomat</h1>
            <p className="text-sm text-gray-500 mt-1">
              {selectedRole === "student" && "O'quvchilar davomatini real-vaqtda kuzatish"}
              {selectedRole === "teacher" && "O'qituvchilar davomatini real-vaqtda kuzatish"}
              {selectedRole === "staff" && "Xodimlar davomatini real-vaqtda kuzatish"}
              {selectedRole === "" && "Barcha xodimlar davomatini real-vaqtda kuzatish"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFaceScanner(!showFaceScanner)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Yuz Skaneri
            </button>
            <button
              onClick={handleManualExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Excel Export
            </button>
          </div>
        </div>

        {/* Face Scanner */}
        {showFaceScanner && (
          <div>
            <RealFaceRecognition onRecognition={handleFaceRecognition} />
          </div>
        )}

        {/* Face Records */}
        {faceRecords.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🎬</span>
              <h3 className="text-sm font-semibold text-gray-700">So'nggi Yuz Tanishlar</h3>
            </div>
            <div className="space-y-2.5">
              {faceRecords.slice(-5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{record.personName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {record.role === "teacher" ? "👨‍🏫 O'qituvchi" : "👨‍🎓 O'quvchi"} •{" "}
                      {new Date(record.timestamp).toLocaleTimeString("uz-UZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2.5 py-1 rounded-lg">
                    {record.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards - Dashboard style */}
        <div className="grid grid-cols-5 gap-5">
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
              <span className="text-sm font-semibold text-gray-600">{totalStudents} ta</span>
            </div>
          </div>

          {/* Keldi */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                {totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{presentStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Keldi</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Hozir:</span>
              <span className="text-sm font-semibold text-emerald-600">{presentStudents} ta</span>
            </div>
          </div>

          {/* Kech */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                {totalStudents > 0 ? Math.round((lateStudents / totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{lateStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Kech</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Kechikkan:</span>
              <span className="text-sm font-semibold text-amber-600">{lateStudents} ta</span>
            </div>
          </div>

          {/* Yo'q */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-700">
                {totalStudents > 0 ? Math.round((absentStudents / totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{absentStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Yo'q</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Kelmagan:</span>
              <span className="text-sm font-semibold text-red-600">{absentStudents} ta</span>
            </div>
          </div>

          {/* Davomat % */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${attendancePercentage >= 90 ? 'bg-green-50 text-green-700' :
                attendancePercentage >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                }`}>
                {attendancePercentage >= 90 ? 'Yaxshi' : attendancePercentage >= 70 ? 'O\'rtacha' : 'Past'}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{attendancePercentage}%</p>
            <p className="text-sm text-gray-500 mt-1">Davomat</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Foiz:</span>
              <span className="text-sm font-semibold text-blue-600">{attendancePercentage}%</span>
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

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Barcha lavozimlar</option>
              {roleOptions.slice(1).map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Barcha sinflar</option>
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Ism</option>
              <option value="role">Lavozim</option>
              <option value="class">Sinf/Bo'lim</option>
              <option value="status">Status</option>
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
                setSelectedRole("");
                setSelectedClass("");
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Ism
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Lavozim
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Sinf / Bo'lim
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Kelgan
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Ketgan
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedAttendance.map((student) => {
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
                          {student.role === "student"
                            ? "O'quvchi"
                            : student.role === "teacher"
                              ? "O'qituvchi"
                              : "Xodim"}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {student.class}
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
                        <div className="relative inline-block">
                          {/* 3-Dot Menu Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const dropdown = e.currentTarget.nextElementSibling;
                              const allDropdowns = document.querySelectorAll('.action-dropdown');
                              allDropdowns.forEach(d => {
                                if (d !== dropdown) d.classList.add('hidden');
                              });
                              dropdown.classList.toggle('hidden');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
                            title="Amallar"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {/* Dropdown Menu - Improved */}
                          <div className="action-dropdown hidden absolute right-0 mt-2 w-[250px] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                handleEditEmployee(student);
                                document.querySelectorAll('.action-dropdown').forEach(d => d.classList.add('hidden'));
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors"
                            >
                              <div className="p-1.5 bg-blue-50 rounded-lg">
                                <Edit2 className="w-4 h-4 text-blue-600" />
                              </div>
                              Tahrirlash
                            </button>

                            <div className="border-t border-gray-100 my-2"></div>

                            {/* Status Options */}
                            {student.status === "present" ? (
                              <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                <div className="p-1.5 bg-emerald-50 rounded-lg">
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="font-semibold text-emerald-700">Keldi deb belgilangan</span>
                              </div>
                            ) : student.status === "late" ? (
                              <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                <div className="p-1.5 bg-amber-50 rounded-lg">
                                  <AlertCircle className="w-4 h-4 text-amber-600" />
                                </div>
                                <span className="font-semibold text-amber-700">Kech keldi</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    toast.success(`${student.name} - Keldi deb belgilandi`);
                                    document.querySelectorAll('.action-dropdown').forEach(d => d.classList.add('hidden'));
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  Keldi deb belgilash
                                </button>
                                <button
                                  onClick={() => {
                                    toast.info(`${student.name} - Sababli deb belgilandi`);
                                    document.querySelectorAll('.action-dropdown').forEach(d => d.classList.add('hidden'));
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                  <div className="p-1.5 bg-amber-50 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                  </div>
                                  Sababli
                                </button>
                                <button
                                  onClick={() => {
                                    toast.error(`${student.name} - Kelmadi`);
                                    document.querySelectorAll('.action-dropdown').forEach(d => d.classList.add('hidden'));
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  <div className="p-1.5 bg-red-50 rounded-lg">
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  </div>
                                  Kelmadi
                                </button>
                              </>
                            )}
                          </div>
                        </div>
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
        {filteredAttendance.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Ma'lumot topilmadi
            </h3>
            <p className="text-sm text-gray-500">
              Tanlangan sana va sinf uchun davomat ma'lumotlari mavjud emas
            </p>
          </div>
        )}

        {/* Professional Role Selection Modal */}
        {selectedEmployee && (
          <RoleSelectionModal
            employee={selectedEmployee}
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedEmployee(null);
            }}
            onSave={handleSaveEmployee}
          />
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
