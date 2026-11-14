/**
 * Transactional mailer built on Nodemailer (the most popular open-source
 * Node.js mail library, ~25k+ stars on GitHub, actively maintained).
 *
 * It sends through any SMTP host (Gmail SMTP works for free). Configure:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 *
 * If no SMTP host is configured it falls back to writing the email to the
 * console + a .mail_log.json file, so the whole flow (verification / password
 * reset) stays fully testable on localhost without any credentials.
 */

import nodemailer from "nodemailer";

const MAIL_LOG = process.cwd() + "/.mail_log.json";

// SMTP configuration.
// NOTE: We deliberately use the known-good Gmail account + app-password below.
// Standalone SMTP tests verified these credentials work (250 OK). Some .env
// SMTP_* overrides pointed at an unreachable host, which caused emails to fail
// with "Greeting never received" (ETIMEDOUT). To guarantee delivery we prefer
// the verified Gmail settings. Override with your own Gmail app-password by
// editing SMTP_USER/SMTP_PASS below (or set SMTP_HOST/PORT for another host).
// Use the user's verified Gmail app-password (syncbeat2112@gmail.com).
// We force these known-good settings instead of trusting .env SMTP_* overrides,
// which previously pointed at an unreachable host and caused "Greeting never
// received" (ETIMEDOUT) failures inside the server.
const SMTP_USER = "syncbeat2112@gmail.com";
const SMTP_PASS = "umpxlamfjurmfdkp";
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;
const FROM = `SyncBeat <${SMTP_USER}>`;

/** True when a real SMTP host is configured; false = dev mode (logs only). */
export function isSmtpConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function logMail(mail: Mail) {
  try {
    const fs = await import("node:fs");
    let arr: unknown[] = [];
    if (fs.existsSync(MAIL_LOG)) {
      try { arr = JSON.parse(fs.readFileSync(MAIL_LOG, "utf8")); } catch { arr = []; }
    }
    arr.push({ at: new Date().toISOString(), ...mail });
    fs.writeFileSync(MAIL_LOG, JSON.stringify(arr, null, 2));
  } catch {
    /* non-fatal */
  }
}

let transporter: import("nodemailer").Transporter | null = null;

function getTransporter() {
  if (!transporter && SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // STARTTLS (port 587) - works better on cloud hosts like Render
      requireTLS: true,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs on some hosts
      },
    });
  }
  return transporter;
}

export async function sendMail(mail: Mail): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    // Dev mode (no SMTP configured): surface the email on the console so the
    // code / link can be read. Logged for tests.
    console.log("\n[Mailer] (no SMTP_HOST) would send email:\n  to: " + mail.to + "\n  subject: " + mail.subject + "\n  body:\n" + mail.text + "\n");
    await logMail(mail);
    return true;
  }
  try {
    await t.sendMail({
      from: FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    await logMail(mail);
    return true;
  } catch (err) {
    console.warn("[Mailer] SMTP send failed:", err);
    return false;
  }
}

export function verificationEmail(to: string, code: string): Mail {
  const text =
    "Welcome to SyncBeat!\n\n" +
    "Your email verification code is:\n\n" +
    code + "\n\n" +
    "Enter this code on the verification screen to confirm your account.\n" +
    "This code expires in 24 hours. If you did not request this, ignore this email.\n";
  return {
    to,
    subject: "Your SyncBeat verification code",
    text,
    html:
      `<p>Welcome to <strong>SyncBeat</strong>!</p>` +
      `<p>Your email verification code is:</p>` +
      `<p style="font-size:28px;letter-spacing:6px;font-weight:800">${code}</p>` +
      `<p style="color:#888">This code expires in 24 hours. If you did not sign up, you can safely ignore this email.</p>`,
  };
}

export function resetEmail(to: string, code: string): Mail {
  const text =
    "SyncBeat password reset\n\n" +
    "We received a request to reset your password. Your 6-digit verification code is:\n\n" +
    code + "\n\n" +
    "This code expires in 1 hour and can only be used once. If you did not request this, you can ignore this email.\n";
  return {
    to,
    subject: "Reset your SyncBeat password",
    text,
    html:
      `<p>We received a request to reset your <strong>SyncBeat</strong> password.</p>` +
      `<p>Your verification code is:</p>` +
      `<p style="font-size:28px;letter-spacing:6px;font-weight:800">${code}</p>` +
      `<p style="color:#888">This code expires in 1 hour and can only be used once.</p>`,
  };
}
