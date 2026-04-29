import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";

const PYTHON_BIN =
  process.env.TIKTOK_PYTHON ||
  "/opt/homebrew/opt/yt-dlp/libexec/bin/python3";
const FETCH_SCRIPT = path.join(process.cwd(), "scripts", "fetch_tiktok_html.py");
const POOL_SIZE = Number(process.env.TIKTOK_DAEMON_POOL || 3);

type Pending = {
  resolve: (html: string) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};

class Worker {
  private proc: ChildProcessWithoutNullStreams;
  private buffer = "";
  private pending: Pending | null = null;
  busy = false;

  constructor() {
    this.proc = this.spawn();
  }

  private spawn(): ChildProcessWithoutNullStreams {
    const proc = spawn(PYTHON_BIN, [FETCH_SCRIPT, "--daemon"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    proc.stdout.setEncoding("utf-8");
    proc.stdout.on("data", (chunk: string) => {
      this.buffer += chunk;
      let nl;
      while ((nl = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.slice(0, nl);
        this.buffer = this.buffer.slice(nl + 1);
        this.handleLine(line);
      }
    });
    proc.stderr.setEncoding("utf-8");
    proc.stderr.on("data", (chunk: string) => {
      if (process.env.TIKTOK_DAEMON_DEBUG) {
        process.stderr.write(`[py-daemon] ${chunk}`);
      }
    });
    proc.on("exit", (code) => {
      if (this.pending) {
        clearTimeout(this.pending.timer);
        this.pending.reject(new Error(`daemon exited with code ${code}`));
        this.pending = null;
      }
      this.proc = this.spawn();
    });
    return proc;
  }

  private handleLine(line: string) {
    if (!this.pending) return;
    const p = this.pending;
    this.pending = null;
    clearTimeout(p.timer);
    try {
      const resp = JSON.parse(line);
      if (resp.ok) p.resolve(resp.html as string);
      else p.reject(new Error(resp.error || "fetch failed"));
    } catch (e) {
      p.reject(e as Error);
    }
  }

  send(url: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending) {
          this.pending = null;
          this.proc.kill("SIGKILL");
          reject(new Error("daemon timeout"));
        }
      }, timeoutMs);
      this.pending = { resolve, reject, timer };
      this.proc.stdin.write(JSON.stringify({ url }) + "\n");
    });
  }
}

class Pool {
  private workers: Worker[];
  private waiters: Array<(w: Worker) => void> = [];

  constructor(size: number) {
    this.workers = Array.from({ length: size }, () => new Worker());
  }

  private acquire(): Promise<Worker> {
    const free = this.workers.find((w) => !w.busy);
    if (free) {
      free.busy = true;
      return Promise.resolve(free);
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private release(w: Worker) {
    const next = this.waiters.shift();
    if (next) next(w);
    else w.busy = false;
  }

  async fetch(url: string, timeoutMs = 25000): Promise<string> {
    const w = await this.acquire();
    try {
      return await w.send(url, timeoutMs);
    } finally {
      this.release(w);
    }
  }
}

const g = globalThis as unknown as { __tiktokHtmlPool?: Pool };
if (!g.__tiktokHtmlPool) {
  g.__tiktokHtmlPool = new Pool(POOL_SIZE);
}

export function fetchHtml(url: string): Promise<string> {
  return g.__tiktokHtmlPool!.fetch(url);
}
