import React, { Suspense, lazy, useState, useEffect, useMemo } from "react";
import {
  Plus,
  Settings,
  TrendingUp,
  Calendar as CalendarIcon,
  FileText,
  BarChart2,
  X,
  CloudLightning,
  RefreshCw,
  Sun,
  Moon,
  Download,
  BellRing,
  AlertTriangle,
  Newspaper,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trade,
  CalendarEvent,
  NewsItem,
  NewsDebugInfo,
  T5AccountOverview,
  T5Trade,
  T5Purchase,
} from "./types";
import {
  fetchTradesFromDB,
  saveTradeToDB,
  deleteTradeFromDB,
  getSavedSupabaseKeys,
} from "./lib/supabase";
import { IOSDatePicker, IOSTimePicker } from "./components/IOSDatePicker";
import { NewsPanel } from "./components/NewsPanel";
import { fetchT5Accounts, fetchT5AccountDetail, fetchT5Purchases } from "./lib/supabase-the5ers";
import { LoginScreen } from "./LoginScreen";

const NEWS_PAGE_SIZE = 10;

const BentoStats = lazy(() =>
  import("./components/BentoStats").then((module) => ({
    default: module.BentoStats,
  })),
);
const DashboardView = lazy(() =>
  import("./components/DashboardView").then((module) => ({
    default: module.DashboardView,
  })),
);
const CalendarView = lazy(() =>
  import("./components/CalendarView").then((module) => ({
    default: module.CalendarView,
  })),
);
const JournalView = lazy(() =>
  import("./components/JournalView").then((module) => ({
    default: module.JournalView,
  })),
);
const AddTradeModalComponent = lazy(() =>
  import("./components/AddTradeModal").then((module) => ({
    default: module.AddTradeModal,
  })),
);
const IOSTabBar = lazy(() =>
  import("./components/IOSTabBar").then((module) => ({
    default: module.IOSTabBar,
  })),
);

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const res = await originalFetch(...args);
  if (res.status === 401 && typeof args[0] === 'string' && args[0].startsWith('/api/') && localStorage.getItem('trade_app_auth_token')) {
    localStorage.removeItem('trade_app_auth_token');
    window.location.reload();
  }
  return res;
};




