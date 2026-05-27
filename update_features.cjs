const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add AlertTriangle to imports
if (!content.includes('AlertTriangle')) {
  content = content.replace(
    /Pencil,/g,
    'Pencil,\n  AlertTriangle,'
  );
}

// 2. Add upcomingRedEvents state logic
if (!content.includes('const upcomingRedEvents')) {
  const groupedEventsStr = '  const groupedEventsByDay = useMemo(() => {';
  const upcomingEventsLogic = `  // Tính toán tin đỏ sắp tới trong 12 tiếng tới
  const upcomingRedEvents = useMemo(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    return calendarEvents.filter(ev => {
      if (ev.impact !== "High") return false;
      const evTime = new Date(ev.date);
      return evTime > now && evTime <= future;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [calendarEvents]);

  const groupedEventsByDay = useMemo(() => {`;
  content = content.replace(groupedEventsStr, upcomingEventsLogic);
}

// 3. Add Banner to the UI
if (!content.includes('CẢNH BÁO TIN ĐỎ SẮP RA MẮT')) {
  const headerStr = '{/* Google Workspace Style Tonal Top Header */}';
  const bannerLogic = `{upcomingRedEvents.length > 0 && (
          <div className="bg-rose-600 text-white p-4 rounded-[20px] shadow-level2 flex items-center gap-4 animate-pulse">
            <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold m3-title-medium uppercase tracking-wider">Cảnh báo tin đỏ sắp ra mắt!</h4>
              <p className="m3-body-medium text-white/90 truncate">
                {upcomingRedEvents.map(e => \`\${e.title} (\${new Date(e.date).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})})\`).join(" • ")}
              </p>
            </div>
          </div>
        )}

        {/* Google Workspace Style Tonal Top Header */}`;
  content = content.replace(headerStr, bannerLogic);
}

// 4. Update impact colors to bold distinct colors
const oldColorsRegex = /const getImpactColorClasses = \(impact: string\) => \{[\s\S]*?\};/m;
const newColors = `const getImpactColorClasses = (impact: string) => {
    switch (impact) {
      case "High":
        return {
          bg: "bg-rose-500 text-white shadow-xs",
          text: "text-rose-700 dark:text-rose-400 border-2 border-rose-500 dark:border-rose-400 bg-rose-50 dark:bg-rose-950/30",
          indicator: "bg-rose-600",
          label: "Tin Đỏ",
        };
      case "Medium":
        return {
          bg: "bg-orange-500 text-white shadow-xs",
          text: "text-orange-700 dark:text-orange-400 border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-950/30",
          indicator: "bg-orange-500",
          label: "Tin Cam",
        };
      default:
        return {
          bg: "bg-yellow-400 text-yellow-950 shadow-xs",
          text: "text-yellow-700 dark:text-yellow-400 border-2 border-yellow-400 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30",
          indicator: "bg-yellow-400",
          label: "Tin Vàng",
        };
    }
  };`;

content = content.replace(oldColorsRegex, newColors);

// Write back
fs.writeFileSync('src/App.tsx', content);
console.log('Features added and colors updated successfully!');
