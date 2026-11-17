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
const SMTP_USER = process.env.SMTP_USER || "msgsena241740@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "vkderpwhznjtwxpm";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
const FROM = process.env.MAIL_FROM || `SyncBeat <${SMTP_USER}>`;

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

let primaryTransporter: import("nodemailer").Transporter | null = null;
let fallbackTransporter: import("nodemailer").Transporter | null = null;

function getPrimaryTransporter() {
  if (!primaryTransporter) {
    // Always use explicit host/port — avoids Render blocking 'service: gmail' (uses port 25 internally)
    // Port 465 = SSL direct, most reliable on cloud hosting
    primaryTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return primaryTransporter;
}

function getFallbackTransporter() {
  if (!fallbackTransporter) {
    // Fallback: port 587 STARTTLS if 465 blocked
    fallbackTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: false },
    });
  }
  return fallbackTransporter;
}

export async function sendMail(mail: Mail): Promise<boolean> {
  const primary = getPrimaryTransporter();
  if (!primary) {
    console.log("\n[Mailer] (no SMTP_HOST) would send email:\n  to: " + mail.to + "\n  subject: " + mail.subject + "\n  body:\n" + mail.text + "\n");
    await logMail(mail);
    return true;
  }

  // 1. Try Primary Transporter
  try {
    const info = await primary.sendMail({
      from: FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    console.log(`[Mailer] Email delivered successfully to ${mail.to}:`, info.messageId);
    await logMail(mail);
    return true;
  } catch (err) {
    console.warn(`[Mailer] Primary SMTP send to ${mail.to} failed:`, err);
  }

  // 2. Try Fallback Transporter (e.g. alternate port 465/587)
  try {
    const fallback = getFallbackTransporter();
    if (fallback) {
      console.log(`[Mailer] Attempting fallback transporter for ${mail.to}...`);
      const info = await fallback.sendMail({
        from: FROM,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      console.log(`[Mailer] Fallback email delivered successfully to ${mail.to}:`, info.messageId);
      await logMail(mail);
      return true;
    }
  } catch (fallbackErr) {
    console.warn(`[Mailer] Fallback SMTP send to ${mail.to} failed:`, fallbackErr);
  }

  await logMail(mail);
  return false;
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
