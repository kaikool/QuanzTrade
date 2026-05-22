const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard input width classes with stronger ones
content = content.replace(/className="w-full /g, 'className="w-full box-border block overflow-hidden ');
content = content.replace(/max-w-\[100\%\]/g, 'max-w-full');

// specifically for datetime local make sure we apply strict sizing rules
content = content.replace(/<input\s+type="datetime-local"/g, '<input\n                      type="datetime-local"\n                      style={{ boxSizing: "border-box", display: "block", minWidth: 0, width: "100%", maxWidth: "100%" }}');

fs.writeFileSync('src/App.tsx', content);
