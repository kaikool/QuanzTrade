import React, { Suspense, lazy, useState, useEffect, useMemo } from "react";
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
  Pencil,
  AlertTriangle,
  Newspaper,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Trade, CalendarEvent, NewsItem, NewsDebugInfo } from "./types";
import {
  fetchTradesFromDB,
  saveTradeToDB,
  deleteTradeFromDB,
  getSavedSupabaseKeys,
} from "./lib/supabase";
import { M3DatePicker, M3TimePicker } from "./components/M3DatePicker";
import { NewsPanel } from "./components/NewsPanel";

const BentoStats = lazy(() =>
  import("./components/BentoStats").then((module) => ({
    default: module.BentoStats,
  })),
);

export default function App() {
  // App core state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [loadingOlderNews, setLoadingOlderNews] = useState(false);
  const [newsHasMore, setNewsHasMore] = useState(true);
  const [newsLastUpdatedAt, setNewsLastUpdatedAt] = useState<string | null>(
    null,
  );
  const [newsDebug, setNewsDebug] = useState<NewsDebugInfo | null>(null);

  // UI Panels
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPairFilter, setSelectedPairFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  // Edit & Supabase Database Configuration states
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [dbUrl, setDbUrl] = useState(
    () => localStorage.getItem("trade_app_supabase_url") || "",
  );
  const [dbAnon, setDbAnon] = useState(
    () => localStorage.getItem("trade_app_supabase_anon") || "",
  );
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // Tab control
  // On Desktop we show a majestic integrated Bento layout.
  // On Mobile, the tabs let users switch cleanly.
  const [currentTab, setCurrentTab] = useState<
    "dashboard" | "journal" | "calendar" | "news"
  >("dashboard");

  // Economic Calendar UI Filters
  // Day / Week filter
  const [calendarPeriodFilter, setCalendarPeriodFilter] = useState<
    "DAY" | "WEEK"
  >("WEEK");
  const [calendarImpactFilter, setCalendarImpactFilter] = useState<
    "ALL" | "HIGH" | "MEDIUM"
  >("ALL");

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

  // Robust Helpers to split/merge separate Date and Time inputs
  const getEntryDatePart = () => {
    if (!formEntryDate) return "";
    return formEntryDate.split("T")[0] || "";
  };

  const getEntryTimePart = () => {
    if (!formEntryDate) return "";
    return formEntryDate.split("T")[1] || "";
  };

  const handleEntryDateChange = (datePart: string) => {
    if (!datePart) {
      setFormEntryDate("");
      return;
    }
    const timePart = getEntryTimePart() || "12:00";
    setFormEntryDate(`${datePart}T${timePart}`);
  };

  const handleEntryTimeChange = (timePart: string) => {
    if (!timePart) {
      const datePart =
        getEntryDatePart() || new Date().toISOString().split("T")[0];
      setFormEntryDate(`${datePart}T00:00`);
      return;
    }
    const datePart =
      getEntryDatePart() || new Date().toISOString().split("T")[0];
    setFormEntryDate(`${datePart}T${timePart}`);
  };

  const getExitDatePart = () => {
    if (!formExitDate) return "";
    return formExitDate.split("T")[0] || "";
  };

  const getExitTimePart = () => {
    if (!formExitDate) return "";
    return formExitDate.split("T")[1] || "";
  };

  const handleExitDateChange = (datePart: string) => {
    if (!datePart) {
      setFormExitDate("");
      return;
    }
    const timePart = getExitTimePart() || "12:00";
    setFormExitDate(`${datePart}T${timePart}`);
  };

  const handleExitTimeChange = (timePart: string) => {
    if (!timePart) {
      const datePart =
        getExitDatePart() || new Date().toISOString().split("T")[0];
      setFormExitDate(`${datePart}T00:00`);
      return;
    }
    const datePart =
      getExitDatePart() || new Date().toISOString().split("T")[0];
    setFormExitDate(`${datePart}T${timePart}`);
  };

  // Darkmode (Google Material Design 3 dynamic light/dark mode state)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("trade_app_dark_mode") === "true";
  });

  // Progressive Web App (PWA) & Local Notification States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => {
      return localStorage.getItem("pwa_notifications_enabled") === "true";
    },
  );

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
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
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
          "Bạn sẽ nhận được cảnh báo trước 1 tiếng cho các tin đỏ tác động cao tới USD!",
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
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification(title, {
                body,
                icon: "/icon.svg",
                vibrate: [200, 100, 200],
                badge: "/icon.svg",
              } as any);
            })
            .catch(() => {
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
              "Sự kiện 'Core Retail Sales m/m' (Tác động mạnh 🔴) sẽ diễn ra sau 1 giờ! Hãy kiểm tra các vị thế của bạn.",
            );
          }, 800);
        }
      });
    } else {
      showLocalNotification(
        "🚨 Thử Nghiệm Tin Đỏ",
        "Sự kiện 'Core Retail Sales m/m' (Tác động mạnh 🔴) sẽ diễn ra sau 1 giờ! Hãy kiểm tra các vị thế của bạn.",
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
              `Sự kiện USD quan trọng đặc biệt sẽ xảy ra sau 1 tiếng (${evTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}). Hãy lưu ý rủi ro!`,
            );
            const updated = [...notifiedEvents, eventId];
            setNotifiedEvents(updated);
            localStorage.setItem(
              "pwa_notified_events",
              JSON.stringify(updated),
            );
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
      alert(
        "Tính năng cài đặt đang khả dụng trực tiếp từ trình duyệt của bạn (Tapto 'Thêm vào MH chính' hoặc nút tải xuống trên thanh URL).",
      );
    }
  };

  const handleResetLocalStorage = async () => {
    if (
      confirm(
        "Bạn có chắc chắn muốn xoá toàn bộ lịch sử giao dịch đang lưu trữ cục bộ?",
      )
    ) {
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
    // Load fast market news
    loadNewsData();
    // Default dates on form
    const now = new Date();
    setFormEntryDate(now.toISOString().slice(0, 16));
    setFormExitDate(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadNewsData(false);
    }, 2 * 60 * 1000);
    return () => window.clearInterval(intervalId);
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
    const localISO = new Date(now.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);
    setFormEntryDate(localISO);
    setFormExitDate(localISO);

    setIsAddOpen(true);
  };

  const handleBeginEditTrade = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setFormPair(trade.pair);
    setFormType(trade.type);
    setFormEntryPrice(trade.entry_price.toString());
    setFormExitPrice(
      trade.exit_price !== null ? trade.exit_price.toString() : "",
    );
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
      const localISO = new Date(eDate.getTime() - tzOffset)
        .toISOString()
        .slice(0, 16);
      setFormEntryDate(localISO);
    }

    if (trade.exit_date) {
      const exDate = new Date(trade.exit_date);
      const tzOffset = exDate.getTimezoneOffset() * 60000;
      const localISO = new Date(exDate.getTime() - tzOffset)
        .toISOString()
        .slice(0, 16);
      setFormExitDate(localISO);
    } else {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset)
        .toISOString()
        .slice(0, 16);
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
      alert(
        "Kết nối Supabase thành công! Dữ liệu đã được đồng bộ hóa và tải về.",
      );
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

  const loadNewsData = async (showLoading = true) => {
    if (showLoading) setLoadingNews(true);
    try {
      const res = await fetch("/api/news", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json && json.success) {
        setNewsItems(json.data);
        setNewsHasMore(json.hasMore ?? json.data.length > 0);
        setNewsLastUpdatedAt(json.fetchedAt || new Date().toISOString());
        setNewsDebug(json.debug || null);
      }
    } catch (e) {
      console.error("Error loading news backend:", e);
    } finally {
      if (showLoading) setLoadingNews(false);
    }
  };

  const syncNews = async () => {
    setRefreshingNews(true);
    await loadNewsData(false);
    setTimeout(() => setRefreshingNews(false), 800);
  };

  const loadOlderNews = async () => {
    if (loadingOlderNews) return;

    setLoadingOlderNews(true);
    try {
      const params = new URLSearchParams({
        history: "1",
        offset: String(newsItems.length),
        limit: "60",
      });
      const res = await fetch(`/api/news?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json && json.success) {
        setNewsItems((current) => {
          const seen = new Set(current.map((item) => item.id));
          const olderItems = (json.data || []).filter((item: NewsItem) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });

          return [...current, ...olderItems];
        });
        setNewsHasMore(Boolean(json.hasMore || (json.data || []).length > 0));
        setNewsDebug(json.debug || null);
      }
    } catch (e) {
      console.error("Error loading older news:", e);
    } finally {
      setLoadingOlderNews(false);
    }
  };

  // Handle Trade Creation
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPair || !formEntryPrice || !formSize) {
      alert(
        "Vui lòng nhập đủ thông tin: Cặp tiền, Giá vào lệnh & Khối lượng (Lots)!",
      );
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
      const difference =
        formType === "BUY"
          ? exitPriceNum - entryPriceNum
          : entryPriceNum - exitPriceNum;

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
      exit_date:
        formStatus === "CLOSED" ? new Date(formExitDate).toISOString() : null,
      notes: formNotes,
      timeframe: formTimeframe,
      rating: formRating,
      tag: formTag,
      stop_loss: slNum,
      take_profit: tpNum,
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

    const openTradesCount = trades.filter((t) => t.status === "OPEN").length;
    const closedTradesCount = trades.filter(
      (t) => t.status === "CLOSED",
    ).length;

    return {
      balance: finalBalance,
      pnl: totalPnl,
      openCount: openTradesCount,
      closedCount: closedTradesCount,
    };
  }, [trades]);

  // Filters candidates
  const uniquePairs = useMemo(() => {
    const set = new Set(trades.map((t) => t.pair));
    return ["ALL", ...Array.from(set)];
  }, [trades]);

  // Filtered trades list to display
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchSearch =
        t.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.tag && t.tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPair =
        selectedPairFilter === "ALL" || t.pair === selectedPairFilter;
      const matchStatus =
        selectedStatusFilter === "ALL" || t.status === selectedStatusFilter;
      return matchSearch && matchPair && matchStatus;
    });
  }, [trades, searchQuery, selectedPairFilter, selectedStatusFilter]);

  // Filtered Calendar Events
  const filteredEventsByFilters = useMemo(() => {
    // Use actual current date for the calendar filter
    const baseDate = new Date();

    return calendarEvents.filter((ev) => {
      const objDate = new Date(ev.date);
      const timeDiff = objDate.getTime() - baseDate.getTime();
      const diffDays = timeDiff / (1000 * 3600 * 24);

      // Period Filter
      let passPeriod = true;
      if (calendarPeriodFilter === "DAY") {
        // Must match exact same local calendar day as the baseDate (Today)
        passPeriod =
          objDate.getFullYear() === baseDate.getFullYear() &&
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

    filteredEventsByFilters.forEach((ev) => {
      const d = new Date(ev.date);
      const formattedDay = d.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
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

  // Calculate upcoming RED events (High Impact) in the next 12 hours
  const upcomingRedEvents = useMemo(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
    return calendarEvents
      .filter((ev) => {
        if (ev.impact !== "High") return false;
        const evTime = new Date(ev.date);
        return evTime > now && evTime <= future;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [calendarEvents]);

  // Format Helper for status classes
  const getImpactColorClasses = (impact: string) => {
    switch (impact) {
      case "High":
        return {
          bg: "bg-rose-500 text-white shadow-xs",
          text: "text-rose-700 dark:text-rose-400 border-2 border-rose-500 dark:border-rose-400 bg-rose-50 dark:bg-rose-950/30",
          indicator: "bg-rose-600",
          label: "Tin Đỏ",
        };
      case "Medium":
        return {
          bg: "bg-orange-500 text-white shadow-xs",
          text: "text-orange-700 dark:text-orange-400 border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-950/30",
          indicator: "bg-orange-500",
          label: "Tin Cam",
        };
      default:
        return {
          bg: "bg-yellow-400 text-yellow-950 shadow-xs",
          text: "text-yellow-700 dark:text-yellow-400 border-2 border-yellow-400 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30",
          indicator: "bg-yellow-400",
          label: "Tin Vàng",
        };
    }
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-m3-surface-container-low text-m3-on-surface" : "bg-m3-surface-container-low text-m3-on-surface"} transition-all ease-[var(--ease-m3-enter)] duration-300 font-display pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6`}
      id="app-root-theme"
    >
      {/* Main Container */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pt-5 space-y-3.5 sm:space-y-6"
        id="app-grid-frame"
      >
        {/* Red Event Alert Banner */}
        {upcomingRedEvents.length > 0 && (
          <div className="bg-rose-600 text-white p-3 sm:p-4 rounded-[20px] shadow-level2 flex flex-row items-start sm:items-center gap-3 sm:gap-4 animate-pulse-once border border-rose-500">
            <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold m3-title-medium uppercase tracking-wider flex items-center flex-wrap gap-2">
                Cảnh báo tin đỏ sắp ra mắt
                <span className="m3-label-small bg-white text-rose-600 px-2 py-0.5 rounded-full font-black">
                  CAO
                </span>
              </h4>
              <p className="m3-body-medium text-white/90 mt-1 line-clamp-2 sm:line-clamp-none">
                {upcomingRedEvents
                  .map(
                    (e) =>
                      `${e.title} (${new Date(e.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})`,
                  )
                  .join(" • ")}
              </p>
            </div>
          </div>
        )}

        {/* Google Workspace Style Tonal Top Header */}
        <header
          className={`flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 ${darkMode ? "bg-m3-surface" : "bg-m3-surface"} rounded-[24px] shadow-level1 space-y-4 md:space-y-0`}
          id="google-m3-header"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 bg-m3-primary text-m3-on-primary rounded-[16px] flex items-center justify-center shadow-level2 font-extrabold flex-shrink-0"
              id="logo-icon"
            >
              <CloudLightning size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:m3-headline-small tracking-tight text-m3-on-surface font-display truncate">
                  Quantum Trade
                </h1>
                <span className="px-2 py-0.5 m3-label-medium uppercase tracking-wider bg-m3-primary-container text-m3-primary dark:bg-m3-primary-container/30 dark:text-m3-on-primary-container rounded-md flex-shrink-0">
                  PRO
                </span>
              </div>
              <p className="m3-body-small sm:m3-body-medium text-m3-on-surface-variant mt-1 leading-snug truncate">
                Đồng bộ hóa tin vĩ mô USD & nhật ký giao dịch hiệu năng cao
              </p>
            </div>
          </div>

          <div
            className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto"
            id="balance-badge-area"
          >
            {/* Dynamic Light/Dark Switch under Material 3 */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 sm:p-3 bg-m3-surface-container-high rounded-full transition-colors ease-[var(--ease-m3-enter)] cursor-pointer"
              title="Giao diện sáng/tối"
              id="btn-darkmode"
            >
              {darkMode ? (
                <Sun size={16} className="text-amber-400" />
              ) : (
                <Moon size={16} className="text-m3-on-surface-variant" />
              )}
            </button>

            {/* Account size indicator in dynamic style */}
            <div className="text-right min-w-0">
              <span className="m3-body-small sm:m3-label-medium tracking-wider text-m3-on-surface-variant uppercase block truncate">
                Số Dư Tài Khoản
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 justify-end">
                <span
                  className="text-xl sm:text-2xl font-black text-m3-on-surface font-display truncate"
                  id="live-balance-text"
                >
                  $
                  {summary.balance.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`m3-body-small sm:m3-body-small px-2 py-1 rounded-full font-bold flex items-center gap-0.5 flex-shrink-0 ${summary.pnl >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                  id="summary-badge-pnl"
                >
                  {summary.pnl >= 0 ? "+" : ""}${summary.pnl.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Profile Settings Click */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 bg-m3-surface-container-high m3-state-layer dark:bg-m3-surface-container rounded-full flex items-center justify-center text-m3-on-surface font-bold font-mono cursor-pointer relative shadow-level1 flex-shrink-0 m3-body-medium"
              id="avatar-button"
            >
              JD
              <span className="absolute -bottom-0.5 -right-0.5 bg-m3-primary text-m3-on-primary rounded-[28px] m3-state-layer p-1 border border-white dark:border-m3-surface shadow-xs m3-body-small animate-pulse-once">
                <Settings size={12} />
              </span>
            </button>
          </div>
        </header>

        {/* Google-style Pill Navigation Tab Segment Manager */}
        <div
          className={`hidden md:flex justify-between items-center ${darkMode ? "bg-m3-surface" : "bg-m3-surface"} p-1.5 rounded-full shadow-level1 overflow-x-auto no-scrollbar`}
          id="segmented-controller"
        >
          <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] m3-label-large transition-all ease-[var(--ease-m3-enter)] duration-200 m3-state-layer flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "dashboard" ? "bg-m3-primary-container text-m3-primary dark:bg-m3-primary-container/30 dark:text-m3-primary" : "text-m3-on-surface-variant hover:text-m3-on-surface dark:hover:text-m3-on-surface dark:text-m3-on-surface-variant"}`}
            >
              <BarChart2 size={16} className="flex-shrink-0" />
              <span>Tổng quan</span>
            </button>
            <button
              onClick={() => setCurrentTab("journal")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] m3-label-large transition-all ease-[var(--ease-m3-enter)] duration-200 m3-state-layer flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "journal" ? "bg-m3-primary-container text-m3-primary dark:bg-m3-primary-container/30 dark:text-m3-primary" : "text-m3-on-surface-variant hover:text-m3-on-surface dark:hover:text-m3-on-surface dark:text-m3-on-surface-variant"}`}
            >
              <FileText size={16} className="flex-shrink-0" />
              <span>
                Nhật ký{" "}
                <span className="m3-body-small font-mono text-m3-on-surface-variant">
                  ({trades.length})
                </span>
              </span>
            </button>
            <button
              onClick={() => setCurrentTab("calendar")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] m3-label-large transition-all ease-[var(--ease-m3-enter)] duration-200 m3-state-layer flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "calendar" ? "bg-m3-primary-container text-m3-primary dark:bg-m3-primary-container/30 dark:text-m3-primary" : "text-m3-on-surface-variant hover:text-m3-on-surface dark:hover:text-m3-on-surface dark:text-m3-on-surface-variant"}`}
            >
              <CalendarIcon size={16} className="flex-shrink-0" />
              <span>Lịch kinh tế</span>
            </button>
            <button
              onClick={() => setCurrentTab("news")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] m3-label-large transition-all ease-[var(--ease-m3-enter)] duration-200 m3-state-layer flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "news" ? "bg-m3-primary-container text-m3-primary dark:bg-m3-primary-container/30 dark:text-m3-primary" : "text-m3-on-surface-variant hover:text-m3-on-surface dark:hover:text-m3-on-surface dark:text-m3-on-surface-variant"}`}
            >
              <Newspaper size={16} className="flex-shrink-0" />
              <span>Tin tức thị trường</span>
            </button>
          </div>
        </div>

        {/* 1. OVERVIEW BENTO TAB SCREEN */}
        {currentTab === "dashboard" && (
          <div className="space-y-6" id="dashboard-bento-section">
            {/* Numeric and graphs bento core statistics wrapper */}
            <Suspense
              fallback={
                <div className="min-h-[260px] rounded-[24px] bg-m3-surface shadow-level1 animate-pulse" />
              }
            >
              <BentoStats trades={trades} darkMode={darkMode} />
            </Suspense>

            {/* Mixed Bento Row: Calendar Fast-View (Large 2/3) + Recent Trade Activities (Medium 1/3) */}
            <div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              id="bento-two-columns-mixed"
            >
              {/* Calendar Feed Fast-View Card */}
              <div
                className={`lg:col-span-2 p-5 sm:p-6 ${darkMode ? "bg-m3-surface" : "bg-m3-surface"} rounded-[24px] shadow-level1 flex flex-col justify-between`}
                id="bento-calendar-fastview"
              >
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-m3-outline-variant pb-4 mb-4 gap-3 sm:gap-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-m3-primary-container dark:bg-m3-primary-container/30 text-m3-primary rounded-[16px] flex-shrink-0">
                        <CalendarIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="m3-body-large sm:m3-title-medium text-m3-on-surface leading-tight">
                          Điểm Tin Kinh Tế Nổi Bật
                        </h4>
                        <p className="m3-body-small sm:m3-body-medium text-m3-on-surface-variant mt-0.5 truncate">
                          Các sự kiện vĩ mô tác động mạnh tới USD
                        </p>
                      </div>
                    </div>

                    {/* Quick filter inside header - M3 Segmented Button */}
                    <div className="flex border border-m3-outline rounded-full w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0 h-10">
                      <button
                        onClick={() => setCalendarPeriodFilter("DAY")}
                        className={`flex-1 sm:flex-initial text-center px-5 flex items-center justify-center m3-label-large rounded-l-full border-r border-m3-outline transition-colors ease-[var(--ease-m3-enter)] cursor-pointer m3-state-layer ${
                          calendarPeriodFilter === "DAY"
                            ? "bg-m3-primary-container text-m3-on-primary-container"
                            : "bg-transparent text-m3-on-surface"
                        }`}
                      >
                        Hôm nay
                      </button>
                      <button
                        onClick={() => setCalendarPeriodFilter("WEEK")}
                        className={`flex-1 sm:flex-initial text-center px-5 flex items-center justify-center m3-label-large rounded-r-full transition-colors ease-[var(--ease-m3-enter)] cursor-pointer m3-state-layer ${
                          calendarPeriodFilter === "WEEK"
                            ? "bg-m3-primary-container text-m3-on-primary-container"
                            : "bg-transparent text-m3-on-surface"
                        }`}
                      >
                        Tuần này
                      </button>
                    </div>
                  </div>

                  <div
                    className="space-y-4 max-h-[350px] overflow-y-auto pr-1"
                    id="fastview-events-scroller"
                  >
                    {loadingCalendar ? (
                      <div className="py-12 text-center text-m3-on-surface-variant space-y-2">
                        <RefreshCw
                          className="animate-spin text-m3-primary mx-auto"
                          size={24}
                        />
                        <p className="m3-body-medium">
                          Đang nạp cập nhật lịch kinh tế thực tế...
                        </p>
                      </div>
                    ) : filteredEventsByFilters.length === 0 ? (
                      <div className="py-12 text-center text-m3-on-surface-variant">
                        <p className="m3-body-medium">
                          Không có sự kiện kinh tế USD nào tương thích bộ lọc đã chọn.
                        </p>
                        <p className="m3-body-small text-m3-on-surface-variant mt-1.5">
                          Lưu ý: Bạn có thể chọn sự kiện có tác động thấp hơn ở tab
                          Lịch Kinh Tế
                        </p>
                      </div>
                    ) : (
                      filteredEventsByFilters.slice(0, 5).map((ev, idx) => {
                        const styleInfo = getImpactColorClasses(ev.impact);
                        const eventDate = new Date(ev.date);
                        return (
                          <div
                            key={`fast-ev-${idx}`}
                            className="flex items-center justify-between p-3.5 bg-m3-surface rounded-[16px] border border-transparent hover:border-m3-outline-variant transition-colors ease-[var(--ease-m3-enter)] gap-2"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-1 h-9 rounded-full flex-shrink-0 ${styleInfo.indicator}`}
                              ></div>
                              <div className="min-w-0">
                                <h5
                                  className="m3-body-medium sm:m3-title-medium text-m3-on-surface tracking-tight truncate"
                                  title={ev.title}
                                >
                                  {ev.title}
                                </h5>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 m3-body-small text-m3-on-surface-variant">
                                  <span className="font-mono bg-m3-surface-container-high px-1.5 py-0.5 rounded text-m3-on-surface-variant font-bold">
                                    {ev.country}
                                  </span>
                                  <span>•</span>
                                  <span>DF: {ev.forecast || "N/A"}</span>
                                  <span>•</span>
                                  <span>KT: {ev.previous || "N/A"}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="m3-label-large text-m3-on-surface block font-mono">
                                {eventDate.toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <div className="mt-1">
                                <span
                                  className={`text-[10px] sm:m3-body-small px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${styleInfo.text} ${styleInfo.bg}`}
                                >
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

                <div className="mt-4 pt-4 border-t border-m3-outline-variant dark:border-m3-outline-variant flex justify-end items-center m3-body-medium">
                  <button
                    onClick={() => setCurrentTab("calendar")}
                    className="text-m3-primary hover:underline flex items-center gap-1 font-extrabold"
                  >
                    Xem lịch toàn bộ chi tiết <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Recent Trade History Widget Panel */}
              <div
                className={`p-5 sm:p-6 ${darkMode ? "bg-m3-surface" : "bg-m3-surface"} rounded-[24px] shadow-level1 flex flex-col justify-between`}
                id="bento-recent-history"
              >
                <div>
                  <div className="flex justify-between items-center mb-4 gap-2">
                    <h4 className="m3-body-large sm:text-lg font-extrabold text-m3-on-surface truncate">
                      Lệnh Gần Đây
                    </h4>
                    <span className="m3-body-small bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 rounded-full font-bold flex-shrink-0">
                      Lịch Sử
                    </span>
                  </div>

                  <div
                    className="space-y-3 max-h-[300px] overflow-y-auto"
                    id="recent-trades-list"
                  >
                    {trades.length === 0 ? (
                      <div className="text-center py-12 text-m3-on-surface-variant m3-body-medium">
                        <BookOpen
                          size={24}
                          className="mx-auto text-m3-outline-variant dark:text-m3-on-surface-variant animate-pulse mb-2"
                        />
                        Chưa có lịch sử giao dịch.
                      </div>
                    ) : (
                      trades.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 p-2.5 hover:bg-m3-surface-container-low dark:hover:bg-m3-surface-container-low/20 rounded-[16px] transition-all ease-[var(--ease-m3-enter)]"
                        >
                          <div
                            className={`w-10 h-10 rounded-[16px] flex items-center justify-center font-bold m3-body-small ${t.type === "BUY" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                          >
                            {t.type}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold m3-body-medium text-m3-on-surface">
                                {t.pair}
                              </span>
                              <span
                                className={`m3-body-medium font-black font-mono ${t.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                              >
                                {t.pnl >= 0 ? "+" : ""}${t.pnl.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center m3-body-small text-m3-on-surface-variant mt-1">
                              <span>
                                {t.size} Lots • {t.timeframe}
                              </span>
                              <span className="italic">
                                {t.status === "OPEN" ? "Đang Chạy" : "Đã Khớp"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-m3-outline-variant dark:border-m3-outline-variant">
                  <button
                    onClick={() => setCurrentTab("journal")}
                    className="w-full py-2.5 bg-m3-surface-container dark:bg-m3-surface-container-high text-m3-on-surface rounded-full m3-body-small sm:m3-label-large transition-all ease-[var(--ease-m3-enter)]"
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
          <div
            className="grid grid-cols-1 gap-6"
            id="journal-standalone-section"
          >
            <div
              className="p-4 sm:p-6 bg-m3-surface rounded-[24px] shadow-level1 max-w-full overflow-hidden"
              id="journal-master-card"
            >
              {/* Journal controls header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-m3-outline-variant dark:border-m3-outline-variant pb-3 mb-4 w-full min-w-0">
                <div className="flex-shrink-0">
                  <h3 className="m3-body-medium sm:m3-title-medium text-m3-on-surface flex items-center gap-1.5">
                    <FileText className="text-m3-primary" size={16} />
                    Lịch sử Giao dịch
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:w-auto pb-1 sm:pb-0">
                  {/* Pair filter select - M3 standard */}
                  <div className="flex items-center justify-center gap-1.5 bg-m3-surface-container dark:bg-m3-surface-container-high px-2 py-2.5 sm:px-2.5 sm:py-1.5 rounded-[16px] m3-label-medium w-full sm:w-auto">
                    <Filter size={11} className="text-m3-on-surface-variant" />
                    <select
                      value={selectedPairFilter}
                      onChange={(e) => setSelectedPairFilter(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer text-m3-on-surface font-bold w-full sm:max-w-none text-center sm:text-left truncate m3-body-small"
                    >
                      <option
                        value="ALL"
                        className="bg-m3-surface dark:bg-m3-surface-container-low text-m3-on-surface"
                      >
                        Cặp: Tất cả
                      </option>
                      {uniquePairs
                        .filter((p) => p !== "ALL")
                        .map((p) => (
                          <option
                            key={p}
                            value={p}
                            className="bg-m3-surface dark:bg-m3-surface-container-low text-m3-on-surface"
                          >
                            {p}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Status filter select - M3 standard */}
                  <div className="flex items-center justify-center gap-1.5 bg-m3-surface-container dark:bg-m3-surface-container-high px-2 py-2.5 sm:px-2.5 sm:py-1.5 rounded-[16px] m3-label-medium w-full sm:w-auto">
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer text-m3-on-surface font-bold w-full sm:max-w-none text-center sm:text-left truncate m3-body-small"
                    >
                      <option
                        value="ALL"
                        className="bg-m3-surface dark:bg-m3-surface-container-low text-m3-on-surface"
                      >
                        Tất cả lệnh
                      </option>
                      <option
                        value="OPEN"
                        className="bg-m3-surface dark:bg-m3-surface-container-low text-m3-on-surface"
                      >
                        Lệnh Mở (OPEN)
                      </option>
                      <option
                        value="CLOSED"
                        className="bg-m3-surface dark:bg-m3-surface-container-low text-m3-on-surface"
                      >
                        Đã Đóng (CLOSED)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live search input bar - M3 Workspace Style */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-m3-on-surface-variant">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  placeholder="Nhập cặp tiền hoặc phân tích để tìm kiếm nhanh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-m3-surface-container rounded-[12px] m3-body-small border border-m3-outline-variant/50 dark:border-m3-outline-variant focus:border-m3-primary focus:bg-m3-surface dark:focus:bg-m3-surface-container-low focus:outline-none focus:ring-1 focus:ring-m3-primary transition-all ease-[var(--ease-m3-enter)] font-sans"
                  id="trade-search-input"
                />
              </div>

              {/* Desktop Trades Table - Hidden on Mobile */}
              <div
                className="hidden md:block overflow-x-auto"
                id="trades-table-scroller"
              >
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-20 text-m3-on-surface-variant">
                    <BookOpen
                      size={48}
                      className="mx-auto text-m3-outline-variant dark:text-m3-on-surface-variant mb-2 animate-pulse"
                    />
                    <p className="m3-body-medium font-semibold">
                      Không tìm thấy giao dịch nào
                    </p>
                    <p className="m3-body-small text-m3-on-surface-variant mt-1">
                      Sử dụng bộ lọc khác hoặc nhập một giao dịch mới để tiếp
                      tục!
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-m3-outline-variant m3-label-medium uppercase text-m3-on-surface-variant tracking-wider">
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          Cặp / Trạng thái
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          Loại lệnh
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          Kích thước (Lots)
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          Điểm vào / Điểm ra
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          Chốt lời / Chặn lỗ
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          Ghi chú & Phân tích
                        </th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">
                          Lời / Lỗ (USD)
                        </th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-m3-outline-variant m3-body-medium">
                      {filteredTrades.map((t) => (
                        <tr
                          key={t.id}
                          className="group hover:bg-m3-surface-container-low/50 dark:hover:bg-m3-surface-container/30 transition-colors ease-[var(--ease-m3-enter)]"
                        >
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-bold m3-body-medium sm:m3-body-large text-m3-on-surface tracking-tight">
                                  {t.pair}
                                </div>
                                <div className="m3-body-small text-m3-on-surface-variant font-bold mt-1">
                                  {t.timeframe || "M15"}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] sm:m3-body-small px-2 py-0.5 rounded font-extrabold uppercase tracking-wide ${t.status === "OPEN" ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400" : "bg-m3-surface-container text-m3-on-surface-variant dark:bg-m3-surface-container-high dark:text-m3-on-surface-variant"}`}
                              >
                                {t.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-[12px] m3-body-small font-black font-mono ${t.type === "BUY" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-m3-on-surface whitespace-nowrap">
                            {t.size} Lots
                          </td>
                          <td className="py-4 px-4 font-mono m3-body-small text-m3-on-surface-variant whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>
                                Vào:{" "}
                                <strong className="text-m3-on-surface">
                                  {t.entry_price}
                                </strong>
                              </span>
                              {t.exit_price ? (
                                <span>
                                  Ra:{" "}
                                  <strong className="text-m3-on-surface">
                                    {t.exit_price}
                                  </strong>
                                </span>
                              ) : (
                                <span className="opacity-40 italic">
                                  Đang mở...
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono m3-body-small text-m3-on-surface-variant whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>
                                SL:{" "}
                                {t.stop_loss ? (
                                  <strong className="text-m3-on-surface">
                                    {t.stop_loss}
                                  </strong>
                                ) : (
                                  <span className="opacity-40">N/A</span>
                                )}
                              </span>
                              <span>
                                TP:{" "}
                                {t.take_profit ? (
                                  <strong className="text-m3-on-surface">
                                    {t.take_profit}
                                  </strong>
                                ) : (
                                  <span className="opacity-40">N/A</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 max-w-xs">
                            <div
                              className="truncate m3-body-small text-m3-on-surface-variant"
                              title={t.notes}
                            >
                              {t.notes || (
                                <span className="text-m3-on-surface-variant italic">
                                  Không có ghi chú
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2.5 items-center mt-1.5">
                              {t.tag && (
                                <span className="m3-label-medium uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded">
                                  {t.tag}
                                </span>
                              )}
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span
                                    key={i}
                                    className={`m3-body-small ${i < t.rating ? "text-amber-500" : "text-m3-outline-variant dark:text-m3-outline-variant"}`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-mono font-black m3-body-large ${t.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                            >
                              {t.pnl >= 0 ? "+" : ""}$
                              {t.pnl.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <div className="m3-body-small text-m3-on-surface-variant mt-1 font-mono">
                              {new Date(t.entry_date).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleBeginEditTrade(t)}
                                className="p-2 rounded-[16px] bg-m3-surface-container-low dark:bg-m3-surface-container text-m3-on-surface-variant hover:text-m3-primary hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all ease-[var(--ease-m3-enter)] cursor-pointer inline-flex items-center justify-center"
                                title="Chỉnh sửa / Cập nhật trạng thái"
                                id={`edit-btn-${t.id}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTrade(t.id)}
                                className="p-2 rounded-[16px] bg-m3-surface-container-low dark:bg-m3-surface-container text-m3-on-surface-variant hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all ease-[var(--ease-m3-enter)] cursor-pointer inline-flex items-center justify-center"
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
              <div
                className="block md:hidden space-y-3"
                id="trades-mobile-scroller"
              >
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-12 text-m3-on-surface-variant m3-body-small">
                    <BookOpen
                      size={36}
                      className="mx-auto text-m3-on-surface-variant mb-2 animate-pulse"
                    />
                    <p className="font-semibold">
                      Không tìm thấy giao dịch nào
                    </p>
                  </div>
                ) : (
                  filteredTrades.map((t) => (
                    <div
                      key={`mob-trade-${t.id}`}
                      className="p-4 bg-m3-surface-container-low dark:bg-m3-surface-container/45 rounded-[24px] border border-m3-outline-variant/15 dark:border-m3-outline-variant space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold m3-body-medium text-m3-on-surface">
                              {t.pair}
                            </span>
                            <span className="m3-body-small px-2 py-0.5 bg-m3-surface-container-high dark:bg-m3-surface-container-high text-m3-on-surface-variant rounded font-bold">
                              {t.timeframe || "M15"}
                            </span>
                          </div>
                          <span className="m3-body-small text-m3-on-surface-variant block mt-1 font-mono">
                            {new Date(t.entry_date).toLocaleDateString(
                              "vi-VN",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <span
                          className={`m3-body-small px-2.5 py-1 rounded-[12px] font-bold uppercase tracking-wide ${t.status === "OPEN" ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400" : "bg-m3-surface-container text-m3-on-surface-variant dark:bg-m3-surface-container-high dark:text-m3-on-surface-variant"}`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 m3-body-small border-t border-b border-m3-outline-variant/15 dark:border-m3-outline-variant py-2.5">
                        <div className="flex flex-col">
                          <span className="text-m3-on-surface-variant text-[10px] font-bold tracking-wider">
                            Số lượng Lots
                          </span>
                          <span className="font-medium mt-1 flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${t.type === "BUY" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                            >
                              {t.type}
                            </span>
                            <strong>{t.size} Lots</strong>
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-m3-on-surface-variant text-[10px] font-bold tracking-wider">
                            Giá vào / ra
                          </span>
                          <span className="font-mono text-m3-on-surface mt-1">
                            {t.entry_price} →{" "}
                            <strong className="text-m3-on-surface">
                              {t.exit_price || "Đang mở"}
                            </strong>
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-m3-on-surface-variant text-[10px] font-bold tracking-wider">
                            Chặn lỗ / Chốt lời
                          </span>
                          <span className="font-mono text-m3-on-surface-variant mt-1">
                            {t.stop_loss || "N/A"} / {t.take_profit || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-m3-on-surface-variant text-[10px] font-bold tracking-wider">
                            Lời / Lỗ ròng (USD)
                          </span>
                          <span
                            className={`font-mono font-black m3-body-medium ${t.pnl >= 0 ? "text-emerald-500" : "text-rose-500"} mt-1`}
                          >
                            {t.pnl >= 0 ? "+" : ""}${t.pnl.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {t.notes && (
                        <p className="m3-body-small text-m3-on-surface-variant italic bg-m3-surface-container/50 dark:bg-m3-surface-container/30 p-2.5 rounded-[16px] line-clamp-2">
                          {t.notes}
                        </p>
                      )}

                      <div className="flex justify-between items-center m3-body-small">
                        <div className="flex gap-2 items-center">
                          {t.tag && (
                            <span className="text-[10px] sm:m3-label-medium uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              {t.tag}
                            </span>
                          )}
                          <div className="flex gap-0.5">
                            {Array.from({ length: t.rating }).map((_, i) => (
                              <span
                                key={i}
                                className="text-amber-500 m3-body-small"
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBeginEditTrade(t)}
                            className="px-3.5 py-2 rounded-[16px] bg-m3-primary-container hover:bg-m3-primary m3-body-small text-m3-primary hover:text-m3-on-primary m3-state-layer dark:bg-m3-surface-container-high dark:hover:bg-m3-primary dark:text-m3-primary font-bold transition-all ease-[var(--ease-m3-enter)] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pencil size={12} />
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(t.id)}
                            className="px-3.5 py-2 rounded-[16px] bg-rose-500/10 hover:bg-rose-500 m3-body-small text-rose-500 hover:text-m3-on-error m3-state-layer dark:bg-rose-950/35 dark:hover:bg-rose-500 dark:text-rose-400 font-bold transition-all ease-[var(--ease-m3-enter)] flex items-center gap-1.5 cursor-pointer"
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
            <div
              className="p-4 sm:p-6 bg-m3-surface rounded-[24px] shadow-level1 max-w-full overflow-hidden"
              id="calendar-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-m3-outline-variant dark:border-m3-outline-variant pb-3 mb-4 w-full min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-m3-primary-container dark:bg-m3-primary-container/30 text-m3-primary rounded-[16px] sm:rounded-[24px] flex items-center justify-center font-bold flex-shrink-0">
                    <CalendarIcon size={18} className="sm:size-5" />
                  </div>
                  <div>
                    <h3 className="m3-body-large sm:m3-title-medium text-m3-on-surface">
                      Lịch Kinh Tế Vĩ Mô
                    </h3>
                    <p className="m3-body-small sm:m3-body-medium text-m3-on-surface-variant mt-0.5">
                      Chỉ số USD quan trọng
                    </p>
                  </div>
                </div>

                {/* Filters row - Highly responsive layout for Mobile */}
                <div className="grid grid-cols-[1.3fr_1.1fr_auto] gap-2 w-full sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:w-auto pb-1 sm:pb-0">
                  {/* Segmented Period Selection */}
                  <div
                    className={`flex ${darkMode ? "bg-m3-surface-container-lowest" : "bg-m3-surface-container"} p-1 rounded-[16px] w-full sm:w-auto`}
                  >
                    <button
                      onClick={() => setCalendarPeriodFilter("DAY")}
                      className={`flex-1 py-1.5 sm:px-4 m3-label-medium rounded-[12px] transition-all ease-[var(--ease-m3-enter)] cursor-pointer text-center ${
                        calendarPeriodFilter === "DAY"
                          ? darkMode
                            ? "bg-m3-surface-container-high text-m3-primary shadow-xs"
                            : "bg-m3-surface text-m3-primary shadow-xs"
                          : darkMode
                            ? "text-m3-on-surface-variant hover:text-m3-on-surface"
                            : "text-m3-on-surface-variant hover:text-m3-on-surface"
                      }`}
                    >
                      Hôm Nay
                    </button>
                    <button
                      onClick={() => setCalendarPeriodFilter("WEEK")}
                      className={`flex-1 py-1.5 sm:px-4 m3-label-medium rounded-[12px] transition-all ease-[var(--ease-m3-enter)] cursor-pointer text-center ${
                        calendarPeriodFilter === "WEEK"
                          ? darkMode
                            ? "bg-m3-surface-container-high text-m3-primary shadow-xs"
                            : "bg-m3-surface text-m3-primary shadow-xs"
                          : darkMode
                            ? "text-m3-on-surface-variant hover:text-m3-on-surface"
                            : "text-m3-on-surface-variant hover:text-m3-on-surface"
                      }`}
                    >
                      Tuần Này
                    </button>
                  </div>

                  {/* Beautiful Dot Markers as Interactive Filters */}
                  <div
                    className={`flex ${darkMode ? "bg-m3-surface-container-lowest" : "bg-m3-surface-container"} p-1 rounded-[16px] items-center justify-around w-full sm:w-auto sm:gap-1`}
                  >
                    <button
                      onClick={() => setCalendarImpactFilter("ALL")}
                      className={`px-3 py-1.5 rounded-[12px] flex items-center justify-center gap-1 transition-all ease-[var(--ease-m3-enter)] cursor-pointer flex-1 ${
                        calendarImpactFilter === "ALL"
                          ? darkMode
                            ? "bg-m3-surface-container-high text-m3-primary shadow-xs"
                            : "bg-m3-surface text-m3-primary shadow-xs"
                          : "opacity-40 hover:opacity-95"
                      }`}
                      title="Tất cả sự kiện kinh tế (Đỏ, Vàng, Xanh)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    </button>
                    <button
                      onClick={() => setCalendarImpactFilter("MEDIUM")}
                      className={`px-3 py-1.5 rounded-[12px] flex items-center justify-center gap-1 transition-all ease-[var(--ease-m3-enter)] cursor-pointer flex-1 ${
                        calendarImpactFilter === "MEDIUM"
                          ? darkMode
                            ? "bg-m3-surface-container-high text-m3-primary shadow-xs"
                            : "bg-m3-surface text-m3-primary shadow-xs"
                          : "opacity-40 hover:opacity-95"
                      }`}
                      title="Tin từ trung bình trở lên (Đỏ, Vàng)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    </button>
                    <button
                      onClick={() => setCalendarImpactFilter("HIGH")}
                      className={`px-3 py-1.5 rounded-[12px] flex items-center justify-center gap-1 transition-all ease-[var(--ease-m3-enter)] cursor-pointer flex-1 ${
                        calendarImpactFilter === "HIGH"
                          ? darkMode
                            ? "bg-m3-surface-container-high text-m3-primary shadow-xs"
                            : "bg-m3-surface text-m3-primary shadow-xs"
                          : "opacity-40 hover:opacity-95"
                      }`}
                      title="Chỉ sự kiện kinh tế quan trọng (Đỏ)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    </button>
                  </div>

                  {/* Manual Refresh Call inside same line */}
                  <button
                    onClick={syncCalendar}
                    className="p-2.5 bg-m3-surface-container dark:bg-m3-surface-container-lowest dark:hover:bg-m3-surface-container-high rounded-[16px] transition-all ease-[var(--ease-m3-enter)] cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
                    title="Cập nhật lịch kinh tế mới nhất"
                  >
                    <RefreshCw
                      size={14}
                      className={
                        refreshingCalendar
                          ? "animate-spin text-m3-primary"
                          : "text-m3-on-surface-variant"
                      }
                    />
                  </button>
                </div>
              </div>

              {/* Day-by-Day Calendar Render list */}
              {loadingCalendar ? (
                <div className="py-24 text-center space-y-4">
                  <RefreshCw
                    className="animate-spin text-m3-primary mx-auto"
                    size={32}
                  />
                  <p className="m3-body-medium text-m3-on-surface-variant">
                    Đang quét nguồn dữ liệu Forex Factory Live...
                  </p>
                </div>
              ) : groupedEventsByDay.length === 0 ? (
                <div className="py-20 text-center text-m3-on-surface-variant">
                  <CloudLightning
                    className="mx-auto text-m3-outline-variant dark:text-m3-on-surface-variant animate-pulse mb-3"
                    size={48}
                  />
                  <p className="font-semibold m3-body-medium">
                    Không thấy sự kiện kinh tế USD tương thích
                  </p>
                  <p className="m3-body-small text-m3-on-surface-variant mt-1">
                    Vui lòng thử điều chỉnh lại bộ lọc tác động sự kiện.
                  </p>
                </div>
              ) : (
                <div className="space-y-8" id="calendar-days-feed">
                  {groupedEventsByDay.map(([dayName, events]) => (
                    <div key={dayName} className="space-y-4">
                      <h4 className="m3-body-small sm:m3-label-large uppercase tracking-widest text-[#001d3d] dark:text-[#e0f1ff] bg-m3-primary-container dark:bg-m3-primary-container/30 px-3 py-1.5 rounded-[12px] inline-block">
                        {dayName}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map((ev, index) => {
                          const style = getImpactColorClasses(ev.impact);
                          const evTime = new Date(ev.date).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" },
                          );

                          return (
                            <div
                              key={`${dayName}-${index}`}
                              className="p-4 sm:p-5 bg-m3-surface-container-low dark:bg-[#1f2021]/60 hover:bg-m3-surface-container dark:hover:bg-[#1f2021]/90 rounded-[24px] flex flex-col justify-between hover:scale-[1.01] transition-all ease-[var(--ease-m3-enter)] duration-200"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex gap-2.5 items-start">
                                  <div
                                    className={`w-1 h-9 rounded-full mt-0.5 flex-shrink-0 ${style.indicator}`}
                                  ></div>
                                  <div>
                                    <h5 className="font-bold m3-body-medium sm:m3-body-large tracking-tight text-m3-on-surface leading-tight">
                                      {ev.title}
                                    </h5>
                                    <span className="m3-body-small text-m3-on-surface-variant uppercase font-mono tracking-wider">
                                      {ev.country} • {timezoneOffsetStr}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <span className="m3-body-small sm:m3-label-large text-m3-on-surface-variant flex items-center gap-1 justify-end font-mono">
                                    <Clock
                                      size={12}
                                      className="text-m3-on-surface-variant"
                                    />
                                    {evTime}
                                  </span>
                                  <div className="mt-1">
                                    <span
                                      className={`text-[10px] sm:m3-label-medium rounded px-2 py-0.5 uppercase tracking-wider inline-block ${style.text} ${style.bg}`}
                                    >
                                      {style.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Forecast vs Previous display block */}
                              <div className="mt-4 pt-3 border-t border-m3-outline-variant/20 dark:border-m3-outline-variant grid grid-cols-3 gap-2 text-center m3-body-small sm:m3-body-medium">
                                <div className="bg-m3-surface p-2 rounded-[16px]">
                                  <div className="text-[10px] sm:m3-body-small uppercase font-extrabold text-m3-on-surface-variant">
                                    Dự báo
                                  </div>
                                  <div className="font-mono font-bold text-m3-on-surface mt-1 m3-body-small sm:m3-body-medium truncate">
                                    {ev.forecast || "-"}
                                  </div>
                                </div>
                                <div className="bg-m3-surface p-2 rounded-[16px]">
                                  <div className="text-[10px] sm:m3-body-small uppercase font-extrabold text-m3-on-surface-variant">
                                    Kỳ trước
                                  </div>
                                  <div className="font-mono font-bold text-m3-on-surface mt-1 m3-body-small sm:m3-body-medium truncate">
                                    {ev.previous || "-"}
                                  </div>
                                </div>
                                <div className="bg-[#f0f9ff] dark:bg-indigo-950/20 p-2 rounded-[16px]">
                                  <div className="text-[10px] sm:m3-body-small uppercase font-extrabold text-sky-600 dark:text-sky-400">
                                    Thực tế
                                  </div>
                                  <div className="font-mono font-bold text-sky-600 dark:text-sky-300 mt-1 m3-body-small sm:m3-body-medium truncate">
                                    {ev.actual || (
                                      <span className="italic font-normal m3-body-small text-m3-on-surface-variant">
                                        Đợi tin
                                      </span>
                                    )}
                                  </div>
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

        {/* 4. FAST RSS NEWS TAB SCREEN */}
        {currentTab === "news" && (
          <NewsPanel
            newsItems={newsItems}
            loading={loadingNews}
            refreshing={refreshingNews}
            onRefresh={syncNews}
            onLoadOlder={loadOlderNews}
            loadingOlder={loadingOlderNews}
            hasMore={newsHasMore}
            darkMode={darkMode}
            lastUpdatedAt={newsLastUpdatedAt}
            debug={newsDebug}
          />
        )}
      </div>

      {/* 5. GORGEOUS ADD TRADE PANEL DIRECTIVE MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            id="modal-container-root"
          >
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
              className="relative w-full max-w-[100vw] sm:max-w-2xl bg-m3-surface sm:rounded-[28px] rounded-t-[28px] shadow-level5 z-10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-x-hidden overflow-y-hidden"
              id="new-trade-modal-window"
            >
              <div className="flex justify-between items-center px-5 sm:px-8 py-4 sm:py-6 border-b border-m3-outline-variant bg-m3-surface z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex p-3 bg-m3-primary-container text-m3-primary dark:bg-m3-primary-container/30 dark:text-m3-primary rounded-[16px]">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="m3-title-medium text-m3-on-surface font-display">
                      {editingTradeId
                        ? "Cập Nhật Giao Dịch"
                        : "Ghi Chép Giao Dịch Mới"}
                    </h3>
                    <p className="m3-body-small text-m3-on-surface-variant mt-0.5">
                      {editingTradeId
                        ? "Cập nhật các số liệu, ghi chú hoặc tất toán giao dịch"
                        : "Ghi nhận chi tiết để theo dõi biểu đồ tăng trưởng"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="p-2 sm:p-1.5 hover:bg-m3-surface-container dark:hover:bg-white/5 rounded-full transition-colors ease-[var(--ease-m3-enter)] text-m3-on-surface-variant hover:text-m3-on-surface dark:hover:text-m3-on-surface cursor-pointer"
                  title="Đóng"
                >
                  <X size={24} className="sm:w-[20px] sm:h-[20px]" />
                </button>
              </div>

              <form
                onSubmit={handleCreateTrade}
                className="flex flex-col flex-1 min-h-0 min-w-0"
                id="trade-form"
              >
                <div className="overflow-y-auto flex-1 px-4 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-7">
                  {/* BUY SELL TOGGLE & Pairs Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Cặp ngoại tệ
                      </label>
                      <select
                        value={formPair}
                        onChange={(e) => setFormPair(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-bold cursor-pointer"
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
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Hướng lệnh
                      </label>
                      <div className="flex border border-m3-outline rounded-full w-full h-12 overflow-hidden m3-label-large">
                        <button
                          type="button"
                          onClick={() => setFormType("BUY")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[var(--ease-m3-enter)] cursor-pointer m3-state-layer border-r border-m3-outline ${formType === "BUY" ? "bg-emerald-600 text-m3-on-primary" : "bg-transparent text-m3-on-surface"}`}
                        >
                          MUA
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormType("SELL")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[var(--ease-m3-enter)] cursor-pointer m3-state-layer ${formType === "SELL" ? "bg-rose-600 text-m3-on-primary" : "bg-transparent text-m3-on-surface"}`}
                        >
                          BÁN
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Entry Price & Lots Size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Giá vào lệnh *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="VD: 1.0854"
                        value={formEntryPrice}
                        onChange={(e) => setFormEntryPrice(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-mono"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Khối lượng (Lots) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.01"
                        value={formSize}
                        onChange={(e) => setFormSize(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* SL, TP Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Chặn lỗ
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Tùy chọn - SL"
                        value={formStopLoss}
                        onChange={(e) => setFormStopLoss(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-mono"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Chốt lời
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Tùy chọn - TP"
                        value={formTakeProfit}
                        onChange={(e) => setFormTakeProfit(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-mono"
                      />
                    </div>
                  </div>

                  {/* Status Switch Open / Closed & Timeframe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Trạng thái giao dịch
                      </label>
                      <div className="flex border border-m3-outline rounded-full w-full h-12 overflow-hidden m3-label-large text-sm sm:text-base">
                        <button
                          type="button"
                          onClick={() => setFormStatus("CLOSED")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[var(--ease-m3-enter)] cursor-pointer m3-state-layer border-r border-m3-outline min-w-0 px-2 ${formStatus === "CLOSED" ? "bg-indigo-600 text-m3-on-primary" : "bg-transparent text-m3-on-surface"}`}
                        >
                          <span className="truncate">ĐÃ ĐÓNG</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormStatus("OPEN")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[var(--ease-m3-enter)] cursor-pointer m3-state-layer min-w-0 px-2 ${formStatus === "OPEN" ? "bg-cyan-600 text-m3-on-primary" : "bg-transparent text-m3-on-surface"}`}
                        >
                          <span className="truncate">ĐANG MỞ</span>
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Khung thời gian
                      </label>
                      <select
                        value={formTimeframe}
                        onChange={(e) => setFormTimeframe(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-bold cursor-pointer"
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
                    <div className="p-3 sm:p-5 rounded-[16px] sm:rounded-[20px] bg-m3-surface-container-lowest border border-m3-outline-variant grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                      <div className="min-w-0">
                        <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                          Giá đóng lệnh
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="VD: 1.0920"
                          value={formExitPrice}
                          onChange={(e) => setFormExitPrice(e.target.value)}
                          className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-mono"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                          Ngày đóng lệnh
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <M3DatePicker
                            value={getExitDatePart()}
                            onChange={handleExitDateChange}
                            placeholder="Chọn ngày đóng"
                          />
                          <M3TimePicker
                            value={getExitTimePart()}
                            onChange={handleExitTimeChange}
                            placeholder="Chọn giờ đóng"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Entry Date & Tags Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Ngày vào lệnh
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <M3DatePicker
                          value={getEntryDatePart()}
                          onChange={handleEntryDateChange}
                          placeholder="Chọn ngày vào"
                        />
                        <M3TimePicker
                          value={getEntryTimePart()}
                          onChange={handleEntryTimeChange}
                          placeholder="Chọn giờ vào"
                        />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                        Chiến lược
                      </label>
                      <select
                        value={formTag}
                        onChange={(e) => setFormTag(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] font-bold cursor-pointer"
                      >
                        <option value="News-Trade">
                          Giao dịch theo tin tức
                        </option>
                        <option value="Trend-Follow">Đu theo xu hướng</option>
                        <option value="Breakout">Bứt phá</option>
                        <option value="Range-Trade">Giao dịch Vùng</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes Input */}
                  <div>
                    <label className="m3-label-medium text-m3-on-surface-variant mb-1.5 block">
                      Lý do vào lệnh
                    </label>
                    <textarea
                      rows={2.5}
                      placeholder="Tại sao bạn khớp lệnh này? Khung cảm xúc, phân tích kỹ thuật hoặc nhận định tin tức của bạn..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)] resize-none"
                    ></textarea>
                  </div>

                  {/* Rating selection (Stars) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-m3-surface-container-low/50 dark:bg-m3-surface-container-lowest/30 rounded-[16px] border border-m3-outline-variant dark:border-m3-outline-variant">
                    <div>
                      <span className="font-bold text-m3-on-surface m3-body-small block">
                        Mức Độ Tuân Thủ Kỷ Luật
                      </span>
                      <span className="m3-body-small text-m3-on-surface-variant mt-1 block">
                        Bạn có làm đúng kế hoạch giao dịch ban đầu không?
                      </span>
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
                            <span
                              className={
                                i < formRating
                                  ? "text-amber-400 drop-shadow-xs font-bold"
                                  : "text-m3-outline-variant dark:text-m3-outline-variant hover:text-m3-on-surface-variant"
                              }
                            >
                              ★
                            </span>
                          </button>
                        ))}
                      </div>
                      <span className="m3-body-small text-m3-on-surface-variant font-bold font-mono min-w-[45px]">
                        ({formRating}/5 sao)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save controls */}
                <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-m3-outline-variant bg-m3-surface flex flex-col-reverse sm:flex-row gap-3 justify-end items-center z-20 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,16px))] sm:pb-5">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-m3-outline text-m3-primary rounded-[20px] m3-label-large m3-state-layer cursor-pointer transition-colors ease-[var(--ease-m3-enter)] text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-2.5 bg-m3-primary text-m3-on-primary rounded-[20px] m3-label-large m3-state-layer active:scale-[0.98] transition-all ease-[var(--ease-m3-enter)] cursor-pointer text-center"
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
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            id="settings-modal-root"
          >
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
              className="relative w-full max-w-md bg-m3-surface p-5 sm:p-6 rounded-t-3xl sm:rounded-[24px] shadow-level5 z-10 m3-body-small pb-[calc(1.5rem+env(safe-area-inset-bottom,16px))] sm:pb-6"
              id="settings-modal-window"
            >
              {/* Material Design 3 Bottom Sheet handle wrapper */}
              <div className="w-10 h-1 bg-m3-outline-variant rounded-full mx-auto mb-4 block sm:hidden"></div>

              <div className="flex justify-between items-center pb-4 mb-4 border-b border-m3-outline-variant dark:border-m3-outline-variant">
                <h4 className="m3-body-medium sm:m3-title-medium text-m3-on-surface font-display">
                  Cài Đặt Hệ Thống
                </h4>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 rounded-full bg-m3-surface-container-high m3-state-layer dark:bg-m3-surface-container text-m3-on-surface-variant cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <h5 className="font-bold text-m3-on-surface-variant capitalize mb-2">
                    Chủ Đề Giao Diện
                  </h5>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDarkMode(false)}
                      className={`flex-1 py-1.5 sm:py-2 rounded-full font-bold flex items-center justify-center gap-2 border m3-body-small transition-all ease-[var(--ease-m3-enter)] ${!darkMode ? "bg-m3-surface border-m3-primary text-m3-primary shadow-xs" : "bg-m3-surface-container-low border-m3-outline-variant text-m3-on-surface-variant dark:bg-m3-surface-container dark:border-m3-outline-variant dark:text-m3-on-surface-variant"}`}
                    >
                      ☀ Sáng (Material Lite)
                    </button>
                    <button
                      onClick={() => setDarkMode(true)}
                      className={`flex-1 py-1.5 sm:py-2 rounded-full font-bold flex items-center justify-center gap-2 border m3-body-small transition-all ease-[var(--ease-m3-enter)] ${darkMode ? "bg-m3-surface-container-low border-m3-primary text-m3-primary shadow-xs" : "bg-m3-surface-container-low border-m3-outline-variant text-m3-on-surface-variant dark:bg-m3-surface-container dark:border-m3-outline-variant dark:text-m3-on-surface-variant"}`}
                    >
                      ☽ Tối (Material Dark)
                    </button>
                  </div>
                </div>

                <div className="border-t border-m3-outline-variant dark:border-m3-outline-variant pt-4">
                  <h5 className="font-bold text-m3-on-surface-variant capitalize mb-2.5 flex items-center gap-1.5">
                    <BellRing size={13} className="text-m3-primary" />
                    Thông Báo Đẩy PWA
                  </h5>
                  <div className="flex items-center justify-between p-3 bg-m3-surface-container rounded-[16px] border border-transparent">
                    <div>
                      <p className="font-semibold text-m3-on-surface">
                        Cảnh báo sự kiện vĩ mô
                      </p>
                      <p className="m3-body-small text-m3-on-surface-variant mt-1 dark:text-m3-on-surface-variant">
                        Báo trước 1 giờ khi có tin đỏ (USD High Impact)
                      </p>
                    </div>
                    <button
                      onClick={toggleNotifications}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ease-[var(--ease-m3-enter)] duration-200 ease-in-out focus:outline-none ${
                        notificationsEnabled
                          ? "bg-m3-primary"
                          : "bg-m3-outline-variant"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-m3-surface shadow-xs ring-0 transition duration-200 ease-in-out ${
                          notificationsEnabled
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {deferredPrompt && (
                  <div className="border-t border-m3-outline-variant dark:border-m3-outline-variant pt-4">
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleInstallAppPWA();
                      }}
                      className="w-full py-2.5 bg-m3-primary text-m3-on-primary font-bold rounded-[20px] m3-state-layer flex items-center justify-center gap-1.5 shadow"
                    >
                      <Download size={14} />
                      Cài đặt Ứng dụng PWA
                    </button>
                  </div>
                )}

                <div className="border-t border-m3-outline-variant dark:border-m3-outline-variant pt-4">
                  <button
                    onClick={handleResetLocalStorage}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded-[16px] border border-rose-100/50 dark:border-rose-950/30 transition-colors ease-[var(--ease-m3-enter)] cursor-pointer m3-body-small"
                  >
                    Xoá Toàn Bộ Nhật Ký Cũ (Local)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Floating Action Button (FAB) for Mobile & Desktop - M3 Centered Grid Align */}
      <div className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] md:bottom-8 left-0 right-0 pointer-events-none z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
          <button
            onClick={handleOpenAddTrade}
            className="pointer-events-auto h-14 w-14 md:w-auto md:px-6 bg-m3-primary text-m3-on-primary rounded-[16px] flex items-center justify-center gap-2 shadow-level3 m3-state-layer transition-all ease-[var(--ease-m3-enter)] cursor-pointer"
            title="Thêm Giao Dịch"
            id="m3-fab"
          >
            <Plus size={26} className="flex-shrink-0" />
            <span className="hidden md:block m3-label-large">
              Thêm giao dịch
            </span>
          </button>
        </div>
      </div>

      {/* Material 3 Bottom Navigation bar for mobile / bottom control menu */}
      <footer
        className={`md:hidden fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom,0px)] h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] border-t ${darkMode ? "bg-m3-surface-container/95 border-m3-outline-variant" : "bg-m3-surface/95 border-m3-outline-variant"} backdrop-blur-xl flex items-center justify-around px-2 z-40 transition-colors ease-[var(--ease-m3-enter)]`}
        id="m3-bottom-nav"
      >
        <button
          onClick={() => setCurrentTab("dashboard")}
          className={`flex flex-col items-center gap-1.5 justify-center flex-1 py-1.5 ${currentTab === "dashboard" ? "text-m3-primary" : "text-m3-on-surface-variant"}`}
        >
          <div
            className={`px-5 py-1.5 rounded-full ${currentTab === "dashboard" ? "bg-m3-primary-container dark:bg-m3-primary-container/30 text-m3-primary dark:text-m3-primary" : ""}`}
          >
            <BarChart2 size={20} />
          </div>
          <span className="m3-label-medium tracking-wide">Tổng quan</span>
        </button>

        <button
          onClick={() => setCurrentTab("journal")}
          className={`flex flex-col items-center gap-1.5 justify-center flex-1 py-1.5 ${currentTab === "journal" ? "text-m3-primary" : "text-m3-on-surface-variant"}`}
        >
          <div
            className={`px-5 py-1.5 rounded-full ${currentTab === "journal" ? "bg-m3-primary-container dark:bg-m3-primary-container/30 text-m3-primary dark:text-m3-primary" : ""}`}
          >
            <FileText size={20} />
          </div>
          <span className="m3-label-medium tracking-wide">Nhật ký</span>
        </button>

        <button
          onClick={() => setCurrentTab("calendar")}
          className={`flex flex-col items-center gap-1.5 justify-center flex-1 py-1.5 ${currentTab === "calendar" ? "text-m3-primary" : "text-m3-on-surface-variant"}`}
        >
          <div
            className={`px-5 py-1.5 rounded-full ${currentTab === "calendar" ? "bg-m3-primary-container dark:bg-m3-primary-container/30 text-m3-primary dark:text-m3-primary" : ""}`}
          >
            <CalendarIcon size={20} />
          </div>
          <span className="m3-label-medium tracking-wide">Kinh tế</span>
        </button>

        <button
          onClick={() => setCurrentTab("news")}
          className={`flex flex-col items-center gap-1.5 justify-center flex-1 py-1.5 ${currentTab === "news" ? "text-m3-primary" : "text-m3-on-surface-variant"}`}
        >
          <div
            className={`px-5 py-1.5 rounded-full ${currentTab === "news" ? "bg-m3-primary-container dark:bg-m3-primary-container/30 text-m3-primary dark:text-m3-primary" : ""}`}
          >
            <Newspaper size={20} />
          </div>
          <span className="m3-label-medium tracking-wide">Tin tức</span>
        </button>
      </footer>
    </div>
  );
}
