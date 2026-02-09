/**
 * validate-agents.js
 * 모든 레이어의 agents/*.md 파일 검증
 * - frontmatter 필수: description, tools
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const LAYERS = ["base", "common", "react-next", "nestjs"];
const REQUIRED_FIELDS = ["description", "tools"];

let errors = [];
let validated = 0;

for (const layer of LAYERS) {
  const dir = path.join(ROOT, layer, "agents");
  if (!fs.existsSync(dir)) continue;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, "utf-8");

    // BOM 제거
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      errors.push(`${layer}/agents/${file}: frontmatter 없음`);
      continue;
    }

    // frontmatter에서 키 존재 여부 확인 (YAML list 형식 지원)
    const fmText = match[1];
    for (const field of REQUIRED_FIELDS) {
      // "field:" 가 줄 시작에 있는지 (값이 같은 줄이든 다음 줄 리스트든)
      const pattern = new RegExp(`^${field}\\s*:`, "m");
      if (!pattern.test(fmText)) {
        errors.push(`${layer}/agents/${file}: '${field}' 필드 없음`);
      }
    }

    validated++;
  }
}

if (validated === 0) {
  console.log("  [SKIP] agents: 파일 없음");
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`  [FAIL] agents: ${errors.length}건 오류 (${validated}개 검사)`);
  errors.forEach((e) => console.log(`         - ${e}`));
  process.exit(1);
}

console.log(`  [PASS] agents: ${validated}개 검증 완료`);
process.exit(0);
