import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const sourceIds = [
  "01_air_fryer_wings_00001_", "commercial-skincare-elixir-water",
  "03_electric_suv_studio_00001_", "commercial-ice-maker-cubes",
  "05_healing_mattress_00001_", "d9c14d8520e106a0803087b55aaea7ad",
  "06_earbuds_unboxing_00001_", "ffcffe00a999d24e399f2eeb2fc45b73",
  "commercial-mirror-beauty-routine", "commercial-sereni-story-product",
  "commercial-animated-street-story", "pet-cats-product",
  "pet-golden-product", "pet-orange-cat-product", "pet-dogs-product", "lunar-rover"
];
const profiles = [
  { height: 360, bitrate: 300, audio: 48 },
  { height: 480, bitrate: 550, audio: 64 },
  { height: 720, bitrate: 1000, audio: 64 },
  { height: 1080, bitrate: 2200, audio: 96 }
];
const digest = data => createHash("sha256").update(data).digest("hex").slice(0, 16);

function command(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-6000); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout) : reject(new Error(`${executable} exited ${code}: ${stderr}`)));
  });
}

export async function buildShowcasePlayback(root, distDir) {
  const encoderVersion = (await command("ffmpeg", ["-version"])).split(/\r?\n/)[0];
  const manifest = { schemaVersion: 1, videos: {} };
  const destination = path.join(distDir, "showcase", "media");
  await mkdir(destination, { recursive: true });

  for (const id of sourceIds) {
    const source = path.join(root, "showcase", "videos", `${id}.mp4`);
    const probe = JSON.parse(await command("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", source]));
    const video = probe.streams.find(stream => stream.codec_type === "video");
    const [numerator, denominator] = video.avg_frame_rate.split("/").map(Number);
    const fps = Math.min(30, numerator / denominator || 24);
    const shortSide = Math.min(video.width, video.height);
    const selectedProfiles = profiles.filter(profile => profile.height <= shortSide);
    if (!selectedProfiles.length) selectedProfiles.push({ height: shortSide, bitrate: 300, audio: 48 });
    const recipe = digest(Buffer.concat([await readFile(source), Buffer.from(JSON.stringify({ encoderVersion, selectedProfiles, fps, version: 1 }))]));
    const cache = path.join(root, "output", "media-renditions", recipe);
    const marker = path.join(cache, "complete.json");
    let entry;
    try { entry = JSON.parse(await readFile(marker, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }

    if (!entry) {
      await mkdir(cache, { recursive: true });
      const duration = Number(probe.format.duration);
      const longVideo = duration > 30;
      const variants = [];
      for (const profile of selectedProfiles) {
        const ratio = profile.height / shortSide;
        const width = Math.max(2, Math.round(video.width * ratio / 2) * 2);
        const height = Math.max(2, Math.round(video.height * ratio / 2) * 2);
        const name = `${profile.height}p`;
        const target = path.join(cache, `${name}.mp4`);
        await command("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y", "-i", source,
          "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1",
          "-vf", `scale=${width}:${height}:flags=lanczos,fps=${fps}`,
          "-c:v", "libx264", "-preset", "fast", "-threads", "2", "-crf", "24",
          "-maxrate", `${profile.bitrate}k`, "-bufsize", `${profile.bitrate * 2}k`,
          "-pix_fmt", "yuv420p", "-g", String(Math.round(fps * 2)),
          "-keyint_min", String(Math.round(fps * 2)), "-sc_threshold", "0",
          "-force_key_frames", "expr:gte(t,n_forced*2)",
          "-c:a", "aac", "-b:a", `${profile.audio}k`, "-movflags", "+faststart", target
        ]);
        const file = await stat(target);
        variants.push({ label: name, width, height, bitrate: (profile.bitrate + profile.audio) * 1000, bytes: file.size, src: `showcase/media/${recipe}/${name}.mp4` });
        if (longVideo) {
          await command("ffmpeg", [
            "-hide_banner", "-loglevel", "error", "-y", "-i", target,
            "-c", "copy", "-hls_time", "2", "-hls_playlist_type", "vod",
            "-hls_flags", "independent_segments", "-hls_list_size", "0",
            "-hls_segment_filename", path.join(cache, `${name}-%03d.ts`), path.join(cache, `${name}.m3u8`)
          ]);
        }
      }
      if (longVideo) {
        const master = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS"];
        for (const variant of variants) {
          master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${Math.ceil(variant.bitrate * 1.15)},RESOLUTION=${variant.width}x${variant.height}`, `${variant.label}.m3u8`);
        }
        await writeFile(path.join(cache, "master.m3u8"), `${master.join("\n")}\n`);
      }
      const posterCandidates = [
        `showcase/images/_posters/${id}.webp`,
        `showcase/videos/${id.replace(/_00001_$/, "")}.jpg`
      ];
      let poster = "";
      for (const candidate of posterCandidates) {
        if (await stat(path.join(root, candidate)).then(() => true).catch(() => false)) { poster = candidate; break; }
      }
      entry = { duration, poster, variants, hls: longVideo ? `showcase/media/${recipe}/master.m3u8` : null };
      await writeFile(marker, JSON.stringify(entry));
    }
    const targetDir = path.join(destination, recipe);
    await mkdir(targetDir, { recursive: true });
    for (const filename of await readdir(cache)) {
      if (filename !== "complete.json") await cp(path.join(cache, filename), path.join(targetDir, filename));
    }
    manifest.videos[id] = entry;
    console.log(`[playback] ${id}: ${entry.variants.map(variant => variant.label).join(", ")}${entry.hls ? " + HLS" : ""}`);
  }

  const manifestData = `${JSON.stringify(manifest)}\n`;
  const manifestName = `manifest-${digest(manifestData)}.json`;
  await writeFile(path.join(destination, manifestName), manifestData);
  const runtimeDir = path.join(distDir, "showcase", "runtime");
  const bundle = await build({
    entryPoints: { player: path.join(root, "src", "showcase-player.js") },
    outdir: runtimeDir, entryNames: "[name]-[hash]", chunkNames: "[name]-[hash]",
    bundle: true, splitting: true, format: "esm", platform: "browser", target: "es2020",
    minify: true, legalComments: "none", metafile: true
  });
  const player = Object.entries(bundle.metafile.outputs).find(([, info]) => info.entryPoint?.endsWith("showcase-player.js"))[0];
  const css = await readFile(path.join(root, "showcase", "player.css"));
  const cssName = `player-${digest(css)}.css`;
  await writeFile(path.join(runtimeDir, cssName), css);
  const htmlPath = path.join(distDir, "index.html");
  const html = (await readFile(htmlPath, "utf8"))
    .replace(/href="showcase\/(?:runtime\/)?player(?:-[a-f0-9]+)?\.css"/, `href="showcase/runtime/${cssName}"`)
    .replace(/src="showcase\/runtime\/player(?:-[A-Za-z0-9]+)?\.js"/, `src="${path.relative(distDir, player).replaceAll("\\", "/")}"`)
    .replace(/data-manifest="showcase\/media\/manifest(?:-[a-f0-9]+)?\.json"/, `data-manifest="showcase/media/${manifestName}"`);
  await writeFile(htmlPath, html);
  return manifest;
}
