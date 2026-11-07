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

// Support both standard SMTP_HOST/USER/PASS or GMAIL_USER/GMAIL_PASS directly
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "";
const SMTP_HOST = process.env.SMTP_HOST || (SMTP_USER.includes("@gmail.com") ? "smtp.gmail.com" : "");
const SMTP_PORT = Number(process.env.SMTP_PORT || (SMTP_HOST === "smtp.gmail.com" ? 465 : 587));
const FROM = process.env.MAIL_FROM || (SMTP_USER ? `SyncBeat <${SMTP_USER}>` : "SyncBeat <noreply@syncbeat.local>");

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
      secure: SMTP_PORT === 465, // 465 = implicit SSL, otherwise STARTTLS
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
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

export function resetEmail(to: string, link: string): Mail {
  const text =
    "SyncBeat password reset\n\n" +
    "We received a request to reset your password. Click the link below to choose a new one:\n\n" +
    link + "\n\n" +
    "This link expires in 1 hour and can only be used once. If you did not request this, you can ignore this email.\n";
  return {
    to,
    subject: "Reset your SyncBeat password",
    text,
    html:
      `<p>We received a request to reset your <strong>SyncBeat</strong> password.</p>` +
      `<p><a href="${link}">Choose a new password</a></p>` +
      `<p style="color:#888">This link expires in 1 hour and can only be used once.</p>`,
  };
}
