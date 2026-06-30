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
      id="ios-tab-bar"
      className="md:hidden fixed z-40 bottom-0 left-0 right-0 flex items-center justify-around ios-glass bg-[var(--sys-surface)]/80 border-t border-[var(--sys-border)] pb-[env(safe-area-inset-bottom,0px)] h-[calc(49px+env(safe-area-inset-bottom,0px))] backdrop-saturate-[1.8] backdrop-blur-[30px]"
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`relative flex flex-col items-center flex-1 h-[49px] pt-[6px] transition-colors duration-150 cursor-pointer ${
              isActive ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"
            }`}
          >
            <div className={`transition-transform duration-150 ${isActive ? "scale-105" : ""}`}>
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            <span className={`text-[10px] leading-none tracking-wide mt-[3px] ${isActive ? "font-bold" : "font-medium"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
