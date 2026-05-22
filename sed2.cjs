const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

lines.splice(1343, 60);

fs.writeFileSync('src/App.tsx', lines.join('\n'));
