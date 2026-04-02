#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "verify") {
  process.stdout.write("agent-council cli scaffold is available.\n");
  process.exit(0);
}

process.stdout.write("Usage: agent-council <init|refresh|verify|uninstall>\n");
