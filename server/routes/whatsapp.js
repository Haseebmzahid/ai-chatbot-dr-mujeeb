import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { handleChatMessage } from "../services/chatbotService.js";
import {
  getWhatsAppStatus,
  isOptOutMessage,
  listMessageLogs,
  logMessage,
  markOptOut,
  recordWebhookEvent,
  sendWhatsAppText,
  updateMessageStatus,
  upsertInboundConsent,
  verifyMetaSignature
} from "../services/whatsappService.js";
import { compactText, normalizePhone } from "../utils/time.js";
import { chatMessageSchema } from "../utils/validation.js";

const router = Router();

router.get("/status", authenticate, (_req, res) => {
  res.json({ whatsapp: getWhatsAppStatus() });
});

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"] || req.query["hub_mode"];
  const token = req.query["hub.verify_token"] || req.query["hub_verify_token"];
  const challenge = req.query["hub.challenge"] || req.query["hub_challenge"];

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

function detectLanguage(text = "") {
  return /[\u0600-\u06FF]/.test(text) ? "ur" : "en";
}

function optOutConfirmation(language = "en") {
  if (language === "ur") {
    return "آپ کو غیر ضروری WhatsApp پیغامات نہیں بھیجے جائیں گے۔ اپائنٹمنٹ کے لیے reception سے رابطہ کریں: 0300-8585508";
  }
  return "You will not receive non-essential WhatsApp messages. For appointments, contact reception at 0300-8585508.";
}

async function processWebhookPayload(payload) {
  const entries = payload?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      for (const status of value.statuses || []) {
        await updateMessageStatus(status.id, status.status, status);
        await logMessage({
          phone: status.recipient_id,
          messageType: "delivery_status",
          direction: "Status",
          status: status.status,
          rawPayload: status
        });
      }

      for (const message of value.messages || []) {
        const event = await recordWebhookEvent(message.id, message.type || "message");
        if (event.duplicate) continue;

        const phone = normalizePhone(message.from);
        const text = compactText(message.text?.body || message.button?.text || message.interactive?.button_reply?.title || "", 1000);
        if (!text) continue;
        const language = detectLanguage(text);

        await logMessage({
          phone,
          messageType: "patient_message",
          messageBody: text,
          direction: "Incoming",
          status: "received",
          providerMessageId: message.id,
          rawPayload: message
        });

        if (isOptOutMessage(text)) {
          await markOptOut({ phone, language });
          await sendWhatsAppText({
            to: phone,
            text: optOutConfirmation(language),
            messageType: "opt_out_confirmation",
            language,
            operational: true,
            ignoreOptOut: true,
            patientInitiated: true
          });
          continue;
        }

        await upsertInboundConsent({ phone, language, text });
        const reply = await handleChatMessage({ phone, message: text });
        await sendWhatsAppText({
          to: phone,
          text: reply.text,
          messageType: "chatbot_reply",
          appointmentId: reply.appointment?.appointmentId || "",
          language,
          patientInitiated: true
        });
      }
    }
  }
}

router.post("/webhook", (req, res, next) => {
  try {
    const debugInfo = {
      signature: req.headers["x-hub-signature-256"],
      object: req.body ? req.body.object : undefined,
      rawBodyLength: req.rawBody ? req.rawBody.length : undefined
    };
    console.log("[Webhook Debug] Request received at beginning of route handler:", debugInfo);

    if (process.env.META_APP_SECRET) {
      console.log("[Webhook Debug] Immediately before verifyMetaSignature(req):", debugInfo);
      const isSignatureValid = verifyMetaSignature(req);
      console.log(`[Webhook Debug] Immediately after verifyMetaSignature(req). Result: ${isSignatureValid}`, debugInfo);
      
      if (!isSignatureValid) {
        console.log("[Webhook Debug] Signature validation failed. Rejection return statement reached:", debugInfo);
        return res.status(403).json({ message: "Invalid Meta signature." });
      }
    }

    const payload = req.body;
    setImmediate(() => {
      processWebhookPayload(payload).catch((error) => {
        console.error("WhatsApp webhook processing failed:", error.message);
      });
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/logs", authenticate, async (req, res, next) => {
  try {
    res.json({ messageLogs: await listMessageLogs(req.query.limit) });
  } catch (error) {
    next(error);
  }
});

router.post("/send", authenticate, async (req, res, next) => {
  try {
    const parsed = chatMessageSchema.parse({ phone: req.body.phone, message: req.body.message || req.body.text || "", language: req.body.language || "en" });
    const result = await sendWhatsAppText({
      to: parsed.phone,
      text: parsed.message,
      messageType: "manual_message",
      actor: req.user || null,
      language: parsed.language || "en"
    });
    res.json({ whatsapp: result });
  } catch (error) {
    next(error);
  }
});

export default router;
