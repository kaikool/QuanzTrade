import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  FileText, 
  BarChart2, 
  Trash2, 
  X, 
  CheckCircle2, 
  ArrowUpRight, 
  CloudLightning,
  Copy,
  Check,
  Search,
  BookOpen,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Clock,
  Sun,
  Moon,
  Download,
  BellRing,
  BellOff,
  Send,
  Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Trade, CalendarEvent } from "./types";
import { 
  fetchTradesFromDB, 
  saveTradeToDB, 
  deleteTradeFromDB, 
  getSavedSupabaseKeys
} from "./lib/supabase";
import { BentoStats } from "./components/BentoStats";

export default function App() {
  // App core state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);
  
  // UI Panels
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPairFilter, setSelectedPairFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  
  // Edit & Supabase Database Configuration states
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [dbUrl, setDbUrl] = useState(() => localStorage.getItem("trade_app_supabase_url") || "");
  const [dbAnon, setDbAnon] = useState(() => localStorage.getItem("trade_app_supabase_anon") || "");
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  
  // Tab control
  // On Desktop we show a majestic integrated Bento layout.
  // On Mobile, the tabs let users switch cleanly.
  const [currentTab, setCurrentTab] = useState<"dashboard" | "journal" | "calendar">("dashboard");

  // Economic Calendar UI Filters
  // Day / Week filter
  const [calendarPeriodFilter, setCalendarPeriodFilter] = useState<"DAY" | "WEEK">("WEEK");
  const [calendarImpactFilter, setCalendarImpactFilter] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");
  
  // Form states for adding new trade
  const [formPair, setFormPair] = useState("EUR/USD");
  const [formType, setFormType] = useState<"BUY" | "SELL">("BUY");
  const [formEntryPrice, setFormEntryPrice] = useState("");
  const [formExitPrice, setFormExitPrice] = useState("");
  const [formSize, setFormSize] = useState("1.0");
  const [formNotes, setFormNotes] = useState("");
  const [formTimeframe, setFormTimeframe] = useState("H1");
  const [formRating, setFormRating] = useState(5);
  const [formStatus, setFormStatus] = useState<"OPEN" | "CLOSED">("CLOSED");
  const [formTag, setFormTag] = useState("News-Trade");
  const [formStopLoss, setFormStopLoss] = useState("");
  const [formTakeProfit, setFormTakeProfit] = useState("");
  const [formEntryDate, setFormEntryDate] = useState("");
  const [formExitDate, setFormExitDate] = useState("");

  // Darkmode (Google Material Design 3 dynamic light/dark mode state)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("trade_app_dark_mode") === "true";
  });

  // Progressive Web App (PWA) & Local Notification States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("pwa_notifications_enabled") === "true";
  });
  
  const [notifiedEvents, setNotifiedEvents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pwa_notified_events");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen to deferred PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Request notifications permission helper
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Trình duyệt này không hỗ trợ hiển thị thông báo.");
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("pwa_notifications_enabled", "true");
        showLocalNotification(
          "🔔 Đã Bật Thông Báo!", 
          "Bạn sẽ nhận được cảnh báo trước 1 tiếng cho các tin đỏ tác động cao tới USD!"
        );
        return true;
      } else {
        setNotificationsEnabled(false);
        localStorage.setItem("pwa_notifications_enabled", "false");
        return false;
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
      return false;
    }
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem("pwa_notifications_enabled", "false");
    } else {
      await requestNotificationPermission();
    }
  };

  // Triggers local notification safely using service worker or falling back to window notification context
  const showLocalNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: "/icon.svg",
              vibrate: [200, 100, 200],
              badge: "/icon.svg"
            } as any);
          }).catch(() => {
            new Notification(title, { body, icon: "/icon.svg" });
          });
        } else {
          new Notification(title, { body, icon: "/icon.svg" });
        }
      } catch (err) {
        new Notification(title, { body, icon: "/icon.svg" });
      }
    }
  };

  const triggerTestNotification = () => {
    if (Notification.permission !== "granted") {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          setTimeout(() => {
            showLocalNotification(
              "🚨 Thử Nghiệm Tin Đỏ",
              "Sự kiện 'Core Retail Sales m/m' (Tác động mạnh 🔴) sẽ diễn ra sau 1 giờ! Hãy kiểm tra các vị thế của bạn."
            );
          }, 800);
        }
      });
    } else {
      showLocalNotification(
        "🚨 Thử Nghiệm Tin Đỏ",
        "Sự kiện 'Core Retail Sales m/m' (Tác động mạnh 🔴) sẽ diễn ra sau 1 giờ! Hãy kiểm tra các vị thế của bạn."
      );
    }
  };

  // Background interval scans for upcoming High/Red events exactly 1-hour prior (50 to 70 mins)
  useEffect(() => {
    if (!notificationsEnabled || calendarEvents.length === 0) return;

    const checkUpcomingEvents = () => {
      const now = new Date();
      calendarEvents.forEach((ev) => {
        if (ev.impact !== "High") return;

        const evTime = new Date(ev.date);
        const diffMs = evTime.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));

        // Check if event is approx. 50-70 minutes away
        if (diffMins >= 50 && diffMins <= 70) {
          const eventId = `${ev.title}-${ev.date}`;
          if (!notifiedEvents.includes(eventId)) {
            showLocalNotification(
              `🚨 Tin Đỏ Sắp Diễn Ra: ${ev.title}`,
              `Sự kiện USD quan trọng đặc biệt sẽ xảy ra sau 1 tiếng (${evTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}). Hãy lưu ý rủi ro!`
            );
            const updated = [...notifiedEvents, eventId];
            setNotifiedEvents(updated);
            localStorage.setItem("pwa_notified_events", JSON.stringify(updated));
          }
        }
      });
    };

    checkUpcomingEvents();
    const intervalId = setInterval(checkUpcomingEvents, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, [calendarEvents, notificationsEnabled, notifiedEvents]);

  // Try to claim custom install prompt trigger
  const handleInstallAppPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        }
        setDeferredPrompt(null);
      });
    } else {
      alert("Tính năng cài đặt đang khả dụng trực tiếp từ trình duyệt của bạn (Tapto 'Thêm vào MH chính' hoặc nút tải xuống trên thanh URL).");
    }
  };

  const handleResetLocalStorage = async () => {
    if (confirm("Bạn có chắc chắn muốn xoá toàn bộ lịch sử giao dịch đang lưu trữ cục bộ?")) {
      localStorage.setItem("trade_app_local_trades", "[]");
      await loadTradesData();
      setIsSettingsOpen(false);
    }
  };

  // Initialize data and db keys
  useEffect(() => {
    // Load trades
    loadTradesData();
    // Load calendar
    loadCalendarData();
// Default dates on form
    const now = new Date();
    setFormEntryDate(now.toISOString().slice(0, 16));
    setFormExitDate(now.toISOString().slice(0, 16));
  }, []);

  // Update body and html dark class & persist choice
  useEffect(() => {
    localStorage.setItem("trade_app_dark_mode", darkMode ? "true" : "false");
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  const loadTradesData = async () => {
    const list = await fetchTradesFromDB();
    setTrades(list);
    
    const { url, anonKey } = getSavedSupabaseKeys();
    if (url && anonKey) {
      setSupabaseConnected(true);
    } else {
      setSupabaseConnected(false);
    }
  };

  const handleOpenAddTrade = () => {
    setEditingTradeId(null);
    setFormPair("EUR/USD");
    setFormType("BUY");
    setFormEntryPrice("");
    setFormExitPrice("");
    setFormSize("1.0");
    setFormNotes("");
    setFormTimeframe("H1");
    setFormRating(5);
    setFormStatus("CLOSED");
    setFormTag("News-Trade");
    setFormStopLoss("");
    setFormTakeProfit("");
    
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISO = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    setFormEntryDate(localISO);
    setFormExitDate(localISO);
    
    setIsAddOpen(true);
  };

  const handleBeginEditTrade = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setFormPair(trade.pair);
    setFormType(trade.type);
    setFormEntryPrice(trade.entry_price.toString());
    setFormExitPrice(trade.exit_price !== null ? trade.exit_price.toString() : "");
    setFormSize(trade.size.toString());
    setFormNotes(trade.notes || "");
    setFormTimeframe(trade.timeframe || "H1");
    setFormRating(trade.rating || 5);
    setFormStatus(trade.status);
    setFormTag(trade.tag || "News-Trade");
    setFormStopLoss(trade.stop_loss ? trade.stop_loss.toString() : "");
    setFormTakeProfit(trade.take_profit ? trade.take_profit.toString() : "");
    
    if (trade.entry_date) {
      const eDate = new Date(trade.entry_date);
      const tzOffset = eDate.getTimezoneOffset() * 60000;
      const localISO = (new Date(eDate.getTime() - tzOffset)).toISOString().slice(0, 16);
      setFormEntryDate(localISO);
    }
    
    if (trade.exit_date) {
      const exDate = new Date(trade.exit_date);
      const tzOffset = exDate.getTimezoneOffset() * 60000;
      const localISO = (new Date(exDate.getTime() - tzOffset)).toISOString().slice(0, 16);
      setFormExitDate(localISO);
    } else {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
      setFormExitDate(localISO);
    }

    setIsAddOpen(true);
  };

  const testSupabaseConnection = async () => {
    if (!dbUrl || !dbAnon) {
      alert("Vui lòng điền đầy đủ Supabase URL và Anon Key!");
      return;
    }
    try {
      localStorage.setItem("trade_app_supabase_url", dbUrl.trim());
      localStorage.setItem("trade_app_supabase_anon", dbAnon.trim());
      const list = await fetchTradesFromDB();
      setTrades(list);
      setSupabaseConnected(true);
      alert("Kết nối Supabase thành công! Dữ liệu đã được đồng bộ hóa và tải về.");
    } catch (err: any) {
      setSupabaseConnected(false);
      alert("Kết nối thất bại. Lỗi: " + err.message);
    }
  };

  const handleSaveSupabaseConfig = () => {
    localStorage.setItem("trade_app_supabase_url", dbUrl.trim());
    localStorage.setItem("trade_app_supabase_anon", dbAnon.trim());
    loadTradesData();
    alert("Đã lưu cấu hình kết nối Supabase thành công!");
  };

  const loadCalendarData = async () => {
    setLoadingCalendar(true);
    try {
      const res = await fetch("/api/calendar");
      const json = await res.json();
      if (json && json.success) {
        setCalendarEvents(json.data);
      }
    } catch (e) {
      console.error("Error loading calendar backend:", e);
    } finally {
      setLoadingCalendar(false);
    }
  };

const syncCalendar = async () => {
    setRefreshingCalendar(true);
    await loadCalendarData();
    setTimeout(() => setRefreshingCalendar(false), 800);
  };

  // Handle Trade Creation
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPair || !formEntryPrice || !formSize) {
      alert("Vui lòng nhập đủ thông tin: Cặp tiền, Giá vào lệnh & Khối lượng (Lots)!");
      return;
    }

    const entryPriceNum = parseFloat(formEntryPrice);
    const exitPriceNum = formExitPrice ? parseFloat(formExitPrice) : null;
    const sizeNum = parseFloat(formSize);
    const slNum = formStopLoss ? parseFloat(formStopLoss) : undefined;
    const tpNum = formTakeProfit ? parseFloat(formTakeProfit) : undefined;

    // Calculate PNL based on BUY or SELL
    let calculatedPnl = 0;
    if (formStatus === "CLOSED" && exitPriceNum !== null) {
      const pipMultiplier = formPair.includes("JPY") ? 100 : 10000;
      const difference = formType === "BUY" 
        ? (exitPriceNum - entryPriceNum) 
        : (entryPriceNum - exitPriceNum);
      
      calculatedPnl = difference * pipMultiplier * sizeNum * 10;
    } else {
      calculatedPnl = 0;
    }

    const targetId = editingTradeId || "t" + Date.now();

    const createdTrade: Trade = {
      id: targetId,
      pair: formPair,
      type: formType,
      entry_price: entryPriceNum,
      exit_price: formStatus === "CLOSED" ? exitPriceNum : null,
      size: sizeNum,
      pnl: parseFloat(calculatedPnl.toFixed(2)),
      status: formStatus,
      entry_date: new Date(formEntryDate).toISOString(),
      exit_date: formStatus === "CLOSED" ? new Date(formExitDate).toISOString() : null,
      notes: formNotes,
      timeframe: formTimeframe,
      rating: formRating,
      tag: formTag,
      stop_loss: slNum,
      take_profit: tpNum
    };

    try {
      await saveTradeToDB(createdTrade);
      await loadTradesData();
      setIsAddOpen(false);
      setEditingTradeId(null);

      // Reset form inputs
      setFormNotes("");
      setFormEntryPrice("");
      setFormExitPrice("");
      setFormStopLoss("");
      setFormTakeProfit("");
    } catch (err: any) {
      console.error("Lỗi đồng bộ hoá:", err);
      alert("Đồng bộ hoá thất bại: " + err.message);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xoá lịch sử giao dịch này không?")) {
      await deleteTradeFromDB(id);
      await loadTradesData();
    }
  };

  // Compute stats for header and badges
  const summary = useMemo(() => {
    let startingBalance = 100000; // Preset starting test standard balance
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const finalBalance = startingBalance + totalPnl;
    
    const openTradesCount = trades.filter(t => t.status === "OPEN").length;
    const closedTradesCount = trades.filter(t => t.status === "CLOSED").length;

    return {
      balance: finalBalance,
      pnl: totalPnl,
      openCount: openTradesCount,
      closedCount: closedTradesCount
    };
  }, [trades]);

  // Filters candidates
  const uniquePairs = useMemo(() => {
    const set = new Set(trades.map(t => t.pair));
    return ["ALL", ...Array.from(set)];
  }, [trades]);

  // Filtered trades list to display
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchSearch = t.pair.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.tag && t.tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPair = selectedPairFilter === "ALL" || t.pair === selectedPairFilter;
      const matchStatus = selectedStatusFilter === "ALL" || t.status === selectedStatusFilter;
      return matchSearch && matchPair && matchStatus;
    });
  }, [trades, searchQuery, selectedPairFilter, selectedStatusFilter]);

  // Filtered Calendar Events
  const filteredEventsByFilters = useMemo(() => {
    // Current date is 2026-05-22 according to metadata!
    const baseDate = new Date("2026-05-22T01:38:15Z");
    
    return calendarEvents.filter(ev => {
      const objDate = new Date(ev.date);
      const timeDiff = objDate.getTime() - baseDate.getTime();
      const diffDays = timeDiff / (1000 * 3600 * 24);

      // Period Filter
      let passPeriod = true;
      if (calendarPeriodFilter === "DAY") {
        // Must match exact same local calendar day as the baseDate (Today)
        passPeriod = objDate.getFullYear() === baseDate.getFullYear() &&
                     objDate.getMonth() === baseDate.getMonth() &&
                     objDate.getDate() === baseDate.getDate();
      } else if (calendarPeriodFilter === "WEEK") {
        // Within +/- 3.5 days of May 22
        passPeriod = Math.abs(diffDays) <= 4;
      }

      // Impact Filter
      let passImpact = true;
      if (calendarImpactFilter === "HIGH") {
        passImpact = ev.impact === "High";
      } else if (calendarImpactFilter === "MEDIUM") {
        passImpact = ev.impact === "High" || ev.impact === "Medium";
      }

      return passPeriod && passImpact;
    });
  }, [calendarEvents, calendarPeriodFilter, calendarImpactFilter]);

  // Group events by day beautiful label
  const timezoneOffsetStr = useMemo(() => {
    try {
      const offsetMinutes = new Date().getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offsetMinutes / -60));
      const sign = offsetMinutes > 0 ? "-" : "+";
      return `GMT${sign}${offsetHours}`;
    } catch (e) {
      return "GMT";
    }
  }, []);

  const groupedEventsByDay = useMemo(() => {
    const groups: { [key: string]: CalendarEvent[] } = {};
    
    filteredEventsByFilters.forEach(ev => {
      const d = new Date(ev.date);
      const formattedDay = d.toLocaleDateString("vi-VN", { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      if (!groups[formattedDay]) {
        groups[formattedDay] = [];
      }
      groups[formattedDay].push(ev);
    });

    return Object.entries(groups).sort((a, b) => {
      // Parse first dates inside values
      const dateA = new Date(a[1][0].date).getTime();
      const dateB = new Date(b[1][0].date).getTime();
      return dateA - dateB;
    });
  }, [filteredEventsByFilters]);

  // Format Helper for status classes
  const getImpactColorClasses = (impact: string) => {
    switch(impact) {
      case "High": 
        return {
          bg: "bg-red-50 dark:bg-red-900/10",
          text: "text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/30",
          indicator: "bg-red-500",
          label: "Tin Đỏ"
        };
      case "Medium": 
        return {
          bg: "bg-amber-50 dark:bg-amber-900/10",
          text: "text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30",
          indicator: "bg-amber-500",
          label: "Tin Cam"
        };
      default: 
        return {
          bg: "bg-blue-50 dark:bg-blue-900/10",
          text: "text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30",
          indicator: "bg-blue-400",
          label: "Tin Vàng"
        };
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-google-dark-bg text-gray-100" : "bg-[#f0f4f9] text-gray-800"} transition-all duration-300 font-display pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6`} id="app-root-theme">
      
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pt-5 space-y-3.5 sm:space-y-6" id="app-grid-frame">
        
        {/* Google Workspace Style Tonal Top Header */}
        <header className={`flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 ${darkMode ? "bg-google-dark-surface" : "bg-white"} rounded-[24px] shadow-sm space-y-4 md:space-y-0`} id="google-m3-header">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-google-blue-600 text-white rounded-[24px] flex items-center justify-center shadow-md font-extrabold flex-shrink-0" id="logo-icon">
              <CloudLightning size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-950 dark:text-white font-display truncate">Quantum Trade</h1>
                <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-google-blue-50 text-google-blue-600 dark:bg-google-blue-600/10 dark:text-google-blue-100 rounded-md flex-shrink-0">PRO</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug truncate">
                Đồng bộ hóa tin vĩ mô USD & nhật ký giao dịch hiệu năng cao
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto" id="balance-badge-area">
            
            {/* Dynamic Light/Dark Switch under Material 3 */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 sm:p-3 bg-gray-150 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Giao diện sáng/tối"
              id="btn-darkmode"
            >
              {darkMode ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} className="text-gray-600" />
              )}
            </button>

            {/* Account size indicator in dynamic style */}
            <div className="text-right min-w-0">
              <span className="text-xs sm:text-xs font-extrabold tracking-wider text-gray-400 dark:text-gray-500 uppercase block truncate">Số Dư Tài Khoản</span>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 justify-end">
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-display truncate" id="live-balance-text">
                  ${summary.balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-xs sm:text-xs px-2 py-1 rounded-full font-bold flex items-center gap-0.5 flex-shrink-0 ${summary.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`} id="summary-badge-pnl">
                  {summary.pnl >= 0 ? "+" : ""}${summary.pnl.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Profile Settings Click */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold font-mono cursor-pointer relative shadow-sm flex-shrink-0 text-sm"
              id="avatar-button"
            >
              JD
              <span className="absolute -bottom-0.5 -right-0.5 bg-google-blue-600 text-white rounded-full p-1 border border-white dark:border-google-dark-surface shadow-xs text-xs animate-pulse-once">
                <Settings size={12} />
              </span>
            </button>
          </div>
        </header>

        {/* Google-style Pill Navigation Tab Segment Manager */}
        <div className={`hidden md:flex justify-between items-center ${darkMode ? "bg-google-dark-surface" : "bg-white"} p-1.5 rounded-full shadow-sm overflow-x-auto no-scrollbar`} id="segmented-controller">
          <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
            <button 
              onClick={() => setCurrentTab("dashboard")}
              className={`px-4 sm:px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "dashboard" ? 'bg-google-blue-50 text-google-blue-600 dark:bg-google-blue-600/15 dark:text-blue-200' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white dark:text-gray-400'}`}
            >
              <BarChart2 size={16} className="flex-shrink-0" />
              <span>Tổng quan</span>
            </button>
            <button 
              onClick={() => setCurrentTab("journal")}
              className={`px-4 sm:px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "journal" ? 'bg-google-blue-50 text-google-blue-600 dark:bg-google-blue-600/15 dark:text-blue-200' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white dark:text-gray-400'}`}
            >
              <FileText size={16} className="flex-shrink-0" />
              <span>Nhật ký <span className="text-xs font-mono text-gray-400 dark:text-gray-500">({trades.length})</span></span>
            </button>
            <button 
              onClick={() => setCurrentTab("calendar")}
              className={`px-4 sm:px-6 py-2.5 rounded-full text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "calendar" ? 'bg-google-blue-50 text-google-blue-600 dark:bg-google-blue-600/15 dark:text-blue-200' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white dark:text-gray-400'}`}
            >
              <CalendarIcon size={16} className="flex-shrink-0" />
              <span>Lịch tin tức</span>
            </button>
</div>
          
          <button 
            onClick={handleOpenAddTrade}
            className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-google-blue-600 hover:bg-google-blue-700 text-white rounded-full text-sm font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
            id="desktop-add-trade-btn"
          >
            <Plus size={16} />
            <span>Thêm giao dịch</span>
          </button>
        </div>

        {/* 1. OVERVIEW BENTO TAB SCREEN */}
        {currentTab === "dashboard" && (
          <div className="space-y-6" id="dashboard-bento-section">
            
            {/* Numeric and graphs bento core statistics wrapper */}
            <BentoStats trades={trades} darkMode={darkMode} />

            {/* Mixed Bento Row: Calendar Fast-View (Large 2/3) + Recent Trade Activities (Medium 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="bento-two-columns-mixed">
              
              {/* Calendar Feed Fast-View Card */}
              <div className={`lg:col-span-2 p-5 sm:p-6 ${darkMode ? "bg-google-dark-surface" : "bg-white"} rounded-[24px] shadow-sm flex flex-col justify-between`} id="bento-calendar-fastview">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-150 dark:border-white/5 pb-4 mb-4 gap-3 sm:gap-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-google-blue-50 dark:bg-google-blue-600/10 text-google-blue-600 rounded-xl flex-shrink-0">
                        <CalendarIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white leading-tight">Điểm Tin Kinh Tế Nổi Bật</h4>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">Các sự kiện vĩ mô tác động mạnh tới USD</p>
                      </div>
                    </div>
                    
                    {/* Quick filter inside header - Slate theme layout */}
                    <div className={`flex ${darkMode ? 'bg-[#131314] border-[#2e2f30]' : 'bg-gray-100 border-transparent'} p-1 rounded-xl w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0 border`}>
                      <button 
                        onClick={() => setCalendarPeriodFilter("DAY")}
                        className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          calendarPeriodFilter === "DAY" 
                            ? (darkMode ? 'bg-[#2e2f30] text-blue-300 shadow-xs' : 'bg-white text-google-blue-600 shadow-xs') 
                            : (darkMode ? 'text-gray-400 hover:text-gray-200 dark:text-gray-400 dark:hover:text-white' : 'text-gray-550 hover:text-gray-800')
                        }`}
                      >
                        Hôm nay
                      </button>
                      <button 
                        onClick={() => setCalendarPeriodFilter("WEEK")}
                        className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          calendarPeriodFilter === "WEEK" 
                            ? (darkMode ? 'bg-[#2e2f30] text-blue-300 shadow-xs' : 'bg-[#f8f9fa] sm:bg-white text-google-blue-600 shadow-xs') 
                            : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-550 hover:text-gray-850')
                        }`}
                      >
                        Tuần này
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1" id="fastview-events-scroller">
                    {loadingCalendar ? (
                       <div className="py-12 text-center text-gray-400 space-y-2">
                        <RefreshCw className="animate-spin text-google-blue-600 mx-auto" size={24} />
                        <p className="text-sm">Đang nạp cập nhật lịch kinh tế thực tế...</p>
                      </div>
                    ) : filteredEventsByFilters.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                        <p className="text-sm">Không có tin tức USD nào tương thích bộ lọc đã chọn.</p>
                        <p className="text-xs text-gray-400 mt-1.5">Lưu ý: Bạn có thể chọn tin có tác động thấp hơn ở tab Lịch Kinh Tế</p>
                      </div>
                    ) : (
                      filteredEventsByFilters.slice(0, 5).map((ev, idx) => {
                        const styleInfo = getImpactColorClasses(ev.impact);
                        const eventDate = new Date(ev.date);
                        return (
                          <div 
                            key={`fast-ev-${idx}`}
                            className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-[#18191a] rounded-xl border border-transparent hover:border-google-blue-600/10 transition-colors gap-2"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`w-1 h-9 rounded-full flex-shrink-0 ${styleInfo.indicator}`}></div>
                              <div className="min-w-0">
                                <h5 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight truncate" title={ev.title}>{ev.title}</h5>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-mono bg-gray-200/50 dark:bg-white/5 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold">{ev.country}</span>
                                  <span>•</span>
                                  <span>DF: {ev.forecast || "N/A"}</span>
                                  <span>•</span>
                                  <span>KT: {ev.previous || "N/A"}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block font-mono">
                                {eventDate.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="mt-1">
                                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${styleInfo.text} ${styleInfo.bg}`}>
                                  {styleInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-end items-center text-sm">
                  <button 
                    onClick={() => setCurrentTab("calendar")}
                    className="text-google-blue-600 hover:underline flex items-center gap-1 font-extrabold"
                  >
                    Xem lịch toàn bộ chi tiết <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Recent Trade History Widget Panel */}
              <div className={`p-5 sm:p-6 ${darkMode ? "bg-google-dark-surface" : "bg-white"} rounded-[24px] shadow-sm flex flex-col justify-between`} id="bento-recent-history">
                <div>
                  <div className="flex justify-between items-center mb-4 gap-2">
                    <h4 className="text-base sm:text-lg font-extrabold text-gray-950 dark:text-white truncate">Lệnh Gần Đây</h4>
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 rounded-full font-bold flex-shrink-0">Lịch Sử</span>
                  </div>
 
                  <div className="space-y-3 max-h-[300px] overflow-y-auto" id="recent-trades-list">
                    {trades.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-sm">
                        <BookOpen size={24} className="mx-auto text-gray-300 dark:text-gray-700 animate-pulse mb-2" />
                        Chưa có lịch sử giao dịch.
                      </div>
                    ) : (
                      trades.slice(0, 4).map((t) => (
                        <div key={t.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-google-dark-bg/20 rounded-xl transition-all">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${t.type === "BUY" ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {t.type}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-sm text-gray-800 dark:text-white">{t.pair}</span>
                              <span className={`text-sm font-black font-mono ${t.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {t.pnl >= 0 ? "+" : ""}${t.pnl.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 mt-1">
                              <span>{t.size} Lots • {t.timeframe}</span>
                              <span className="italic">{t.status === "OPEN" ? "Đang Chạy" : "Đã Khớp"}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
 
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <button 
                    onClick={() => setCurrentTab("journal")}
                    className="w-full py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-full text-xs sm:text-sm font-extrabold transition-all"
                    id="bento-view-journal-btn"
                  >
                    Quản lý toàn bộ {trades.length} giao dịch
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. JOURNAL MANAGEMENT TAB SCREEN */}
        {currentTab === "journal" && (
          <div className="grid grid-cols-1 gap-6" id="journal-standalone-section">
            
            <div className="p-4 sm:p-6 bg-white dark:bg-google-dark-surface rounded-[24px] shadow-sm max-w-full overflow-hidden" id="journal-master-card">
              
              {/* Journal controls header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-3 mb-4 w-full min-w-0">
                <div className="flex-shrink-0">
                  <h3 className="text-sm sm:text-base font-bold text-gray-950 dark:text-white flex items-center gap-1.5">
                    <FileText className="text-google-blue-600" size={16} />
                    Lịch sử Giao dịch
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:w-auto pb-1 sm:pb-0">
                  {/* Pair filter select - M3 standard */}
                  <div className="flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-zinc-800/80 px-2 py-2.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold w-full sm:w-auto">
                    <Filter size={11} className="text-gray-400 dark:text-gray-400" />
                    <select 
                      value={selectedPairFilter}
                      onChange={(e) => setSelectedPairFilter(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer text-gray-800 dark:text-gray-200 font-bold w-full sm:max-w-none text-center sm:text-left truncate text-xs"
                    >
                      <option value="ALL" className="bg-white dark:bg-google-dark-bg text-gray-900 dark:text-white">Cặp: Tất cả</option>
                      {uniquePairs.filter(p => p !== "ALL").map(p => (
                        <option key={p} value={p} className="bg-white dark:bg-google-dark-bg text-gray-900 dark:text-white">{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status filter select - M3 standard */}
                  <div className="flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-zinc-800/80 px-2 py-2.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold w-full sm:w-auto">
                    <select 
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer text-gray-800 dark:text-gray-200 font-bold w-full sm:max-w-none text-center sm:text-left truncate text-xs"
                    >
                      <option value="ALL" className="bg-white dark:bg-google-dark-bg text-gray-900 dark:text-white">Tất cả lệnh</option>
                      <option value="OPEN" className="bg-white dark:bg-google-dark-bg text-gray-900 dark:text-white">Lệnh Mở (OPEN)</option>
                      <option value="CLOSED" className="bg-white dark:bg-google-dark-bg text-gray-900 dark:text-white">Đã Đóng (CLOSED)</option>
                    </select>
                  </div>

                  {/* Add trade trigger capsule */}
                  <button 
                    onClick={handleOpenAddTrade}
                    className="py-2.5 px-3.5 bg-google-blue-600 hover:bg-google-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer text-center w-full sm:w-auto"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Live search input bar - M3 Workspace Style */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                  <Search size={15} />
                </div>
                <input 
                  type="text"
                  placeholder="Nhập cặp tiền hoặc phân tích để tìm kiếm nhanh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 rounded-lg text-xs border border-gray-200/50 dark:border-white/5 focus:border-google-blue-600 focus:bg-white dark:focus:bg-google-dark-bg focus:outline-none focus:ring-1 focus:ring-google-blue-600 transition-all font-sans"
                  id="trade-search-input"
                />
              </div>

              {/* Desktop Trades Table - Hidden on Mobile */}
              <div className="hidden md:block overflow-x-auto" id="trades-table-scroller">
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-2 animate-pulse" />
                    <p className="text-sm font-semibold">Không tìm thấy giao dịch nào</p>
                    <p className="text-xs text-gray-500 mt-1">Sử dụng bộ lọc khác hoặc nhập một giao dịch mới để tiếp tục!</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-white/5 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        <th className="py-3.5 px-4 whitespace-nowrap">Cặp / Trạng thái</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Loại lệnh</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Kích thước (Lots)</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Điểm vào / Điểm ra</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Chốt lời / Chặn lỗ</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Ghi chú & Phân tích</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Lời / Lỗ (USD)</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                      {filteredTrades.map((t) => (
                        <tr key={t.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-white tracking-tight">{t.pair}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1">{t.timeframe || "M15"}</div>
                              </div>
                              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-extrabold uppercase tracking-wide ${t.status === "OPEN" ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400" : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400"}`}>
                                {t.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono ${t.type === "BUY" ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {t.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold dark:text-gray-200 whitespace-nowrap">
                            {t.size} Lots
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>Vào: <strong className="text-gray-800 dark:text-white">{t.entry_price}</strong></span>
                              {t.exit_price ? (
                                <span>Ra: <strong className="text-gray-800 dark:text-white">{t.exit_price}</strong></span>
                              ) : (
                                <span className="opacity-40 italic">Đang mở...</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>SL: {t.stop_loss ? <strong className="text-gray-800 dark:text-white">{t.stop_loss}</strong> : <span className="opacity-40">N/A</span>}</span>
                              <span>TP: {t.take_profit ? <strong className="text-gray-800 dark:text-white">{t.take_profit}</strong> : <span className="opacity-40">N/A</span>}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 max-w-xs">
                            <div className="truncate text-xs text-gray-600 dark:text-gray-300" title={t.notes}>
                              {t.notes || <span className="text-gray-400 italic">Không có ghi chú</span>}
                            </div>
                            <div className="flex gap-2.5 items-center mt-1.5">
                              {t.tag && (
                                <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded">
                                  {t.tag}
                                </span>
                              )}
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span 
                                    key={i} 
                                    className={`text-xs ${i < t.rating ? 'text-amber-500' : 'text-gray-300 dark:text-slate-800'}`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span className={`font-mono font-black text-base ${t.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {t.pnl >= 0 ? "+" : ""}${t.pnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                              {new Date(t.entry_date).toLocaleDateString(undefined, {month: "short", day: "numeric"})}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => handleBeginEditTrade(t)}
                                className="p-2 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-google-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center"
                                title="Chỉnh sửa / Cập nhật trạng thái"
                                id={`edit-btn-${t.id}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTrade(t.id)}
                                className="p-2 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-400 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center"
                                title="Xoá thương vụ"
                                id={`del-btn-${t.id}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Mobile Trades Card List - High responsive UI */}
              <div className="block md:hidden space-y-3" id="trades-mobile-scroller">
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    <BookOpen size={36} className="mx-auto text-gray-400 dark:text-gray-500 mb-2 animate-pulse" />
                    <p className="font-semibold">Không tìm thấy giao dịch nào</p>
                  </div>
                ) : (
                  filteredTrades.map((t) => (
                    <div 
                      key={`mob-trade-${t.id}`}
                      className="p-4 bg-gray-50 dark:bg-slate-900/45 rounded-[24px] border border-gray-150/15 dark:border-white/5 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-gray-900 dark:text-white">{t.pair}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded font-bold">{t.timeframe || "M15"}</span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-400 block mt-1 font-mono">
                            {new Date(t.entry_date).toLocaleDateString("vi-VN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-wide ${t.status === "OPEN" ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400" : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400"}`}>
                          {t.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs border-t border-b border-gray-150/15 dark:border-white/5 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold tracking-wider">Số lượng Lots</span>
                          <span className="font-medium mt-1 flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${t.type === "BUY" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                              {t.type}
                            </span>
                            <strong>{t.size} Lots</strong>
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold tracking-wider">Giá vào / ra</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200 mt-1">
                            {t.entry_price} → <strong className="text-gray-900 dark:text-white">{t.exit_price || "Đang mở"}</strong>
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold tracking-wider">Chặn lỗ / Chốt lời</span>
                          <span className="font-mono text-gray-500 dark:text-gray-400 mt-1">
                            {t.stop_loss || "N/A"} / {t.take_profit || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold tracking-wider">Lời / Lỗ ròng (USD)</span>
                          <span className={`font-mono font-black text-sm ${t.pnl >= 0 ? "text-emerald-500" : "text-rose-500"} mt-1`}>
                            {t.pnl >= 0 ? "+" : ""}${t.pnl.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {t.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-100/50 dark:bg-slate-950/20 p-2.5 rounded-xl line-clamp-2">
                          {t.notes}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-xs">
                        <div className="flex gap-2 items-center">
                          {t.tag && (
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              {t.tag}
                            </span>
                          )}
                          <div className="flex gap-0.5">
                            {Array.from({ length: t.rating }).map((_, i) => (
                              <span key={i} className="text-amber-500 text-xs">★</span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleBeginEditTrade(t)}
                            className="px-3.5 py-2 rounded-xl bg-google-blue-50 hover:bg-google-blue-600 text-xs text-google-blue-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-google-blue-600 dark:text-blue-300 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pencil size={12} />
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteTrade(t.id)}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-xs text-rose-500 hover:text-white dark:bg-rose-950/35 dark:hover:bg-rose-600 dark:text-rose-400 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            Xoá
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

          </div>
        )}

        {/* 3. CALENDAR MASTER TAB SCREEN */}
        {currentTab === "calendar" && (
          <div className="space-y-6" id="calendar-master-view">
            
            <div className="p-4 sm:p-6 bg-white dark:bg-google-dark-surface rounded-[24px] shadow-sm max-w-full overflow-hidden" id="calendar-card">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-3 mb-4 w-full min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-google-blue-50 dark:bg-google-blue-600/15 text-google-blue-600 rounded-xl sm:rounded-[24px] flex items-center justify-center font-bold flex-shrink-0">
                    <CalendarIcon size={18} className="sm:size-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white">Lịch Tin Tức Vĩ Mô</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Chỉ số USD quan trọng</p>
                  </div>
                </div>

                {/* Filters row - Highly responsive layout for Mobile */}
                <div className="grid grid-cols-[1.3fr_1.1fr_auto] gap-2 w-full sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:w-auto pb-1 sm:pb-0">
                  
                  {/* Segmented Period Selection */}
                  <div className={`flex ${darkMode ? 'bg-[#131314]' : 'bg-gray-100'} p-1 rounded-xl w-full sm:w-auto`}>
                    <button 
                      onClick={() => setCalendarPeriodFilter("DAY")}
                      className={`flex-1 py-1.5 sm:px-4 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                        calendarPeriodFilter === "DAY" 
                          ? (darkMode ? 'bg-[#2e2f30] text-blue-300 shadow-xs' : 'bg-white text-google-blue-600 shadow-xs') 
                          : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-550 hover:text-gray-800')
                      }`}
                    >
                      Hôm Nay
                    </button>
                    <button 
                      onClick={() => setCalendarPeriodFilter("WEEK")}
                      className={`flex-1 py-1.5 sm:px-4 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                        calendarPeriodFilter === "WEEK" 
                          ? (darkMode ? 'bg-[#2e2f30] text-blue-300 shadow-xs' : 'bg-white text-google-blue-600 shadow-xs') 
                          : (darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-550 hover:text-gray-800')
                      }`}
                    >
                      Tuần Này
                    </button>
                  </div>

                  {/* Beautiful Dot Markers as Interactive Filters */}
                  <div className={`flex ${darkMode ? 'bg-[#131314]' : 'bg-gray-100'} p-1 rounded-xl items-center justify-around w-full sm:w-auto sm:gap-1`}>
                    <button
                      onClick={() => setCalendarImpactFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer flex-1 ${
                        calendarImpactFilter === "ALL" 
                          ? (darkMode ? 'bg-[#2e2f30] text-blue-300 shadow-xs' : 'bg-white text-google-blue-600 shadow-xs') 
                          : 'opacity-40 hover:opacity-95'
                      }`}
                      title="Tất cả tin tức (Đỏ, Vàng, Xanh)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    </button>
                    <button
                      onClick={() => setCalendarImpactFilter("MEDIUM")}
                      className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer flex-1 ${
                        calendarImpactFilter === "MEDIUM" 
                          ? (darkMode ? 'bg-[#2e2f30] text-blue-300 shadow-xs' : 'bg-white text-google-blue-600 shadow-xs') 
                          : 'opacity-40 hover:opacity-95'
                      }`}
                      title="Tin từ trung bình trở lên (Đỏ, Vàng)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    </button>
                    <button
                      onClick={() => setCalendarImpactFilter("HIGH")}
                      className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer flex-1 ${
                        calendarImpactFilter === "HIGH" 
                          ? (darkMode ? 'bg-[#2e2f30] text-blue-300 shadow-xs' : 'bg-white text-google-blue-600 shadow-xs') 
                          : 'opacity-40 hover:opacity-95'
                      }`}
                      title="Chỉ tin tức quan trọng (Đỏ)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    </button>
                  </div>

                  {/* Manual Refresh Call inside same line */}
                  <button 
                    onClick={syncCalendar}
                    className="p-2.5 bg-gray-100 dark:bg-[#131314] hover:bg-gray-200 dark:hover:bg-[#2e2f30] rounded-xl transition-all cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
                    title="Cập nhật nguồn tin tức mới nhất"
                  >
                    <RefreshCw size={14} className={refreshingCalendar ? "animate-spin text-google-blue-600" : "text-gray-500 dark:text-gray-400"} />
                  </button>
                </div>
              </div>

              {/* Day-by-Day Calendar Render list */}
              {loadingCalendar ? (
                <div className="py-24 text-center space-y-4">
                  <RefreshCw className="animate-spin text-google-blue-600 mx-auto" size={32} />
                  <p className="text-sm text-gray-400">Đang quét nguồn dữ liệu Forex Factory Live...</p>
                </div>
              ) : groupedEventsByDay.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <CloudLightning className="mx-auto text-gray-300 dark:text-gray-700 animate-pulse mb-3" size={48} />
                  <p className="font-semibold text-sm">Không thấy tin tức USD tương thích</p>
                  <p className="text-xs text-gray-400 mt-1">Vui lòng thử điều chỉnh lại bộ lọc tác động tin tức.</p>
                </div>
              ) : (
                <div className="space-y-8" id="calendar-days-feed">
                  {groupedEventsByDay.map(([dayName, events]) => (
                    <div key={dayName} className="space-y-4">
                      <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#001d3d] dark:text-[#e0f1ff] bg-google-blue-50 dark:bg-google-blue-600/15 px-3 py-1.5 rounded-lg inline-block">
                        {dayName}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map((ev, index) => {
                          const style = getImpactColorClasses(ev.impact);
                          const evTime = new Date(ev.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

                          return (
                            <div 
                              key={`${dayName}-${index}`}
                              className="p-4 sm:p-5 bg-gray-50 dark:bg-[#1f2021]/60 hover:bg-gray-100 dark:hover:bg-[#1f2021]/90 rounded-[24px] flex flex-col justify-between hover:scale-[1.01] transition-all duration-200"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex gap-2.5 items-start">
                                  <div className={`w-1 h-9 rounded-full mt-0.5 flex-shrink-0 ${style.indicator}`}></div>
                                  <div>
                                    <h5 className="font-bold text-sm sm:text-base tracking-tight text-gray-900 dark:text-white leading-tight">
                                      {ev.title}
                                    </h5>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-mono tracking-wider">
                                      {ev.country} • {timezoneOffsetStr}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <span className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1 justify-end font-mono">
                                    <Clock size={12} className="text-gray-400" />
                                    {evTime}
                                  </span>
                                  <div className="mt-1">
                                    <span className={`text-[10px] sm:text-xs font-extrabold rounded px-2 py-0.5 uppercase tracking-wider inline-block ${style.text} ${style.bg}`}>
                                      {style.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Forecast vs Previous display block */}
                              <div className="mt-4 pt-3 border-t border-gray-150/20 dark:border-white/5 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
                                <div className="bg-white dark:bg-[#131314] p-2 rounded-xl">
                                  <div className="text-[10px] sm:text-xs uppercase font-extrabold text-gray-400">Dự báo</div>
                                  <div className="font-mono font-bold text-gray-800 dark:text-white mt-1 text-xs sm:text-sm truncate">{ev.forecast || "-"}</div>
                                </div>
                                <div className="bg-white dark:bg-[#131314] p-2 rounded-xl">
                                  <div className="text-[10px] sm:text-xs uppercase font-extrabold text-gray-400">Kỳ trước</div>
                                  <div className="font-mono font-bold text-gray-800 dark:text-white mt-1 text-xs sm:text-sm truncate">{ev.previous || "-"}</div>
                                </div>
                                <div className="bg-[#f0f9ff] dark:bg-indigo-950/20 p-2 rounded-xl">
                                  <div className="text-[10px] sm:text-xs uppercase font-extrabold text-sky-600 dark:text-sky-400">Thực tế</div>
                                  <div className="font-mono font-bold text-sky-600 dark:text-sky-300 mt-1 text-xs sm:text-sm truncate">{ev.actual || <span className="italic font-normal text-xs text-gray-400">Đợi tin</span>}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* 5. GORGEOUS ADD TRADE PANEL DIRECTIVE MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="modal-container-root">
            
            {/* Dark background blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
            ></motion.div>

            {/* Window panel container */}
            <motion.div 
               initial={{ opacity: 0, y: 100 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 120 }}
               transition={{ type: "spring", damping: 26, stiffness: 220 }}
               className="relative w-full max-w-2xl bg-white dark:bg-google-dark-surface sm:rounded-[28px] rounded-t-[28px] shadow-2xl z-10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-x-hidden overflow-y-hidden"
               id="new-trade-modal-window"
            >
              
              <div className="flex justify-between items-center px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-150 dark:border-white/5 bg-white dark:bg-google-dark-surface z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex p-3 bg-google-blue-50 text-google-blue-600 dark:bg-google-blue-600/15 dark:text-blue-300 rounded-xl">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-950 dark:text-white font-display">
                      {editingTradeId ? "Cập Nhật Giao Dịch" : "Ghi Chép Giao Dịch Mới"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {editingTradeId ? "Cập nhật các số liệu, ghi chú hoặc tất toán giao dịch" : "Ghi nhận chi tiết để theo dõi biểu đồ tăng trưởng"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="p-2 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-gray-950 dark:hover:text-white cursor-pointer"
                  title="Đóng"
                >
                  <X size={24} className="sm:w-[20px] sm:h-[20px]" />
                </button>
              </div>

              <form onSubmit={handleCreateTrade} className="flex flex-col flex-1 min-h-0 min-w-0" id="trade-form">
                
                <div className="overflow-y-auto flex-1 px-4 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-7">
                  {/* BUY SELL TOGGLE & Pairs Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Cặp ngoại tệ</label>
                      <select 
                        value={formPair}
                        onChange={(e) => setFormPair(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-bold cursor-pointer"
                      >
                      <option value="EUR/USD">EUR/USD</option>
                      <option value="GBP/USD">GBP/USD</option>
                      <option value="USD/JPY">USD/JPY</option>
                      <option value="AUD/USD">AUD/USD</option>
                      <option value="USD/CAD">USD/CAD</option>
                      <option value="GBP/JPY">GBP/JPY</option>
                      <option value="XAU/USD">XAU/USD (Vàng)</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Hướng lệnh</label>
                    <div className="flex bg-gray-100 dark:bg-[#131314] p-1.5 rounded-[14px] border border-gray-200 dark:border-zinc-800">
                      <button 
                        type="button"
                        onClick={() => setFormType("BUY")}
                        className={`flex-1 py-2 sm:py-1.5 rounded-[10px] text-xs font-extrabold uppercase transition-all cursor-pointer ${formType === "BUY" ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                      >
                        MUA
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormType("SELL")}
                        className={`flex-1 py-2 sm:py-1.5 rounded-[10px] text-xs font-extrabold uppercase transition-all cursor-pointer ${formType === "SELL" ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                      >
                        BÁN
                      </button>
                    </div>
                  </div>
                </div>

                {/* Entry Price & Lots Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Giá vào lệnh *</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      placeholder="VD: 1.0854"
                      value={formEntryPrice}
                      onChange={(e) => setFormEntryPrice(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-mono"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Khối lượng (Lots) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      min="0.01"
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                {/* SL, TP Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Chặn lỗ</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="Tùy chọn - SL"
                      value={formStopLoss}
                      onChange={(e) => setFormStopLoss(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-mono"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Chốt lời</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="Tùy chọn - TP"
                      value={formTakeProfit}
                      onChange={(e) => setFormTakeProfit(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Status Switch Open / Closed & Timeframe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Trạng thái giao dịch</label>
                    <div className="flex bg-gray-100 dark:bg-[#131314] p-1.5 rounded-[14px] border border-gray-200 dark:border-zinc-800">
                      <button 
                        type="button"
                        onClick={() => setFormStatus("CLOSED")}
                        className={`flex-1 py-2 sm:py-1.5 rounded-[10px] text-xs font-extrabold uppercase transition-all cursor-pointer ${formStatus === "CLOSED" ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                      >
                        ĐÃ KHỚP (CLOSED)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormStatus("OPEN")}
                        className={`flex-1 py-2 sm:py-1.5 rounded-[10px] text-xs font-extrabold uppercase transition-all cursor-pointer ${formStatus === "OPEN" ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                      >
                        ĐANG CHẠY (OPEN)
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Khung thời gian</label>
                    <select 
                      value={formTimeframe}
                      onChange={(e) => setFormTimeframe(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-bold cursor-pointer"
                    >
                      <option value="M5">M5 (5 phút)</option>
                      <option value="M15">M15 (15 phút)</option>
                      <option value="H1">H1 (1 giờ)</option>
                      <option value="H4">H4 (4 giờ)</option>
                      <option value="D1">D1 (1 ngày)</option>
                    </select>
                  </div>
                </div>

                {/* Conditional exit fields if state is closed */}
                {formStatus === "CLOSED" && (
                  <div className="p-3 sm:p-5 rounded-[16px] sm:rounded-[20px] bg-gray-50/50 dark:bg-[#131314]/30 border border-gray-200/50 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Giá đóng lệnh</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="VD: 1.0920"
                        value={formExitPrice}
                        onChange={(e) => setFormExitPrice(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-white dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-mono"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Ngày đóng lệnh</label>
                      <input
                      type="datetime-local"
                        value={formExitDate}
                        onChange={(e) => setFormExitDate(e.target.value)}
                        className="w-full bg-white dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-2 py-3 sm:px-3 text-xs focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 text-gray-900 dark:text-white transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Entry Date & Tags Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Ngày vào lệnh</label>
                    <input
                      type="datetime-local"
                      value={formEntryDate}
                      onChange={(e) => setFormEntryDate(e.target.value)}
                      className="w-full bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-2 py-3 sm:px-3 text-xs focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 text-gray-900 dark:text-white transition-all cursor-pointer"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Chiến lược</label>
                    <select 
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all font-bold cursor-pointer"
                    >
                      <option value="News-Trade">Giao dịch theo tin tức</option>
                      <option value="Trend-Follow">Đu theo xu hướng</option>
                      <option value="Breakout">Bứt phá</option>
                      <option value="Range-Trade">Giao dịch Vùng</option>
                    </select>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Lý do vào lệnh</label>
                  <textarea 
                    rows={2.5}
                    placeholder="Tại sao bạn khớp lệnh này? Khung cảm xúc, phân tích kỹ thuật hoặc nhận định tin tức của bạn..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all"
                  ></textarea>
                </div>

                {/* Rating selection (Stars) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50/50 dark:bg-[#131314]/30 rounded-xl border border-gray-200 dark:border-zinc-800">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white text-xs block">Mức Độ Tuân Thủ Kỷ Luật</span>
                    <span className="text-xs text-gray-400 dark:text-gray-400 mt-1 block">Bạn có làm đúng kế hoạch giao dịch ban đầu không?</span>
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <div className="flex gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button 
                          key={i}
                          type="button"
                          onClick={() => setFormRating(i + 1)}
                          className="text-xl transition-transform active:scale-125 focus:outline-none cursor-pointer"
                        >
                          <span className={i < formRating ? "text-amber-400 drop-shadow-xs font-bold" : "text-gray-300 dark:text-zinc-750 hover:text-gray-400"}>★</span>
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 font-bold font-mono min-w-[45px]">({formRating}/5 sao)</span>
                  </div>
                </div>
                </div>

                {/* Save controls */}
                <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-gray-150 dark:border-white/5 bg-white dark:bg-google-dark-surface flex flex-col-reverse sm:flex-row gap-3 justify-end items-center z-20 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,16px))] sm:pb-5">
                  <button 
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-full text-sm font-bold cursor-pointer transition-colors text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="w-full sm:w-auto px-8 py-2.5 bg-google-blue-600 hover:bg-google-blue-700 text-white rounded-full text-sm font-bold active:scale-[0.98] transition-all cursor-pointer text-center"
                  >
                    {editingTradeId ? "Cập nhật dữ liệu" : "Ghi lại giao dịch"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. CORNER SETTINGS MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="settings-modal-root">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            ></motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 120 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md bg-white dark:bg-google-dark-surface p-5 sm:p-6 rounded-t-3xl sm:rounded-[24px] shadow-2xl z-10 text-xs pb-[calc(1.5rem+env(safe-area-inset-bottom,16px))] sm:pb-6"
              id="settings-modal-window"
            >
              {/* Material Design 3 Bottom Sheet handle wrapper */}
              <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700/80 rounded-full mx-auto mb-4 block sm:hidden"></div>

              <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100 dark:border-white/5">
                <h4 className="text-sm sm:text-base font-bold text-gray-950 dark:text-white font-display">Cài Đặt Hệ Thống</h4>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 rounded-full bg-gray-100 font-bold hover:bg-gray-200 dark:bg-white/5 text-gray-500 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <h5 className="font-bold text-gray-400 capitalize mb-2">Chủ Đề Giao Diện</h5>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setDarkMode(false)}
                      className={`flex-1 py-1.5 sm:py-2 rounded-full font-bold flex items-center justify-center gap-2 border text-xs transition-all ${!darkMode ? 'bg-white border-google-blue-600 text-google-blue-600 shadow-xs' : 'bg-gray-50 border-gray-150 text-gray-500 dark:bg-zinc-800/50 dark:border-zinc-700/50 dark:text-gray-400'}`}
                    >
                      ☀ Sáng (Material Lite)
                    </button>
                    <button 
                      onClick={() => setDarkMode(true)}
                      className={`flex-1 py-1.5 sm:py-2 rounded-full font-bold flex items-center justify-center gap-2 border text-xs transition-all ${darkMode ? 'bg-google-dark-bg border-google-blue-600 text-google-blue-400 shadow-xs' : 'bg-gray-50 border-gray-150 text-gray-500 dark:bg-zinc-800/50 dark:border-zinc-700/50 dark:text-gray-400'}`}
                    >
                      ☽ Tối (Material Dark)
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                  <h5 className="font-bold text-gray-400 capitalize mb-2.5 flex items-center gap-1.5">
                    <BellRing size={13} className="text-google-blue-600" />
                    Thông Báo Đẩy PWA
                  </h5>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent">
                    <div>
                      <p className="font-semibold text-gray-950 dark:text-white">Cảnh báo tin tức vĩ mô</p>
                      <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Báo trước 1 giờ khi có tin đỏ (USD High Impact)</p>
                    </div>
                    <button
                      onClick={toggleNotifications}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notificationsEnabled ? "bg-google-blue-600" : "bg-gray-250 dark:bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          notificationsEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>



                {deferredPrompt && (
                  <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleInstallAppPWA();
                      }}
                      className="w-full py-2.5 bg-google-blue-600 hover:bg-google-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow"
                    >
                      <Download size={14} />
                      Cài đặt Ứng dụng PWA
                    </button>
                  </div>
                )}

                <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                  <button
                    onClick={handleResetLocalStorage}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded-xl border border-rose-100/50 dark:border-rose-950/30 transition-colors cursor-pointer text-xs"
                  >
                    Xoá Toàn Bộ Nhật Ký Cũ (Local)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) on Mobile - Floats right above the bottom nav bar */}
      <button 
        onClick={handleOpenAddTrade}
        className="md:hidden fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] right-4 w-14 h-14 bg-google-blue-600 hover:bg-google-blue-700 text-white rounded-[16px] flex items-center justify-center shadow-lg active:scale-95 transition-all z-40 cursor-pointer"
        title="Thêm Giao Dịch"
        id="m3-fab"
      >
        <Plus size={26} />
      </button>

      {/* Material 3 Bottom Navigation bar for mobile / bottom control menu */}
      <footer className={`md:hidden fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom,0px)] h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] border-t ${darkMode ? "bg-[#1f2021]/95 border-zinc-800" : "bg-white/95 border-gray-150/40"} backdrop-blur-xl flex items-center justify-around px-2 z-40 transition-colors`} id="m3-bottom-nav">
        <button 
          onClick={() => setCurrentTab("dashboard")}
          className={`flex flex-col items-center gap-1.5 justify-center flex-1 py-1.5 ${currentTab === "dashboard" ? 'text-google-blue-600' : 'text-gray-400'}`}
        >
          <div className={`px-5 py-1.5 rounded-full ${currentTab === "dashboard" ? 'bg-google-blue-50 dark:bg-google-blue-900/30 text-google-blue-600 dark:text-blue-300' : ''}`}>
            <BarChart2 size={20} />
          </div>
          <span className="text-xs font-extrabold tracking-wide">Tổng quan</span>
        </button>
        
        <button 
          onClick={() => setCurrentTab("journal")}
          className={`flex flex-col items-center gap-1.5 justify-center flex-1 py-1.5 ${currentTab === "journal" ? 'text-google-blue-600' : 'text-gray-400'}`}
        >
          <div className={`px-5 py-1.5 rounded-full ${currentTab === "journal" ? 'bg-google-blue-50 dark:bg-google-blue-900/30 text-google-blue-600 dark:text-blue-300' : ''}`}>
            <FileText size={20} />
          </div>
          <span className="text-xs font-extrabold tracking-wide">Nhật ký</span>
        </button>

        <button 
          onClick={() => setCurrentTab("calendar")}
          className={`flex flex-col items-center gap-1.5 justify-center flex-1 py-1.5 ${currentTab === "calendar" ? 'text-google-blue-600' : 'text-gray-400'}`}
        >
          <div className={`px-5 py-1.5 rounded-full ${currentTab === "calendar" ? 'bg-google-blue-50 dark:bg-google-blue-900/30 text-google-blue-600 dark:text-blue-300' : ''}`}>
            <CalendarIcon size={20} />
          </div>
          <span className="text-xs font-extrabold tracking-wide">Lịch Tin</span>
        </button>
      </footer>

    </div>
  );
}
