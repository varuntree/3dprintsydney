import { spawn, type ChildProcess } from "child_process";
import { promises as fsp } from "fs";
import path from "path";

export type SliceOptions = {
  layerHeight: number; // mm
  infill: number; // percent
  supports: boolean;
};

export type SliceResult = {
  timeSec: number;
  grams: number;
  gcodePath?: string;
  fallback?: boolean;
};

function parseTimeToSeconds(text: string): number {
  // Supports formats like "1h 23m 45s", "2h 5m", "15m 30s", "02:10:00"
  const hms = text.match(/(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i);
  if (hms) {
    const h = Number(hms[1] || 0);
    const m = Number(hms[2] || 0);
    const s = Number(hms[3] || 0);
    return h * 3600 + m * 60 + s;
  }
  const colon = text.match(/(\d+):(\d+):(\d+)/);
  if (colon) {
    return Number(colon[1]) * 3600 + Number(colon[2]) * 60 + Number(colon[3]);
  }
  return 0;
}

async function parseGcodeMetrics(gcodePath: string): Promise<{ timeSec: number; grams: number }> {
  const buf = await fsp.readFile(gcodePath, "utf8");
  const lines = buf.split(/\r?\n/).slice(0, 200);
  let grams = 0;
  let timeSec = 0;
  for (const line of lines) {
    const lg = line.toLowerCase();
    const g1 = lg.match(/filament\s+used\s*=\s*([\d.]+)\s*g/);
    const g2 = lg.match(/filament\s+used\s*\[g\]\s*=\s*([\d.]+)/);
    if (!grams && (g1 || g2)) {
      grams = Number((g1?.[1] ?? g2?.[1]) || 0);
    }
    const t1 = lg.match(/estimated\s+printing\s+time.*?=\s*([^;]+)/);
    if (!timeSec && t1?.[1]) {
      timeSec = parseTimeToSeconds(t1[1].trim());
    }
  }
  return { timeSec, grams };
}

export async function sliceFileWithCli(inputPath: string, opts: SliceOptions): Promise<SliceResult> {
  if (process.env.SLICER_DISABLE === "1") {
    return { timeSec: 3600, grams: 80, fallback: true };
  }
  const bin = process.env.SLICER_BIN || "prusaslicer"; // or "slic3r"
  const outDir = path.dirname(inputPath);
  const outPath = path.join(outDir, path.basename(inputPath, path.extname(inputPath)) + ".gcode");

  const args: string[] = [];
  // Common flags supported by PrusaSlicer and (mostly) Slic3r
  args.push("--export-gcode");
  args.push("--layer-height", String(opts.layerHeight));
  args.push("--fill-density", `${opts.infill}%`);
  if (opts.supports) args.push("--support-material");
  args.push("--output", outDir);
  args.push(inputPath);

  const concurrency = Math.max(1, Math.min(4, Number(process.env.SLICER_CONCURRENCY || 1)));
  await acquire(concurrency);
  let child: ChildProcess | null = null;
  try {
    child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    release();
    return { timeSec: 3600, grams: 80, fallback: true };
  }
  const res = await new Promise<{ code: number; stderr: string }>((resolve) => {
    const timeoutMs = Math.max(30_000, Math.min(300_000, Number(process.env.SLICER_TIMEOUT_MS || 120_000)));
    const to = setTimeout(() => {
      try { child!.kill("SIGKILL"); } catch {}
    }, timeoutMs);
    let stderr = "";
    child!.on("error", () => resolve({ code: 1, stderr: "spawn error" }));
    child!.stderr?.on("data", (d) => (stderr += d.toString()));
    child!.on("close", (code) => {
      clearTimeout(to);
      resolve({ code: code ?? 0, stderr });
    });
  }).finally(release);

  if (res.code !== 0) {
    return { timeSec: 3600, grams: 80, fallback: true }; // crude fallback
  }

  const metrics = await parseGcodeMetrics(outPath).catch(() => ({ timeSec: 0, grams: 0 }));
  if (!metrics.timeSec || !metrics.grams) {
    return { timeSec: 3600, grams: 80, fallback: true };
  }
  return { ...metrics, gcodePath: outPath };
}

// --- simple semaphore to limit concurrent slicer runs ---
let current = 0;
const waiters: Array<() => void> = [];
async function acquire(limit: number) {
  if (current < limit) {
    current += 1; return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  current += 1;
}
function release() {
  current = Math.max(0, current - 1);
  const next = waiters.shift();
  if (next) next();
}
