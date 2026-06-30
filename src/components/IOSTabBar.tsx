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
      className="md:hidden fixed z-40 bottom-0 left-0 right-0 flex items-center justify-around bg-[var(--ios-surface)]/80 border-t border-[var(--ios-separator)]/60"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        height: 'calc(50px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center justify-center w-full h-[50px] ${
              isActive ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]"
            } cursor-pointer`}
          >
            <div className="mb-0.5 mt-1 transition-transform active:scale-90">
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
              />
            </div>
            <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
