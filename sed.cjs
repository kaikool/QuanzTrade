const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('4. NEWS TAB SCREEN')) {
    skip = true;
  }
  
  if (!skip) {
    newLines.push(lines[i]);
  }
  
  if (skip && lines[i].includes(')}')) {
     if (i + 1 < lines.length && lines[i+1] === '') {
       // it's the end of block
       if (i + 2 < lines.length && lines[i+2].includes('</div>')) {
           skip = false;
       }
     }
  }
}

fs.writeFileSync('src/App.tsx', newLines.join('\n'));
