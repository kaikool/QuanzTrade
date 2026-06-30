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
  ShieldCheck,
  Camera,
  Maximize2,
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
import { M3DatePicker, M3TimePicker } from "./components/M3DatePicker";
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
          bg: "bg-[var(--sys-red)]/100 text-white shadow-xs",
          text: "text-[var(--sys-red)] dark:text-[var(--sys-red)] border-2 border-rose-500 dark:border-rose-400 bg-[var(--sys-red)]/10 dark:bg-[var(--sys-red)]/20",
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
      className={`min-h-screen ${darkMode ? "dark bg-[var(--sys-bg)] text-[var(--sys-text)]" : "bg-[var(--sys-bg)] text-[var(--sys-text)]"} transition-all ease-[ease-out] duration-300 font-display pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6`}
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
                <span className="text-sm font-medium bg-white text-[var(--sys-red)] px-2 py-0.5 rounded-full font-black">
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

        {/* Google Workspace Style Tonal Top Header */}
        {(currentTab === "dashboard" || currentTab === "journal") && (
        <header
          className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 bg-[var(--sys-surface)] rounded-[24px] border border-[var(--sys-border)] shadow-ios-sm space-y-4 md:space-y-0"
          id="google-ios-header"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 bg-[var(--sys-blue)] text-white rounded-[16px] flex items-center justify-center shadow-ios-md font-extrabold flex-shrink-0"
              id="logo-icon"
            >
              <CloudLightning size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--sys-text)] font-display truncate">
                  {selectedT5AccountIds.length > 0 && t5Accounts.length > 0 ? "QuanzTrade" : "Táo Tầu Journal"}
                </h1>
              </div>
              <p className="text-base sm:text-lg text-[var(--sys-text-secondary)] mt-1 leading-snug truncate">
                {summary.balance > 0 ? `Tổng tài sản: $${summary.balance.toLocaleString("en-US")}` : "Nhật ký giao dịch"}
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
              className="p-2.5 sm:p-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-full transition-colors ease-[ease-out] cursor-pointer"
              title="Giao diện sáng/tối"
              id="btn-darkmode"
            >
              {darkMode ? (
                <Sun size={16} className="text-amber-500" />
              ) : (
                <Moon size={16} className="text-[var(--sys-text-secondary)]" />
              )}
            </button>

            {/* Account size indicator in dynamic style */}
            <div className="text-right min-w-0">
              <span className="text-base sm:text-sm font-medium tracking-wider text-[var(--sys-text-secondary)] uppercase block truncate">
                Số Dư Tài Khoản
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 justify-end">
                <span
                  className="text-xl sm:text-2xl font-black text-[var(--sys-text)] font-display truncate"
                  id="live-balance-text"
                >
                  $
                  {summary.balance.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`text-base sm:text-base px-2 py-1 rounded-full font-bold flex items-center gap-0.5 flex-shrink-0 ${summary.pnl >= 0 ? "bg-[var(--sys-green)]/100/10 text-[var(--sys-green)] dark:text-[var(--sys-green)]" : "bg-[var(--sys-red)]/100/10 text-[var(--sys-red)] dark:text-[var(--sys-red)]"}`}
                  id="summary-badge-pnl"
                >
                  {summary.pnl >= 0 ? "+" : ""}${summary.pnl.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Profile Settings Click */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] active:scale-95 transition-transform dark:bg-[var(--sys-surface-2)] rounded-full flex items-center justify-center text-[var(--sys-text)] font-bold font-mono cursor-pointer relative shadow-ios-sm flex-shrink-0 text-lg"
              id="avatar-button"
            >
              JD
              <span className="absolute -bottom-0.5 -right-0.5 bg-[var(--sys-blue)] text-white rounded-[28px] active:scale-95 transition-transform p-1 border border-white dark:border-ios-surface shadow-xs text-base animate-pulse-once">
                <Settings size={12} />
              </span>
            </button>
          </div>
        </header>
        )}

        {/* Google-style Pill Navigation Tab Segment Manager */}
        <div
          className="hidden md:flex justify-between items-center bg-[var(--sys-surface)] rounded-full border border-[var(--sys-border)] shadow-ios-sm p-1.5 overflow-x-auto no-scrollbar"
          id="segmented-controller"
        >
          <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "dashboard" ? "bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:transparent dark:text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)] dark:hover:text-[var(--sys-text)] dark:text-[var(--sys-text-secondary)]"}`}
            >
              <BarChart2 size={16} className="flex-shrink-0" />
              <span>Tổng quan</span>
            </button>
            <button
              onClick={() => setCurrentTab("journal")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "journal" ? "bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:transparent dark:text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)] dark:hover:text-[var(--sys-text)] dark:text-[var(--sys-text-secondary)]"}`}
            >
              <FileText size={16} className="flex-shrink-0" />
              <span>
                Nhật ký{" "}
                <span className="text-base font-mono text-[var(--sys-text-secondary)]">
                  ({mergedTrades.length})
                </span>
              </span>
            </button>
            <button
              onClick={() => setCurrentTab("calendar")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "calendar" ? "bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:transparent dark:text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)] dark:hover:text-[var(--sys-text)] dark:text-[var(--sys-text-secondary)]"}`}
            >
              <CalendarIcon size={16} className="flex-shrink-0" />
              <span>Lịch kinh tế</span>
            </button>
            <button
              onClick={() => setCurrentTab("news")}
              className={`px-4 sm:px-6 py-2.5 rounded-[100px] text-base font-semibold transition-all ease-[ease-out] duration-200 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap ${currentTab === "news" ? "bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:transparent dark:text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)] dark:hover:text-[var(--sys-text)] dark:text-[var(--sys-text-secondary)]"}`}
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
          <div
            className="grid grid-cols-1 gap-6"
            id="journal-standalone-section"
          >
            <div
              className="p-4 sm:p-6 bg-[var(--sys-surface)] rounded-[24px] border border-[var(--sys-border)] shadow-ios-sm max-w-full overflow-hidden"
              id="journal-master-card"
            >
              {/* Journal controls header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sys-border)] dark:border-[var(--sys-border)] pb-3 mb-4 w-full min-w-0">
                <div className="flex-shrink-0">
                  <h3 className="text-lg sm:text-lg font-semibold text-[var(--sys-text)] flex items-center gap-1.5">
                    <FileText className="text-[var(--sys-blue)]" size={16} />
                    {selectedJournalAccount ? `Journal: ${selectedJournalAccount.name}` : "Lịch sử giao dịch"}
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:w-auto pb-1 sm:pb-0">
                  <div className="flex items-center justify-center gap-1.5 bg-[var(--sys-surface-2)] dark:bg-[var(--sys-surface-2)] border border-[var(--sys-border)] px-2 py-2.5 sm:px-2.5 sm:py-1.5 rounded-[16px] text-sm font-medium w-full sm:w-auto">
                    <select value={selectedJournalAccountId} onChange={(e) => setSelectedJournalAccountId(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--sys-text)] font-bold w-full sm:max-w-[180px] text-center sm:text-left truncate text-base">
                      {journalAccountOptions.map((account) => (<option key={account.accountId} value={account.accountId}>{account.name}</option>))}
                    </select>
                  </div>
                  {/* Pair filter select - M3 standard */}
                  <div className="flex items-center justify-center gap-1.5 bg-[var(--sys-surface-2)] dark:bg-[var(--sys-surface-2)] border border-[var(--sys-border)] px-2 py-2.5 sm:px-2.5 sm:py-1.5 rounded-[16px] text-sm font-medium w-full sm:w-auto">
                    <Filter size={11} className="text-[var(--sys-text-secondary)]" />
                    <select
                      value={selectedPairFilter}
                      onChange={(e) => setSelectedPairFilter(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer text-[var(--sys-text)] font-bold w-full sm:max-w-none text-center sm:text-left truncate text-base"
                    >
                      <option
                        value="ALL"
                        className="bg-[var(--sys-surface)] text-[var(--sys-text)]"
                      >
                        Cặp: Tất cả
                      </option>
                      {uniquePairs
                        .filter((p) => p !== "ALL")
                        .map((p) => (
                          <option
                            key={p}
                            value={p}
                            className="bg-[var(--sys-surface)] text-[var(--sys-text)]"
                          >
                            {p}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Status filter select - M3 standard */}
                  <div className="flex items-center justify-center gap-1.5 bg-[var(--sys-surface-2)] dark:bg-[var(--sys-surface-2)] border border-[var(--sys-border)] px-2 py-2.5 sm:px-2.5 sm:py-1.5 rounded-[16px] text-sm font-medium w-full sm:w-auto">
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer text-[var(--sys-text)] font-bold w-full sm:max-w-none text-center sm:text-left truncate text-base"
                    >
                      <option
                        value="ALL"
                        className="bg-[var(--sys-surface)] text-[var(--sys-text)]"
                      >
                        Tất cả lệnh
                      </option>
                      <option
                        value="OPEN"
                        className="bg-[var(--sys-surface)] text-[var(--sys-text)]"
                      >
                        Lệnh Mở (OPEN)
                      </option>
                      <option
                        value="CLOSED"
                        className="bg-[var(--sys-surface)] text-[var(--sys-text)]"
                      >
                        Đã Đóng (CLOSED)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live search input bar - M3 Workspace Style */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--sys-text-secondary)]">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  placeholder="Nhập cặp tiền hoặc phân tích để tìm kiếm nhanh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--sys-surface-2)] rounded-[12px] text-base border border-[var(--sys-border)]/50 dark:border-[var(--sys-border)] focus:border-[var(--sys-blue)] focus:bg-[var(--sys-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--sys-blue)] transition-all ease-[ease-out] font-sans"
                  id="trade-search-input"
                />
              </div>

              {/* Desktop Trades Table - Compact Redesign */}
              <div
                className="hidden md:block overflow-x-auto"
                id="trades-table-scroller"
              >
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-20 text-[var(--sys-text-secondary)]">
                    <BookOpen
                      size={48}
                      className="mx-auto text-[var(--sys-text-secondary)] dark:text-[var(--sys-text-secondary)] mb-2 animate-pulse"
                    />
                    <p className="text-lg font-semibold">
                      Không tìm thấy giao dịch nào
                    </p>
                    <p className="text-base text-[var(--sys-text-secondary)] mt-1">
                      Sử dụng bộ lọc khác hoặc nhập một giao dịch mới để tiếp
                      tục!
                    </p>
                  </div>
                ) : (
                  <>
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-[var(--sys-border)] text-sm font-medium uppercase text-[var(--sys-text-secondary)] tracking-wider">
                        <th className="py-3.5 px-4 whitespace-nowrap text-base">Cặp / Hướng</th>
                        <th className="py-3.5 px-4 whitespace-nowrap text-base">Khối lượng</th>
                        <th className="py-3.5 px-4 whitespace-nowrap text-base">Vào → Ra / SL • TP</th>
                        <th className="py-3.5 px-4 whitespace-nowrap text-base">Tag</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap text-base">Lời / Lỗ</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap text-base">Sửa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ios-outline-variant/60 text-lg">
                      {filteredTrades.slice(0, visibleCount).map((t) => {
                        const pnlBarWidth = Math.min(Math.abs(t.pnl) / 1000, 1) * 100;
                        return (
                          <tr
                            key={t.id}
                            className="group hover:bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm/50 dark:hover:bg-[var(--sys-surface-2)]/30 transition-colors ease-[ease-out]"
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="flex gap-2">
                                  {/* Open Snapshot */}
                                  {t.tv_snapshot_url ? (
                                    <button onClick={() => setLightboxUrl(t.tv_snapshot_url!)} className="w-20 aspect-[16/10] rounded-lg border border-[var(--sys-border)] overflow-hidden flex-shrink-0 block relative group shadow-sm animate-fade-in" title="Ảnh Mở Lệnh">
                                      <img src={t.tv_snapshot_url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex items-end justify-center pb-1 transition-opacity duration-200">
                                        <span className="text-xs text-white font-bold">Mở Lệnh</span>
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="w-20 aspect-[16/10] rounded-lg border border-dashed border-[var(--sys-border)] flex items-center justify-center bg-[var(--sys-surface-2)] flex-shrink-0" title="Chưa có ảnh Mở Lệnh">
                                      <Camera size={14} className="text-[var(--sys-text-secondary)]/30" />
                                    </div>
                                  )}

                                  {/* Close Snapshot */}
                                  {t.tv_snapshot_url_close ? (
                                    <button onClick={() => setLightboxUrl(t.tv_snapshot_url_close!)} className="w-20 aspect-[16/10] rounded-lg border border-[var(--sys-border)] overflow-hidden flex-shrink-0 block relative group shadow-sm animate-fade-in" title="Ảnh Đóng Lệnh">
                                      <img src={t.tv_snapshot_url_close} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex items-end justify-center pb-1 transition-opacity duration-200">
                                        <span className="text-xs text-white font-bold">Đóng Lệnh</span>
                                      </div>
                                    </button>
                                  ) : t.status === "CLOSED" ? (
                                    <div className="w-20 aspect-[16/10] rounded-lg border border-dashed border-[var(--sys-border)] flex items-center justify-center bg-[var(--sys-surface-2)] flex-shrink-0" title="Chưa có ảnh Đóng Lệnh">
                                      <Camera size={14} className="text-[var(--sys-text-secondary)]/30" />
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-sm font-black font-mono ${t.type === "BUY" ? "bg-[var(--sys-green)]/100/10 text-[var(--sys-green)]" : "bg-[var(--sys-red)]/100/10 text-[var(--sys-red)]"}`}
                                  >
                                    {t.type}
                                  </span>
                                  <div>
                                    <div className="font-bold text-[var(--sys-text)] text-base leading-tight flex items-center gap-1.5">
                                      {t.pair}
                                      {t.status === "OPEN" ? (
                                        <span className="text-sm px-1.5 py-0.5 rounded bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:bg-[var(--sys-blue)]/20 dark:text-[var(--sys-blue)] font-extrabold uppercase animate-pulse">OPEN</span>
                                      ) : (
                                        <span className="text-sm px-1.5 py-0.5 rounded bg-[var(--sys-border)]/30 text-[var(--sys-text-secondary)] font-extrabold uppercase">CLOSED</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-[var(--sys-text-secondary)] mt-0.5">
                                      {t.timeframe || "M15"} • {(!t.entry_date || isNaN(new Date(t.entry_date).getTime())) ? "—" : new Date(t.entry_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[var(--sys-text)] whitespace-nowrap text-base">
                              {t.size}
                            </td>
                            <td className="py-3 px-4 font-mono text-base text-[var(--sys-text-secondary)] whitespace-nowrap">
                              <div className="flex items-center gap-1 text-base">
                                <span className="text-[var(--sys-text)] font-semibold">{t.entry_price}</span>
                                <span className="text-[var(--sys-text-secondary)]">→</span>
                                <span className={t.exit_price ? "text-[var(--sys-text)] font-semibold" : "opacity-40 italic"}>
                                  {t.exit_price || "---"}
                                </span>
                              </div>
                              <div className="text-sm text-[var(--sys-text-secondary)] mt-0.5">
                                SL: {t.stop_loss ?? "—"} • TP: {t.take_profit ?? "—"}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {t.tag && (
                                  <span className="text-sm uppercase tracking-wider bg-[var(--sys-blue)]/100/10 text-[var(--sys-blue)] dark:text-[var(--sys-blue)] px-1.5 py-0.5 rounded font-bold inline-block w-fit">
                                    {t.tag}
                                  </span>
                                )}
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={`text-sm ${i < t.rating ? "text-amber-500" : "text-[var(--sys-text-secondary)]"}`}>★</span>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2.5">
                                <div className="flex flex-col items-end">
                                  <span className={`font-mono font-black text-base ${(t.pnl ?? 0) >= 0 ? "text-[var(--sys-green)]" : "text-[var(--sys-red)]"}`}>
                                    {(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <progress
                                  className={`ios26-pnl-progress ${(t.pnl ?? 0) >= 0 ? "is-profit" : "is-loss"}`}
                                  value={Math.min(Math.abs(t.pnl ?? 0) / 1000, 1) * 100}
                                  max={100}
                                  aria-label="P&L scale"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleBeginEditTrade(t)}
                                  className="p-1.5 rounded-lg bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm dark:bg-[var(--sys-surface-2)] text-[var(--sys-text-secondary)] hover:text-[var(--sys-blue)] hover:bg-[var(--sys-blue)]/10 dark:hover:bg-[var(--sys-blue)]/20 transition-all cursor-pointer"
                                  title="Sửa"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTrade(t.id)}
                                  className="p-1.5 rounded-lg bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm dark:bg-[var(--sys-surface-2)] text-[var(--sys-text-secondary)] hover:text-[var(--sys-red)] hover:bg-[var(--sys-red)]/10/50 dark:hover:bg-[var(--sys-red)]/10 transition-all cursor-pointer"
                                  title="Xoá"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visibleCount < filteredTrades.length && (
                    <div className="text-center py-4">
                      <button onClick={() => setVisibleCount(prev => prev + 50)} className="px-6 py-2.5 rounded-full bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-text)] text-sm font-semibold hover:bg-[var(--sys-surface)] transition-all cursor-pointer">
                        Xem thêm ({filteredTrades.length - visibleCount} giao dịch)
                      </button>
                    </div>
                  )}
                </>
                )}
              </div>

              {/* Mobile Trades Card - Compact Redesign */}
              <div
                className="block md:hidden space-y-2"
                id="trades-mobile-scroller"
              >
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-12 text-[var(--sys-text-secondary)] text-base">
                    <BookOpen
                      size={36}
                      className="mx-auto text-[var(--sys-text-secondary)] mb-2 animate-pulse"
                    />
                    <p className="font-semibold">
                      Không tìm thấy giao dịch nào
                    </p>
                  </div>
                ) : (
                  filteredTrades.slice(0, visibleCount).map((t) => {
                    const pnlBarWidth = Math.min(Math.abs(t.pnl) / 1000, 1) * 100;
                    return (
                      <div
                        key={`mob-trade-${t.id}`}
                        className="bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm dark:bg-[var(--sys-surface-2)]/50 rounded-[20px] border border-[var(--sys-border)]/15 dark:border-[var(--sys-border)]/40 overflow-hidden shadow-sm"
                      >
                        {/* Hero: Chart Snapshot */}
                        {(t.tv_snapshot_url || t.tv_snapshot_url_close) && (
                          <div className="w-full relative">
                            <div className={`grid ${t.tv_snapshot_url && t.tv_snapshot_url_close ? 'grid-cols-2 gap-0.5' : 'grid-cols-1'} w-full`}>
                              {t.tv_snapshot_url && (
                                <div onClick={() => setLightboxUrl(t.tv_snapshot_url!)} className="w-full block relative cursor-pointer overflow-hidden aspect-[16/10] bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm dark:bg-black/30">
                                  <img src={t.tv_snapshot_url} alt="Chart Mở Lệnh" className="w-full h-full object-cover block" />
                                  <div className="absolute bottom-2 left-2 z-10">
                                    <span className="px-2 py-0.5 rounded bg-black/60 text-xs font-bold text-white uppercase backdrop-blur-sm">Mở Lệnh</span>
                                  </div>
                                </div>
                              )}
                              {t.tv_snapshot_url_close && (
                                <div onClick={() => setLightboxUrl(t.tv_snapshot_url_close!)} className="w-full block relative cursor-pointer overflow-hidden aspect-[16/10] bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm dark:bg-black/30">
                                  <img src={t.tv_snapshot_url_close} alt="Chart Đóng Lệnh" className="w-full h-full object-cover block" />
                                  <div className="absolute bottom-2 left-2 z-10">
                                    <span className="px-2 py-0.5 rounded bg-black/60 text-xs font-bold text-white uppercase backdrop-blur-sm">Đóng Lệnh</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* PnL overlay badge */}
                            <div className="absolute top-2.5 right-2.5 z-10">
                              <span className={`px-2.5 py-1 rounded-full text-sm font-black font-mono shadow-lg backdrop-blur-sm ${(t.pnl ?? 0) >= 0 ? "bg-[var(--sys-green)]/100/90 text-white" : "bg-[var(--sys-red)]/100/90 text-white"}`}>
                                {(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            {/* Direction overlay badge */}
                            <div className="absolute top-2.5 left-2.5 z-10">
                              <span className={`px-2.5 py-1 rounded-full text-sm font-black font-mono shadow-lg backdrop-blur-sm ${t.type === "BUY" ? "bg-[var(--sys-green)]/100/90 text-white" : "bg-[var(--sys-red)]/100/90 text-white"}`}>
                                {t.type} {t.pair}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Card body */}
                        <div className="p-3.5 space-y-2.5">
                          {/* Header: Pair + Direction + PnL (only if no chart image) */}
                          {!(t.tv_snapshot_url || t.tv_snapshot_url_close) && (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`px-2.5 py-0.5 rounded-full text-sm font-black font-mono ${t.type === "BUY" ? "bg-[var(--sys-green)]/100/10 text-[var(--sys-green)]" : "bg-[var(--sys-red)]/100/10 text-[var(--sys-red)]"}`}>
                                  {t.type}
                                </span>
                                <span className="font-bold text-lg text-[var(--sys-text)] truncate">{t.pair}</span>
                                {t.status === "OPEN" ? (
                                  <span className="text-sm px-2 py-0.5 rounded-full bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:bg-[var(--sys-blue)]/20 dark:text-[var(--sys-blue)] font-extrabold uppercase animate-pulse">OPEN</span>
                                ) : (
                                  <span className="text-sm px-2 py-0.5 rounded-full bg-[var(--sys-border)]/30 text-[var(--sys-text-secondary)] font-extrabold uppercase">CLOSED</span>
                                )}
                              </div>
                              <span className={`font-mono font-black text-lg ${(t.pnl ?? 0) >= 0 ? "text-[var(--sys-green)]" : "text-[var(--sys-red)]"}`}>
                                {(t.pnl ?? 0) >= 0 ? "+" : ""}${(t.pnl ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          )}

                          {/* If has chart: show pair name + status below image */}
                          {(t.tv_snapshot_url || t.tv_snapshot_url_close) && (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-[var(--sys-text)]">{t.pair}</span>
                              {t.status === "OPEN" ? (
                                <span className="text-sm px-2 py-0.5 rounded-full bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:bg-[var(--sys-blue)]/20 dark:text-[var(--sys-blue)] font-extrabold uppercase animate-pulse">OPEN</span>
                              ) : (
                                <span className="text-sm px-2 py-0.5 rounded-full bg-[var(--sys-border)]/30 text-[var(--sys-text-secondary)] font-extrabold uppercase">CLOSED</span>
                              )}
                              <span className="text-sm text-[var(--sys-text-secondary)]">•</span>
                              <span className="text-sm text-[var(--sys-text-secondary)] font-medium">{t.size} lots</span>
                            </div>
                          )}


                          {/* Price info grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-base">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--sys-text-secondary)]">Vào:</span>
                              <span className="text-[var(--sys-text)] font-mono font-semibold">{t.entry_price}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--sys-text-secondary)]">Ra:</span>
                              <span className={`font-mono font-semibold ${t.exit_price ? "text-[var(--sys-text)]" : "text-[var(--sys-text-secondary)]/40 italic"}`}>{t.exit_price || "---"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--sys-red)] font-medium">SL:</span>
                              <span className="text-[var(--sys-text-secondary)] font-mono">{t.stop_loss ?? "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--sys-green)] font-medium">TP:</span>
                              <span className="text-[var(--sys-text-secondary)] font-mono">{t.take_profit ?? "—"}</span>
                            </div>
                          </div>

                          {/* Notes */}
                          {t.notes && (
                            <p className="text-sm text-[var(--sys-text-secondary)] italic bg-[var(--sys-surface-2)]/40 dark:bg-[var(--sys-surface-2)]/20 px-3 py-2 rounded-xl leading-relaxed line-clamp-2">
                              💡 {t.notes}
                            </p>
                          )}

                          {/* Footer: Meta + Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-[var(--sys-border)]/15">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              {t.tag && (
                                <span className="text-sm uppercase tracking-wider bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] px-2 py-0.5 rounded-full font-bold">{t.tag}</span>
                              )}
                              <div className="flex gap-px">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={`text-sm ${i < t.rating ? "text-amber-500" : "text-[var(--sys-text-secondary)]/40"}`}>★</span>
                                ))}
                              </div>
                              <span className="text-sm text-[var(--sys-text-secondary)]">
                                {t.timeframe || "M15"} • {(!t.entry_date || isNaN(new Date(t.entry_date).getTime())) ? "—" : new Date(t.entry_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => handleBeginEditTrade(t)} className="p-2 rounded-xl bg-[var(--sys-surface-2)] dark:bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-text-secondary)] hover:text-[var(--sys-blue)] active:scale-95 transition-all cursor-pointer" title="Sửa">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDeleteTrade(t.id)} className="p-2 rounded-xl bg-[var(--sys-surface-2)] dark:bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-text-secondary)] hover:text-[var(--sys-red)] active:scale-95 transition-all cursor-pointer" title="Xoá">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {visibleCount < filteredTrades.length && (
                  <div className="text-center py-3">
                    <button onClick={() => setVisibleCount(prev => prev + 50)} className="px-5 py-2 rounded-full bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-text)] text-sm font-semibold cursor-pointer">
                      Xem thêm ({filteredTrades.length - visibleCount} giao dịch)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. CALENDAR MASTER TAB SCREEN */}
        {currentTab === "calendar" && (
          <div className="space-y-6" id="calendar-master-view">
            <div
              className="p-4 sm:p-6 bg-[var(--sys-surface)] rounded-[24px] border border-[var(--sys-border)] shadow-ios-sm max-w-full overflow-hidden"
              id="calendar-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sys-border)] dark:border-[var(--sys-border)] pb-3 mb-4 w-full min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--sys-blue)]/10 dark:transparent text-[var(--sys-blue)] rounded-[16px] sm:rounded-[24px] flex items-center justify-center font-bold flex-shrink-0">
                    <CalendarIcon size={18} className="sm:size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-lg font-semibold text-[var(--sys-text)]">
                      Lịch Kinh Tế Vĩ Mô
                    </h3>
                    <p className="text-base sm:text-lg text-[var(--sys-text-secondary)] mt-0.5">
                      Chỉ số USD quan trọng
                    </p>
                  </div>
                </div>

                {/* Filters row - Highly responsive layout for Mobile */}
                <div className="grid grid-cols-[1.3fr_1.1fr_auto] gap-2 w-full sm:flex sm:flex-row sm:items-center sm:gap-1.5 sm:w-auto pb-1 sm:pb-0">
                  {/* Segmented Period Selection */}
                  <div
                    className={`flex ${darkMode ? "bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm" : "bg-[var(--sys-surface-2)]"} p-1 rounded-[16px] w-full sm:w-auto`}
                  >
                    <button
                      onClick={() => setCalendarPeriodFilter("DAY")}
                      className={`flex-1 py-1.5 sm:px-4 text-sm font-medium rounded-[12px] transition-all ease-[ease-out] cursor-pointer text-center ${
                        calendarPeriodFilter === "DAY"
                          ? darkMode
                            ? "bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-blue)] shadow-xs"
                            : "bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm text-[var(--sys-blue)] shadow-xs"
                          : darkMode
                            ? "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)]"
                            : "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)]"
                      }`}
                    >
                      Hôm Nay
                    </button>
                    <button
                      onClick={() => setCalendarPeriodFilter("WEEK")}
                      className={`flex-1 py-1.5 sm:px-4 text-sm font-medium rounded-[12px] transition-all ease-[ease-out] cursor-pointer text-center ${
                        calendarPeriodFilter === "WEEK"
                          ? darkMode
                            ? "bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-blue)] shadow-xs"
                            : "bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm text-[var(--sys-blue)] shadow-xs"
                          : darkMode
                            ? "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)]"
                            : "text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)]"
                      }`}
                    >
                      Tuần Này
                    </button>
                  </div>

                  {/* Beautiful Dot Markers as Interactive Filters */}
                  <div
                    className={`flex ${darkMode ? "bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm" : "bg-[var(--sys-surface-2)]"} p-1 rounded-[16px] items-center justify-around w-full sm:w-auto sm:gap-1`}
                  >
                    <button
                      onClick={() => setCalendarImpactFilter("ALL")}
                      className={`px-3 py-1.5 rounded-[12px] flex items-center justify-center gap-1 transition-all ease-[ease-out] cursor-pointer flex-1 ${
                        calendarImpactFilter === "ALL"
                          ? darkMode
                            ? "bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-blue)] shadow-xs"
                            : "bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm text-[var(--sys-blue)] shadow-xs"
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
                      className={`px-3 py-1.5 rounded-[12px] flex items-center justify-center gap-1 transition-all ease-[ease-out] cursor-pointer flex-1 ${
                        calendarImpactFilter === "MEDIUM"
                          ? darkMode
                            ? "bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-blue)] shadow-xs"
                            : "bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm text-[var(--sys-blue)] shadow-xs"
                          : "opacity-40 hover:opacity-95"
                      }`}
                      title="Tin từ trung bình trở lên (Đỏ, Vàng)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    </button>
                    <button
                      onClick={() => setCalendarImpactFilter("HIGH")}
                      className={`px-3 py-1.5 rounded-[12px] flex items-center justify-center gap-1 transition-all ease-[ease-out] cursor-pointer flex-1 ${
                        calendarImpactFilter === "HIGH"
                          ? darkMode
                            ? "bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-blue)] shadow-xs"
                            : "bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm text-[var(--sys-blue)] shadow-xs"
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
                    className="p-2.5 bg-[var(--sys-surface-2)] dark:bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm dark:hover:bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[16px] transition-all ease-[ease-out] cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
                    title="Cập nhật lịch kinh tế mới nhất"
                  >
                    <RefreshCw
                      size={14}
                      className={
                        refreshingCalendar
                          ? "animate-spin text-[var(--sys-blue)]"
                          : "text-[var(--sys-text-secondary)]"
                      }
                    />
                  </button>
                </div>
              </div>

              {/* Day-by-Day Calendar Render list */}
              {loadingCalendar ? (
                <div className="py-24 text-center space-y-4">
                  <RefreshCw
                    className="animate-spin text-[var(--sys-blue)] mx-auto"
                    size={32}
                  />
                  <p className="text-lg text-[var(--sys-text-secondary)]">
                    Đang quét nguồn dữ liệu Forex Factory Live...
                  </p>
                </div>
              ) : groupedEventsByDay.length === 0 ? (
                <div className="py-20 text-center text-[var(--sys-text-secondary)]">
                  <CloudLightning
                    className="mx-auto text-[var(--sys-text-secondary)] dark:text-[var(--sys-text-secondary)] animate-pulse mb-3"
                    size={48}
                  />
                  <p className="font-semibold text-lg">
                    Không thấy sự kiện kinh tế USD tương thích
                  </p>
                  <p className="text-base text-[var(--sys-text-secondary)] mt-1">
                    Vui lòng thử điều chỉnh lại bộ lọc tác động sự kiện.
                  </p>
                </div>
              ) : (
                <div className="space-y-8" id="calendar-days-feed">
                  {groupedEventsByDay.map(([dayName, events]) => (
                    <div key={dayName} className="space-y-4">
                      <h4 className="text-base sm:text-base font-semibold uppercase tracking-widest text-[var(--sys-blue)] dark:text-[var(--sys-blue)] bg-[var(--sys-blue)]/10 dark:transparent px-3 py-1.5 rounded-[12px] inline-block">
                        {dayName}
                      </h4>

                      <div className="flex flex-col gap-2">
                        {events.map((ev, index) => {
                          const style = getImpactColorClasses(ev.impact);
                          const evTime = new Date(ev.date).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" },
                          );

                          return (
                            <div
                              key={`${dayName}-${index}`}
                              className="flex items-center gap-2 sm:gap-4 p-2.5 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm dark:bg-[var(--sys-surface-2)]/45 rounded-[16px] border border-[var(--sys-border)]/15 dark:border-[var(--sys-border)] hover:bg-[var(--sys-surface-2)] transition-colors"
                            >
                              {/* Cột 1: Giờ & Impact */}
                              <div className="flex flex-col items-center justify-center min-w-[48px] sm:min-w-[60px] flex-shrink-0">
                                <span className="font-mono font-bold text-sm text-[var(--sys-text)]">{evTime}</span>
                                <div className={`mt-1 rounded px-1.5 py-0.5 text-xs uppercase tracking-wider font-extrabold ${style.text} ${style.bg}`}>
                                  {style.label}
                                </div>
                              </div>

                              {/* Cột 2: Tiêu đề & Quốc gia */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h5 className="font-bold text-sm sm:text-base text-[var(--sys-text)] truncate leading-snug mb-0.5">
                                  {ev.title}
                                </h5>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm bg-[var(--sys-text)]/5 dark:bg-[var(--sys-text)]/10 px-1.5 py-0.5 rounded text-[var(--sys-text-secondary)] uppercase font-mono tracking-wider">
                                    {ev.country}
                                  </span>
                                  <span className="text-xs text-[var(--sys-text-secondary)] hidden sm:inline-block">
                                    {timezoneOffsetStr}
                                  </span>
                                </div>
                              </div>

                              {/* Cột 3: Desktop Stats */}
                              <div className="hidden md:flex flex-col items-end flex-shrink-0 gap-1.5 border-l border-[var(--sys-border)]/20 pl-4">
                                <div className="flex items-center gap-3 font-mono text-sm text-[var(--sys-text-secondary)]">
                                  <span>Dự báo: <strong className="text-[var(--sys-text)]">{ev.forecast || "-"}</strong></span>
                                  <span>Trước: <strong className="text-[var(--sys-text)]">{ev.previous || "-"}</strong></span>
                                </div>
                                <div className="font-mono text-base flex items-center gap-1.5">
                                  <span className="text-sm uppercase font-bold text-[var(--sys-blue)] dark:text-[var(--sys-blue)]">Thực tế:</span>
                                  <strong className="text-[var(--sys-blue)] dark:text-[var(--sys-blue)] font-black">{ev.actual || "Đợi tin"}</strong>
                                </div>
                              </div>

                              {/* Cột 3: Mobile Stats */}
                              <div className="flex md:hidden flex-col items-end justify-center flex-shrink-0 min-w-[70px]">
                                <div className="font-mono text-xs text-[var(--sys-text-secondary)] mb-0.5 flex items-center gap-1">
                                  <span className="opacity-60">DB:</span> <strong>{ev.forecast || "-"}</strong>
                                </div>
                                <div className="font-mono text-sm font-black text-[var(--sys-blue)] dark:text-[var(--sys-blue)] flex items-center gap-1">
                                  <span className="opacity-60 text-xs uppercase">TT:</span> {ev.actual || "-"}
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
              className="relative w-full max-w-[100vw] sm:max-w-2xl bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm sm:rounded-[28px] rounded-t-[28px] shadow-ios-xl z-10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-x-hidden overflow-y-hidden"
              id="new-trade-modal-window"
            >
              <div className="flex justify-between items-center px-5 sm:px-8 py-4 sm:py-6 border-b border-[var(--sys-border)] bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm z-20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex p-3 bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] dark:transparent dark:text-[var(--sys-blue)] rounded-[16px]">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--sys-text)] font-display">
                      {editingTradeId
                        ? "Cập Nhật Giao Dịch"
                        : "Ghi Chép Giao Dịch Mới"}
                    </h3>
                    <p className="text-base text-[var(--sys-text-secondary)] mt-0.5">
                      {editingTradeId
                        ? "Cập nhật các số liệu, ghi chú hoặc tất toán giao dịch"
                        : "Ghi nhận chi tiết để theo dõi biểu đồ tăng trưởng"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="p-2 sm:p-1.5 hover:bg-[var(--sys-surface-2)] dark:hover:bg-white/5 rounded-full transition-colors ease-[ease-out] text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)] dark:hover:text-[var(--sys-text)] cursor-pointer"
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
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Cặp ngoại tệ
                      </label>
                      <select
                        value={formPair}
                        onChange={(e) => setFormPair(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-bold cursor-pointer"
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
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Hướng lệnh
                      </label>
                      <div className="flex border border-[var(--sys-border)] rounded-full w-full h-12 overflow-hidden text-base font-semibold">
                        <button
                          type="button"
                          onClick={() => setFormType("BUY")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[ease-out] cursor-pointer active:scale-95 transition-transform border-r border-[var(--sys-border)] ${formType === "BUY" ? "bg-emerald-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}
                        >
                          MUA
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormType("SELL")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[ease-out] cursor-pointer active:scale-95 transition-transform ${formType === "SELL" ? "bg-rose-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}
                        >
                          BÁN
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Entry Price & Lots Size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Giá vào lệnh *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="VD: 1.0854"
                        value={formEntryPrice}
                        onChange={(e) => setFormEntryPrice(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-mono"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Khối lượng (Lots) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.01"
                        value={formSize}
                        onChange={(e) => setFormSize(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* SL, TP Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Chặn lỗ
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Tùy chọn - SL"
                        value={formStopLoss}
                        onChange={(e) => setFormStopLoss(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-mono"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Chốt lời
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Tùy chọn - TP"
                        value={formTakeProfit}
                        onChange={(e) => setFormTakeProfit(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-mono"
                      />
                    </div>
                  </div>

                  {/* Status Switch Open / Closed & Timeframe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="min-w-0">
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Trạng thái giao dịch
                      </label>
                      <div className="flex border border-[var(--sys-border)] rounded-full w-full h-12 overflow-hidden text-base font-semibold text-base sm:text-lg">
                        <button
                          type="button"
                          onClick={() => setFormStatus("CLOSED")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[ease-out] cursor-pointer active:scale-95 transition-transform border-r border-[var(--sys-border)] min-w-0 px-2 ${formStatus === "CLOSED" ? "bg-indigo-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}
                        >
                          <span className="truncate">ĐÃ ĐÓNG</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormStatus("OPEN")}
                          className={`flex-1 h-full flex items-center justify-center transition-colors ease-[ease-out] cursor-pointer active:scale-95 transition-transform min-w-0 px-2 ${formStatus === "OPEN" ? "bg-cyan-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}
                        >
                          <span className="truncate">ĐANG MỞ</span>
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Khung thời gian
                      </label>
                      <select
                        value={formTimeframe}
                        onChange={(e) => setFormTimeframe(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-bold cursor-pointer"
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
                    <div className="p-3 sm:p-5 rounded-[16px] sm:rounded-[20px] bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                      <div className="min-w-0">
                        <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                          Giá đóng lệnh
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="VD: 1.0920"
                          value={formExitPrice}
                          onChange={(e) => setFormExitPrice(e.target.value)}
                          className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-mono"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
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
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
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
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                        Chiến lược
                      </label>
                      <select
                        value={formTag}
                        onChange={(e) => setFormTag(e.target.value)}
                        className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] font-bold cursor-pointer"
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
                    <label className="text-sm font-medium text-[var(--sys-text-secondary)] mb-1.5 block">
                      Lý do vào lệnh
                    </label>
                    <textarea
                      rows={2.5}
                      placeholder="Tại sao bạn khớp lệnh này? Khung cảm xúc, phân tích kỹ thuật hoặc nhận định tin tức của bạn..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full min-w-0 px-3 py-3 sm:p-3.5 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm border border-[var(--sys-border)] rounded-[4px] text-lg focus:outline-none focus:ring-0 focus:border-[var(--sys-blue)] focus:border-2 text-[var(--sys-text)] transition-colors ease-[ease-out] resize-none"
                    ></textarea>
                  </div>

                  {/* TradingView Snapshot Open Feature */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-[var(--sys-text-secondary)] block">
                        Ảnh biểu đồ Mở Lệnh (TradingView)
                      </label>
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        disabled={isCapturingSnapshot || !formPair}
                        className="text-sm font-bold text-[var(--sys-blue)] flex items-center gap-1 hover:underline disabled:opacity-50"
                      >
                        {isCapturingSnapshot ? (
                          <><RefreshCw size={12} className="animate-spin" /> Đang chụp...</>
                        ) : (
                          <><Camera size={12} /> Tự động chụp {formPair && `(${formPair})`}</>
                        )}
                      </button>
                    </div>
                    {formTVSnapshotUrl ? (
                      <div className="relative border border-[var(--sys-border)] rounded-lg overflow-hidden group max-h-[160px] flex items-center justify-center bg-black/10 w-full">
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(formTVSnapshotUrl)}
                          className="block w-full cursor-zoom-in"
                          title="Xem ảnh lớn"
                        >
                          <img src={formTVSnapshotUrl} alt="Chart" className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </button>
                        <div className="absolute top-2 right-2 z-10 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(formTVSnapshotUrl)}
                            className="p-2.5 bg-black/60 text-white rounded-full shadow-lg hover:bg-black/80 transition-colors"
                            title="Xem ảnh lớn"
                          >
                            <Maximize2 size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormTVSnapshotUrl("")}
                            className="p-2.5 bg-[var(--sys-red)]/100 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                            title="Xoá ảnh"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-[var(--sys-border)] rounded-lg p-4 flex flex-col items-center justify-center text-[var(--sys-text-secondary)]/60 gap-2 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm">
                        <Camera size={24} className="opacity-50" />
                        <span className="text-sm">Chưa có ảnh chụp biểu đồ mở lệnh</span>
                      </div>
                    )}
                  </div>

                  {/* TradingView Snapshot Close Feature */}
                  {formStatus === "CLOSED" && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-[var(--sys-text-secondary)] block">
                          Ảnh biểu đồ Đóng Lệnh (TradingView)
                        </label>
                        <button
                          type="button"
                          onClick={handleCaptureSnapshotClose}
                          disabled={isCapturingSnapshotClose || !formPair}
                          className="text-sm font-bold text-[var(--sys-blue)] flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                          {isCapturingSnapshotClose ? (
                            <><RefreshCw size={12} className="animate-spin" /> Đang chụp...</>
                          ) : (
                            <><Camera size={12} /> Tự động chụp {formPair && `(${formPair})`}</>
                          )}
                        </button>
                      </div>
                      {formTVSnapshotUrlClose ? (
                        <div className="relative border border-[var(--sys-border)] rounded-lg overflow-hidden group max-h-[160px] flex items-center justify-center bg-black/10 w-full">
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(formTVSnapshotUrlClose)}
                            className="block w-full cursor-zoom-in"
                            title="Xem ảnh lớn"
                          >
                            <img src={formTVSnapshotUrlClose} alt="Chart" className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          </button>
                          <div className="absolute top-2 right-2 z-10 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(formTVSnapshotUrlClose)}
                              className="p-2.5 bg-black/60 text-white rounded-full shadow-lg hover:bg-black/80 transition-colors"
                              title="Xem ảnh lớn"
                            >
                              <Maximize2 size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormTVSnapshotUrlClose("")}
                              className="p-2.5 bg-[var(--sys-red)]/100 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                              title="Xoá ảnh"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-[var(--sys-border)] rounded-lg p-4 flex flex-col items-center justify-center text-[var(--sys-text-secondary)]/60 gap-2 bg-[var(--sys-surface)] rounded-2xl border border-[var(--sys-border)] shadow-ios-sm">
                          <Camera size={24} className="opacity-50" />
                          <span className="text-sm">Chưa có ảnh chụp biểu đồ đóng lệnh</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating selection (Stars) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--sys-surface)] rounded-[16px] border border-[var(--sys-border)]">
                    <div>
                      <span className="font-bold text-[var(--sys-text)] text-base block">
                        Mức Độ Tuân Thủ Kỷ Luật
                      </span>
                      <span className="text-base text-[var(--sys-text-secondary)] mt-1 block">
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
                                  ? "text-amber-500 drop-shadow-xs font-bold"
                                  : "text-[var(--sys-text-secondary)] dark:text-[var(--sys-text-secondary)] hover:text-[var(--sys-text-secondary)]"
                              }
                            >
                              ★
                            </span>
                          </button>
                        ))}
                      </div>
                      <span className="text-base text-[var(--sys-text-secondary)] font-bold font-mono min-w-[45px]">
                        ({formRating}/5 sao)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save controls */}
                <div className="trade-form-actions px-5 sm:px-8 py-4 sm:py-5 border-t border-[var(--sys-border)] flex flex-col-reverse sm:flex-row gap-3 justify-end items-center z-20 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,16px))] sm:pb-5">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-transparent border border-[var(--sys-border)] text-[var(--sys-blue)] rounded-[20px] text-base font-semibold active:scale-95 transition-transform cursor-pointer transition-colors ease-[ease-out] text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="trade-form-submit w-full sm:w-auto px-8 py-2.5 text-white rounded-[20px] text-base font-semibold active:scale-95 transition-transform active:scale-[0.98] transition-all ease-[ease-out] cursor-pointer text-center"
                  >
                    {editingTradeId ? "Cập nhật dữ liệu" : "Ghi lại giao dịch"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. SYSTEM SETTINGS MODAL */}
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
          className="w-14 h-14 bg-[var(--sys-blue)] text-white rounded-full flex items-center justify-center shadow-ios-xl active:scale-95 transition-transform cursor-pointer"
          aria-label="Thêm lệnh nhanh"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Quick Add Mini Modal */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="quick-add-modal-root">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsQuickAddOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 120 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full sm:max-w-md bg-[var(--sys-surface)] rounded-t-[28px] sm:rounded-[28px] border border-[var(--sys-border)] shadow-ios-xl z-10 p-5 pb-8"
              id="quick-add-modal-window"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--sys-text)]">Lệnh nhanh</h3>
                <button onClick={() => setIsQuickAddOpen(false)} className="p-2 rounded-full hover:bg-[var(--sys-surface-2)] cursor-pointer">
                  <X size={20} />
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
                  <select name="pair" defaultValue="EUR/USD" className="px-3 py-3 bg-[var(--sys-surface-2)] rounded-[12px] border border-[var(--sys-border)] text-[var(--sys-text)] text-base focus:outline-none focus:border-[var(--sys-blue)]">
                    {["EUR/USD","GBP/USD","USD/JPY","AUD/USD","USD/CAD","NZD/USD","USD/CHF","XAU/USD","BTC/USD"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select name="type" defaultValue="BUY" className="px-3 py-3 bg-[var(--sys-surface-2)] rounded-[12px] border border-[var(--sys-border)] text-[var(--sys-text)] text-base focus:outline-none focus:border-[var(--sys-blue)]">
                    <option value="BUY">MUA (BUY)</option>
                    <option value="SELL">BÁN (SELL)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input name="entry_price" type="number" step="any" placeholder="Giá vào" required className="px-3 py-3 bg-[var(--sys-surface-2)] rounded-[12px] border border-[var(--sys-border)] text-[var(--sys-text)] text-base focus:outline-none focus:border-[var(--sys-blue)] font-mono" />
                  <input name="exit_price" type="number" step="any" placeholder="Giá ra (tuỳ)" className="px-3 py-3 bg-[var(--sys-surface-2)] rounded-[12px] border border-[var(--sys-border)] text-[var(--sys-text)] text-base focus:outline-none focus:border-[var(--sys-blue)] font-mono" />
                  <input name="size" type="number" step="0.01" placeholder="Lots" required className="px-3 py-3 bg-[var(--sys-surface-2)] rounded-[12px] border border-[var(--sys-border)] text-[var(--sys-text)] text-base focus:outline-none focus:border-[var(--sys-blue)] font-mono" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsQuickAddOpen(false)} className="flex-1 py-3 rounded-[12px] border border-[var(--sys-border)] text-[var(--sys-text)] font-semibold cursor-pointer">Huỷ</button>
                  <button type="submit" className="flex-1 py-3 rounded-[12px] bg-[var(--sys-blue)] text-white font-semibold cursor-pointer">Thêm lệnh</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-[16px] shadow-ios-lg backdrop-blur-xl text-sm font-medium animate-in slide-in-from-right-2
            ${t.type === 'success' ? 'bg-[var(--sys-green)] text-white' : 
              t.type === 'error' ? 'bg-[var(--sys-red)] text-white' : 
              'bg-[var(--sys-surface)] border border-[var(--sys-border)] text-[var(--sys-text)]'}`}>
            {t.message}
          </div>
        ))}
      </div>

      <footer
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 transition-colors ease-[ease-out] backdrop-blur-xl ${darkMode ? "bg-[var(--sys-surface-2)]/95 border-t border-[var(--sys-border)]" : "bg-[var(--sys-surface)] border-t border-[var(--sys-border)]"}`}
        id="ios-bottom-nav"
      >
        <button
          onClick={() => setCurrentTab("dashboard")}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 ${currentTab === "dashboard" ? "text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)]"}`}
        >
          <div
            className={`p-1.5 rounded-full ${currentTab === "dashboard" ? "bg-[var(--sys-blue)]/10 dark:transparent" : ""}`}
          >
            <BarChart2 size={28} />
          </div>
          <span className="text-[10px] font-[400]">Tổng quan</span>
        </button>

        <button
          onClick={() => setCurrentTab("journal")}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 ${currentTab === "journal" ? "text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)]"}`}
        >
          <div
            className={`p-1.5 rounded-full ${currentTab === "journal" ? "bg-[var(--sys-blue)]/10 dark:transparent" : ""}`}
          >
            <FileText size={28} />
          </div>
          <span className="text-[10px] font-[400]">Nhật ký</span>
        </button>

        <button
          onClick={() => setCurrentTab("calendar")}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 ${currentTab === "calendar" ? "text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)]"}`}
        >
          <div
            className={`p-1.5 rounded-full ${currentTab === "calendar" ? "bg-[var(--sys-blue)]/10 dark:transparent" : ""}`}
          >
            <CalendarIcon size={28} />
          </div>
          <span className="text-[10px] font-[400]">Kinh tế</span>
        </button>

        <button
          onClick={() => setCurrentTab("news")}
          className={`flex flex-col items-center gap-0.5 justify-center flex-1 ${currentTab === "news" ? "text-[var(--sys-blue)]" : "text-[var(--sys-text-secondary)]"}`}
        >
          <div
            className={`p-1.5 rounded-full ${currentTab === "news" ? "bg-[var(--sys-blue)]/10 dark:transparent" : ""}`}
          >
            <Newspaper size={28} />
          </div>
          <span className="text-[10px] font-[400]">Tin tức</span>
        </button>
      </footer>

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
