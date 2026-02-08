#!/usr/bin/env node
/**
 * Jira MCP 서버 실행 래퍼
 * .claude/.env 에서 JIRA_TOKEN, JIRA_URL, JIRA_USERNAME 읽어서 실행합니다.
 *
 * 출처: bid-ai-site/.claude/scripts/run-jira-mcp.cjs
 */
const fs = require("fs");
const path = require("path");

// Load .env from .claude/.env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^=\s#]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const token = process.env.JIRA_TOKEN;
const jiraUrl = process.env.JIRA_URL || "https://rstful.atlassian.net";
const jiraUsername = process.env.JIRA_USERNAME || "";

if (!token) {
  console.error("JIRA_TOKEN not found in .claude/.env");
  process.exit(1);
}

if (!jiraUsername) {
  console.error("JIRA_USERNAME not found in .claude/.env");
  process.exit(1);
}

const { spawn } = require("child_process");
const child = spawn(
  "uvx",
  [
    "mcp-atlassian",
    `--jira-url=${jiraUrl}`,
    `--jira-username=${jiraUsername}`,
    `--jira-token=${token}`,
  ],
  {
    stdio: "inherit",
    shell: true,
  }
);

child.on("exit", (code) => process.exit(code || 0));
