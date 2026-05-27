const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The goal is to ensure ALL inputs, selects, and textareas in the add trade dialog 
// have `w-full min-w-0` and consistent responsive styling to prevent overflow.

const standardInputClass = 'w-full min-w-0 px-3 py-3 sm:p-3.5 bg-m3-surface-container-lowest border border-m3-outline rounded-[4px] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-colors ease-[var(--ease-m3-enter)]';

// 1. formPair (select)
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] m3-body-large sm:m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] font-bold cursor-pointer"/,
  `className="${standardInputClass} font-bold cursor-pointer"`
);

// 2. formEntryPrice
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] font-mono"/,
  `className="${standardInputClass} font-mono"`
);

// 3. formSize
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] font-mono font-bold"/,
  `className="${standardInputClass} font-mono font-bold"`
);

// 4. formStopLoss & formTakeProfit
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] font-mono"/g,
  `className="${standardInputClass} font-mono"`
);

// 5. formTimeframe
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] font-bold cursor-pointer"/,
  `className="${standardInputClass} font-bold cursor-pointer"`
);

// 6. formExitPrice
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface\/50 border border-m3-outline-variant dark:border-m3-outline-variant rounded-\[16px\] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] font-mono"/,
  `className="${standardInputClass} font-mono"`
);

// 7. formExitDate (The likely culprit!)
content = content.replace(
  /className="w-full bg-m3-surface\/50 border border-m3-outline-variant dark:border-m3-outline-variant rounded-\[16px\] px-2 py-3 sm:px-3 m3-body-small focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] cursor-pointer"/,
  `className="${standardInputClass} cursor-pointer"`
);

// 8. formEntryDate
content = content.replace(
  /className="w-full bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] px-2 py-3 sm:px-3 m3-body-small focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] cursor-pointer"/,
  `className="${standardInputClass} cursor-pointer"`
);

// 9. formTag
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\] font-bold cursor-pointer"/,
  `className="${standardInputClass} font-bold cursor-pointer"`
);

// 10. formNotes
content = content.replace(
  /className="w-full min-w-0 px-3 py-3 sm:p-3\.5 bg-m3-surface-container-lowest border border-m3-outline rounded-\[4px\] m3-body-small sm:m3-body-medium focus:outline-none focus:ring-0 focus:border-m3-primary focus:border-2 text-m3-on-surface transition-all ease-\[var\(--ease-m3-enter\)\]"/,
  `className="${standardInputClass} resize-none"`
);

// Also check the form container. 
// "overflow-x-hidden overflow-y-auto" should prevent PWA sliding.
// I will enforce max-w-[100vw] on the modal to be absolutely sure.
content = content.replace(
  /className="relative w-full max-w-2xl bg-m3-surface sm:rounded-\[28px\] rounded-t-\[28px\] shadow-level5 z-10 flex flex-col h-\[92dvh\] sm:h-auto sm:max-h-\[90vh\] overflow-x-hidden overflow-y-hidden"/,
  `className="relative w-full max-w-[100vw] sm:max-w-2xl bg-m3-surface sm:rounded-[28px] rounded-t-[28px] shadow-level5 z-10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-x-hidden overflow-y-hidden"`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed input layout and styling for Add Trade modal.');
