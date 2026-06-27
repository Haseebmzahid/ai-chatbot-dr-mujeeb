import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [
  "README.md",
  ".env.example",
  "index.html",
  "Dockerfile",
  "docker-compose.yml",
  "ecosystem.config.cjs",
  "deploy",
  "docs",
  "locales",
  "src",
  "server"
];

const DENYLIST = [
  "Dr. Khurrum",
  "Khurrum Mansoor",
  "demo123",
  "clinic.demo",
  "sample patient",
  "test patient",
  "seeded patient",
  "seeded appointment",
  "mock data",
  "memory fallback",
  "WhatsApp Demo",
  "local demo mode",
  "fake reports",
  "fake charts",
  "fake message sent",
  "old doctor data",
  "old clinic data"
];

const CASE_INSENSITIVE = ["demo", "dummy", "fake", "placeholder"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "backups"]);
const SKIP_FILES = new Set(["scripts/check-dummy-content.js"]);
const TEXT_EXTENSIONS = new Set([".js", ".jsx", ".json", ".md", ".css", ".html", ".yml", ".yaml", ".cjs", ".example", ".txt", ".conf", ""]);

function walk(filePath) {
  const relative = path.relative(ROOT, filePath).replaceAll("\\", "/");
  if (SKIP_FILES.has(relative)) return [];
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    if (SKIP_DIRS.has(path.basename(filePath))) return [];
    return fs.readdirSync(filePath).flatMap((item) => walk(path.join(filePath, item)));
  }
  if (!TEXT_EXTENSIONS.has(path.extname(filePath))) return [];
  return [filePath];
}

const files = TARGETS.map((target) => path.join(ROOT, target)).filter(fs.existsSync).flatMap(walk);
const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8").replaceAll("check:dummy-content", "check-content-command");
  const relative = path.relative(ROOT, file).replaceAll("\\", "/");
  for (const term of DENYLIST) {
    if (text.includes(term)) findings.push(`${relative}: contains "${term}"`);
  }
  const lower = text.toLowerCase();
  for (const term of CASE_INSENSITIVE) {
    if (lower.includes(term)) findings.push(`${relative}: contains "${term}"`);
  }
}

if (findings.length) {
  console.error("Content scan failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Content scan passed across ${files.length} files.`);
