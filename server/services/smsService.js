export async function sendSMS(to, message, config = {}) {
  const provider = (config.provider || process.env.SMS_PROVIDER || "greenweb").toLowerCase();
  if (!to || !message) throw new Error("to and message are required");

  switch (provider) {
    case "greenweb":
      return sendViaGreenweb(to, message, config);
    case "bulksmsbd":
      return sendViaBulkSMSBD(to, message, config);
    case "smsnetbd":
      return sendViaSMSNetBD(to, message, config);
    default:
      throw new Error(`Unsupported SMS provider: ${provider}`);
  }
}

async function sendViaGreenweb(to, message, config = {}) {
  const token = config.apiKey || process.env.SMS_API_KEY;
  if (!token) throw new Error("SMS_API_KEY is required for Greenweb");
  const url = `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(token)}&to=${encodeURIComponent(to)}&message=${encodeURIComponent(message)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Greenweb error: ${res.status}`);
  const text = await res.text();
  return { provider: "greenweb", result: text };
}

async function sendViaBulkSMSBD(to, message, config = {}) {
  const apiKey = config.apiKey || process.env.SMS_API_KEY;
  const senderId = config.senderId || process.env.SMS_SENDER_ID || "880";
  if (!apiKey) throw new Error("SMS_API_KEY is required for BulkSMSBD");
  const url = "https://bulksmsbd.net/api/smsapi";
  const body = new URLSearchParams({
    api_key: apiKey,
    type: "text",
    senderid: senderId,
    number: to,
    message,
  });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`BulkSMSBD error: ${res.status}`);
  const data = await res.json().catch(() => ({}));
  return { provider: "bulksmsbd", result: data };
}

async function sendViaSMSNetBD(to, message, config = {}) {
  const apiKey = config.apiKey || process.env.SMS_API_KEY;
  const senderId = config.senderId || process.env.SMS_SENDER_ID || "880";
  if (!apiKey) throw new Error("SMS_API_KEY is required for SMS.net.bd");
  const url = "https://sms.net.bd/smsapi";
  const body = new URLSearchParams({ api_key: apiKey, type: "text", contacts: to, senderid: senderId, msg: message });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`SMS.net.bd error: ${res.status}`);
  const data = await res.json().catch(() => ({}));
  return { provider: "smsnetbd", result: data };
}

