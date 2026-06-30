import React from "react";
import { BarChart2, FileText, Calendar, Newspaper } from "lucide-react";

type TabId = "dashboard" | "journal" | "calendar" | "news";

interface IOSTabBarProps {
  currentTab: TabId;
  setCurrentTab: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: "dashboard", label: "Tổng quan", Icon: BarChart2 },
  { id: "journal",   label: "Nhật ký",  Icon: FileText },
  { id: "calendar",  label: "Kinh tế",  Icon: Calendar },
  { id: "news",      label: "Tin tức",  Icon: Newspaper },
];

export function IOSTabBar({ currentTab, setCurrentTab }: IOSTabBarProps) {
  return (
    <nav
      id="ios-bottom-nav"
      className="md:hidden fixed z-30 left-3 right-3 flex items-start justify-around px-2 pt-1.5 pb-[max(0.25rem,env(safe-area-inset-bottom,4px))] bg-[var(--ios-surface)]/70 border border-[var(--ios-separator)] rounded-[28px] shadow-ios-xl"
      style={{
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        backdropFilter: 'saturate(180%) blur(34px)',
        WebkitBackdropFilter: 'saturate(180%) blur(34px)',
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center gap-0.5 justify-center flex-1 min-h-[48px] rounded-[22px] ${
              isActive ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]"
            } active:scale-90 transition-all duration-150 cursor-pointer`}
          >
            <div
              className={`p-1.5 rounded-full ${
                isActive ? "bg-[var(--ios-blue)]/10" : ""
              } transition-colors`}
            >
              <Icon size={28} />
            </div>
            <span className="text-[10px] font-[400]">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