export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("trade_app_auth_token"));
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("trade_app_auth_token") || "");

  // App core state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);
  const [loadingOlderNews, setLoadingOlderNews] = useState(false);
  const [newsPage, setNewsPage] = useState(0);
  const [newsHasMore, setNewsHasMore] = useState(true);
  const [newsLastUpdatedAt, setNewsLastUpdatedAt] = useState<string | null>(
    null,
  );
  const [newsDebug, setNewsDebug] = useState<NewsDebugInfo | null>(null);

  // UI Panels
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPairFilter, setSelectedPairFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [selectedJournalAccountId, setSelectedJournalAccountId] = useState("ALL");

  // Edit & Supabase Database Configuration states
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [dbUrl, setDbUrl] = useState(
    () => localStorage.getItem("trade_app_supabase_url") || "",
  );
  const [dbAnon, setDbAnon] = useState(
    () => localStorage.getItem("trade_app_supabase_anon") || "",
  );
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [sitePassword, setSitePassword] = useState("");

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
  const [formTVSnapshotUrl, setFormTVSnapshotUrl] = useState("");
  const [formTVSnapshotUrlClose, setFormTVSnapshotUrlClose] = useState("");
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [isCapturingSnapshotClose, setIsCapturingSnapshotClose] = useState(false);
  const [formPnl, setFormPnl] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ─── The5ers State ────────────────────────────────────────────────────────────
  const [t5Accounts, setT5Accounts] = useState<T5AccountOverview[]>([]);
  const [t5Trades, setT5Trades] = useState(Array<T5Trade>());
  const [t5Purchases, setT5Purchases] = useState(Array<T5Purchase>());
  const [t5Loading, setT5Loading] = useState(true);
  const [t5Error, setT5Error] = useState<string | null>(null);
  const [selectedT5AccountIds, setSelectedT5AccountIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("t5_selected_accounts") || "null");
      if (saved && Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });

  // ─── The5ers (GH Actions scraper) ──────────────────────────────────────────
  const [t5Email, setT5Email] = useState(() => localStorage.getItem("t5_email") || "");
  const [t5DsrToken, setT5DsrToken] = useState(() => localStorage.getItem("t5_dsr_token") || localStorage.getItem("t5_password") || "");
  const [t5Saving, setT5Saving] = useState(false);
  const [t5Syncing, setT5Syncing] = useState(false);
  const [t5SaveResult, setT5SaveResult] = useState<string | null>(null);

  // ─── TradingView Auth Config ──────────────────────────────────────────────
  const [tvSessionId, setTvSessionId] = useState(() => localStorage.getItem("tv_session_id") || "");
  const [tvSessionSign, setTvSessionSign] = useState(() => localStorage.getItem("tv_session_sign") || "");
  const [browserlessToken, setBrowserlessToken] = useState(() => localStorage.getItem("browserless_token") || "");
  const [tvSaving, setTvSaving] = useState(false);
  const [tvSaveResult, setTvSaveResult] = useState<string | null>(null);

  // ─── Toast System ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<{id: number; message: string; type: 'success' | 'error' | 'info'}[]>([]);
  let toastId = 0;
  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = ++toastId;
    setToasts(prev => [...prev, {id, message, type}]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function saveTVCreds() {
    if (!tvSessionId || !tvSessionSign || !browserlessToken) { setTvSaveResult("Vui lòng nhập đủ các trường"); return; }
    setTvSaving(true);
    setTvSaveResult(null);
    try {
      const res = await fetch("/api/save-tv-creds", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}`
        },
        body: JSON.stringify({ sessionId: tvSessionId, sessionSign: tvSessionSign, browserlessToken }),
      });
      const json = await res.json();
      setTvSaveResult(json.success ? `✅ ${json.message}` : `❌ ${json.message}`);
    } catch (e: any) {
      setTvSaveResult(`❌ ${e.message}`);
    } finally {
      setTvSaving(false);
    }
  }

  async function saveT5Creds() {
    const email = localStorage.getItem("t5_email");
    const dsrToken = localStorage.getItem("t5_dsr_token") || localStorage.getItem("t5_password");
    if (!email || !dsrToken) { setT5SaveResult("Nhập email + DSR token"); return; }
    setT5Saving(true);
    setT5SaveResult(null);
    try {
      const res = await fetch("/api/save-t5-creds", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}`
        },
        body: JSON.stringify({ email, dsrToken }),
      });
      const json = await res.json();
      setT5SaveResult(json.success ? `✅ ${json.message}` : `❌ ${json.message}`);
    } catch (e: any) {
      setT5SaveResult(`❌ ${e.message}`);
    } finally {
      setT5Saving(false);
    }
  }

  async function syncT5Now() {
    const email = localStorage.getItem("t5_email");
    const dsrToken = localStorage.getItem("t5_dsr_token") || localStorage.getItem("t5_password");
    if (!email || !dsrToken) { setT5SaveResult("Nhập email + DSR token trước!"); return; }
    setT5Syncing(true);
    setT5SaveResult("Đang cào dữ liệu The5ers (mất 5-10 giây)...");
    try {
      const res = await fetch("/api/the5ers/sync", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}`
        },
        body: JSON.stringify({ email, dsrToken }),
      });
      const json = await res.json();
      setT5SaveResult(json.success ? `✅ Cào xong: ${json.message}` : `❌ Lỗi: ${json.message}`);
      if (json.success) {
        await loadT5Data();
      }
    } catch (e: any) {
      setT5SaveResult(`❌ Lỗi kết nối: ${e.message}`);
    } finally {
      setT5Syncing(false);
    }
  }

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
      showToast("Trình duyệt này không hỗ trợ hiển thị thông báo.", "error");
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
        notifySW();
        return true;
      } else {
        setNotificationsEnabled(false);
        localStorage.setItem("pwa_notifications_enabled", "false");
        notifySW();
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
      notifySW();
    } else {
      await requestNotificationPermission();
    }
  };

  // Tell service worker about notification state
  function notifySW() {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_NOTIFICATION_STATE",
        enabled: localStorage.getItem("pwa_notifications_enabled") === "true",
        notifiedIds: notifiedEvents,
      });
    }
  }

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
      showToast(
        "Tính năng cài đặt khả dụng từ trình duyệt. Thêm vào màn hình chính để dùng offline.",
        "info"
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
  // ─── The5ers Data Loading ──────────────────────────────────────────────────────

  
  const loadT5CredsFromServer = async () => {
    try {
      const res = await fetch("/api/get-t5-creds", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}` }
      });
      const json = await res.json();
      if (json.success) {
        if (json.email && !t5Email) {
          setT5Email(json.email);
          localStorage.setItem("trade_app_t5_email", json.email);
        }
        if (json.dsrToken && !t5DsrToken) {
          setT5DsrToken(json.dsrToken);
          localStorage.setItem("t5_dsr_token", json.dsrToken);
        }
      }
    } catch (e) {}
  };

  const loadTVCredsFromServer = async () => {
    try {
      const res = await fetch("/api/get-tv-creds", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}` }
      });
      const json = await res.json();
      if (json.success) {
        if (json.sessionId && !tvSessionId) {
          setTvSessionId(json.sessionId);
          localStorage.setItem("tv_session_id", json.sessionId);
        }
        if (json.sessionSign && !tvSessionSign) {
          setTvSessionSign(json.sessionSign);
          localStorage.setItem("tv_session_sign", json.sessionSign);
        }
        if (json.browserlessToken && !browserlessToken) {
          setBrowserlessToken(json.browserlessToken);
          localStorage.setItem("browserless_token", json.browserlessToken);
        }
      }
    } catch (e) {}
  };

  async function loadT5Data() {
    setT5Loading(true);
    setT5Error(null);
    try {
      // Step 1: Load accounts list (lightweight) + purchases
      const [accounts, purchases] = await Promise.all([
        fetchT5Accounts(),
        fetchT5Purchases(),
      ]);
      setT5Accounts(accounts);
      setT5Purchases(purchases);

      // Step 2: Load trades for available accounts first, skip disabled
      const activeIds = accounts
        .filter(a => a.status === "active" || a.status === "available")
        .map(a => a.accountId);
      const selectedIds = new Set(selectedT5AccountIds.length > 0
        ? selectedT5AccountIds
        : activeIds);

      const allTrades: T5Trade[] = [];
      for (const acc of accounts) {
        const isActive = acc.status === "active" || acc.status === "available";
        const isSelected = selectedIds.has(acc.accountId);
        // Load active + already selected. Skip disabled not-yet-selected.
        if (!isActive && !isSelected) continue;
        const { trades } = await fetchT5AccountDetail(acc.accountId);
        allTrades.push(...trades);
      }
      setT5Trades(allTrades);

      // Auto-select available accounts if nothing selected yet
      if (selectedT5AccountIds.length === 0 && activeIds.length > 0) {
        setSelectedT5AccountIds(activeIds);
        localStorage.setItem("t5_selected_accounts", JSON.stringify(activeIds));
      }
    } catch (err: any) {
      setT5Error(err.message || "Lỗi tải dữ liệu The5ers");
    } finally {
      setT5Loading(false);
    }
  }

  // Load trades for a single account (called when user selects a disabled account)
  async function loadT5AccountTrades(accountId: string) {
    if (t5Trades.some(t => t.accountId === accountId)) return; // already loaded
    const { trades } = await fetchT5AccountDetail(accountId);
    setT5Trades(prev => [...prev, ...trades]);
  }

  // Map T5 trade to manual Trade format for unified display
  const t5MappedTrades = useMemo(() => {
    const activeIds = new Set(selectedT5AccountIds);
    return t5Trades
      .filter(t => t && t.accountId && (!selectedT5AccountIds.length || activeIds.has(t.accountId)))
      .map(t => ({
        id: `t5-${t.tradeId}`,
        pair: (t.instrument || "Unknown").replace(/(.{3})/, "$1/"),
        type: t.direction === "buy" ? "BUY" as const : "SELL" as const,
        entry_price: t.openPrice,
        exit_price: t.closePrice,
        size: t.volume,
        pnl: t.pnl || 0,
        status: (t.closeTime ? "CLOSED" : "OPEN") as "CLOSED" | "OPEN",
        entry_date: t.openTime || new Date().toISOString(),
        exit_date: t.closeTime,
        notes: `The5ers - ${t.accountId}`,
        timeframe: "N/A",
        rating: 0,
        tag: "The5ers",
        tv_snapshot_url: null,
        tv_snapshot_url_close: null,
      }));
  }, [t5Trades, selectedT5AccountIds]);

  // Merged trades for display: manual + The5ers
  const mergedTrades = useMemo(() => {
    // 1. Map manual trades by ID for quick lookup
    const manualTradesMap = new Map<string, Trade>();
    trades.forEach((t) => manualTradesMap.set(t.id, t));

    // 2. Process T5 trades: if the user added notes/images, merge them into the Live T5 data
    const enrichedT5Trades = t5MappedTrades.map((t5) => {
      const manual = manualTradesMap.get(t5.id);
      if (manual) {
        // If the scraper says the trade is closed, but the manual version is still open, 
        // the scraper has fresh exit data. Update the manual version with the scraper's exit data.
        if (t5.status === "CLOSED" && manual.status === "OPEN") {
          return {
            ...manual,
            status: "CLOSED",
            exit_price: t5.exit_price,
            exit_date: t5.exit_date,
            pnl: t5.pnl,
          };
        }
        // Otherwise, use the user's manual edit (which contains their snapshot URL and notes)
        return manual;
      }
      return t5;
    });

    // 3. Collect pure manual trades (ones that are NOT from T5)
    const t5Ids = new Set(t5MappedTrades.map(t => t.id));
    const pureManualTrades = trades.filter((t) => !t5Ids.has(t.id));

    // Combine and sort by entry date descending
    return [...enrichedT5Trades, ...pureManualTrades].sort(
      (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime(),
    );
  }, [trades, t5MappedTrades]);

  const accountById = useMemo(() => {
    return new Map(t5Accounts.map((account) => [account.accountId, account]));
  }, [t5Accounts]);

  const getTradeAccountId = (trade: Trade) => {
    if (!trade.id.startsWith("t5-")) return "MANUAL";
    const match = trade.notes?.match(/The5ers\s*-\s*(.+)$/);
    return match?.[1] || "UNKNOWN";
  };

  const journalAccountOptions = useMemo(() => {
    return [
      { accountId: "ALL", name: "Tất cả tài khoản" },
      ...t5Accounts.map((account) => ({
        accountId: account.accountId,
        name: account.name || account.accountId,
      })),
      { accountId: "MANUAL", name: "Lệnh thủ công" },
    ];
  }, [t5Accounts]);

  const selectedJournalAccount = selectedJournalAccountId === "ALL"
    ? null
    : accountById.get(selectedJournalAccountId);

  // Initialize data and db keys
  useEffect(() => {
    if (!isLoggedIn) return;
    // Load trades
    loadTradesData();
    // Load calendar
    loadCalendarData();
    // Load fast market news
    loadNewsData();
    // Load The5ers data
      loadT5CredsFromServer().then(() => loadT5Data());
    // Load TradingView Auth Cookies
      loadTVCredsFromServer();
    // Default dates on form
    const now = new Date();
    setFormEntryDate(now.toISOString().slice(0, 16));
    setFormExitDate(now.toISOString().slice(0, 16));

    // Sync notification state to SW on mount
    setTimeout(notifySW, 1500);
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", (ev) => {
        if (ev.data?.type === "NOTIFIED_EVENTS_STATE" && Array.isArray(ev.data.notifiedIds)) {
          setNotifiedEvents(ev.data.notifiedIds);
          localStorage.setItem("pwa_notified_events", JSON.stringify(ev.data.notifiedIds));
          }
        });
      }
    }, [isLoggedIn]);

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    function handleKey(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        document.getElementById('trade-search-input')?.focus();
      }
      if (e.key === 'Escape') {
        setIsQuickAddOpen(false);
        setIsAddOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isLoggedIn]);

  // Auto-refresh The5ers data every 5 minutes (reads Supabase)
  useEffect(() => {
    if (!isLoggedIn) return;
    const id = setInterval(() => { loadT5Data(); }, 300000);
    return () => clearInterval(id);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const intervalId = window.setInterval(() => {
      loadNewsData(false);
    }, 2 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [isLoggedIn]);

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
    const { url, anonKey } = getSavedSupabaseKeys();
    if (url && anonKey) {
      setSupabaseConnected(true);
    } else {
      setSupabaseConnected(false);
    }

    const list = await fetchTradesFromDB();
    setTrades(list);
    
    // Refresh local storage so it stays perfectly synced for offline mode,
    // rather than letting stale local data resurrect deleted trades.
    localStorage.setItem("trade_app_local_trades", JSON.stringify(list));
  };

  const handleOpenAddTrade = () => {
    setEditingTradeId(null);
    setFormPair("EUR/USD");
    setFormType("BUY");
    setFormEntryPrice("");
    setFormExitPrice("");
    setFormSize("1.0");
    setFormPnl("");
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
    setFormTVSnapshotUrl("");
    setFormTVSnapshotUrlClose("");

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
    setFormPnl(trade.pnl !== undefined ? trade.pnl.toString() : "");
    setFormNotes(trade.notes || "");
    setFormTimeframe(trade.timeframe || "H1");
    setFormRating(trade.rating || 5);
    setFormStatus(trade.status);
    setFormTag(trade.tag || "News-Trade");
    setFormStopLoss(trade.stop_loss ? trade.stop_loss.toString() : "");
    setFormTakeProfit(trade.take_profit ? trade.take_profit.toString() : "");
    setFormTVSnapshotUrl(trade.tv_snapshot_url || "");
    setFormTVSnapshotUrlClose(trade.tv_snapshot_url_close || "");

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
      showToast("Vui lòng điền đầy đủ Supabase URL và Anon Key!", "error");
      return;
    }
    try {
      localStorage.setItem("trade_app_supabase_url", dbUrl.trim());
      localStorage.setItem("trade_app_supabase_anon", dbAnon.trim());
      const list = await fetchTradesFromDB();
      setTrades(list);
      setSupabaseConnected(true);
      showToast("Kết nối Supabase thành công!", "success");
    } catch (err: any) {
      setSupabaseConnected(false);
      showToast("Kết nối thất bại. Lỗi: " + err.message, "error");
    }
  };

  const handleSaveSupabaseConfig = () => {
    localStorage.setItem("trade_app_supabase_url", dbUrl.trim());
    localStorage.setItem("trade_app_supabase_anon", dbAnon.trim());
    loadTradesData();
    showToast("Đã lưu cấu hình Supabase thành công!", "success");
  };

  const loadCalendarData = async () => {
    setLoadingCalendar(true);
    try {
      const res = await fetch("/api/calendar", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}` }
      });
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

  const loadNewsData = async (showLoading = true, page = 0) => {
    if (showLoading) setLoadingNews(true);
    try {
      const params = new URLSearchParams({
        offset: String(page * NEWS_PAGE_SIZE),
        limit: String(NEWS_PAGE_SIZE),
      });
      const res = await fetch(`/api/news?${params.toString()}`, { cache: "no-store", headers: { "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}` } });
      const json = await res.json();
      if (json && json.success) {
        setNewsItems(json.data || []);
        setNewsHasMore(Boolean(json.hasMore));
        setNewsPage(page);
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
    await loadNewsData(false, 0);
    setTimeout(() => setRefreshingNews(false), 800);
  };

  const loadNewsPage = async (page: number) => {
    if (loadingOlderNews) return;

    const nextPage = Math.max(0, page);
    setLoadingOlderNews(true);
    try {
      const params = new URLSearchParams({
        offset: String(nextPage * NEWS_PAGE_SIZE),
        limit: String(NEWS_PAGE_SIZE),
      });
      const res = await fetch(`/api/news?${params.toString()}`, { cache: "no-store", headers: { "Authorization": `Bearer ${localStorage.getItem("trade_app_auth_token")}` } });
      const json = await res.json();
      if (json && json.success) {
        setNewsItems(json.data || []);
        setNewsPage(nextPage);
        setNewsHasMore(Boolean(json.hasMore));
        setNewsLastUpdatedAt(json.fetchedAt || new Date().toISOString());
        setNewsDebug(json.debug || null);
      }
    } catch (e) {
      console.error("Error loading news page:", e);
    } finally {
      setLoadingOlderNews(false);
    }
  };

  const handleCaptureSnapshot = async () => {
    setIsCapturingSnapshot(true);
    try {
      // Encode the symbol e.g., EUR/USD -> EURUSD
      const encodedSymbol = encodeURIComponent("FX:" + formPair.replace("/", ""));
      const token = localStorage.getItem("trade_app_auth_token") || "";
      const tvId = encodeURIComponent(tvSessionId);
      const tvSign = encodeURIComponent(tvSessionSign);
      const url = `/api/tv-snapshot?symbol=${encodedSymbol}&auth_token=${token}&tv_session_id=${tvId}&tv_session_sign=${tvSign}`;
      
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi khi gọi API chụp ảnh");
      }
      
      setFormTVSnapshotUrl(json.url);
    } catch (e: any) {
      if (e?.message !== "error") showToast("Chụp ảnh thất bại: " + e.message, "error");
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  const handleCaptureSnapshotClose = async () => {
    setIsCapturingSnapshotClose(true);
    try {
      const encodedSymbol = encodeURIComponent("FX:" + formPair.replace("/", ""));
      const token = localStorage.getItem("trade_app_auth_token") || "";
      const tvId = encodeURIComponent(tvSessionId);
      const tvSign = encodeURIComponent(tvSessionSign);
      const url = `/api/tv-snapshot?symbol=${encodedSymbol}&auth_token=${token}&tv_session_id=${tvId}&tv_session_sign=${tvSign}`;
      
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Lỗi khi gọi API chụp ảnh");
      }
      
      setFormTVSnapshotUrlClose(json.url);
    } catch (e: any) {
      if (e?.message !== "error") showToast("Chụp ảnh thất bại: " + e.message, "error");
    } finally {
      setIsCapturingSnapshotClose(false);
    }
  };

  // Handle Trade Creation
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPair || !formEntryPrice || !formSize) {
      showToast("Vui lòng nhập: Cặp tiền, Giá vào lệnh & Khối lượng!", "error");
      return;
    }

    const entryPriceNum = parseFloat(formEntryPrice);
    const exitPriceNum = formExitPrice ? parseFloat(formExitPrice) : null;
    const sizeNum = parseFloat(formSize);
    const slNum = formStopLoss ? parseFloat(formStopLoss) : undefined;
    const tpNum = formTakeProfit ? parseFloat(formTakeProfit) : undefined;
    const pnlNum = formPnl ? parseFloat(formPnl) : 0;

    // User requested to completely remove the custom PnL calculation because it's incorrect.
    // Instead, we just use the manually inputted PnL (or 0 if not provided).
    const calculatedPnl = pnlNum;

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
      tv_snapshot_url: formTVSnapshotUrl || null,
      tv_snapshot_url_close: formTVSnapshotUrlClose || null,
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
      setFormPnl("");
      setFormTVSnapshotUrl("");
      setFormTVSnapshotUrlClose("");
    } catch (err: any) {
      console.error("Lỗi đồng bộ hoá:", err);
      showToast("Đồng bộ hoá thất bại: " + err.message, "error");
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xoá lịch sử giao dịch này không?")) {
      await deleteTradeFromDB(id);
      await loadTradesData();
    }
  };

  const followedT5Accounts = useMemo(() => {
    const selectedIds = new Set(selectedT5AccountIds);
    return t5Accounts.filter((account) => selectedIds.has(account.accountId));
  }, [t5Accounts, selectedT5AccountIds]);

  // Compute stats for header and badges
  const summary = useMemo(() => {
    const selectedIds = new Set(selectedT5AccountIds);
    const selectedAccounts = followedT5Accounts;
    const t5Balance = selectedAccounts.reduce((s, a) => s + (a.balance || 0), 0);
    const t5Pnl = selectedAccounts.reduce((s, a) => s + (a.pnl || 0), 0);
    const t5OpenTrades = t5Trades.filter(t => t && t.accountId && selectedIds.has(t.accountId) && !t.closeTime).length;
    const t5ClosedTrades = t5Trades.filter(t => t && t.accountId && selectedIds.has(t.accountId) && t.closeTime).length;

    const totalPnl = trades.filter(t => t && t.id && !t.id.startsWith("t5-")).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const manualPnl = trades.filter(t => t && t.id && t.status === "CLOSED" && !t.id.startsWith("t5-")).reduce((sum, t) => sum + (t.pnl || 0), 0);
    const openCount = trades.filter(t => t && t.status === "OPEN" && !t.id.startsWith("t5-")).length;
    const closedCount = trades.filter(t => t && t.status === "CLOSED" && !t.id.startsWith("t5-")).length;

    return {
      balance: t5Balance,
      pnl: totalPnl + t5Pnl,
      openCount: openCount + t5OpenTrades,
      closedCount: closedCount + t5ClosedTrades,
    };
  }, [trades, followedT5Accounts, t5Trades, selectedT5AccountIds]);

  // Filters candidates
  const [visibleCount, setVisibleCount] = useState(50);
  const uniquePairs = useMemo(() => {
    const set = new Set(mergedTrades.map((t) => t && t.pair).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [mergedTrades]);

  // Filtered trades list to display (manual + The5ers)
  const filteredTrades = useMemo(() => {
    return mergedTrades.filter((t) => {
      const matchSearch =
        t.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.tag && t.tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPair =
        selectedPairFilter === "ALL" || t.pair === selectedPairFilter;
      const matchStatus =
        selectedStatusFilter === "ALL" || t.status === selectedStatusFilter;
      const tradeAccountId = getTradeAccountId(t);
      const matchAccount =
        selectedJournalAccountId === "ALL" ||
        selectedJournalAccountId === tradeAccountId;
      return matchSearch && matchPair && matchStatus && matchAccount;
    });
  }, [mergedTrades, searchQuery, selectedPairFilter, selectedStatusFilter, selectedJournalAccountId, t5Accounts]);

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
          bg: "bg-[var(--ios-red)]/100 text-white shadow-xs",
          text: "text-[var(--ios-red)] dark:text-[var(--ios-red)] border-2 border-rose-500 dark:border-rose-400 bg-[var(--ios-red)]/10 dark:bg-[var(--ios-red)]/20",
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

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem("trade_app_auth_token", token);
    setAuthToken(token);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-[var(--ios-bg)] text-[var(--ios-label)]" : "bg-[var(--ios-bg)] text-[var(--ios-label)]"} transition-all ease-[ease-out] duration-300 font-display pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6`}
      id="app-root-theme"
    >
      {/* Main Container */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pt-5 space-y-3.5 sm:space-y-6"
        id="app-grid-frame"
      >
        {/* Red Event Alert Banner */}
        {upcomingRedEvents.length > 0 && (
          <div className="bg-rose-600 text-white p-3 sm:p-4 rounded-[20px] shadow-ios-md flex flex-row items-start sm:items-center gap-3 sm:gap-4 animate-pulse-once border border-rose-500">
            <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-lg font-semibold uppercase tracking-wider flex items-center flex-wrap gap-2">
                Cảnh báo tin đỏ sắp ra mắt
                <span className="text-sm font-medium bg-white text-[var(--ios-red)] px-2 py-0.5 rounded-full font-black">
                  CAO
                </span>
              </h4>
              <p className="text-lg text-white/90 mt-1 line-clamp-2 sm:line-clamp-none">
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

        {/* iOS Large Title Header */}
        {(currentTab === "dashboard" || currentTab === "journal") && (
        <header className="mb-2 px-1 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-0" id="google-ios-header">
          <div className="min-w-0">
            <h1 className="text-[34px] font-bold tracking-tight text-[var(--ios-label)] leading-none truncate">
              {selectedT5AccountIds.length > 0 && t5Accounts.length > 0 ? "QuanzTrade" : "Táo Tầu Journal"}
            </h1>
            <p className="text-[15px] font-medium text-[var(--ios-secondary-label)] mt-2 truncate">
              {summary.balance > 0 ? `Tổng tài sản: $${summary.balance.toLocaleString("en-US")}` : "Nhật ký giao dịch"}
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-11 h-11 flex items-center justify-center bg-[var(--ios-surface-2)] shadow-ios-sm rounded-full transition-colors cursor-pointer active:scale-90"
              title="Giao diện sáng/tối"
              id="btn-darkmode"
            >
              {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-[var(--ios-secondary-label)]" />}
            </button>

            <div className="text-right min-w-0 bg-[var(--ios-surface-2)] shadow-ios-sm px-4 py-1.5 rounded-[16px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] block leading-tight">
                Số dư
              </span>
              <span className="text-[18px] font-bold font-mono tracking-tight text-[var(--ios-label)] leading-tight" id="live-balance-text">
                ${summary.balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </header>
        )}

        {/* Desktop Segmented Control */}
        <div
          className="hidden md:flex justify-between items-center ios-glass bg-[var(--ios-surface)] rounded-full border border-[var(--ios-separator)] shadow-ios-sm p-1.5 overflow-x-auto no-scrollbar"
          id="segmented-controller"
        >
          <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "dashboard" ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] dark:transparent dark:text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] dark:hover:text-[var(--ios-label)] dark:text-[var(--ios-secondary-label)]"}`}
            >
              <BarChart2 size={16} className="flex-shrink-0" />
              <span>Tổng quan</span>
            </button>
            <button
              onClick={() => setCurrentTab("journal")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "journal" ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] dark:transparent dark:text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] dark:hover:text-[var(--ios-label)] dark:text-[var(--ios-secondary-label)]"}`}
            >
              <FileText size={16} className="flex-shrink-0" />
              <span>
                Nhật ký{" "}
                <span className="text-base font-mono text-[var(--ios-secondary-label)]">
                  ({mergedTrades.length})
                </span>
              </span>
            </button>
            <button
              onClick={() => setCurrentTab("calendar")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "calendar" ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] dark:transparent dark:text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] dark:hover:text-[var(--ios-label)] dark:text-[var(--ios-secondary-label)]"}`}
            >
              <CalendarIcon size={16} className="flex-shrink-0" />
              <span>Lịch kinh tế</span>
            </button>
            <button
              onClick={() => setCurrentTab("news")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "news" ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] dark:transparent dark:text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)] dark:hover:text-[var(--ios-label)] dark:text-[var(--ios-secondary-label)]"}`}
            >
              <Newspaper size={16} className="flex-shrink-0" />
              <span>Tin tức thị trường</span>
            </button>
          </div>
        </div>

        {/* 1. OVERVIEW BENTO TAB SCREEN */}
        {currentTab === "dashboard" && (
          <DashboardView
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            summary={summary}
            mergedTrades={mergedTrades}
            filteredTrades={filteredTrades}
            upcomingRedEvents={upcomingRedEvents}
            selectedT5AccountIds={selectedT5AccountIds}
            t5Accounts={t5Accounts}
            followedT5Accounts={followedT5Accounts}
            t5Trades={t5Trades}
            setSelectedJournalAccountId={setSelectedJournalAccountId}
            loadT5AccountTrades={loadT5AccountTrades}
            setIsQuickAddOpen={setIsQuickAddOpen}
            setIsSettingsOpen={setIsSettingsOpen}
          />
        )}

          {/* 2. JOURNAL MANAGEMENT TAB SCREEN */}
          {currentTab === "journal" && (
            <JournalView
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedPairFilter={selectedPairFilter}
              setSelectedPairFilter={setSelectedPairFilter}
              selectedStatusFilter={selectedStatusFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              selectedJournalAccountId={selectedJournalAccountId}
              setSelectedJournalAccountId={setSelectedJournalAccountId}
              journalAccountOptions={journalAccountOptions}
              uniquePairs={uniquePairs}
              filteredTrades={filteredTrades}
              visibleCount={visibleCount}
              setVisibleCount={setVisibleCount}
              mergedTrades={mergedTrades}
              darkMode={darkMode}
              handleBeginEditTrade={handleBeginEditTrade}
              handleDeleteTrade={handleDeleteTrade}
              handleOpenAddTrade={handleOpenAddTrade}
            />
          )}
              {/* 3. CALENDAR MASTER TAB SCREEN */}
        {currentTab === "calendar" && (
          <CalendarView
            loadingCalendar={loadingCalendar}
            groupedEventsByDay={groupedEventsByDay}
            calendarPeriodFilter={calendarPeriodFilter}
            setCalendarPeriodFilter={setCalendarPeriodFilter}
            calendarImpactFilter={calendarImpactFilter}
            setCalendarImpactFilter={setCalendarImpactFilter}
            syncCalendar={syncCalendar}
            refreshingCalendar={refreshingCalendar}
            timezoneOffsetStr={timezoneOffsetStr}
            darkMode={darkMode}
            getImpactColorClasses={getImpactColorClasses}
          />
        )}

        {/* 4. FAST RSS NEWS TAB SCREEN */}
        {currentTab === "news" && (
          <NewsPanel
            newsItems={newsItems}
            loading={loadingNews}
            refreshing={refreshingNews}
            onRefresh={syncNews}
            page={newsPage}
            pageSize={NEWS_PAGE_SIZE}
            onPageChange={loadNewsPage}
            loadingOlder={loadingOlderNews}
            hasMore={newsHasMore}
            darkMode={darkMode}
            lastUpdatedAt={newsLastUpdatedAt}
            debug={newsDebug}
          />
        )}
      </div>

      {/* Add Trade Modal */}
      <AddTradeModalComponent
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        editingTradeId={editingTradeId}
        formPair={formPair}
        setFormPair={setFormPair}
        formType={formType}
        setFormType={setFormType}
        formEntryPrice={formEntryPrice}
        setFormEntryPrice={setFormEntryPrice}
        formExitPrice={formExitPrice}
        setFormExitPrice={setFormExitPrice}
        formSize={formSize}
        setFormSize={setFormSize}
        formStopLoss={formStopLoss}
        setFormStopLoss={setFormStopLoss}
        formTakeProfit={formTakeProfit}
        setFormTakeProfit={setFormTakeProfit}
        formStatus={formStatus}
        setFormStatus={setFormStatus}
        formTimeframe={formTimeframe}
        setFormTimeframe={setFormTimeframe}
        formTag={formTag}
        setFormTag={setFormTag}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        formRating={formRating}
        setFormRating={setFormRating}
        formPnl={formPnl}
        setFormPnl={setFormPnl}
        formEntryDate={formEntryDate}
        formExitDate={formExitDate}
        formTVSnapshotUrl={formTVSnapshotUrl}
        formTVSnapshotUrlClose={formTVSnapshotUrlClose}
        isCapturingSnapshot={isCapturingSnapshot}
        isCapturingSnapshotClose={isCapturingSnapshotClose}
        setLightboxUrl={setLightboxUrl}
        onSubmit={handleCreateTrade}
        onCaptureSnapshot={handleCaptureSnapshot}
        onCaptureSnapshotClose={handleCaptureSnapshotClose}
        getEntryDatePart={getEntryDatePart}
        handleEntryDateChange={handleEntryDateChange}
        getExitDatePart={getExitDatePart}
        handleExitDateChange={handleExitDateChange}
        IOSDatePicker={IOSDatePicker}
        IOSTimePicker={IOSTimePicker}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="settings-modal-root" id="settings-modal-root">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="settings-backdrop"
            />

            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 90, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="settings-sheet"
              id="settings-modal-window"
            >
              <div className="settings-handle" />

              <header className="settings-header">
                <div className="settings-title-wrap">
                  <span className="settings-icon-badge"><Settings size={18} /></span>
                  <div className="min-w-0">
                    <h4>Cài đặt</h4>
                    <p>Hệ thống, tài khoản và bảo mật</p>
                  </div>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="settings-close" aria-label="Đóng cài đặt">
                  <X size={16} />
                </button>
              </header>

              <div className="settings-content">
                <section className="settings-section">
                  <div className="settings-section-title">Giao diện</div>
                  <div className="settings-choice-grid">
                    <button type="button" onClick={() => setDarkMode(false)} className={`settings-choice ${!darkMode ? "is-active" : ""}`}>
                      <Sun size={16} />
                      <span>Sáng</span>
                    </button>
                    <button type="button" onClick={() => setDarkMode(true)} className={`settings-choice ${darkMode ? "is-active" : ""}`}>
                      <Moon size={16} />
                      <span>Tối</span>
                    </button>
                  </div>
                </section>

                <section className="settings-section">
                  <div className="settings-section-title">Đồng bộ dữ liệu</div>
                  <div className="settings-group">
                    <label className="settings-field">
                      <span>Supabase URL</span>
                      <input type="text" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} placeholder="https://...supabase.co" className="settings-input" />
                    </label>
                    <label className="settings-field">
                      <span>Anon key</span>
                      <input type="password" value={dbAnon} onChange={(e) => setDbAnon(e.target.value)} placeholder="Khóa Supabase" className="settings-input settings-input-mono" />
                    </label>
                    <div className="settings-actions two">
                      <button type="button" onClick={handleSaveSupabaseConfig} className="settings-button secondary">Lưu</button>
                      <button type="button" onClick={testSupabaseConnection} className="settings-button primary">Kiểm tra</button>
                    </div>
                    <p className={`settings-hint ${supabaseConnected ? "is-ok" : ""}`}>{supabaseConnected ? "Đã kết nối Supabase." : "Dùng để đồng bộ nhật ký giao dịch."}</p>
                  </div>
                </section>

                <section className="settings-section">
                  <div className="settings-section-title">Thông báo</div>
                  <div className="settings-row-group">
                    <div className="settings-row">
                      <span className="settings-row-icon"><BellRing size={17} /></span>
                      <div className="settings-row-copy"><strong>Tin đỏ USD</strong><span>Báo trước 1 giờ</span></div>
                      <button type="button" onClick={toggleNotifications} className={`ios-toggle ${notificationsEnabled ? "is-on" : ""}`} aria-pressed={notificationsEnabled}><span /></button>
                    </div>
                  </div>
                </section>

                <section className="settings-section">
                  <div className="settings-section-title">TradingView</div>
                  <div className="settings-group">
                    <label className="settings-field"><span>Session ID</span><input type="text" value={tvSessionId} onChange={(e) => { setTvSessionId(e.target.value); localStorage.setItem("tv_session_id", e.target.value); }} placeholder="sessionid" className="settings-input settings-input-mono" /></label>
                    <label className="settings-field"><span>Session sign</span><input type="text" value={tvSessionSign} onChange={(e) => { setTvSessionSign(e.target.value); localStorage.setItem("tv_session_sign", e.target.value); }} placeholder="sessionid_sign" className="settings-input settings-input-mono" /></label>
                    <label className="settings-field"><span>Browserless token</span><input type="password" value={browserlessToken} onChange={(e) => setBrowserlessToken(e.target.value)} placeholder="Token chụp ảnh biểu đồ" className="settings-input settings-input-mono" /></label>
                    <button type="button" onClick={saveTVCreds} disabled={tvSaving} className="settings-button primary full">{tvSaving ? "Đang lưu..." : "Lưu TradingView"}</button>
                    {tvSaveResult && <p className={`settings-result ${tvSaveResult.startsWith("✅") ? "is-ok" : "is-error"}`}>{tvSaveResult}</p>}
                  </div>
                </section>

                <section className="settings-section">
                  <div className="settings-section-title">The5ers</div>
                  <div className="settings-group">
                    <div className="settings-row compact">
                      <span className="settings-row-icon"><TrendingUp size={17} /></span>
                      <div className="settings-row-copy"><strong>Tài khoản theo dõi</strong><span>{selectedT5AccountIds.length}/{t5Accounts.length} đang chọn</span></div>
                      <button type="button" onClick={loadT5Data} disabled={t5Loading} className="settings-mini-button"><RefreshCw size={14} className={t5Loading ? "animate-spin" : ""} /><span>{t5Loading ? "Tải" : "Làm mới"}</span></button>
                    </div>
                    {t5Loading ? (
                      <p className="settings-hint">Đang tải tài khoản...</p>
                    ) : t5Accounts.length === 0 ? (
                      <p className="settings-hint">Chưa có dữ liệu The5ers.</p>
                    ) : (
                      <div className="settings-account-list">
                        {t5Accounts.map((acc) => {
                          const checked = selectedT5AccountIds.includes(acc.accountId);
                          const isActive = acc.status === "active" || acc.status === "available";
                          return (
                            <label key={acc.accountId} className={`settings-account ${!isActive ? "is-muted" : ""}`}>
                              <input type="checkbox" checked={checked} onChange={() => { const next = checked ? selectedT5AccountIds.filter((id) => id !== acc.accountId) : [...selectedT5AccountIds, acc.accountId]; setSelectedT5AccountIds(next); localStorage.setItem("t5_selected_accounts", JSON.stringify(next)); if (!checked && !isActive) loadT5AccountTrades(acc.accountId); }} />
                              <span className="settings-account-name">{acc.name}</span>
                              <span className={`settings-pill ${acc.type === "funded" ? "green" : acc.type === "evaluation" ? "blue" : "neutral"}`}>{acc.type === "funded" ? "Funded" : acc.type === "evaluation" ? "Eval" : "Demo"}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <button type="button" onClick={() => { const activeIds = t5Accounts.filter((a) => a.status === "active" || a.status === "available").map((a) => a.accountId); setSelectedT5AccountIds(activeIds); localStorage.setItem("t5_selected_accounts", JSON.stringify(activeIds)); }} className="settings-button secondary full">Chọn tất cả active</button>
                    <label className="settings-field"><span>Email The5ers</span><input type="email" value={t5Email} onChange={(e) => { setT5Email(e.target.value); localStorage.setItem("t5_email", e.target.value); }} placeholder="email@domain.com" className="settings-input settings-input-mono" /></label>
                    <label className="settings-field"><span>DSR token</span><textarea value={t5DsrToken} onChange={(e) => { const val = e.target.value.trim(); setT5DsrToken(val); localStorage.setItem("t5_dsr_token", val); }} placeholder="Dán token DSR" className="settings-input settings-textarea settings-input-mono" /></label>
                    <div className="settings-actions two">
                      <button type="button" onClick={saveT5Creds} disabled={t5Saving} className="settings-button primary">{t5Saving ? "Đang lưu..." : "Lưu DSR"}</button>
                      <button type="button" onClick={syncT5Now} disabled={t5Syncing} className="settings-button success">{t5Syncing ? "Đang đồng bộ..." : "Đồng bộ server"}</button>
                    </div>
                    <button type="button" onClick={async () => {
                      try {
                        const res = await fetch("/api/trigger-scrape", { method: "POST" });
                        const json = await res.json();
                        showToast(json.message || "Đã trigger GitHub Actions!", json.success ? "success" : "error");
                      } catch(e: any) { showToast("Lỗi: " + e.message, "error"); }
                    }} className="settings-button secondary full">🚀 Chạy GitHub Actions</button>
                    {t5SaveResult && <p className={`settings-result ${t5SaveResult.startsWith("✅") ? "is-ok" : "is-error"}`}>{t5SaveResult}</p>}
                  </div>
                </section>

                <section className="settings-section">
                  <div className="settings-section-title">Bảo mật</div>
                  <div className="settings-group">
                    <div className="settings-row compact"><span className="settings-row-icon"><ShieldCheck size={17} /></span><div className="settings-row-copy"><strong>Mật khẩu web</strong><span>Khóa truy cập app</span></div></div>
                    <input type="password" value={sitePassword} onChange={(e) => setSitePassword(e.target.value)} placeholder="Mật khẩu mới" className="settings-input settings-input-mono" />
                    <button type="button" onClick={async () => { const pass = sitePassword.trim(); if (!pass) return showToast("Vui lòng nhập mật khẩu mới.", "error"); try { const res = await fetch("/api/save-site-password", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("trade_app_auth_token") }, body: JSON.stringify({ sitePassword: pass }) }); const json = await res.json(); showToast(json.message || "Lưu thành công.", json.success ? "success" : "error"); if (json.success) setSitePassword(""); } catch (err: any) { showToast("Lỗi: " + err.message, "error"); } }} className="settings-button primary full">Cập nhật mật khẩu</button>
                  </div>
                </section>

                {deferredPrompt && (
                  <section className="settings-section"><button type="button" onClick={() => { setIsSettingsOpen(false); handleInstallAppPWA(); }} className="settings-button primary full"><Download size={16} /><span>Cài ứng dụng</span></button></section>
                )}

                <section className="settings-section danger-zone"><button type="button" onClick={handleResetLocalStorage} className="settings-button danger full">Xóa nhật ký local cũ</button></section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) - Quick Add */}
      <div className="fixed bottom-[calc(49px+env(safe-area-inset-bottom,0px)+12px)] md:bottom-8 right-4 z-40">
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="w-14 h-14 bg-[var(--ios-blue)] text-white rounded-full flex items-center justify-center shadow-ios-xl active:scale-95 transition-transform cursor-pointer"
          aria-label="Thêm lệnh nhanh"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Quick Add Mini Modal — iOS Sheet */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="quick-add-modal-root">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsQuickAddOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 120 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="relative w-full sm:max-w-md ios-glass bg-[var(--ios-surface)] rounded-t-[28px] sm:rounded-[28px] shadow-ios-xl z-10"
              id="quick-add-modal-window"
            >
              {/* Grabber */}
              <div className="flex justify-center pt-2 sm:hidden">
                <div className="w-9 h-1 rounded-full bg-[var(--ios-separator)]" />
              </div>

              <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-semibold text-[var(--ios-label)]">Lệnh nhanh</h3>
                <button onClick={() => setIsQuickAddOpen(false)} className="w-8 h-8 flex items-center justify-center bg-[var(--ios-surface-2)] rounded-full cursor-pointer active:scale-90 transition-transform">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const pair = fd.get('pair') as string;
                const type = fd.get('type') as 'BUY' | 'SELL';
                const entry_price = parseFloat(fd.get('entry_price') as string);
                const exit_price = fd.get('exit_price') ? parseFloat(fd.get('exit_price') as string) : null;
                const size = parseFloat(fd.get('size') as string);
                if (!pair || !entry_price || !size) {
                  showToast("Nhập cặp tiền, giá vào & khối lượng", "error");
                  return;
                }
                const trade: Trade = {
                  id: "t" + Date.now(),
                  pair,
                  type,
                  entry_price,
                  exit_price,
                  size,
                  pnl: exit_price ? (type === 'BUY' ? (exit_price - entry_price) : (entry_price - exit_price)) * size * 100000 : 0,
                  status: exit_price ? 'CLOSED' : 'OPEN',
                  entry_date: new Date().toISOString(),
                  exit_date: exit_price ? new Date().toISOString() : null,
                  notes: '',
                  timeframe: 'H1',
                  rating: 3,
                  tag: 'Quick',
                };
                try {
                  await saveTradeToDB(trade);
                  await loadTradesData();
                  setIsQuickAddOpen(false);
                  showToast("Đã thêm lệnh!", "success");
                } catch (err: any) {
                  showToast("Lỗi: " + err.message, "error");
                }
              }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select name="pair" defaultValue="EUR/USD" className="px-3 py-3 bg-[var(--ios-surface-2)] rounded-[12px] border border-[var(--ios-separator)] text-[var(--ios-label)] text-base focus:outline-none focus:border-[var(--ios-blue)]">
                    {["EUR/USD","GBP/USD","USD/JPY","AUD/USD","USD/CAD","NZD/USD","USD/CHF","XAU/USD","BTC/USD"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select name="type" defaultValue="BUY" className="px-3 py-3 bg-[var(--ios-surface-2)] rounded-[12px] border border-[var(--ios-separator)] text-[var(--ios-label)] text-base focus:outline-none focus:border-[var(--ios-blue)]">
                    <option value="BUY">MUA (BUY)</option>
                    <option value="SELL">BÁN (SELL)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input name="entry_price" type="number" step="any" placeholder="Giá vào" required className="px-3 py-3 bg-[var(--ios-surface-2)] rounded-[12px] border border-[var(--ios-separator)] text-[var(--ios-label)] text-base focus:outline-none focus:border-[var(--ios-blue)] font-mono" />
                  <input name="exit_price" type="number" step="any" placeholder="Giá ra (tuỳ)" className="px-3 py-3 bg-[var(--ios-surface-2)] rounded-[12px] border border-[var(--ios-separator)] text-[var(--ios-label)] text-base focus:outline-none focus:border-[var(--ios-blue)] font-mono" />
                  <input name="size" type="number" step="0.01" placeholder="Lots" required className="px-3 py-3 bg-[var(--ios-surface-2)] rounded-[12px] border border-[var(--ios-separator)] text-[var(--ios-label)] text-base focus:outline-none focus:border-[var(--ios-blue)] font-mono" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsQuickAddOpen(false)} className="flex-1 py-3 rounded-[12px] border border-[var(--ios-separator)] text-[var(--ios-label)] font-semibold cursor-pointer">Huỷ</button>
                  <button type="submit" className="flex-1 py-3 rounded-[12px] bg-[var(--ios-blue)] text-white font-semibold cursor-pointer">Thêm lệnh</button>
                </div>
              </form>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Toast Notifications — iOS Notification Banner / Dynamic Island Style */}
      <div className="fixed top-2 sm:top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-[90vw] sm:w-auto sm:min-w-[300px] max-w-md" id="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id} 
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`pointer-events-auto px-5 py-3.5 rounded-[24px] shadow-ios-xl ios-glass text-[14px] font-semibold flex items-center justify-center text-center
              ${t.type === 'success' ? 'bg-[var(--sys-success-soft)] text-[var(--ios-green)] border border-[var(--ios-green)]/30' : 
                t.type === 'error' ? 'bg-[var(--sys-danger-soft)] text-[var(--ios-red)] border border-[var(--ios-red)]/30' : 
                'bg-[var(--ios-surface)] text-[var(--ios-label)] border border-[var(--ios-separator)]'}`}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <IOSTabBar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
            onClick={() => setLightboxUrl(null)}
          >
            <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="absolute top-2 right-2 z-10 p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors shadow-lg"
                onClick={() => setLightboxUrl(null)}
                title="Đóng ảnh"
              >
                <X size={24} />
              </button>
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                src={lightboxUrl}
                alt="Chart Snapshot Full"
                className="max-w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
