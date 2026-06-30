import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, RefreshCw, Camera, Lightbulb } from "lucide-react";

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
  M3DatePicker: React.FC<{value: string; onChange: (v: string) => void; placeholder?: string}>;
  M3TimePicker: React.FC<{value: string; onChange: (v: string) => void; placeholder?: string}>;
}

export function AddTradeModal({
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
  formEntryDate, formExitDate,
  formTVSnapshotUrl, formTVSnapshotUrlClose,
  isCapturingSnapshot, isCapturingSnapshotClose,
  setLightboxUrl,
  onSubmit, onCaptureSnapshot, onCaptureSnapshotClose,
  getEntryDatePart, handleEntryDateChange,
  getExitDatePart, handleExitDateChange,
  M3DatePicker, M3TimePicker,
}: AddTradeModalProps) {
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
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="relative w-full max-w-[100vw] sm:max-w-2xl bg-[var(--sys-surface)] border border-[var(--sys-border)] shadow-ios-sm sm:rounded-[28px] rounded-t-[28px] shadow-ios-xl z-10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden"
            id="new-trade-modal-window"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 sm:px-8 py-4 sm:py-6 border-b border-[var(--sys-border)] bg-[var(--sys-surface)] shadow-ios-sm z-20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex p-3 bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] rounded-[16px]">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--sys-text)]">
                    {editingTradeId ? "Cập Nhật Giao Dịch" : "Ghi Chép Giao Dịch Mới"}
                  </h3>
                  <p className="text-sm text-[var(--sys-text-secondary)] mt-0.5">
                    {editingTradeId ? "Cập nhật các số liệu, ghi chú hoặc tất toán giao dịch" : "Ghi nhận chi tiết để theo dõi biểu đồ tăng trưởng"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--sys-surface-2)] rounded-full transition-colors text-[var(--sys-text-secondary)] hover:text-[var(--sys-text)] cursor-pointer" title="Đóng">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0" id="trade-form">
              <div className="overflow-y-auto flex-1 px-4 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">

                {/* BUY/SELL & Pair */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Cặp ngoại tệ</label>
                    <select value={formPair} onChange={e => setFormPair(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-semibold cursor-pointer">
                      <option value="EUR/USD">EUR/USD</option>
                      <option value="GBP/USD">GBP/USD</option>
                      <option value="USD/JPY">USD/JPY</option>
                      <option value="AUD/USD">AUD/USD</option>
                      <option value="USD/CAD">USD/CAD</option>
                      <option value="GBP/JPY">GBP/JPY</option>
                      <option value="XAU/USD">XAU/USD (Vàng)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Hướng lệnh</label>
                    <div className="flex border border-[var(--sys-border)] rounded-[12px] overflow-hidden h-11 text-sm font-semibold">
                      <button type="button" onClick={() => setFormType("BUY")} className={`flex-1 flex items-center justify-center transition-colors cursor-pointer border-r border-[var(--sys-border)] ${formType === "BUY" ? "bg-emerald-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}>MUA</button>
                      <button type="button" onClick={() => setFormType("SELL")} className={`flex-1 flex items-center justify-center transition-colors cursor-pointer ${formType === "SELL" ? "bg-rose-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}>BÁN</button>
                    </div>
                  </div>
                </div>

                {/* Entry Price & Lots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Giá vào lệnh *</label>
                    <input type="number" step="any" required placeholder="VD: 1.0854" value={formEntryPrice} onChange={e => setFormEntryPrice(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Khối lượng (Lots) *</label>
                    <input type="number" step="0.01" required min="0.01" value={formSize} onChange={e => setFormSize(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-mono font-bold" />
                  </div>
                </div>

                {/* SL, TP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Chặn lỗ</label>
                    <input type="number" step="any" placeholder="Tùy chọn - SL" value={formStopLoss} onChange={e => setFormStopLoss(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Chốt lời</label>
                    <input type="number" step="any" placeholder="Tùy chọn - TP" value={formTakeProfit} onChange={e => setFormTakeProfit(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-mono" />
                  </div>
                </div>

                {/* Status & Timeframe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Trạng thái</label>
                    <div className="flex border border-[var(--sys-border)] rounded-[12px] overflow-hidden h-11 text-sm font-semibold">
                      <button type="button" onClick={() => setFormStatus("CLOSED")} className={`flex-1 flex items-center justify-center transition-colors cursor-pointer border-r border-[var(--sys-border)] ${formStatus === "CLOSED" ? "bg-indigo-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}>ĐÃ ĐÓNG</button>
                      <button type="button" onClick={() => setFormStatus("OPEN")} className={`flex-1 flex items-center justify-center transition-colors cursor-pointer ${formStatus === "OPEN" ? "bg-cyan-600 text-white" : "bg-transparent text-[var(--sys-text)]"}`}>ĐANG MỞ</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Khung thời gian</label>
                    <select value={formTimeframe} onChange={e => setFormTimeframe(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-semibold cursor-pointer">
                      <option value="M5">M5 (5 phút)</option>
                      <option value="M15">M15 (15 phút)</option>
                      <option value="H1">H1 (1 giờ)</option>
                      <option value="H4">H4 (4 giờ)</option>
                      <option value="D1">D1 (1 ngày)</option>
                    </select>
                  </div>
                </div>

                {/* P&L */}
                <div>
                  <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">P&L ($)</label>
                  <input type="number" step="any" placeholder="Kết quả lời/lỗ" value={formPnl} onChange={e => setFormPnl(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-mono font-bold" />
                </div>

                {/* Closed: Exit fields */}
                {formStatus === "CLOSED" && (
                  <div className="p-4 rounded-[16px] bg-[var(--sys-surface-2)] border border-[var(--sys-border)] space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sys-text-secondary)]">Tất toán giao dịch</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Giá đóng lệnh</label>
                        <input type="number" step="any" placeholder="VD: 1.0920" value={formExitPrice} onChange={e => setFormExitPrice(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Ngày đóng lệnh</label>
                        <div className="grid grid-cols-2 gap-2">
                          <M3DatePicker value={getExitDatePart()} onChange={handleExitDateChange} placeholder="Ngày" />
                          <M3TimePicker value={getExitDatePart()} onChange={handleExitDateChange} placeholder="Giờ" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entry Date & Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Ngày vào lệnh</label>
                    <div className="grid grid-cols-2 gap-2">
                      <M3DatePicker value={getEntryDatePart()} onChange={handleEntryDateChange} placeholder="Ngày" />
                      <M3TimePicker value={getEntryDatePart()} onChange={handleEntryDateChange} placeholder="Giờ" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Chiến lược</label>
                    <select value={formTag} onChange={e => setFormTag(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] font-semibold cursor-pointer">
                      <option value="News-Trade">Giao dịch theo tin tức</option>
                      <option value="Trend-Follow">Đu theo xu hướng</option>
                      <option value="Breakout">Bứt phá</option>
                      <option value="Range-Trade">Giao dịch Vùng</option>
                    </select>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Đánh giá</label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} type="button" onClick={() => setFormRating(i + 1)} className={`text-lg p-1 ${i < formRating ? "text-amber-500" : "text-[var(--sys-text-secondary)]/40"} cursor-pointer`}>★</button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-[var(--sys-text-secondary)] mb-1.5 block uppercase tracking-wider">Lý do vào lệnh</label>
                  <textarea rows={3} placeholder="Tại sao bạn khớp lệnh này? Phân tích kỹ thuật hoặc nhận định tin tức..." value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full px-3 py-3 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-[12px] text-sm focus:outline-none focus:border-[var(--sys-blue)] text-[var(--sys-text)] resize-none" />
                </div>

                {/* TradingView Snapshot Open */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] uppercase tracking-wider">Ảnh biểu đồ Mở Lệnh</label>
                    <button type="button" onClick={onCaptureSnapshot} disabled={isCapturingSnapshot || !formPair} className="text-xs font-semibold text-[var(--sys-blue)] flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer">
                      {isCapturingSnapshot ? <><RefreshCw size={12} className="animate-spin" /> Đang chụp...</> : <><Camera size={12} /> Chụp {formPair}</>}
                    </button>
                  </div>
                  {formTVSnapshotUrl ? (
                    <div className="relative border border-[var(--sys-border)] rounded-lg overflow-hidden group max-h-[140px] bg-black/10">
                      <button type="button" onClick={() => setLightboxUrl(formTVSnapshotUrl)} className="block w-full cursor-zoom-in">
                        <img src={formTVSnapshotUrl} alt="Chart Mở" className="w-full object-cover transition-transform group-hover:scale-105" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-20 rounded-lg border border-dashed border-[var(--sys-border)] flex items-center justify-center bg-[var(--sys-surface-2)] text-[var(--sys-text-secondary)]/50 text-xs">Chưa có ảnh</div>
                  )}
                </div>

                {/* TradingView Snapshot Close */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[var(--sys-text-secondary)] uppercase tracking-wider">Ảnh biểu đồ Đóng Lệnh</label>
                    <button type="button" onClick={onCaptureSnapshotClose} disabled={isCapturingSnapshotClose || !formPair} className="text-xs font-semibold text-[var(--sys-blue)] flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer">
                      {isCapturingSnapshotClose ? <><RefreshCw size={12} className="animate-spin" /> Đang chụp...</> : <><Camera size={12} /> Chụp {formPair}</>}
                    </button>
                  </div>
                  {formTVSnapshotUrlClose ? (
                    <div className="relative border border-[var(--sys-border)] rounded-lg overflow-hidden group max-h-[140px] bg-black/10">
                      <button type="button" onClick={() => setLightboxUrl(formTVSnapshotUrlClose)} className="block w-full cursor-zoom-in">
                        <img src={formTVSnapshotUrlClose} alt="Chart Đóng" className="w-full object-cover transition-transform group-hover:scale-105" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-20 rounded-lg border border-dashed border-[var(--sys-border)] flex items-center justify-center bg-[var(--sys-surface-2)] text-[var(--sys-text-secondary)]/50 text-xs">Chưa có ảnh</div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="px-4 sm:px-8 py-4 border-t border-[var(--sys-border)] bg-[var(--sys-surface)] shrink-0 flex items-center gap-3">
                <button type="submit" className="flex-1 py-3 rounded-[12px] bg-[var(--sys-blue)] text-white font-semibold text-sm cursor-pointer active:scale-[0.98] transition-transform">
                  {editingTradeId ? "Cập nhật giao dịch" : "Thêm lệnh"}
                </button>
                <button type="button" onClick={onClose} className="px-5 py-3 rounded-[12px] bg-[var(--sys-surface-2)] border border-[var(--sys-border)] text-[var(--sys-text-secondary)] text-sm font-semibold cursor-pointer active:scale-[0.98] transition-transform">
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
