const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(/box-border block overflow-hidden /g, '');
app = app.replace(/max-w-\[100\%\]/g, '');

fs.writeFileSync('src/App.tsx', app);
