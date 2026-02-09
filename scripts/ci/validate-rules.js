/**
 * validate-rules.js
 * 모든 레이어의 rules/ 하위 .md 파일 검증 (재귀)
 * - 비어있지 않은지 확인
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const LAYERS = ["base", "common", "react-next", "nestjs"];

let errors = [];
let validated = 0;

function scanDir(dir, label) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDir(fullPath, label);
      continue;
    }

    if (!entry.name.endsWith(".md")) continue;
    if (entry.name === "README.md") continue;

    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      errors.push(`${path.relative(ROOT, fullPath)}: 읽기 실패`);
      continue;
    }

    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    if (content.trim().length === 0) {
      errors.push(`${path.relative(ROOT, fullPath)}: 빈 파일`);
      continue;
    }

    validated++;
  }
}

for (const layer of LAYERS) {
  scanDir(path.join(ROOT, layer, "rules"), layer);
}

if (validated === 0) {
  console.log("  [SKIP] rules: 파일 없음");
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`  [FAIL] rules: ${errors.length}건 오류 (${validated}개 검사)`);
  errors.forEach((e) => console.log(`         - ${e}`));
  process.exit(1);
}

console.log(`  [PASS] rules: ${validated}개 검증 완료`);
process.exit(0);
