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
  const periodLabel = calendarPeriodFilter === "DAY" ? "Hôm nay" : "Tuần này";

  return (
    <div className="space-y-4 sm:space-y-5" id="calendar-section">
      {/* Header bar — match NewsPanel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--ios-secondary-label)]">Lịch kinh tế</span>
            <span className="text-[12px] text-[var(--ios-tertiary-label)] font-mono">{periodLabel} · {timezoneOffsetStr}</span>
          </div>
          <p className="text-[13px] text-[var(--ios-secondary-label)] mt-1">ForexFactory</p>
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <div className="flex shrink-0 bg-[var(--ios-fill)] p-1 rounded-[10px] text-[13px] font-bold shadow-sm">
            <button onClick={() => setCalendarPeriodFilter("DAY")}
              className={`h-8 px-3 rounded-[8px] transition-all cursor-pointer whitespace-nowrap ${calendarPeriodFilter === "DAY" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Hôm nay</button>
            <button onClick={() => setCalendarPeriodFilter("WEEK")}
              className={`h-8 px-3 rounded-[8px] transition-all cursor-pointer whitespace-nowrap ${calendarPeriodFilter === "WEEK" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Tuần này</button>
          </div>

          <div className="flex shrink-0 bg-[var(--ios-fill)] p-1 rounded-[10px] shadow-sm">
            <button onClick={() => setCalendarImpactFilter("ALL")} className={`h-8 px-2 rounded-[8px] transition-all cursor-pointer flex items-center gap-1 ${calendarImpactFilter === "ALL" ? "bg-[var(--ios-surface)] shadow-ios-sm" : ""}`} title="Tất cả">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-red)]" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-blue)]" />
            </button>
            <button onClick={() => setCalendarImpactFilter("MEDIUM")} className={`h-8 px-2 rounded-[8px] transition-all cursor-pointer flex items-center gap-1 ${calendarImpactFilter === "MEDIUM" ? "bg-[var(--ios-surface)] shadow-ios-sm" : ""}`} title="Trung bình+">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-red)]" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </button>
            <button onClick={() => setCalendarImpactFilter("HIGH")} className={`h-8 px-2 rounded-[8px] transition-all cursor-pointer flex items-center gap-1 ${calendarImpactFilter === "HIGH" ? "bg-[var(--ios-surface)] shadow-ios-sm" : ""}`} title="Chỉ đỏ">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--sys-red)]" />
            </button>
          </div>

          <button onClick={syncCalendar} className="w-[38px] h-[38px] shrink-0 flex items-center justify-center rounded-full bg-[var(--ios-fill)] cursor-pointer active:scale-90 transition-transform shadow-sm" title="Cập nhật">
            <RefreshCw size={16} className={refreshingCalendar ? "animate-spin text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"} />
          </button>
        </div>
      </div>

      {/* Calendar cards — match NewsPanel */}
      {loadingCalendar ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-32 rounded-[30px] bg-[var(--ios-fill)] animate-pulse border-0" />
          ))}
        </div>
      ) : groupedEventsByDay.length === 0 ? (
        <div className="py-20 text-center text-[var(--ios-secondary-label)] ios-glass ios26-card bg-[var(--ios-surface)]">
          <CloudLightning size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-[17px] text-[var(--ios-label)]">Không có sự kiện</p>
          <p className="text-[15px] mt-1">Lịch trống hoặc bị lọc hết.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedEventsByDay.map(([dayName, events]) => (
            <section key={dayName} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--ios-secondary-label)]">{dayName}</span>
                <span className="text-[12px] font-mono text-[var(--ios-tertiary-label)]">{events.length} sự kiện</span>
              </div>

              <div className="space-y-4">
                {events.map((ev, index) => {
                  const style = getImpactColorClasses(ev.impact);
                  const evTime = new Date(ev.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  const impactLabel = ev.impact === "High" ? "High impact" : ev.impact === "Medium" ? "Medium impact" : ev.impact === "Low" ? "Low impact" : "Normal";

                  return (
                    <article key={`${dayName}-${index}`} className="ios-glass ios26-card bg-[var(--ios-surface)] p-5 transition-colors group">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${style.indicator} text-white shadow-sm`}>{impactLabel}</span>
                        <span className="text-[13px] tracking-tight text-[var(--ios-secondary-label)] font-mono">{evTime}</span>
                        <div className="w-1 h-1 rounded-full bg-[var(--ios-separator)]" />
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--ios-fill)] text-[var(--ios-secondary-label)] uppercase tracking-wide">{ev.country}</span>
                        <div className="w-1 h-1 rounded-full bg-[var(--ios-separator)]" />
                        <span className="text-[12px] font-medium text-[var(--ios-secondary-label)]">{timezoneOffsetStr}</span>
                      </div>

                      <div className="mb-3">
                        <h4 className="text-[18px] sm:text-[20px] font-bold text-[var(--ios-label)] leading-tight">{ev.title}</h4>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--ios-separator)]/40">
                        <div className="rounded-[12px] bg-[var(--ios-fill)] px-3 py-2 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ios-secondary-label)]">Dự báo</p>
                          <p className="text-[13px] font-mono font-bold text-[var(--ios-label)] truncate mt-0.5">{ev.forecast || "-"}</p>
                        </div>
                        <div className="rounded-[12px] bg-[var(--ios-fill)] px-3 py-2 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ios-secondary-label)]">Trước đó</p>
                          <p className="text-[13px] font-mono font-bold text-[var(--ios-label)] truncate mt-0.5">{ev.previous || "-"}</p>
                        </div>
                        <div className={`rounded-[12px] px-3 py-2 min-w-0 ${ev.actual ? "bg-[var(--sys-tint-soft)]" : "bg-[var(--ios-fill)]"}`}>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ios-secondary-label)]">Thực tế</p>
                          <p className={`text-[13px] font-mono font-bold truncate mt-0.5 ${ev.actual ? "text-[var(--ios-blue)]" : "text-[var(--ios-label)]"}`}>{ev.actual || "-"}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
