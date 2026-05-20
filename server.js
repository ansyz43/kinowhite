// Статик-сервер для собранного Astro-сайта (dist/) + POST /api/lead.
// Используется на хостингах вроде Timeweb Apps (`npm start`).
// Никаких внешних зависимостей — только встроенные Node-модули.
//
// На reg.ru (shared PHP) этот файл не запустится — там работает
// public/api/lead.php. Фронт пробует оба эндпоинта по очереди.

import http from "node:http";
import { readFile, stat, appendFile } from "node:fs/promises";
import { join, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { randomBytes } from "node:crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "dist");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const LEADS_LOG = resolve(__dirname, "leads.log");

/* ---------- ПОЧТА ---------- */
// Конфиг через env (Timeweb panel → переменные окружения):
//   SMTP_HOST=smtp.beget.com   (или smtp.mail.ru, smtp.yandex.ru, smtp.timeweb.ru)
//   SMTP_PORT=465              (465=SSL, 587=STARTTLS)
//   SMTP_SECURE=ssl            ('ssl' | 'tls')
//   SMTP_USER=info@домен.ру
//   SMTP_PASS=•••
//   MAIL_FROM=info@домен.ру    (по умолчанию = SMTP_USER)
//   MAIL_TO=dvfilmaward2026@mail.ru   (можно не задавать — default ниже)
const SMTP_HOST   = process.env.SMTP_HOST   || "";
const SMTP_PORT   = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = (process.env.SMTP_SECURE || "ssl").toLowerCase();
const SMTP_USER   = process.env.SMTP_USER   || "";
const SMTP_PASS   = process.env.SMTP_PASS   || "";
const MAIL_FROM   = process.env.MAIL_FROM   || SMTP_USER || "noreply@localhost";
const MAIL_TO     = process.env.MAIL_TO     || "dvfilmaward2026@mail.ru";
const HAS_MAIL    = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

if (!HAS_MAIL) {
  console.warn(
    "[mail] SMTP не настроен — заявки пишутся только в leads.log. " +
    "Заполните SMTP_HOST/SMTP_USER/SMTP_PASS в env Timeweb-панели."
  );
} else {
  console.log(`[mail] SMTP ok: ${SMTP_HOST}:${SMTP_PORT} (${SMTP_SECURE}) → ${MAIL_TO}`);
}

function b64utf8(s) { return Buffer.from(s, "utf8").toString("base64"); }
function mimeSubj(s) { return "=?UTF-8?B?" + b64utf8(s) + "?="; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;",
}[c])); }

function smtpDialog(sock) {
  let buf = "";
  const queue = [];
  let waiter = null;
  sock.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx + 1);
      buf = buf.slice(idx + 1);
      queue.push(line);
      if (line.length >= 4 && line[3] === " " && waiter) {
        const r = queue.splice(0).join("");
        const w = waiter; waiter = null; w(r);
      }
    }
  });
  return {
    read: () => new Promise((res) => {
      const i = queue.findIndex(l => l.length >= 4 && l[3] === " ");
      if (i !== -1) res(queue.splice(0, i + 1).join(""));
      else waiter = res;
    }),
    write: (line) => sock.write(line + "\r\n"),
  };
}

