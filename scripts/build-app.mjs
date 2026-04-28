import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "assets");
const cssEntry = path.join(root, "styles", "app.css");
const jsEntry = path.join(root, "app.jsx");

const runCommand = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options
  });

  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`${command} exited with code ${code}`));
  });
});

export const buildAppAssets = async () => {
  await mkdir(assetsDir, { recursive: true });
  await rm(path.join(assetsDir, "app.css"), { force: true });
  await rm(path.join(assetsDir, "app.js"), { force: true });

  const tailwindCli = path.join(root, "node_modules", "tailwindcss", "lib", "cli.js");
  await runCommand(process.execPath, [
    tailwindCli,
    "-c", path.join(root, "tailwind.config.cjs"),
    "-i", cssEntry,
    "-o", path.join(assetsDir, "app.css"),
    "--minify"
  ]);

  await build({
    entryPoints: [jsEntry],
    outfile: path.join(assetsDir, "app.js"),
    bundle: true,
    minify: true,
    sourcemap: false,
    platform: "browser",
    format: "iife",
    target: ["es2020"],
    jsx: "automatic",
    legalComments: "none",
    define: {
      "process.env.NODE_ENV": "\"production\""
    }
  });
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildAppAssets().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
