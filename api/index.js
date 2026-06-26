// Vercel serverless entry — all API routes handled by Express
const path = require("path");
process.chdir(path.join(__dirname, ".."));
module.exports = require("../dist/server.cjs").default;
