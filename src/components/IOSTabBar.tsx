import React from "react";
import { BarChart2, FileText, Calendar, Newspaper } from "lucide-react";

type TabId = "dashboard" | "journal" | "calendar" | "news";

interface IOSTabBarProps {
  currentTab: TabId;
  setCurrentTab: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; Icon: React.FC<{ size?: number; fill?: string; strokeWidth?: number }> }[] = [
  { id: "dashboard", label: "Tổng quan", Icon: BarChart2 },
  { id: "journal",   label: "Nhật ký",  Icon: FileText },
  { id: "calendar",  label: "Kinh tế",  Icon: Calendar },
  { id: "news",      label: "Tin tức",  Icon: Newspaper },
];

export function IOSTabBar({ currentTab, setCurrentTab }: IOSTabBarProps) {
  return (
    <nav
      id="ios-bottom-nav"
      className="md:hidden fixed z-40 left-3 right-3 flex items-center justify-around px-2 py-1.5 ios-glass bg-[var(--ios-surface)]/70 border border-[var(--ios-separator)] rounded-[28px] shadow-ios-glass"
      style={{
        bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        minHeight: "61px",
        backdropFilter: "saturate(180%) blur(34px)",
        WebkitBackdropFilter: "saturate(180%) blur(34px)",
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`relative flex flex-col items-center justify-center flex-1 min-w-0 h-[49px] gap-0.5 transition-colors duration-150 cursor-pointer ${
              isActive ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"
            }`}
          >
            <div className={`transition-transform duration-150 ${isActive ? "scale-105" : ""}`}>
              <Icon
                size={28}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            <span className={`text-[10px] leading-none tracking-normal truncate max-w-full ${isActive ? "font-semibold" : "font-[400]"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
