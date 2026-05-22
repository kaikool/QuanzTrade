const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/<input\n\s*type="datetime-local"\n\s*style=\{\{.*?\}\}\s*\n/g, '<input\n                      type="datetime-local"\n');

// Replace the long class for these inputs with a simpler one that allows shrinking text:
app = app.replace(/className="w-full box-border block overflow-hidden px-2.5 py-3 sm:p-3.5 w-full shrink max-w-full bg-white dark:bg-\[\#131314\]\/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-google-blue-600\/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600\/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all cursor-pointer"/g, 'className="w-full bg-white dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-2 py-3 sm:px-3 text-xs focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 text-gray-900 dark:text-white transition-all cursor-pointer"');

app = app.replace(/className="w-full box-border block overflow-hidden px-2.5 py-3 sm:p-3.5 w-full shrink max-w-full bg-gray-50\/50 dark:bg-\[\#131314\]\/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-google-blue-600\/20 focus:border-google-blue-600 dark:focus:ring-google-blue-600\/20 dark:focus:border-google-blue-500 text-gray-900 dark:text-white transition-all cursor-pointer"/g, 'className="w-full bg-gray-50/50 dark:bg-[#131314]/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-2 py-3 sm:px-3 text-xs focus:outline-none focus:ring-2 focus:ring-google-blue-600/20 text-gray-900 dark:text-white transition-all cursor-pointer"');

fs.writeFileSync('src/App.tsx', app);
