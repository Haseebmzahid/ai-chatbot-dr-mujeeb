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
    return "آپ کو غیر ضروری WhatsApp پیغامات نہیں بھیجے جائیں گے۔ اپائنٹمنٹ کے لیے reception سے رابطہ کریں: \u20660300-8585508\u2069";
  }
  return "You will not receive non-essential WhatsApp messages. For appointments, contact reception at 0300-8585508.";
}

async function processWebhookPayload(payload) {
  console.log("[Webhook Debug] Entering processWebhookPayload with payload:", JSON.stringify(payload, null, 2));
  const entries = payload?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      for (const status of value.statuses || []) {
        console.log("[Webhook Debug] Processing status update:", status.id, "Status:", status.status);
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
        console.log("[Webhook Debug] Processing incoming message:", message.id, "Type:", message.type);
        const event = await recordWebhookEvent(message.id, message.type || "message");
        if (event.duplicate) {
          console.log("[Webhook Debug] Duplicate event ignored:", message.id);
          continue;
        }

        const rawFrom = message.from;
        const phone = normalizePhone(rawFrom);
        const text = compactText(message.text?.body || message.button?.text || message.interactive?.button_reply?.title || "", 1000);
        console.log("[Webhook Debug] Extracted message details:", { rawFrom, normalizedPhone: phone, text });
        
        if (!text) {
          console.log("[Webhook Debug] No text content extracted from message, skipping processing");
          continue;
        }
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
          console.log("[Webhook Debug] Opt-out message detected. Performing opt-out for:", phone);
          await markOptOut({ phone, language });
          console.log("[Webhook Debug] Sending opt-out confirmation to:", phone);
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

        console.log("[Webhook Debug] Registering inbound consent/updating last message time for:", phone);
        await upsertInboundConsent({ phone, language, text });
        
        console.log("[Webhook Debug] Calling handleChatMessage for message from:", phone);
        const reply = await handleChatMessage({ phone, message: text });
        console.log("[Webhook Debug] handleChatMessage execution complete. Reply payload:", reply);

        console.log("[Webhook Debug] Calling sendWhatsAppText to respond to:", phone);
        const sendResult = await sendWhatsAppText({
          to: phone,
          text: reply.text,
          messageType: "chatbot_reply",
          appointmentId: reply.appointment?.appointmentId || "",
          language,
          patientInitiated: true
        });
        console.log("[Webhook Debug] sendWhatsAppText complete. Result:", sendResult);
      }
    }
  }
  console.log("[Webhook Debug] Exiting processWebhookPayload");
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
    console.log("[Webhook Debug] Scheduling processWebhookPayload with setImmediate");
    setImmediate(() => {
      console.log("[Webhook Debug] setImmediate callback triggered: starting processWebhookPayload");
      processWebhookPayload(payload).catch((error) => {
        console.error("[Webhook Debug] processWebhookPayload failed with error:", error.message);
      });
      console.log("[Webhook Debug] setImmediate callback: processWebhookPayload initiated asynchronously");
    });
    console.log("[Webhook Debug] Sending ok response (200) to Meta");
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
