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
    <footer
      id="ios-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-30 flex items-start justify-around px-3 pt-1.5 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] bg-[var(--ios-surface)]/80 backdrop-blur-xl border-t border-[var(--ios-separator)]"
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center gap-0.5 justify-center flex-1 min-h-[48px] ${
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
    </footer>
  );
}
