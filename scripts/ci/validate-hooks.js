/**
 * validate-hooks.js
 * base/hooks/hooks.json 스키마 검증
 * - JSON 파싱
 * - 이벤트 타입 유효성
 * - matcher/hooks 구조
 * - 참조 스크립트 파일 존재 여부
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const HOOKS_FILE = path.join(ROOT, "base", "hooks", "hooks.json");

const VALID_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "SessionStart",
  "SessionEnd",
  "Stop",
  "Notification",
  "SubagentStop",
];

if (!fs.existsSync(HOOKS_FILE)) {
  console.log("  [SKIP] hooks: hooks.json 없음");
  process.exit(0);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(HOOKS_FILE, "utf-8"));
} catch (e) {
  console.log(`  [FAIL] hooks: JSON 파싱 실패 — ${e.message}`);
  process.exit(1);
}

const hooks = data.hooks || data;
let errors = [];
let matcherCount = 0;
let scriptRefs = [];

for (const [event, matchers] of Object.entries(hooks)) {
  if (!VALID_EVENTS.includes(event)) {
    errors.push(`알 수 없는 이벤트: '${event}'`);
    continue;
  }

  if (!Array.isArray(matchers)) {
    errors.push(`${event}: matchers가 배열이 아님`);
    continue;
  }

  for (let i = 0; i < matchers.length; i++) {
    const m = matchers[i];

    if (typeof m.matcher !== "string") {
      errors.push(`${event}[${i}]: 'matcher' 필드 없음 또는 문자열 아님`);
    }

    if (!Array.isArray(m.hooks)) {
      errors.push(`${event}[${i}]: 'hooks' 배열 없음`);
      continue;
    }

    for (let j = 0; j < m.hooks.length; j++) {
      const h = m.hooks[j];

      if (typeof h.type !== "string") {
        errors.push(`${event}[${i}].hooks[${j}]: 'type' 없음`);
      }

      if (typeof h.command !== "string" && !Array.isArray(h.command)) {
        errors.push(`${event}[${i}].hooks[${j}]: 'command' 없음`);
      }

      // 스크립트 참조 추출
      const cmd = Array.isArray(h.command) ? h.command.join(" ") : h.command || "";
      const scriptMatch = cmd.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/(scripts\/[^\s"]+)/);
      if (scriptMatch) {
        scriptRefs.push({
          event,
          ref: scriptMatch[1],
          fullPath: path.join(ROOT, "base", scriptMatch[1]),
        });
      }
    }

    matcherCount++;
  }
}

// 참조 스크립트 파일 존재 확인
for (const ref of scriptRefs) {
  if (!fs.existsSync(ref.fullPath)) {
    errors.push(`${ref.event}: 스크립트 없음 — ${ref.ref}`);
  }
}

if (errors.length > 0) {
  console.log(`  [FAIL] hooks: ${errors.length}건 오류 (${matcherCount} matchers)`);
  errors.forEach((e) => console.log(`         - ${e}`));
  process.exit(1);
}

console.log(`  [PASS] hooks: ${matcherCount} matchers, ${scriptRefs.length} scripts 검증 완료`);
process.exit(0);
