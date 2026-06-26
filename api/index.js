// Vercel serverless entry for Express app
const path = require("path");
process.chdir(path.join(__dirname, ".."));
const server = require("../dist/server.cjs");
module.exports = server.default;
