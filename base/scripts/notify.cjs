#!/usr/bin/env node
/**
 * Windows Toast Notification
 * Usage: node notify.cjs "Title" "Message"
 */
const notifier = require("node-notifier");

const title = process.argv[2] || "Claude Code";
const message = process.argv[3] || "작업 완료";

notifier.notify({
  title,
  message,
  sound: true,
  wait: false,
});
