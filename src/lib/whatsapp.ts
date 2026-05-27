export async function sendWhatsAppMessage(
    phone: string,
    message: string
  ) {
    const instanceId = process.env.NEXT_PUBLIC_ZAPI_INSTANCE;
    const token = process.env.NEXT_PUBLIC_ZAPI_TOKEN;
  
    if (!instanceId || !token) {
      console.error("Z-API não configurada");
      return;
    }
  
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          message,
        }),
      });
    } catch (error) {
      console.error("Erro ao enviar WhatsApp:", error);
    }
  }