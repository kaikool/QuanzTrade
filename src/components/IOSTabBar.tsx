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
      className="md:hidden fixed z-40 left-4 right-4 flex items-center justify-around px-2 py-2 ios-glass bg-[var(--ios-surface)]/70 border border-[var(--ios-separator)]/50 rounded-full shadow-ios-xl"
      style={{
        bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        backdropFilter: 'saturate(200%) blur(40px)',
        WebkitBackdropFilter: 'saturate(200%) blur(40px)',
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-[48px] rounded-full transition-all duration-300 ease-out cursor-pointer ${
              isActive ? "text-[var(--ios-blue)] scale-105" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"
            }`}
          >
            {/* Active Pill Background */}
            {isActive && (
              <div className="absolute inset-0 bg-[var(--ios-blue)]/10 rounded-full shadow-sm" />
            )}
            
            <div className={`relative z-10 transition-transform ${isActive ? "translate-y-[-2px]" : "translate-y-0.5"}`}>
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            {isActive && (
              <span className="relative z-10 text-[10px] font-bold mt-0.5 tracking-wide">
                {label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
