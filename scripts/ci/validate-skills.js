/**
 * validate-skills.js
 * 모든 레이어의 skills/ 하위 디렉토리 검증
 * - 각 스킬 디렉토리에 SKILL.md 필수
 * - SKILL.md 비어있지 않은지 확인
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const LAYERS = ["base", "common", "react-next", "nestjs"];

let errors = [];
let validated = 0;

for (const layer of LAYERS) {
  const dir = path.join(ROOT, layer, "skills");
  if (!fs.existsSync(dir)) continue;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMd = path.join(dir, entry.name, "SKILL.md");

    if (!fs.existsSync(skillMd)) {
      errors.push(`${layer}/skills/${entry.name}/: SKILL.md 없음`);
      continue;
    }

    let content = fs.readFileSync(skillMd, "utf-8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    if (content.trim().length === 0) {
      errors.push(`${layer}/skills/${entry.name}/SKILL.md: 빈 파일`);
      continue;
    }

    validated++;
  }
}

if (validated === 0) {
  console.log("  [SKIP] skills: 스킬 없음");
  process.exit(0);
}

if (errors.length > 0) {
  console.log(`  [FAIL] skills: ${errors.length}건 오류 (${validated}개 검사)`);
  errors.forEach((e) => console.log(`         - ${e}`));
  process.exit(1);
}

console.log(`  [PASS] skills: ${validated}개 검증 완료`);
process.exit(0);
