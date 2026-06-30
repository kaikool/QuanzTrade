import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings, Sun, Moon, BellRing, CloudLightning, TrendingUp,
  BarChart2, ShieldCheck, Download, AlertTriangle, X, RefreshCw,
} from "lucide-react";

/* ─── iOS 26 grouped-list section ─── */

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SectionProps) {
  return (
    <section>
      <h2 className="text-[12px] font-bold tracking-[0.04em] text-[var(--ios-secondary-label)] uppercase px-[18px] mb-[6px]">
        {title}
      </h2>
      <div className="ios26-glass rounded-[16px] overflow-hidden"
        style={{ backdropFilter: "saturate(180%) blur(24px)", WebkitBackdropFilter: "saturate(180%) blur(24px)" }}>
        {children}
      </div>
    </section>
  );
}

/* ─── iOS 26 grouped row ─── */

interface RowProps {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  control: React.ReactNode;
  expanded?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

function SettingsRow({ icon, label, desc, control, expanded, isFirst, isLast }: RowProps) {
  return (
    <div className={`flex items-center justify-between px-[16px] py-[12px] min-h-[48px]
      ${!isFirst ? "border-t border-[var(--ios-separator)]/30" : ""}
      ${isLast ? "" : ""}
      ${expanded ? "bg-[var(--ios-blue)]/[0.03]" : ""}`}>
      <div className="flex items-center gap-[14px] min-w-0 flex-1">
        <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] text-[var(--ios-label)] font-normal leading-[20px] truncate">
            {label}
          </p>
          {desc && (
            <p className="text-[12px] text-[var(--ios-secondary-label)] leading-[16px] mt-[1px] truncate">
              {desc}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 ml-3">
        {control}
      </div>
    </div>
  );
}

/* ─── iOS 26 toggle switch ─── */
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`relative w-[51px] h-[31px] rounded-full p-[2px] transition-colors shrink-0 cursor-pointer ${
        on ? "bg-[var(--ios-green)]" : "bg-[var(--ios-separator)]"
      }`}
    >
      <div className={`w-[27px] h-[27px] bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
        on ? "translate-x-[20px]" : "translate-x-0"
      }`} />
    </button>
  );
}

/* ─── iOS 26 chevron ─── */
function Chevron() {
  return (
    <svg width="9" height="14" viewBox="0 0 9 14" fill="none" className="text-[var(--ios-tertiary-label)] opacity-50">
      <path d="M1.5 1L7.5 7L1.5 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─── Glass input – matches iOS 26 Settings style ─── */
function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-[14px] py-[10px] bg-[var(--ios-surface)]/90 rounded-[10px] text-[16px] text-[var(--ios-label)] font-normal font-mono placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30 transition-shadow ${props.className || ""}`}
      style={{ backdropFilter: "saturate(180%) blur(12px)", WebkitBackdropFilter: "saturate(180%) blur(12px)", ...(props.style || {}) }}
    />
  );
}

function GlassTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-[14px] py-[10px] bg-[var(--ios-surface)]/90 rounded-[10px] text-[16px] text-[var(--ios-label)] font-normal font-mono placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30 transition-shadow resize-none ${props.className || ""}`}
      style={{ backdropFilter: "saturate(180%) blur(12px)", WebkitBackdropFilter: "saturate(180%) blur(12px)", ...(props.style || {}) }}
    />
  );
}

