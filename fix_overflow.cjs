const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Change modal form padding: p-5 -> px-4 py-5
content = content.replace(/p-5 sm:p-8 space-y-6 sm:space-y-7/g, 'px-4 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-7');

// Change CLOSED block padding
content = content.replace(/className="p-4 rounded-\[20px\] bg-gray-50\/50/g, 'className="p-3 sm:p-5 rounded-[16px] sm:rounded-[20px] bg-gray-50/50');

// Change input paddings from p-3.5 to px-3 py-3 sm:p-3.5
content = content.replace(/className="w-full p-3.5/g, 'className="w-full px-2.5 py-3 sm:p-3.5 w-full shrink max-w-[100%]');

fs.writeFileSync('src/App.tsx', content);
