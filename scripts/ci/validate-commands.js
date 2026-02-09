/**
 * validate-commands.js
 * 모든 레이어의 commands/*.md 파일 검증
 * - 비어있지 않은지 확인
 * - frontmatter description 권장 (경고만)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const LAYERS = ["base", "common", "react-next", "nestjs"];

let errors = [];
let warnings = [];
let validated = 0;

function scanDir(dir, layer, prefix) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      scanDir(fullPath, layer, rel);
      continue;
    }

    if (!entry.name.endsWith(".md")) continue;

    let content = fs.readFileSync(fullPath, "utf-8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    if (content.trim().length === 0) {
      errors.push(`${layer}/commands/${rel}: 빈 파일`);
      continue;
    }

    // description frontmatter 체크 (경고만)
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match || !match[1].includes("description")) {
      warnings.push(`${layer}/commands/${rel}: description frontmatter 없음`);
    }

    validated++;
  }
}

for (const layer of LAYERS) {
  scanDir(path.join(ROOT, layer, "commands"), layer, "");
}

if (validated === 0) {
  console.log("  [SKIP] commands: 파일 없음");
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`  [FAIL] commands: ${errors.length}건 오류 (${validated}개 검사)`);
  errors.forEach((e) => console.log(`         - ${e}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.log(`  [PASS] commands: ${validated}개 검증 (경고 ${warnings.length}건)`);
  warnings.forEach((w) => console.log(`         - ${w}`));
} else {
  console.log(`  [PASS] commands: ${validated}개 검증 완료`);
}
process.exit(0);