/* ─── Expandable content (slides out under the master row) ─── */
function ExpandContent({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden transition-all duration-250 ease-out ${
      expanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
    }`}>
      <div className="px-[16px] pb-[14px] pt-[2px] space-y-[10px]">
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  /* Supabase */
  dbUrl: string;
  setDbUrl: (v: string) => void;
  dbAnon: string;
  setDbAnon: (v: string) => void;
  supabaseConnected: boolean;
  handleSaveSupabaseConfig: () => void;
  testSupabaseConnection: () => void;
  /* TradingView */
  tvSessionId: string;
  setTvSessionId: (v: string) => void;
  tvSessionSign: string;
  setTvSessionSign: (v: string) => void;
  browserlessToken: string;
  setBrowserlessToken: (v: string) => void;
  tvSaveResult: string | null;
  tvSaving: boolean;
  saveTVCreds: () => void;
  /* The5ers */
  t5Accounts: any[];
  t5Loading: boolean;
  selectedT5AccountIds: string[];
  setSelectedT5AccountIds: (v: string[]) => void;
  t5Email: string;
  setT5Email: (v: string) => void;
  t5DsrToken: string;
  setT5DsrToken: (v: string) => void;
  t5Saving: boolean;
  t5Syncing: boolean;
  t5SaveResult: string | null;
  loadT5Data: () => void;
  saveT5Creds: () => void;
  syncT5Now: () => void;
  loadT5AccountTrades: (accountId: string) => void;
  /* Security */
  sitePassword: string;
  setSitePassword: (v: string) => void;
  /* Danger */
  deferredPrompt: any;
  handleInstallAppPWA: () => void;
  handleResetLocalStorage: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const {
    isOpen, onClose,
    darkMode, setDarkMode,
    notificationsEnabled, toggleNotifications,
    dbUrl, setDbUrl, dbAnon, setDbAnon, supabaseConnected,
    handleSaveSupabaseConfig, testSupabaseConnection,
    tvSessionId, setTvSessionId, tvSessionSign, setTvSessionSign,
    browserlessToken, setBrowserlessToken, tvSaveResult, tvSaving, saveTVCreds,
    t5Accounts, t5Loading, selectedT5AccountIds, setSelectedT5AccountIds,
    t5Email, setT5Email, t5DsrToken, setT5DsrToken,
    t5Saving, t5Syncing, t5SaveResult, loadT5Data, saveT5Creds, syncT5Now, loadT5AccountTrades,
    sitePassword, setSitePassword,
    deferredPrompt, handleInstallAppPWA, handleResetLocalStorage, showToast,
  } = props;

  // Local expand states
  const [sbExp, setSbExp] = useState(() => localStorage.getItem("settings_sb") === "true" || !!localStorage.getItem("trade_app_supabase_url"));
  const [tvExp, setTvExp] = useState(() => localStorage.getItem("settings_tv") === "true" || !!localStorage.getItem("tv_session_id"));
  const [t5Exp, setT5Exp] = useState(() => localStorage.getItem("settings_t5") === "true" || !!localStorage.getItem("t5_email"));
  const [secExp, setSecExp] = useState(false);

  const toggleSb = () => { const n = !sbExp; setSbExp(n); localStorage.setItem("settings_sb", n ? "true" : "false"); };
  const toggleTv = () => { const n = !tvExp; setTvExp(n); localStorage.setItem("settings_tv", n ? "true" : "false"); };
  const toggleT5 = () => { const n = !t5Exp; setT5Exp(n); localStorage.setItem("settings_t5", n ? "true" : "false"); };

  // Color icon container
  const IconBox = ({ bg, text, children }: { bg: string; text: string; children: React.ReactNode }) => (
    <div className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 ${bg} ${text}`}>
      {children}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" id="settings-modal-root">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 120, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 120, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="relative w-full sm:max-w-[400px] ios-glass ios26-card sm:rounded-[30px] rounded-t-[30px] shadow-ios-xl z-10 flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden"
          >
            {/* Grabber */}
            <div className="flex justify-center pt-[10px] sm:hidden shrink-0">
              <div className="w-[36px] h-[4px] rounded-full bg-[var(--ios-separator)]" />
            </div>

            {/* Header – iOS Settings style */}
            <div className="flex items-center justify-between px-[20px] py-[12px] shrink-0 border-b border-[var(--ios-separator)]/30">
              <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[var(--ios-label)]">
                Cài đặt
              </h1>
              <button
                onClick={onClose}
                className="w-[30px] h-[30px] flex items-center justify-center rounded-full ios26-glass text-[var(--ios-secondary-label)] active:scale-90 transition-transform cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-[12px] py-[16px] space-y-[18px] no-scrollbar bg-[var(--ios-bg)]">

              {/* ─── 1. Giao diện ─── */}
              <SettingsSection title="Giao diện">
                <div className="flex px-[16px] py-[12px] gap-[10px]">
                  <button
                    onClick={() => setDarkMode(false)}
                    className={`flex-1 flex flex-col items-center gap-[6px] py-[12px] rounded-[12px] transition-all cursor-pointer ${
                      !darkMode ? "bg-[var(--ios-blue)] text-white" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"
                    }`}
                  >
                    <Sun size={22} />
                    <span className="text-[13px] font-semibold">Sáng</span>
                  </button>
                  <button
                    onClick={() => setDarkMode(true)}
                    className={`flex-1 flex flex-col items-center gap-[6px] py-[12px] rounded-[12px] transition-all cursor-pointer ${
                      darkMode ? "bg-[var(--ios-blue)] text-white" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"
                    }`}
                  >
                    <Moon size={22} />
                    <span className="text-[13px] font-semibold">Tối</span>
                  </button>
                </div>
              </SettingsSection>

              {/* ─── 2. Thông báo ─── */}
              <SettingsSection title="Thông báo">
                <SettingsRow
                  icon={<IconBox bg="bg-rose-500/15" text="text-rose-500"><BellRing size={16} /></IconBox>}
                  label="Tin Đỏ USD"
                  desc="Báo trước 1 giờ"
                  control={<Toggle on={notificationsEnabled} onClick={toggleNotifications} />}
                  isFirst
                  isLast
                />
              </SettingsSection>

              {/* ─── 3. Supabase ─── */}
              <SettingsSection title="Đám mây">
                <div>
                  <SettingsRow
                    icon={<IconBox bg="bg-[var(--ios-blue)]/15" text="text-[var(--ios-blue)]"><CloudLightning size={16} /></IconBox>}
                    label="Supabase"
                    desc={supabaseConnected ? "Đã kết nối" : "Đồng bộ đám mây"}
                    control={<Toggle on={sbExp} onClick={toggleSb} />}
                    expanded={sbExp}
                    isFirst
                  />
                  <ExpandContent expanded={sbExp}>
                    <div className="space-y-[8px]">
                      <input type="text" value={dbUrl} onChange={e => setDbUrl(e.target.value)} placeholder="https://...supabase.co"
                        className="w-full px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[15px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30" />
                      <input type="password" value={dbAnon} onChange={e => setDbAnon(e.target.value)} placeholder="Anon Key"
                        className="w-full px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[15px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30" />
                      <div className="flex items-center justify-between pt-[4px]">
                        <span className={`text-[13px] font-medium flex items-center gap-1.5 ${supabaseConnected ? "text-[var(--ios-green)]" : "text-[var(--ios-secondary-label)]"}`}>
                          <span className={`w-2 h-2 rounded-full ${supabaseConnected ? "bg-[var(--ios-green)]" : "bg-[var(--ios-separator)]"}`} />
                          {supabaseConnected ? "Đã kết nối" : "Chưa kết nối"}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={handleSaveSupabaseConfig} className="px-[14px] py-[7px] bg-[var(--ios-surface)]/80 rounded-[8px] text-[var(--ios-label)] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer border border-[var(--ios-separator)]/30">Lưu</button>
                          <button onClick={testSupabaseConnection} className="px-[14px] py-[7px] bg-[var(--ios-blue)] text-white rounded-[8px] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer shadow-sm">Kiểm tra</button>
                        </div>
                      </div>
                    </div>
                  </ExpandContent>
                </div>
              </SettingsSection>

              {/* ─── 4. TradingView ─── */}
              <SettingsSection title="Biểu đồ">
                <div>
                  <SettingsRow
                    icon={<IconBox bg="bg-indigo-500/15" text="text-indigo-500"><TrendingUp size={16} /></IconBox>}
                    label="TradingView"
                    desc="Chụp biểu đồ tự động"
                    control={<Toggle on={tvExp} onClick={toggleTv} />}
                    expanded={tvExp}
                    isFirst
                  />
                  <ExpandContent expanded={tvExp}>
                    <div className="space-y-[8px]">
                      <input type="text" value={tvSessionId} onChange={e => { setTvSessionId(e.target.value); localStorage.setItem("tv_session_id", e.target.value); }} placeholder="Session ID"
                        className="w-full px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[15px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30" />
                      <input type="text" value={tvSessionSign} onChange={e => { setTvSessionSign(e.target.value); localStorage.setItem("tv_session_sign", e.target.value); }} placeholder="Session Sign"
                        className="w-full px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[15px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30" />
                      <input type="password" value={browserlessToken} onChange={e => setBrowserlessToken(e.target.value)} placeholder="Browserless Token"
                        className="w-full px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[15px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30" />
                      <div className="flex items-center justify-between pt-[4px]">
                        <span className={`text-[13px] font-medium ${(tvSaveResult || "").includes("✅") ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>{tvSaveResult || ""}</span>
                        <button onClick={saveTVCreds} disabled={tvSaving} className="px-[14px] py-[7px] bg-[var(--ios-blue)] text-white rounded-[8px] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer shadow-sm disabled:opacity-50">
                          {tvSaving ? "Đang lưu…" : "Lưu"}
                        </button>
                      </div>
                    </div>
                  </ExpandContent>
                </div>
              </SettingsSection>

              {/* ─── 5. The5ers ─── */}
              <SettingsSection title="Quỹ">
                <div>
                  <SettingsRow
                    icon={<IconBox bg="bg-emerald-500/15" text="text-emerald-500"><BarChart2 size={16} /></IconBox>}
                    label="The5ers"
                    desc={`${selectedT5AccountIds.length}/${t5Accounts.length} tài khoản`}
                    control={<Toggle on={t5Exp} onClick={toggleT5} />}
                    expanded={t5Exp}
                    isFirst
                  />
                  <ExpandContent expanded={t5Exp}>
                    <div className="space-y-[10px]">
                      {/* Account list */}
                      <div>
                        <div className="flex items-center justify-between mb-[6px]">
                          <p className="text-[14px] font-semibold text-[var(--ios-label)]">Tài khoản</p>
                          <button onClick={loadT5Data} disabled={t5Loading} className="flex items-center gap-1 px-[10px] py-[5px] bg-[var(--ios-surface)]/80 rounded-[8px] text-[var(--ios-label)] text-[12px] font-semibold active:scale-95 transition-transform cursor-pointer border border-[var(--ios-separator)]/30">
                            <RefreshCw size={12} className={t5Loading ? "animate-spin" : ""} /> Làm mới
                          </button>
                        </div>
                        {t5Loading ? (
                          <p className="text-[13px] text-[var(--ios-secondary-label)] py-[12px] text-center">Đang tải…</p>
                        ) : t5Accounts.length === 0 ? (
                          <p className="text-[13px] text-[var(--ios-secondary-label)] py-[12px] text-center">Chưa có dữ liệu</p>
                        ) : (
                          <div className="max-h-[160px] overflow-y-auto space-y-[6px] no-scrollbar">
                            {t5Accounts.map((acc: any) => {
                              const checked = selectedT5AccountIds.includes(acc.accountId);
                              const active = acc.status === "active" || acc.status === "available";
                              return (
                                <label key={acc.accountId} className={`flex items-center justify-between px-[12px] py-[8px] rounded-[10px] transition-colors cursor-pointer ${checked ? "bg-[var(--ios-blue)]/10 border border-[var(--ios-blue)]/25" : "bg-[var(--ios-bg)] border border-transparent"} ${!active ? "opacity-50" : ""}`}>
                                  <div className="flex items-center gap-[10px] min-w-0">
                                    <input type="checkbox" checked={checked} onChange={() => { const next = checked ? selectedT5AccountIds.filter(id => id !== acc.accountId) : [...selectedT5AccountIds, acc.accountId]; setSelectedT5AccountIds(next); localStorage.setItem("t5_selected_accounts", JSON.stringify(next)); if (!checked && !active) loadT5AccountTrades(acc.accountId); }} className="w-4 h-4 accent-[var(--ios-blue)] cursor-pointer shrink-0" />
                                    <span className="text-[14px] font-semibold text-[var(--ios-label)] truncate">{acc.name}</span>
                                  </div>
                                  <span className={`px-[6px] py-[2px] rounded-[4px] text-[9px] font-bold uppercase shrink-0 ${
                                    acc.type === "funded" ? "bg-[var(--ios-green)] text-white" :
                                    acc.type === "evaluation" ? "bg-[var(--ios-blue)] text-white" :
                                    "bg-[var(--ios-secondary-label)] text-white"
                                  }`}>
                                    {acc.type === "funded" ? "Funded" : acc.type === "evaluation" ? "Eval" : "Demo"}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <button onClick={() => { const ids = t5Accounts.filter((a: any) => a.status === "active" || a.status === "available").map((a: any) => a.accountId); setSelectedT5AccountIds(ids); localStorage.setItem("t5_selected_accounts", JSON.stringify(ids)); }} className="w-full py-[8px] bg-[var(--ios-surface)]/80 rounded-[10px] text-[var(--ios-blue)] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer border border-[var(--ios-separator)]/30">
                          Chọn Active
                        </button>
                      </div>
                      {/* Credentials */}
                      <div>
                        <input type="email" value={t5Email} onChange={e => { setT5Email(e.target.value); localStorage.setItem("t5_email", e.target.value); }} placeholder="Email The5ers"
                          className="w-full px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[15px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30" />
                      </div>
                      <div>
                        <textarea value={t5DsrToken} onChange={e => { const v = e.target.value.trim(); setT5DsrToken(v); localStorage.setItem("t5_dsr_token", v); }} placeholder="DSR Token"
                          className="w-full px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[13px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30 h-[64px] resize-none" />
                      </div>
                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-[6px]">
                        <button onClick={saveT5Creds} disabled={t5Saving} className="py-[9px] bg-[var(--ios-surface)]/80 rounded-[10px] text-[var(--ios-label)] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer border border-[var(--ios-separator)]/30">
                          {t5Saving ? "Đang lưu…" : "Lưu DSR"}
                        </button>
                        <button onClick={syncT5Now} disabled={t5Syncing} className="py-[9px] bg-[var(--ios-green)] text-white rounded-[10px] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer shadow-sm">
                          {t5Syncing ? "Đang đồng bộ…" : "Đồng bộ"}
                        </button>
                        <button onClick={async () => { try { const r = await fetch("/api/trigger-scrape", { method: "POST" }); const j = await r.json(); showToast(j.message || "Đã trigger!", j.success ? "success" : "error"); } catch(e: any) { showToast("Lỗi: " + e.message, "error"); } }} className="col-span-2 py-[9px] bg-[var(--ios-surface)]/80 border border-dashed border-[var(--ios-blue)]/40 text-[var(--ios-blue)] rounded-[10px] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer">
                          🚀 GitHub Actions
                        </button>
                      </div>
                      {t5SaveResult && (
                        <p className={`text-[12px] font-medium text-center ${t5SaveResult.startsWith("✅") ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>{t5SaveResult}</p>
                      )}
                    </div>
                  </ExpandContent>
                </div>
              </SettingsSection>

              {/* ─── 6. Bảo mật ─── */}
              <SettingsSection title="Bảo mật">
                <div>
                  <SettingsRow
                    icon={<IconBox bg="bg-slate-500/15" text="text-slate-500"><ShieldCheck size={16} /></IconBox>}
                    label="Mật khẩu Web"
                    desc="Khóa truy cập ứng dụng"
                    control={<Toggle on={secExp} onClick={() => setSecExp(!secExp)} />}
                    isFirst
                  />
                  <ExpandContent expanded={secExp}>
                    <div className="flex gap-[8px]">
                      <input type="password" value={sitePassword} onChange={e => setSitePassword(e.target.value)} placeholder="Mật khẩu mới"
                        className="flex-1 px-[12px] py-[10px] bg-[var(--ios-bg)] rounded-[10px] text-[15px] font-mono text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 border border-[var(--ios-separator)]/30" />
                      <button onClick={async () => { const p = sitePassword.trim(); if (!p) return showToast("Nhập mật khẩu.", "error"); try { const r = await fetch("/api/save-site-password", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("trade_app_auth_token") }, body: JSON.stringify({ sitePassword: p }) }); const j = await r.json(); showToast(j.message || "Lưu thành công.", j.success ? "success" : "error"); if (j.success) setSitePassword(""); } catch(e: any) { showToast("Lỗi: " + e.message, "error"); } }} className="px-[16px] py-[10px] bg-[var(--ios-blue)] text-white rounded-[10px] text-[13px] font-semibold active:scale-95 transition-transform cursor-pointer shadow-sm shrink-0">
                        Cập nhật
                      </button>
                    </div>
                  </ExpandContent>
                </div>
              </SettingsSection>

              {/* ─── 7. Danger Zone ─── */}
              <section className="pt-[4px] space-y-[10px]">
                {deferredPrompt && (
                  <button onClick={() => { onClose(); handleInstallAppPWA(); }} className="w-full py-[13px] bg-[var(--ios-surface)]/80 rounded-[14px] text-[var(--ios-label)] text-[15px] font-semibold active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2 shadow-sm border border-[var(--ios-separator)]/30"
                    style={{ backdropFilter: "saturate(180%) blur(24px)", WebkitBackdropFilter: "saturate(180%) blur(24px)" }}>
                    <Download size={18} /> Cài ứng dụng (PWA)
                  </button>
                )}
                <button onClick={handleResetLocalStorage} className="w-full py-[13px] bg-red-500/10 rounded-[14px] text-[var(--ios-red)] text-[15px] font-semibold active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2 border border-red-500/20">
                  <AlertTriangle size={18} /> Xóa nhật ký Local Storage
                </button>
              </section>

              {/* Spacer for safe area */}
              <div className="h-[12px]" />

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
