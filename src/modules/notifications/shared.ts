export function getNotificationChannels(): { whatsapp: boolean; email: boolean } {
  const whatsapp =
    process.env.NOTIFICATION_WHATSAPP_ENABLED === "true" ||
    process.env.NOTIFICATION_WHATSAPP_ENABLED === "1";
  const email =
    process.env.NOTIFICATION_EMAIL_ENABLED !== "false" && process.env.NOTIFICATION_EMAIL_ENABLED !== "0";
  return { whatsapp, email };
}

export function getWhatsAppTemplateLanguage(): string {
  return process.env.WHATSAPP_BOOKING_TEMPLATE_LANGUAGE?.trim() ?? "fr";
}
