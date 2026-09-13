// Server-only notification senders (Email/WhatsApp/SMS) via provider HTTP APIs.

const env = (k: string) => process.env[k] || "";

export function configuredChannels() {
  return {
    email: Boolean(env("RESEND_API_KEY") && env("RESEND_FROM")),
    whatsapp: Boolean(env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_ID")),
    sms: Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_FROM")),
  };
}

export async function sendMany(targets: string[], fn: (to: string) => Promise<boolean>) {
  let sent = 0, failed = 0;
  await Promise.all(targets.map(async (t) => {
    try { (await fn(t)) ? sent++ : failed++; } catch { failed++; }
  }));
  return { sent, failed };
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("RESEND_FROM"), to, subject, text }),
  });
  return res.ok;
}

export async function sendWhatsApp(to: string, text: string): Promise<boolean> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${env("WHATSAPP_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/[^\d]/g, ""), type: "text", text: { body: text } }),
  });
  return res.ok;
}

export async function sendSMS(to: string, text: string): Promise<boolean> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const auth = Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: env("TWILIO_FROM"), Body: text });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return res.ok;
}
