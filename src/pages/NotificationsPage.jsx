import React, { useState, useEffect } from "react";
import {
  Bell,
  Send,
  MessageSquare,
  Phone,
  Mail,
  Plus,
  SendHorizontal,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL as BASE_URL } from "../config";

const API_URL = `${BASE_URL}/api`;

const NotificationsPage = () => {
  const [loading, setLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState({
    active: false,
    botConfigured: false,
    chatIdSet: false,
  });
  const [notifications, setNotifications] = useState([]);

  const [templates] = useState([
    {
      id: 1,
      name: "Hodimlar Davomati",
      content: "Hodimlarning bugungi davomat hisoboti: {presentCount} kelgan, {absentCount} kelmagan.",
    },
  ]);

  const [formData, setFormData] = useState({
    type: "Telegram",
    recipient: "staff",
    template: "",
    message: "",
  });

  useEffect(() => {
    fetchTelegramStatus();
    fetchNotificationHistory();
  }, []);

  const fetchNotificationHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/history?limit=10`);
      if (response.data.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notification history:", error);
    }
  };

  const fetchTelegramStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = `${API_URL}/notifications/telegram/status`;
      console.log("🔍 Fetching telegram status from:", url);

      // TEST PING
      try {
        const pingResponse = await axios.get(`${API_URL}/notifications/ping`);
        console.log("🏓 Ping response:", pingResponse.data);
      } catch (e) {
        console.warn("🏓 Ping failed:", e.message);
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTelegramStatus(response.data);
    } catch (error) {
      console.error("Telegram status error:", error);
    }
  };

  const handleSendTelegramReport = async (role) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/notifications/telegram/attendance`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      // Refresh notification history
      await fetchNotificationHistory();
    } catch (error) {
      toast.error(error.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSend = async () => {
    if (!formData.message) {
      toast.error("Xabar matnini kiriting");
      return;
    }

    try {
      setLoading(true);

      // Map recipient to readable format
      const recipientMap = {
        'staff': "Barcha Xodimlar"
      };

      const recipient = recipientMap[formData.recipient] || "Barcha";

      // Get template name if selected
      const selectedTemplate = templates.find(t => t.id === parseInt(formData.template));
      const title = selectedTemplate ? selectedTemplate.name : "Xabar";

      const response = await axios.post(
        `${API_URL}/notifications/telegram/custom`,
        {
          title: title,
          message: formData.message,
          recipient: recipient
        }
      );

      toast.success(response.data.message);

      // Clear form
      setFormData({
        ...formData,
        message: "",
        template: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-4 md:py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:items-center sm:flex-row justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-tight">Bildirishnomalar</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">Avtomatik va qo'lda xabarnomalar yuborish tizimi</p>
          </div>

          {/* Telegram Status Badge */}
          <div className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-medium border self-start sm:self-center ${telegramStatus.active
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-red-50 text-red-700 border-red-100"
            }`}>
            <div className={`w-2 h-2 rounded-full ${telegramStatus.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
            Telegram Bot: {telegramStatus.active ? "Ulangan" : "Ulanmagan"}
          </div>
        </div>

        {/* Quick Actions Support */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900">Xodimlar Davomati</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Barcha xodimlarning bugungi keldi-ketdi hisobotini guruhga yuboring.</p>
            <button
              disabled={loading}
              onClick={() => handleSendTelegramReport('staff')}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <SendHorizontal className="w-4 h-4" />
              Telegramga Yuborish
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* New Message Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Xabar Yuborish</h2>
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <div className="p-5 md:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transport</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option>Telegram</option>
                    <option>SMS</option>
                    <option>Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Qabul qiluvchi</label>
                  <select
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="staff">Barcha Xodimlar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mavzu / Shablon</label>
                <select
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Shablonsiz</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Xabar matni</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                  rows="5"
                  placeholder="Xabarni shu yerda yozing..."
                ></textarea>
              </div>

              <button
                onClick={handleManualSend}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#004A77" }}
              >
                <Send className="w-4 h-4" />
                Xabar Yuborish
              </button>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Oxirgi Xabarlar</h2>
              <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[600px] custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Hali xabarlar yo'q</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const date = new Date(notif.sentAt);
                  const formattedDate = `${date.toLocaleDateString('uz-UZ')} ${date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
                  const targetLabels = { 'staff': 'Xodimlar' };
                  const targetLabel = targetLabels[notif.target] || notif.target;

                  return (
                    <div key={notif._id} className="p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-100 hover:shadow-sm transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl border bg-blue-50 text-blue-600 border-blue-100">
                            <SendHorizontal className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{notif.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] uppercase font-bold text-gray-400">{notif.type}</span>
                              <span className="text-[10px] text-gray-300">•</span>
                              <span className="text-[10px] text-gray-400">{formattedDate}</span>
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg uppercase">
                          {notif.status}
                        </span>
                      </div>
                      <div className="pl-12">
                        <p className="text-sm text-gray-600 mb-2">{targetLabel}</p>
                        {notif.metadata && (
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>✅ {notif.metadata.presentCount || 0}</span>
                            <span>❌ {notif.metadata.absentCount || 0}</span>
                            <span>📊 {notif.metadata.attendanceRate || 0}%</span>
                            {notif.recipients && <span>📤 {notif.recipients.sent}/{notif.recipients.total}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;

