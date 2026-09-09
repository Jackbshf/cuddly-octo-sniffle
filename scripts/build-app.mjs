import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
  const jsOutput = path.join(assetsDir, "app.js");

  const tailwindCli = path.join(root, "node_modules", "tailwindcss", "lib", "cli.js");
  await runCommand(process.execPath, [
    tailwindCli,
    "-c", path.join(root, "tailwind.config.cjs"),
    "-i", cssEntry,
    "-o", path.join(assetsDir, "app.css"),
    "--minify"
  ], {
    env: {
      ...process.env,
      BROWSERSLIST_IGNORE_OLD_DATA: process.env.BROWSERSLIST_IGNORE_OLD_DATA || "1"
    }
  });

  const shared = {
    absWorkingDir: root,
    entryPoints: [jsEntry],
    bundle: true,
    minify: true,
    sourcemap: false,
    platform: "browser",
    target: ["es2020"],
    jsx: "automatic",
    legalComments: "none",
    define: {
      "process.env.NODE_ENV": "\"production\""
    }
  };
  const runtime = await build({
    ...shared,
    outdir: assetsDir,
    entryNames: "runtime-[hash]",
    chunkNames: "chunks/[name]-[hash]",
    format: "esm",
    splitting: true,
    metafile: true
  });
  const entry = Object.entries(runtime.metafile.outputs).find(([, value]) => value.entryPoint === "app.jsx");
  if (!entry) throw new Error("Missing portfolio runtime entry");
  const runtimeName = path.basename(entry[0]);

  // A classic bundle preserves the existing direct-file portfolio/editor path.
  const offline = await build({ ...shared, outfile: jsOutput, format: "iife", write: false });
  const offlineCode = offline.outputFiles[0].contents;
  const offlineHash = createHash("sha256").update(offlineCode).digest("hex").slice(0, 10);
  const offlineName = `offline/app.${offlineHash}.js`;
  await mkdir(path.join(assetsDir, "offline"), { recursive: true });
  await writeFile(path.join(assetsDir, offlineName), offlineCode);
  await writeFile(jsOutput, `(() => {
    const base = document.currentScript.src;
    const fail = () => {
      const root = document.getElementById("root");
      const message = document.createElement("p");
      message.textContent = "页面加载失败，请刷新重试。";
      const retry = document.createElement("button");
      retry.textContent = "重新加载";
      retry.onclick = () => location.reload();
      root.replaceChildren(message, retry);
    };
    if (location.protocol === "file:") {
      const script = document.createElement("script");
      script.src = new URL(${JSON.stringify(offlineName)}, base).href;
      script.onerror = fail;
      document.head.appendChild(script);
    } else {
      import(new URL(${JSON.stringify(runtimeName)}, base).href).catch(fail);
    }
  })();\n`, "utf8");
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildAppAssets().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
