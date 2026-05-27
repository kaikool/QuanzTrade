const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove desktop add button from header (lines 822-829 approx)
const desktopBtnRegex = /<button\s+onClick=\{handleOpenAddTrade\}\s+className="hidden md:flex items-center gap-2 px-6 py-2\.5 bg-m3-primary text-m3-on-primary rounded-\[16px\] m3-label-large shadow-level1 m3-state-layer transition-all ease-\[var\(--ease-m3-enter\)\] cursor-pointer"\s+id="desktop-add-trade-btn"\s*>\s*<Plus size=\{16\} \/>\s*<span>Thêm giao dịch<\/span>\s*<\/button>/g;

content = content.replace(desktopBtnRegex, '');

// 2. Update mobile FAB to universal Extended FAB
const mobileFabRegex = /<div\s+className="md:hidden fixed bottom-\[calc\(5\.2rem\+env\(safe-area-inset-bottom,0px\)\)\] right-4 w-14 h-14 bg-m3-primary text-m3-on-primary rounded-\[16px\] flex items-center justify-center shadow-level3 m3-state-layer transition-all ease-\[var\(--ease-m3-enter\)\] z-40 cursor-pointer"\s+onClick=\{handleOpenAddTrade\}\s*>\s*<Plus size=\{24\} \/>\s*<\/div>/g;

const universalFab = `<div
        className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] md:bottom-8 right-4 md:right-8 h-14 bg-m3-primary text-m3-on-primary rounded-[16px] flex items-center justify-center shadow-level3 m3-state-layer transition-all ease-[var(--ease-m3-enter)] z-40 cursor-pointer px-4 gap-2"
        onClick={handleOpenAddTrade}
      >
        <Plus size={24} className="flex-shrink-0" />
        <span className="hidden md:block m3-label-large">Thêm giao dịch</span>
      </div>`;

if (content.match(mobileFabRegex)) {
  content = content.replace(mobileFabRegex, universalFab);
} else {
  // Try looser regex if exact match fails
  const looserRegex = /<div[^>]*className="md:hidden fixed bottom-\[calc\(5\.2rem\+env\(safe-area-inset-bottom,0px\)\)\] right-4 w-14 h-14[^>]*>[^<]*<Plus size=\{24\}[^>]*>[^<]*<\/div>/g;
  content = content.replace(looserRegex, universalFab);
}

fs.writeFileSync('src/App.tsx', content);
console.log('FAB moved to standard M3 position.');
