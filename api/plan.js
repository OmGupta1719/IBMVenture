import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, business_type, location } = req.body;

  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    console.error("❌ BASE_URL is not defined in environment variables");
    return res.status(500).json({ error: "BASE_URL not configured" });
  }

  // Build callback URL
  const callback_url = `${baseUrl}/api/webhook`;

  // ✅ Payload structure matches Relay’s workflow inputs
  const payload = {
    name,
    email,
    business_type,
    location,
    callback_url
  };

  console.log("✅ Payload sent to Relay:", JSON.stringify(payload, null, 2));

  try {
    const relayRes = await fetch(process.env.RELAY_TRIGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const relayText = await relayRes.text();
    console.log("✅ Relay Response Status:", relayRes.status);
    console.log("✅ Relay Response Body:", relayText);

    if (!relayRes.ok) {
      return res.status(500).json({
        error: "Relay trigger failed",
        details: relayText
      });
    }

    res.status(200).json({ status: "Triggered" });
  } catch (error) {
    console.error("Error triggering Relay:", error);
    res.status(500).json({ error: "Failed to trigger Relay" });
  }
}