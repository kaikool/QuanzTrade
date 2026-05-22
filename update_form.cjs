const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update grids
content = content.replace(/grid grid-cols-1 sm:grid-cols-2 gap-4/g, 'grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6');

content = content.replace(/<div>\n                    <label className="text-xs/g, '<div className="min-w-0">\n                    <label className="text-xs');
content = content.replace(/<div>\n                      <label className="text-xs/g, '<div className="min-w-0">\n                      <label className="text-xs');

fs.writeFileSync('src/App.tsx', content);