async function sendMail({ subject, text, html }) {
  if (!HAS_MAIL) throw new Error("smtp-not-configured");
  return await new Promise((resolve, reject) => {
    const useSsl = SMTP_SECURE === "ssl";
    const timer = setTimeout(() => reject(new Error("smtp timeout")), 20000);
    let sock;
    const onErr = (e) => { try { sock?.destroy(); } catch {} clearTimeout(timer); reject(e); };

    const run = async (initSock) => {
      try {
        sock = initSock;
        sock.setEncoding("utf8");
        sock.on("error", onErr);
        let dlg = smtpDialog(sock);
        const expect = async (codes) => {
          const r = await dlg.read();
          if (!codes.split(",").some(c => r.startsWith(c))) {
            throw new Error("smtp: " + r.trim());
          }
          return r;
        };

        await expect("220");
        dlg.write("EHLO localhost");
        await expect("250");

        if (SMTP_SECURE === "tls") {
          dlg.write("STARTTLS");
          await expect("220");
          const t = tlsConnect({ socket: sock, servername: SMTP_HOST, rejectUnauthorized: false });
          await new Promise((r, e) => { t.once("secureConnect", r); t.once("error", e); });
          sock = t; sock.setEncoding("utf8");
          dlg = smtpDialog(sock);
          dlg.write("EHLO localhost");
          await expect("250");
        }

        dlg.write("AUTH LOGIN");
        await expect("334");
        dlg.write(b64utf8(SMTP_USER));
        await expect("334");
        dlg.write(b64utf8(SMTP_PASS));
        await expect("235");

        dlg.write(`MAIL FROM:<${MAIL_FROM}>`);
        await expect("250");
        dlg.write(`RCPT TO:<${MAIL_TO}>`);
        await expect("250,251");
        dlg.write("DATA");
        await expect("354");

        const boundary = "b_" + randomBytes(8).toString("hex");
        const lines = [
          `From: ${mimeSubj("Сайт ДВ Кинопремии")} <${MAIL_FROM}>`,
          `To: ${MAIL_TO}`,
          `Subject: ${mimeSubj(subject)}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: <${randomBytes(8).toString("hex")}@kinodvk>`,
          "MIME-Version: 1.0",
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          "",
          `--${boundary}`,
          "Content-Type: text/plain; charset=UTF-8",
          "Content-Transfer-Encoding: 8bit",
          "",
          text,
          `--${boundary}`,
          "Content-Type: text/html; charset=UTF-8",
          "Content-Transfer-Encoding: 8bit",
          "",
          html,
          `--${boundary}--`,
          "",
        ];
        const body = lines.join("\r\n").replace(/\r\n\./g, "\r\n..");
        sock.write(body + "\r\n.\r\n");
        await expect("250");
        dlg.write("QUIT");
        clearTimeout(timer);
        resolve(true);
      } catch (e) { onErr(e); }
    };

    if (useSsl) {
      const s = tlsConnect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST, rejectUnauthorized: false });
      s.once("secureConnect", () => run(s));
      s.once("error", onErr);
    } else {
      const s = createConnection({ host: SMTP_HOST, port: SMTP_PORT });
      s.once("connect", () => run(s));
      s.once("error", onErr);
    }
  });
}

function safe(s, max = 500) {
  return String(s ?? "").trim().slice(0, max);
}

