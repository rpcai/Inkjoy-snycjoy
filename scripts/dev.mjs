import { spawn } from "node:child_process";

let shuttingDown = false;

const commands = [
  ["api", "npm", ["run", "dev:api"]],
  ["web", "npm", ["run", "dev:web"]],
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    env: process.env,
    shell: process.platform === "win32",
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      process.exitCode = code;
      shutdown();
    }
  });

  return child;
});

function shutdown() {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
