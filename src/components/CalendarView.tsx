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

export function CalendarView({
  loadingCalendar, groupedEventsByDay,
  calendarPeriodFilter, setCalendarPeriodFilter,
  calendarImpactFilter, setCalendarImpactFilter,
  syncCalendar, refreshingCalendar,
  timezoneOffsetStr, darkMode, getImpactColorClasses,
}: CalendarViewProps) {
  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Period filter */}
        <div className="flex bg-[var(--ios-surface-2)] p-0.5 rounded-[10px]">
          <button onClick={() => setCalendarPeriodFilter("DAY")}
            className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all cursor-pointer ${calendarPeriodFilter === "DAY" ? "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]"}`}>Hôm nay</button>
          <button onClick={() => setCalendarPeriodFilter("WEEK")}
            className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all cursor-pointer ${calendarPeriodFilter === "WEEK" ? "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]"}`}>Tuần này</button>
        </div>
        {/* Impact dots filter */}
        <div className="flex bg-[var(--ios-surface-2)] p-0.5 rounded-[10px]">
          <button onClick={() => setCalendarImpactFilter("ALL")} className={`px-2 py-1 rounded-[8px] transition-all cursor-pointer flex items-center gap-0.5 ${calendarImpactFilter === "ALL" ? "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm" : ""}`} title="Tất cả"><span className="w-2 h-2 rounded-full inline-block bg-red-400" /><span className="w-2 h-2 rounded-full inline-block bg-amber-400" /><span className="w-2 h-2 rounded-full inline-block bg-blue-400" /></button>
          <button onClick={() => setCalendarImpactFilter("MEDIUM")} className={`px-2 py-1 rounded-[8px] transition-all cursor-pointer flex items-center gap-0.5 ${calendarImpactFilter === "MEDIUM" ? "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm" : ""}`} title="Trung bình+"><span className="w-2 h-2 rounded-full inline-block bg-red-400" /><span className="w-2 h-2 rounded-full inline-block bg-amber-400" /></button>
          <button onClick={() => setCalendarImpactFilter("HIGH")} className={`px-2 py-1 rounded-[8px] transition-all cursor-pointer flex items-center gap-0.5 ${calendarImpactFilter === "HIGH" ? "bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm" : ""}`} title="Chỉ đỏ"><span className="w-2 h-2 rounded-full inline-block bg-red-400" /></button>
        </div>
        <button onClick={syncCalendar} className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] cursor-pointer active:scale-90 transition-transform" title="Cập nhật">
          <RefreshCw size={14} className={refreshingCalendar ? "animate-spin text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]"} />
        </button>
      </div>

      {/* Events */}
      <div className="ios-glass bg-[var(--ios-surface)] rounded-[14px] shadow-ios-sm overflow-hidden">
        {loadingCalendar ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="animate-spin text-[var(--ios-blue)] mx-auto" size={24} />
            <p className="text-sm text-[var(--ios-secondary-label)]">Đang quét Forex Factory...</p>
          </div>
        ) : groupedEventsByDay.length === 0 ? (
          <div className="py-16 text-center text-[var(--ios-secondary-label)]">
            <CloudLightning size={28} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">Không có sự kiện phù hợp</p>
            <p className="text-xs mt-1">Thử điều chỉnh bộ lọc.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--ios-separator)]">
            {groupedEventsByDay.map(([dayName, events]) => (
              <div key={dayName}>
                {/* Day divider */}
                <div className="px-4 py-2 bg-[var(--ios-surface-2)]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-blue)]">{dayName}</span>
                </div>
                {events.map((ev, index) => {
                  const style = getImpactColorClasses(ev.impact);
                  const evTime = new Date(ev.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={`${dayName}-${index}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ios-surface-2)] transition-colors active:bg-[var(--ios-surface-2)]">
                      {/* Time + Impact */}
                      <div className="flex flex-col items-center min-w-[48px] flex-shrink-0">
                        <span className="font-mono font-bold text-[15px] text-[var(--ios-label)]">{evTime}</span>
                        <span className={`mt-0.5 px-1.5 py-0.5 text-[9px] uppercase font-bold rounded ${style.text}`}>{style.label}</span>
                      </div>
                      {/* Title + Country */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[15px] text-[var(--ios-label)] truncate">{ev.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] bg-[var(--ios-label)]/5 px-1.5 py-0.5 rounded text-[var(--ios-secondary-label)] uppercase font-mono">{ev.country}</span>
                          <span className="text-[10px] text-[var(--ios-secondary-label)]">{timezoneOffsetStr}</span>
                        </div>
                      </div>
                      {/* Forecast/Actual */}
                      <div className="flex flex-col items-end gap-0.5 min-w-[60px]">
                        <div className="flex gap-2 text-[11px] text-[var(--ios-secondary-label)]">
                          <span>DB: <strong className="text-[var(--ios-label)]">{ev.forecast || "-"}</strong></span>
                          <span>Tr: <strong className="text-[var(--ios-label)]">{ev.previous || "-"}</strong></span>
                        </div>
                        <div className="text-[11px] font-bold text-[var(--ios-blue)] uppercase">TT: {ev.actual || "-"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
