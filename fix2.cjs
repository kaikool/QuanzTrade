const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure the form elements have nice, clean classes and no overflow
app = app.replace(/className="w-full box-border block overflow-hidden px-2.5 py-3 sm:p-3.5 w-full shrink max-w-full /g, 'className="w-full min-w-0 px-3 py-3 sm:p-3.5 ');
app = app.replace(/className="w-full box-border block overflow-hidden px-2.5 py-3 sm:p-3.5 /g, 'className="w-full min-w-0 px-3 py-3 sm:p-3.5 ');
app = app.replace(/className="relative w-full max-w-2xl bg-white dark:bg-google-dark-surface sm:rounded-\[28px\] rounded-t-\[28px\] shadow-2xl z-10 flex flex-col h-\[92dvh\] sm:h-auto sm:max-h-\[90vh\] overflow-hidden"/g, 'className="relative w-full max-w-2xl bg-white dark:bg-google-dark-surface sm:rounded-[28px] rounded-t-[28px] shadow-2xl z-10 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-x-hidden overflow-y-hidden"');

fs.writeFileSync('src/App.tsx', app);