async function handleLead(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end(); return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  // читаем тело (лимит 32КБ)
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32 * 1024) {
      res.writeHead(413); res.end(JSON.stringify({ ok: false, error: "Too large" }));
      return;
    }
  }
  let data = {};
  try {
    const ct = req.headers["content-type"] || "";
    if (ct.includes("application/json")) {
      data = JSON.parse(raw || "{}");
    } else {
      data = Object.fromEntries(new URLSearchParams(raw));
    }
  } catch {
    data = {};
  }

  // honeypot
  if (data.company && String(data.company).trim() !== "") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true })); return;
  }

  const name   = safe(data.name, 120);
  const email  = safe(data.email, 160);
  const phone  = safe(data.phone, 60);
  const title  = safe(data.title || data.film_title, 200);
  const year   = safe(data.year  || data.film_year, 8);
  const format = safe(data.format|| data.film_format, 80);
  const region = safe(data.region|| data.film_region, 120);
  const role   = safe(data.role  || data.contact_role, 80);
  const link   = safe(data.link  || data.film_link, 400);
  const message= safe(data.message, 2000);
  const page   = safe(data.page, 200);

  if (name.length < 2) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Укажите имя" })); return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Некорректный e-mail" })); return;
  }
  if (!email && !phone) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Укажите e-mail или телефон" })); return;
  }

  const ip = (req.headers["x-forwarded-for"]?.split(",")[0].trim()) || req.socket.remoteAddress || "";
  const ua = String(req.headers["user-agent"] || "").slice(0, 200);
  const ts = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Vladivostok" });

  const subj = "Новая заявка — ДВ Кинопремия";
  const plain = [
    "Новая заявка — Дальневосточная Кинопремия",
    "------------------------------------------------",
    `Имя:           ${name}`,
    `Роль:          ${role || "—"}`,
    `E-mail:        ${email || "—"}`,
    `Телефон:       ${phone || "—"}`,
    `— О фильме —`,
    `Название:      ${title || "—"}`,
    `Год:           ${year || "—"}`,
    `Формат:        ${format || "—"}`,
    `Регион:        ${region || "—"}`,
    `Ссылка:        ${link || "—"}`,
    `Сообщение:     ${message || "—"}`,
    `— Служебное —`,
    `Страница:      ${page || "/"}`,
    `IP:            ${ip}`,
    `UA:            ${ua}`,
    `Время:         ${ts} (Влд)`,
  ].join("\r\n");

  const pairs = {
    "Имя": name, "Роль": role, "E-mail": email, "Телефон": phone,
    "Название фильма": title, "Год": year, "Формат": format, "Регион": region,
    "Ссылка": link, "Сообщение": message, "Страница": page || "/", "IP": ip, "Время": ts,
  };
  const rows = Object.entries(pairs).map(([k, v]) =>
    `<tr><td style="padding:6px 12px;color:#555;font-weight:600;white-space:nowrap">${esc(k)}</td>` +
    `<td style="padding:6px 12px;color:#111">${esc(v || "—").replace(/\n/g, "<br>")}</td></tr>`
  ).join("");
  const html =
    `<!doctype html><meta charset="utf-8">` +
    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#111">` +
    `<h2 style="margin:0 0 12px;font-family:Georgia,serif">Новая заявка — ДВ Кинопремия</h2>` +
    `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eee">${rows}</table></div>`;

  // лог (надёжный fallback — даже если SMTP упадёт, заявка останется)
  try {
    await appendFile(
      LEADS_LOG,
      `[${ts}] ${ip} | ${name} | ${email} | ${phone} | ${title}\r\n`,
      "utf8"
    );
  } catch (e) { console.error("leads.log write failed:", e.message); }

  if (!HAS_MAIL) {
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, warn: "smtp-not-configured" })); return;
  }

  try {
    await sendMail({ subject: subj, text: plain, html });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("[mail] send failed:", e.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Не удалось отправить (см. leads.log)" }));
  }
}

/* ---------- СТАТИКА ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
  ".otf":   "font/otf",
  ".txt":   "text/plain; charset=utf-8",
  ".xml":   "application/xml; charset=utf-8",
};

async function tryFile(p) {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
    if (s.isDirectory()) {
      const idx = join(p, "index.html");
      const s2 = await stat(idx);
      if (s2.isFile()) return idx;
    }
  } catch {}
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // API: форма заявки
    if (url.pathname === "/api/lead") {
      return await handleLead(req, res);
    }
    // Health-check
    if (url.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, mail: HAS_MAIL })); return;
    }

    let p = decodeURIComponent(url.pathname);
    p = normalize(p).replace(/^[\\/]+/, "");
    const full = resolve(ROOT, p);
    if (!full.startsWith(ROOT)) {
      res.writeHead(403); res.end("Forbidden"); return;
    }

    let file = await tryFile(full);
    if (!file) {
      file =
        (await tryFile(join(ROOT, "404.html"))) ||
        (await tryFile(join(ROOT, "index.html")));
      if (!file) { res.writeHead(404); res.end("Not Found"); return; }
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(await readFile(file));
      return;
    }

    const ext = extname(file).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500); res.end("Server error");
    console.error(err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[kinowhite] → http://${HOST}:${PORT}/  (root: ${ROOT})`);
  console.log(`[kinowhite] POST /api/lead → ${HAS_MAIL ? MAIL_TO : "leads.log only"}`);
});
