import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, RefreshCw, Camera } from "lucide-react";

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTradeId: string | null;
  formPair: string;
  setFormPair: (v: string) => void;
  formType: "BUY" | "SELL";
  setFormType: (v: "BUY" | "SELL") => void;
  formEntryPrice: string;
  setFormEntryPrice: (v: string) => void;
  formExitPrice: string;
  setFormExitPrice: (v: string) => void;
  formSize: string;
  setFormSize: (v: string) => void;
  formStopLoss: string;
  setFormStopLoss: (v: string) => void;
  formTakeProfit: string;
  setFormTakeProfit: (v: string) => void;
  formStatus: "OPEN" | "CLOSED";
  setFormStatus: (v: "OPEN" | "CLOSED") => void;
  formTimeframe: string;
  setFormTimeframe: (v: string) => void;
  formTag: string;
  setFormTag: (v: string) => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  formRating: number;
  setFormRating: (v: number) => void;
  formPnl: string;
  setFormPnl: (v: string) => void;
  formEntryDate: string;
  formExitDate: string;
  formTVSnapshotUrl: string;
  formTVSnapshotUrlClose: string;
  isCapturingSnapshot: boolean;
  isCapturingSnapshotClose: boolean;
  setLightboxUrl: (v: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCaptureSnapshot: () => void;
  onCaptureSnapshotClose: () => void;
  getEntryDatePart: () => string;
  handleEntryDateChange: (v: string) => void;
  getExitDatePart: () => string;
  handleExitDateChange: (v: string) => void;
  IOSDatePicker: React.FC<{value: string; onChange: (v: string) => void; placeholder?: string}>;
  IOSTimePicker: React.FC<{value: string; onChange: (v: string) => void; placeholder?: string}>;
}

