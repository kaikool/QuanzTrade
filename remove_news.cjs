const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace('const [currentTab, setCurrentTab] = useState<"dashboard" | "journal" | "calendar" | "news">("dashboard");', 'const [currentTab, setCurrentTab] = useState<"dashboard" | "journal" | "calendar">("dashboard");');

app = app.replace(/\w*\/\/\s*News state\s*const \[newsData\, setNewsData\] \= useState\<any\[\]\>\(\[\]\);\s*const \[loadingNews\, setLoadingNews\] \= useState\(true\);\s*/g, '');

app = app.replace(/\s*\/\/\s*Load news\s*loadNewsData\(\);\s*/g, '\n');

const loadNewsFunctionRegex = /\s*const loadNewsData = async \(\) => \{[\s\S]*?\}\s*};\s*/;
app = app.replace(loadNewsFunctionRegex, '\n\n');

const desktopTabNewsRegex = /\s*<button\s*onClick=\{\(\) => setCurrentTab\("news"\)\}[\s\S]*?<span>Tin tức vĩ mô<\/span>\s*<\/button>\s*/;
app = app.replace(desktopTabNewsRegex, '\n');

const viewNewsRegex = /\s*{\/\*\s*4\. NEWS TAB SCREEN\s*\*\/}[\s\S]*?{\s*currentTab\b[\s\S]*?id="news-master-view"[\s\S]*?\}\)\}\s*<\/div>\s*<\/div>\s*\)\}\s*/;
app = app.replace(viewNewsRegex, '\n\n');

const mobileTabNewsRegex = /\s*<button\s*onClick=\{\(\) => setCurrentTab\("news"\)\}[\s\S]*?<span>News<\/span>\s*<\/button>\s*/;
app = app.replace(mobileTabNewsRegex, '\n');

fs.writeFileSync('src/App.tsx', app);

let env = fs.readFileSync('.env.example', 'utf8');
env = env.replace(/\s*# OPENBB_API_URL: Link to your OpenBB Platform REST API \(FastAPI\) Backend\s*OPENBB_API_URL=""\s*/g, '\n');
fs.writeFileSync('.env.example', env);

let server = fs.readFileSync('server.ts', 'utf8');
const serverNewsRegex = /\s*\/\/ API endpoint for News[\s\S]*?app\.get\("\/api\/news"[\s\S]*?\}\);\s*/;
server = server.replace(serverNewsRegex, '\n');
fs.writeFileSync('server.ts', server);
