/**
 * validate-relations.js
 * 컴포넌트 간 연관관계 검증
 *
 * 1. .mcp.json ↔ scripts-wiw: MCP 서버가 참조하는 스크립트 존재 여부
 * 2. scripts-wiw ↔ .env.example: MCP 스크립트가 읽는 환경변수가 .env에 정의됐는지
 * 3. hooks.json ↔ scripts: hook이 참조하는 스크립트 존재 여부
 * 4. guide.md ↔ commands: 가이드가 추천하는 커맨드가 실제 존재하는지
 * 5. agents model 값: 유효한 모델명인지
 * 6. setup.ps1 junction 대상: junction 소스 디렉토리 존재 여부
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
let errors = [];
let checks = 0;

// ============================================================
// 1. .mcp.json → scripts-wiw 참조 검증
// ============================================================
const mcpPath = path.join(ROOT, "common", "mcp-configs", ".mcp.json");
if (fs.existsSync(mcpPath)) {
  const mcp = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
  const servers = mcp.mcpServers || {};

  for (const [name, config] of Object.entries(servers)) {
    if (!config.args) continue;
    const scriptArg = config.args.find(
      (a) => typeof a === "string" && a.includes("scripts-wiw/")
    );
    if (scriptArg) {
      // scripts-wiw → common/scripts 로 매핑
      const scriptName = scriptArg.replace(".claude/scripts-wiw/", "");
      const scriptPath = path.join(ROOT, "common", "scripts", scriptName);
      if (!fs.existsSync(scriptPath)) {
        errors.push(`mcp[${name}] → common/scripts/${scriptName} 없음`);
      }
      checks++;
    }
  }
}

// ============================================================
// 2. MCP 스크립트 → .env.example 환경변수 검증
// ============================================================
const envExamplePath = path.join(ROOT, "common", ".env.example");
let envContent = "";
if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, "utf-8");
}

const scriptEnvMap = {
  "run-github-mcp.cjs": ["GITHUB_PAT"],
  "run-jira-mcp.cjs": ["JIRA_TOKEN", "JIRA_URL", "JIRA_USERNAME"],
  "run-db-mcp.cjs": ["DATABASE_URL"],
};

for (const [script, vars] of Object.entries(scriptEnvMap)) {
  const scriptPath = path.join(ROOT, "common", "scripts", script);
  if (!fs.existsSync(scriptPath)) continue;

  for (const v of vars) {
    if (!envContent.includes(v)) {
      errors.push(`${script} → .env.example에 ${v} 없음`);
    }
    checks++;
  }
}

// ============================================================
// 3. hooks.json → scripts 파일 존재 (validate-hooks.js와 중복이지만 관계 관점)
// ============================================================
const hooksPath = path.join(ROOT, "base", "hooks", "hooks.json");
if (fs.existsSync(hooksPath)) {
  const hooksData = JSON.parse(fs.readFileSync(hooksPath, "utf-8"));
  const hooks = hooksData.hooks || hooksData;

  for (const [event, matchers] of Object.entries(hooks)) {
    if (!Array.isArray(matchers)) continue;
    for (const m of matchers) {
      if (!Array.isArray(m.hooks)) continue;
      for (const h of m.hooks) {
        const cmd = Array.isArray(h.command)
          ? h.command.join(" ")
          : h.command || "";
        const match = cmd.match(
          /\$\{CLAUDE_PLUGIN_ROOT\}\/(scripts\/[^\s"]+)/
        );
        if (match) {
          const target = path.join(ROOT, "base", match[1]);
          if (!fs.existsSync(target)) {
            errors.push(`hooks[${event}] → base/${match[1]} 없음`);
          }
          checks++;
        }
      }
    }
  }
}

// ============================================================
// 4. guide.md → commands 존재 검증
// ============================================================
const guidePath = path.join(ROOT, "common", "commands", "guide.md");
if (fs.existsSync(guidePath)) {
  const guide = fs.readFileSync(guidePath, "utf-8");
  // /command 패턴 추출 (backtick 안의 /xxx)
  const cmdRefs = new Set();
  const cmdPattern = /`\/([\w-]+)`/g;
  let match;
  while ((match = cmdPattern.exec(guide)) !== null) {
    cmdRefs.add(match[1]);
  }

  // guide 자체 제외
  cmdRefs.delete("guide");
  // api 경로 제외 (/api/users/me 같은 것)
  cmdRefs.delete("api");

  // 모든 레이어에서 command 파일 수집
  const availableCmds = new Set();
  for (const layer of ["base", "common", "react-next", "nestjs"]) {
    const cmdDir = path.join(ROOT, layer, "commands");
    if (!fs.existsSync(cmdDir)) continue;
    const files = fs.readdirSync(cmdDir, { withFileTypes: true });
    for (const f of files) {
      if (f.isFile() && f.name.endsWith(".md")) {
        availableCmds.add(f.name.replace(".md", ""));
      }
      // 서브디렉토리 (guide/commands 같은)
      if (f.isDirectory()) {
        availableCmds.add(f.name);
      }
    }
  }

  for (const cmd of cmdRefs) {
    if (!availableCmds.has(cmd)) {
      errors.push(`guide.md → /${cmd} 커맨드 파일 없음`);
    }
    checks++;
  }
}

// ============================================================
// 5. agents model 값 검증
// ============================================================
const VALID_MODELS = ["opus", "sonnet", "haiku"];
for (const layer of ["base", "common", "react-next", "nestjs"]) {
  const agentDir = path.join(ROOT, layer, "agents");
  if (!fs.existsSync(agentDir)) continue;

  const files = fs.readdirSync(agentDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    let content = fs.readFileSync(path.join(agentDir, file), "utf-8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;

    const modelMatch = fm[1].match(/^model\s*:\s*(.+)/m);
    if (modelMatch) {
      const model = modelMatch[1].trim().toLowerCase();
      if (!VALID_MODELS.includes(model)) {
        errors.push(
          `${layer}/agents/${file}: model '${model}' 유효하지 않음 (${VALID_MODELS.join("/")})`
        );
      }
      checks++;
    }
  }
}

// ============================================================
// 6. setup.ps1 복사 소스 디렉토리 존재 검증
// ============================================================
const copySources = [
  ["base", "rules", "common"],
  ["base", "rules", "typescript"],
  ["common", "rules"],
  ["react-next", "rules"],
  ["nestjs", "rules"],
  ["base", "hooks"],
  ["base", "contexts"],
  ["base", "scripts"],
  ["common", "scripts"],
];

for (const parts of copySources) {
  const target = path.join(ROOT, ...parts);
  if (!fs.existsSync(target)) {
    errors.push(`복사 소스 없음: ${parts.join("/")}`);
  }
  checks++;
}

// ============================================================
// 결과
// ============================================================
if (checks === 0) {
  console.log("  [SKIP] relations: 검증 대상 없음");
  process.exit(0);
}

if (errors.length > 0) {
  console.log(
    `  [FAIL] relations: ${errors.length}건 오류 (${checks}개 검사)`
  );
  errors.forEach((e) => console.log(`         - ${e}`));
  process.exit(1);
}

console.log(`  [PASS] relations: ${checks}개 연관관계 검증 완료`);
process.exit(0);
