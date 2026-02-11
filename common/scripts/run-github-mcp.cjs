#!/usr/bin/env node
/**
 * GitHub MCP 서버 실행 래퍼
 * .claude/.env 에서 GITHUB_PAT 읽어서 GitHub MCP 서버를 실행합니다.
 *
 * 출처: bid-ai-site/.claude/scripts/run-github-mcp.cjs
 */
const fs = require("fs");
const path = require("path");

// Load .env from .claude/.env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([^=\s#]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const token = process.env.GITHUB_PAT;
if (!token || token.includes("ghp_xxxx") || token.length < 40) {
  console.error("ERROR: GITHUB_PAT not configured in .claude/.env");
  console.error("발급: https://github.com/settings/tokens/new");
  console.error("권한: repo (전체), read:org");
  console.error("형식: ghp_로 시작하는 40자 문자열");
  process.exit(1);
}

process.env.GITHUB_PERSONAL_ACCESS_TOKEN = token;

const { spawn } = require("child_process");
const child = spawn(
  "npx",
  ["-y", "@modelcontextprotocol/server-github"],
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      GITHUB_PERSONAL_ACCESS_TOKEN: token,
    },
  }
);

child.on("exit", (code) => process.exit(code || 0));
