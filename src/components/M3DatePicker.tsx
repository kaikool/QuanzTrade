import React, { useState, useEffect, useRef } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";

// ==========================================
// 📅 1. GORGEOUS MATERIAL DESIGN 3 CALENDAR DATE PICKER
// ==========================================
interface M3DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  placeholder?: string;
}

export const M3DatePicker: React.FC<M3DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Chọn ngày",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to today
  const parsedDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(parsedDate);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync viewDate when value changes from outside
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...

  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const pad = (num: number) => num.toString().padStart(2, "0");
    const selectedDateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  // Format value to display in text input: DD/MM/YYYY
  const getDisplayValue = () => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  };

  const renderDays = () => {
    const cells = [];
    // Empty cells before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const pad = (num: number) => num.toString().padStart(2, "0");
      const currentDayStr = `${year}-${pad(month + 1)}-${pad(day)}`;
      const isSelected = value === currentDayStr;
      const isToday =
        new Date().toDateString() === new Date(year, month, day).toDateString();

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleSelectDay(day)}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors relative ${
            isSelected
              ? "bg-[var(--ios-blue)] text-white font-bold"
              : isToday
                ? "border border-[var(--ios-blue)] text-[var(--ios-blue)]"
                : "hover:bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-label)] dark:text-[var(--ios-label)]"
          }`}
        >
          {day}
        </button>,
      );
    }
    return cells;
  };

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          value={getDisplayValue()}
          className="w-full min-w-0 pl-3 pr-10 py-3 bg-[var(--ios-surface)] ios-glass border border-[var(--ios-separator)] rounded-[4px] text-lg focus:outline-none focus:border-[var(--ios-blue)] focus:border-2 text-[var(--ios-label)] transition-colors ease-[ease-out] cursor-pointer select-none"
        />
        <Calendar
          size={16}
          className="absolute right-3.5 text-[var(--ios-secondary-label)] pointer-events-none"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-40 bg-[var(--ios-surface)] ios-glass border border-[var(--ios-separator)] rounded-[16px] p-4 shadow-ios-lg w-72 flex flex-col gap-3 select-none">
          {/* Header */}
          <div className="flex justify-between items-center px-1">
            <span className="font-bold text-base text-[var(--ios-label)] font-display">
              {monthNames[month]} {year}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] rounded-full text-[var(--ios-label)] transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] rounded-full text-[var(--ios-label)] transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-[var(--ios-secondary-label)]">
            <div>CN</div>
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 justify-items-center">
            {renderDays()}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 🕒 2. GORGEOUS MATERIAL DESIGN 3 TIME PICKER
// ==========================================
interface M3TimePickerProps {
  value: string; // "HH:MM"
  onChange: (val: string) => void;
  placeholder?: string;
}

export const M3TimePicker: React.FC<M3TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Chọn giờ",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [hour, minute] = value ? value.split(":") : ["12", "00"];

  const handleSelectHour = (newHour: string) => {
    onChange(`${newHour}:${minute}`);
  };

  const handleSelectMinute = (newMin: string) => {
    onChange(`${hour}:${newMin}`);
  };

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          placeholder={placeholder}
          value={value || ""}
          className="w-full min-w-0 pl-3 pr-10 py-3 bg-[var(--ios-surface)] ios-glass border border-[var(--ios-separator)] rounded-[4px] text-lg focus:outline-none focus:border-[var(--ios-blue)] focus:border-2 text-[var(--ios-label)] transition-colors ease-[ease-out] cursor-pointer select-none"
        />
        <Clock
          size={16}
          className="absolute right-3.5 text-[var(--ios-secondary-label)] pointer-events-none"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-40 bg-[var(--ios-surface)] ios-glass border border-[var(--ios-separator)] rounded-[16px] p-4 shadow-ios-lg w-48 flex gap-4 select-none justify-center h-48">
          {/* Hours column */}
          <div className="flex flex-col overflow-y-auto w-16 no-scrollbar gap-1 border-r border-[var(--ios-separator)] pr-2 text-center">
            <span className="text-[10px] font-bold text-[var(--ios-secondary-label)] sticky top-0 bg-[var(--ios-surface)] ios-glass pb-1">
              Giờ
            </span>
            {Array.from({ length: 24 }).map((_, i) => {
              const hStr = i.toString().padStart(2, "0");
              const isSelected = hStr === hour;
              return (
                <button
                  key={`h-${i}`}
                  type="button"
                  onClick={() => handleSelectHour(hStr)}
                  className={`py-1 text-sm font-semibold rounded-[4px] cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--ios-blue)] text-white"
                      : "hover:bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-label)] dark:text-[var(--ios-label)]"
                  }`}
                >
                  {hStr}
                </button>
              );
            })}
          </div>

          {/* Minutes column */}
          <div className="flex flex-col overflow-y-auto w-16 no-scrollbar gap-1 text-center">
            <span className="text-[10px] font-bold text-[var(--ios-secondary-label)] sticky top-0 bg-[var(--ios-surface)] ios-glass pb-1">
              Phút
            </span>
            {Array.from({ length: 12 }).map((_, i) => {
              const mVal = (i * 5).toString().padStart(2, "0");
              const isSelected = mVal === minute;
              return (
                <button
                  key={`m-${i}`}
                  type="button"
                  onClick={() => handleSelectMinute(mVal)}
                  className={`py-1 text-sm font-semibold rounded-[4px] cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--ios-blue)] text-white"
                      : "hover:bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-label)] dark:text-[var(--ios-label)]"
                  }`}
                >
                  {mVal}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
