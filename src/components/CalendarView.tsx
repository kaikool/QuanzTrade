import React, { useState, useMemo } from "react";
import { Calendar as CalendarIcon, RefreshCw, CloudLightning } from "lucide-react";

interface CalendarEvent {
  title: string;
  date: string;
  impact: string;
  country: string;
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface CalendarViewProps {
  loadingCalendar: boolean;
  groupedEventsByDay: [string, CalendarEvent[]][];
  calendarPeriodFilter: "DAY" | "WEEK";
  setCalendarPeriodFilter: (v: "DAY" | "WEEK") => void;
  calendarImpactFilter: "ALL" | "HIGH" | "MEDIUM";
  setCalendarImpactFilter: (v: "ALL" | "HIGH" | "MEDIUM") => void;
  syncCalendar: () => void;
  refreshingCalendar: boolean;
  timezoneOffsetStr: string;
  darkMode: boolean;
  getImpactColorClasses: (impact: string) => { text: string; bg: string; label: string; indicator: string };
}

const filterBtn = (active: boolean, darkMode: boolean) =>
  active
    ? darkMode
      ? "bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-blue)] shadow-xs"
      : "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm text-[var(--ios-blue)] shadow-xs"
    : "opacity-40 hover:opacity-95";

export function CalendarView({
  loadingCalendar, groupedEventsByDay,
  calendarPeriodFilter, setCalendarPeriodFilter,
  calendarImpactFilter, setCalendarImpactFilter,
  syncCalendar, refreshingCalendar,
  timezoneOffsetStr, darkMode, getImpactColorClasses,
}: CalendarViewProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 bg-[var(--ios-surface)] rounded-[20px] border border-[var(--ios-separator)] shadow-ios-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] rounded-[14px] flex items-center justify-center font-bold flex-shrink-0">
              <CalendarIcon size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--ios-label)]">Lịch Kinh Tế</h3>
              <p className="text-sm text-[var(--ios-secondary-label)]">Chỉ số USD quan trọng</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Period filter */}
            <div className={`flex ${darkMode ? "bg-[var(--ios-surface)] border border-[var(--ios-separator)]" : "bg-[var(--ios-surface-2)]"} p-0.5 rounded-[10px]`}>
              <button onClick={() => setCalendarPeriodFilter("DAY")}
                className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all cursor-pointer ${calendarPeriodFilter === "DAY" ? (darkMode ? "bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-blue)]" : "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm text-[var(--ios-blue)]") : "text-[var(--ios-secondary-label)]"}`}>Hôm nay</button>
              <button onClick={() => setCalendarPeriodFilter("WEEK")}
                className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all cursor-pointer ${calendarPeriodFilter === "WEEK" ? (darkMode ? "bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-blue)]" : "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm text-[var(--ios-blue)]") : "text-[var(--ios-secondary-label)]"}`}>Tuần này</button>
            </div>

            {/* Impact filter */}
            <div className={`flex ${darkMode ? "bg-[var(--ios-surface)] border border-[var(--ios-separator)]" : "bg-[var(--ios-surface-2)]"} p-0.5 rounded-[10px]`}>
              <button onClick={() => setCalendarImpactFilter("ALL")} className={`px-2 py-1 rounded-[8px] transition-all cursor-pointer ${filterBtn(calendarImpactFilter === "ALL", darkMode)}`} title="Tất cả"><span className="w-1.5 h-1.5 rounded-full inline-block bg-red-400" /> <span className="w-1.5 h-1.5 rounded-full inline-block bg-amber-400" /> <span className="w-1.5 h-1.5 rounded-full inline-block bg-blue-400" /></button>
              <button onClick={() => setCalendarImpactFilter("MEDIUM")} className={`px-2 py-1 rounded-[8px] transition-all cursor-pointer ${filterBtn(calendarImpactFilter === "MEDIUM", darkMode)}`} title="Trung bình trở lên"><span className="w-1.5 h-1.5 rounded-full inline-block bg-red-400" /> <span className="w-1.5 h-1.5 rounded-full inline-block bg-amber-400" /></button>
              <button onClick={() => setCalendarImpactFilter("HIGH")} className={`px-2 py-1 rounded-[8px] transition-all cursor-pointer ${filterBtn(calendarImpactFilter === "HIGH", darkMode)}`} title="Chỉ đỏ"><span className="w-1.5 h-1.5 rounded-full inline-block bg-red-400" /></button>
            </div>

            <button onClick={syncCalendar} className="p-2 rounded-[10px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] cursor-pointer active:scale-90 transition-transform" title="Cập nhật">
              <RefreshCw size={14} className={refreshingCalendar ? "animate-spin text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]"} />
            </button>
          </div>
        </div>

        {/* Events */}
        {loadingCalendar ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="animate-spin text-[var(--ios-blue)] mx-auto" size={28} />
            <p className="text-[var(--ios-secondary-label)]">Đang quét Forex Factory...</p>
          </div>
        ) : groupedEventsByDay.length === 0 ? (
          <div className="py-16 text-center text-[var(--ios-secondary-label)]">
            <CloudLightning size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold">Không có sự kiện phù hợp</p>
            <p className="text-sm mt-1">Thử điều chỉnh bộ lọc tác động.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEventsByDay.map(([dayName, events]) => (
              <div key={dayName} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ios-blue)] bg-[var(--ios-blue)]/10 px-2.5 py-1 rounded-[8px] inline-block">{dayName}</h4>
                <div className="flex flex-col gap-2">
                  {events.map((ev, index) => {
                    const style = getImpactColorClasses(ev.impact);
                    const evTime = new Date(ev.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={`${dayName}-${index}`} className="flex items-center gap-3 p-3 bg-[var(--ios-surface)] rounded-[14px] border border-[var(--ios-separator)] shadow-ios-sm hover:bg-[var(--ios-surface-2)] transition-colors">
                        {/* Time & Impact */}
                        <div className="flex flex-col items-center min-w-[44px] flex-shrink-0">
                          <span className="font-mono font-bold text-sm text-[var(--ios-label)]">{evTime}</span>
                          <span className={`mt-0.5 px-1.5 py-0.5 text-[10px] uppercase font-extrabold rounded ${style.text} ${style.bg}`}>{style.label}</span>
                        </div>
                        {/* Title & Country */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[var(--ios-label)] truncate">{ev.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] bg-[var(--ios-label)]/5 px-1.5 py-0.5 rounded text-[var(--ios-secondary-label)] uppercase font-mono">{ev.country}</span>
                            <span className="text-[10px] text-[var(--ios-secondary-label)]">{timezoneOffsetStr}</span>
                          </div>
                        </div>
                        {/* Desktop Stats */}
                        <div className="hidden md:flex flex-col items-end gap-1 border-l border-[var(--ios-separator)]/20 pl-3">
                          <div className="flex gap-3 text-xs text-[var(--ios-secondary-label)]">
                            <span>DB: <strong className="text-[var(--ios-label)]">{ev.forecast || "-"}</strong></span>
                            <span>Trước: <strong className="text-[var(--ios-label)]">{ev.previous || "-"}</strong></span>
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-[var(--ios-blue)] uppercase">TT: </span>
                            <strong className="text-[var(--ios-blue)]">{ev.actual || "Đợi tin"}</strong>
                          </div>
                        </div>
                        {/* Mobile Stats */}
                        <div className="flex md:hidden flex-col items-end min-w-[55px]">
                          <div className="text-[10px] text-[var(--ios-secondary-label)]"><span className="opacity-60">DB:</span> <strong>{ev.forecast || "-"}</strong></div>
                          <div className="text-xs font-bold text-[var(--ios-blue)]"><span className="opacity-60 text-[9px] uppercase">TT:</span> {ev.actual || "-"}</div>
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
  );
}