/* ---------- reusable segmented control ---------- */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-11";
  const px = size === "sm" ? "px-3" : "px-4";
  const fs = size === "sm" ? "text-[13px]" : "text-[14px]";
  return (
    <div
      className={`flex ${h} ios26-glass rounded-[12px] p-[3px] gap-[3px] border border-[var(--ios-separator)]/40`}
      style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`flex-1 flex items-center justify-center rounded-[9px] ${px} ${fs} font-semibold transition-all cursor-pointer active:scale-[0.97] ${
              active
                ? "bg-[var(--ios-surface)]/90 text-[var(--ios-label)] shadow-ios-sm"
                : "bg-transparent text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- glass input ---------- */
function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className, ...rest } = props;
  return (
    <div>
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
          {label}
        </label>
      )}
      <input
        {...rest}
        className={`w-full px-3.5 py-3 ios26-glass border border-[var(--ios-separator)]/40 rounded-[14px] text-[15px] text-[var(--ios-label)] font-mono placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 transition-shadow ${className || ""}`}
        style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}
      />
    </div>
  );
}

/* ---------- glass select ---------- */
function GlassSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: React.ReactNode }) {
  const { label, children, className, ...rest } = props;
  return (
    <div>
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
          {label}
        </label>
      )}
      <select
        {...rest}
        className={`w-full px-3.5 py-3 ios26-glass border border-[var(--ios-separator)]/40 rounded-[14px] text-[15px] text-[var(--ios-label)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 cursor-pointer appearance-none ${className || ""}`}
        style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}
      >
        {children}
      </select>
    </div>
  );
}

/* ---------- glass textarea ---------- */
function GlassTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const { label, className, ...rest } = props;
  return (
    <div>
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
          {label}
        </label>
      )}
      <textarea
        {...rest}
        className={`w-full px-3.5 py-3 ios26-glass border border-[var(--ios-separator)]/40 rounded-[14px] text-[15px] text-[var(--ios-label)] placeholder:text-[var(--ios-tertiary-label)] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/40 resize-none transition-shadow ${className || ""}`}
        style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}
      />
    </div>
  );
}

/* ============================================ */
export function AddTradeModal(props: AddTradeModalProps) {
  const {
    isOpen, onClose, editingTradeId,
    formPair, setFormPair,
    formType, setFormType,
    formEntryPrice, setFormEntryPrice,
    formExitPrice, setFormExitPrice,
    formSize, setFormSize,
    formStopLoss, setFormStopLoss,
    formTakeProfit, setFormTakeProfit,
    formStatus, setFormStatus,
    formTimeframe, setFormTimeframe,
    formTag, setFormTag,
    formNotes, setFormNotes,
    formRating, setFormRating,
    formPnl, setFormPnl,
    formTVSnapshotUrl, formTVSnapshotUrlClose,
    isCapturingSnapshot, isCapturingSnapshotClose,
    setLightboxUrl,
    onSubmit, onCaptureSnapshot, onCaptureSnapshotClose,
    getEntryDatePart, handleEntryDateChange,
    getExitDatePart, handleExitDateChange,
    IOSDatePicker, IOSTimePicker,
  } = props;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" id="modal-container-root">
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
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 120 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="relative w-full sm:max-w-2xl ios-glass ios26-card sm:rounded-[30px] rounded-t-[30px] shadow-ios-xl z-10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
            id="new-trade-modal-window"
          >
            {/* Grabber */}
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="w-9 h-1 rounded-full bg-[var(--ios-separator)]" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-5 sm:px-8 py-3 sm:py-5 shrink-0">
              <div>
                <h3 className="text-[20px] font-bold text-[var(--ios-label)]">
                  {editingTradeId ? "Cập Nhật Giao Dịch" : "Giao Dịch Mới"}
                </h3>
                <p className="text-[12px] text-[var(--ios-secondary-label)] mt-0.5">
                  {editingTradeId ? "Cập nhật số liệu hoặc tất toán" : "Ghi nhận chi tiết giao dịch"}
                </p>
              </div>
              <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center ios26-glass rounded-full text-[var(--ios-secondary-label)] cursor-pointer active:scale-90 transition-transform border border-[var(--ios-separator)]/40" title="Đóng">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0" id="trade-form">
              <div className="overflow-y-auto flex-1 px-5 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6 no-scrollbar">

                {/* BUY/SELL & Pair */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <GlassSelect label="Cặp ngoại tệ" value={formPair} onChange={e => setFormPair(e.target.value)}>
                    <option value="EUR/USD">EUR/USD</option>
                    <option value="GBP/USD">GBP/USD</option>
                    <option value="USD/JPY">USD/JPY</option>
                    <option value="AUD/USD">AUD/USD</option>
                    <option value="USD/CAD">USD/CAD</option>
                    <option value="GBP/JPY">GBP/JPY</option>
                    <option value="XAU/USD">XAU/USD (Vàng)</option>
                    <option value="BTC/USD">BTC/USD</option>
                    <option value="ETH/USD">ETH/USD</option>
                  </GlassSelect>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
                      Hướng lệnh
                    </label>
                    <Segmented
                      options={[
                        { key: "BUY", label: "MUA" },
                        { key: "SELL", label: "BÁN" },
                      ]}
                      value={formType}
                      onChange={(v) => setFormType(v)}
                    />
                  </div>
                </div>

                {/* Entry Price & Lots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <GlassInput label="Giá vào lệnh *" type="number" step="any" required placeholder="VD: 1.0854" value={formEntryPrice} onChange={e => setFormEntryPrice(e.target.value)} />
                  <GlassInput label="Khối lượng (Lots) *" type="number" step="0.01" required min="0.01" value={formSize} onChange={e => setFormSize(e.target.value)} />
                </div>

                {/* SL, TP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <GlassInput label="Chặn lỗ (SL)" type="number" step="any" placeholder="Tùy chọn" value={formStopLoss} onChange={e => setFormStopLoss(e.target.value)} />
                  <GlassInput label="Chốt lời (TP)" type="number" step="any" placeholder="Tùy chọn" value={formTakeProfit} onChange={e => setFormTakeProfit(e.target.value)} />
                </div>

                {/* Status & Timeframe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
                      Trạng thái
                    </label>
                    <Segmented
                      options={[
                        { key: "CLOSED", label: "ĐÃ ĐÓNG" },
                        { key: "OPEN", label: "ĐANG MỞ" },
                      ]}
                      value={formStatus}
                      onChange={(v) => setFormStatus(v as "OPEN" | "CLOSED")}
                    />
                  </div>
                  <GlassSelect label="Khung thời gian" value={formTimeframe} onChange={e => setFormTimeframe(e.target.value)}>
                    <option value="M5">M5 (5 phút)</option>
                    <option value="M15">M15 (15 phút)</option>
                    <option value="H1">H1 (1 giờ)</option>
                    <option value="H4">H4 (4 giờ)</option>
                    <option value="D1">D1 (1 ngày)</option>
                  </GlassSelect>
                </div>

                {/* P&L */}
                <GlassInput label="P&L ($)" type="number" step="any" placeholder="Kết quả lời/lỗ" value={formPnl} onChange={e => setFormPnl(e.target.value)} />

                {/* Closed: Exit fields */}
                {formStatus === "CLOSED" && (
                  <div className="p-5 rounded-[20px] ios26-glass border border-[var(--ios-separator)]/40 shadow-sm space-y-4"
                    style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)]">Tất toán giao dịch</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <GlassInput label="Giá đóng lệnh" type="number" step="any" placeholder="VD: 1.0920" value={formExitPrice} onChange={e => setFormExitPrice(e.target.value)} />
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
                          Ngày đóng lệnh
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <IOSDatePicker value={getExitDatePart()} onChange={handleExitDateChange} placeholder="Ngày" />
                          <IOSTimePicker value={getExitDatePart()} onChange={handleExitDateChange} placeholder="Giờ" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entry Date & Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
                      Ngày vào lệnh
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <IOSDatePicker value={getEntryDatePart()} onChange={handleEntryDateChange} placeholder="Ngày" />
                      <IOSTimePicker value={getEntryDatePart()} onChange={handleEntryDateChange} placeholder="Giờ" />
                    </div>
                  </div>
                  <GlassSelect label="Chiến lược" value={formTag} onChange={e => setFormTag(e.target.value)}>
                    <option value="News-Trade">Giao dịch theo tin tức</option>
                    <option value="Trend-Follow">Đu theo xu hướng</option>
                    <option value="Breakout">Bứt phá</option>
                    <option value="Range-Trade">Giao dịch Vùng</option>
                  </GlassSelect>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-1.5 block">
                    Đánh giá
                  </label>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormRating(i + 1)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[18px] transition-all cursor-pointer active:scale-90 ${
                          i < formRating
                            ? "text-amber-400 bg-amber-500/10"
                            : "text-[var(--ios-tertiary-label)]/40 bg-transparent hover:text-[var(--ios-secondary-label)]"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    {formRating > 0 && (
                      <span className="text-[13px] font-semibold text-[var(--ios-secondary-label)] ml-2 self-center">
                        {formRating}/5
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <GlassTextarea
                  label="Lý do vào lệnh"
                  rows={3}
                  placeholder="Tại sao bạn khớp lệnh này? Phân tích kỹ thuật hoặc nhận định tin tức..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                />

                {/* TradingView Snapshot Open */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                      Ảnh biểu đồ Mở Lệnh
                    </label>
                    <button
                      type="button"
                      onClick={onCaptureSnapshot}
                      disabled={isCapturingSnapshot || !formPair}
                      className="text-[11px] font-bold text-[var(--ios-blue)] flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {isCapturingSnapshot ? (
                        <><RefreshCw size={12} className="animate-spin" /> Đang chụp...</>
                      ) : (
                        <><Camera size={12} /> Chụp {formPair}</>
                      )}
                    </button>
                  </div>
                  {formTVSnapshotUrl ? (
                    <div className="relative rounded-[14px] overflow-hidden border border-[var(--ios-separator)]/40 max-h-[140px] bg-black/10 shadow-sm">
                      <button type="button" onClick={() => setLightboxUrl(formTVSnapshotUrl)} className="block w-full cursor-zoom-in">
                        <img src={formTVSnapshotUrl} alt="Chart Mở" className="w-full object-cover transition-transform hover:scale-105" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-[72px] rounded-[14px] border border-dashed border-[var(--ios-separator)]/40 flex items-center justify-center bg-[var(--ios-surface)]/80 text-[var(--ios-tertiary-label)] text-[13px] font-medium"
                      style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}>
                      Chưa có ảnh
                    </div>
                  )}
                </div>

                {/* TradingView Snapshot Close */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)]">
                      Ảnh biểu đồ Đóng Lệnh
                    </label>
                    <button
                      type="button"
                      onClick={onCaptureSnapshotClose}
                      disabled={isCapturingSnapshotClose || !formPair}
                      className="text-[11px] font-bold text-[var(--ios-blue)] flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {isCapturingSnapshotClose ? (
                        <><RefreshCw size={12} className="animate-spin" /> Đang chụp...</>
                      ) : (
                        <><Camera size={12} /> Chụp {formPair}</>
                      )}
                    </button>
                  </div>
                  {formTVSnapshotUrlClose ? (
                    <div className="relative rounded-[14px] overflow-hidden border border-[var(--ios-separator)]/40 max-h-[140px] bg-black/10 shadow-sm">
                      <button type="button" onClick={() => setLightboxUrl(formTVSnapshotUrlClose)} className="block w-full cursor-zoom-in">
                        <img src={formTVSnapshotUrlClose} alt="Chart Đóng" className="w-full object-cover transition-transform hover:scale-105" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-[72px] rounded-[14px] border border-dashed border-[var(--ios-separator)]/40 flex items-center justify-center bg-[var(--ios-surface)]/80 text-[var(--ios-tertiary-label)] text-[13px] font-medium"
                      style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}>
                      Chưa có ảnh
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="px-5 sm:px-8 py-4 border-t border-[var(--ios-separator)]/40 shrink-0 flex items-center gap-3"
                style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-[14px] bg-[var(--ios-blue)] text-white font-semibold text-[15px] cursor-pointer active:scale-[0.97] transition-transform shadow-ios-sm"
                >
                  {editingTradeId ? "Cập nhật giao dịch" : "Thêm lệnh"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-[14px] ios26-glass text-[var(--ios-label)] text-[15px] font-semibold cursor-pointer active:scale-[0.97] transition-transform border border-[var(--ios-separator)]/40"
                  style={{ backdropFilter: "saturate(180%) blur(18px)", WebkitBackdropFilter: "saturate(180%) blur(18px)" }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
