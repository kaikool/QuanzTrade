import React from "react";
import { RefreshCw, CloudLightning } from "lucide-react";

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
  timezoneOffsetStr, getImpactColorClasses,
}: CalendarViewProps) {
  return (
    <div className="space-y-4">
      {/* Filters row (Segmented Controls style) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-[var(--ios-fill)] p-0.5 rounded-[12px] text-[13px] font-medium border-0">
          <button onClick={() => setCalendarPeriodFilter("DAY")}
            className={`px-3 py-1.5 rounded-[8px] transition-all cursor-pointer ${calendarPeriodFilter === "DAY" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)] font-semibold" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Hôm nay</button>
          <button onClick={() => setCalendarPeriodFilter("WEEK")}
            className={`px-3 py-1.5 rounded-[8px] transition-all cursor-pointer ${calendarPeriodFilter === "WEEK" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)] font-semibold" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Tuần này</button>
        </div>

        <div className="flex bg-[var(--ios-fill)] p-0.5 rounded-[12px] border-0">
          <button onClick={() => setCalendarImpactFilter("ALL")} className={`px-2 py-1.5 rounded-[8px] transition-all cursor-pointer flex items-center gap-1 ${calendarImpactFilter === "ALL" ? "bg-[var(--ios-surface)] shadow-ios-sm" : ""}`} title="Tất cả">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-red)]" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-blue)]" />
          </button>
          <button onClick={() => setCalendarImpactFilter("MEDIUM")} className={`px-2 py-1.5 rounded-[8px] transition-all cursor-pointer flex items-center gap-1 ${calendarImpactFilter === "MEDIUM" ? "bg-[var(--ios-surface)] shadow-ios-sm" : ""}`} title="Trung bình+">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-red)]" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </button>
          <button onClick={() => setCalendarImpactFilter("HIGH")} className={`px-2 py-1.5 rounded-[8px] transition-all cursor-pointer flex items-center gap-1 ${calendarImpactFilter === "HIGH" ? "bg-[var(--ios-surface)] shadow-ios-sm" : ""}`} title="Chỉ đỏ">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-red)]" />
          </button>
        </div>
        
        <button onClick={syncCalendar} className="h-[36px] w-[36px] flex items-center justify-center rounded-[12px] bg-[var(--ios-fill)] border-0 cursor-pointer active:scale-90 transition-transform ml-auto shadow-sm" title="Cập nhật">
          <RefreshCw size={16} className={refreshingCalendar ? "animate-spin text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"} />
        </button>
      </div>

      {/* iOS 26 Inset Grouped List */}
      <div className="ios-glass ios26-card bg-[var(--ios-surface)] rounded-[30px] shadow-ios-md overflow-hidden border border-[var(--ios-separator)]/50">
        {loadingCalendar ? (
          <div className="py-20 text-center space-y-4">
            <RefreshCw className="animate-spin text-[var(--ios-blue)] mx-auto" size={28} />
            <p className="text-[15px] font-medium text-[var(--ios-secondary-label)]">Đang tải lịch kinh tế...</p>
          </div>
        ) : groupedEventsByDay.length === 0 ? (
          <div className="py-20 text-center text-[var(--ios-secondary-label)]">
            <CloudLightning size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-[17px] text-[var(--ios-label)]">Không có sự kiện</p>
            <p className="text-[15px] mt-1">Lịch trống hoặc bị lọc hết.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--ios-separator)]/60">
            {groupedEventsByDay.map(([dayName, events]) => (
              <div key={dayName} className="group">
                {/* Section Header */}
                <div className="px-5 py-2.5 bg-[var(--sys-tint-soft)] sticky top-0 backdrop-blur-md z-10 border-b border-[var(--ios-separator)]/30">
                  <span className="text-[13px] font-bold uppercase tracking-widest text-[var(--ios-blue)]">{dayName}</span>
                </div>
                
                {events.map((ev, index) => {
                  const style = getImpactColorClasses(ev.impact);
                  const evTime = new Date(ev.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  
                  return (
                    <div key={`${dayName}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-[var(--sys-tint-soft)] transition-colors border-b border-[var(--ios-separator)]/40 last:border-0 bg-[var(--ios-surface)]">
                      {/* Time & Impact Label */}
                      <div className="flex items-center gap-3 sm:min-w-[100px]">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${style.indicator} text-white shadow-sm shrink-0 uppercase tracking-wide`}>
                           {ev.impact === 'High' ? 'ĐỎ' : ev.impact === 'Medium' ? 'CAM' : ev.impact === 'Low' ? 'VÀNG' : 'TRẮNG'}
                        </span>
                        <span className="font-mono font-bold text-[17px] text-[var(--ios-label)] tracking-tight">{evTime}</span>
                      </div>
                      
                      {/* Title & Country */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[17px] text-[var(--ios-label)] leading-snug">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] bg-[var(--ios-fill)] border-0 px-2 py-0.5 rounded-md text-[var(--ios-secondary-label)] uppercase font-mono font-bold tracking-widest">{ev.country}</span>
                          <span className="text-[12px] text-[var(--ios-tertiary-label)] font-mono">{timezoneOffsetStr}</span>
                        </div>
                      </div>
                      
                      {/* Forecast / Actual Data */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-[var(--ios-separator)]/30 sm:border-0 min-w-[90px]">
                        <div className="flex gap-3 sm:gap-2 text-[12px] text-[var(--ios-secondary-label)] font-mono">
                          <span title="Dự báo">D: <strong className="text-[var(--ios-label)]">{ev.forecast || "-"}</strong></span>
                          <span title="Trước đó">T: <strong className="text-[var(--ios-label)]">{ev.previous || "-"}</strong></span>
                        </div>
                        <div className={`text-[13px] font-bold font-mono px-2 py-0.5 rounded-md ${ev.actual ? 'bg-[var(--sys-tint-soft)] text-[var(--ios-blue)]' : 'text-[var(--ios-tertiary-label)]'}`}>
                          A: {ev.actual || "-"}
                        </div>
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
