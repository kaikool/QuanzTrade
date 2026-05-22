const fs = require('fs');

function updateFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/rounded-2xl/g, 'rounded-[24px]');
  fs.writeFileSync(path, content);
}

updateFile('src/App.tsx');
updateFile('src/components/BentoStats.tsx');
