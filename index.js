import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import serverless from "serverless-http";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let latestPlan = null;

// Load from .env
const RELAY_TRIGGER_URL = process.env.RELAY_TRIGGER_URL;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});


// Helper to get base URL (Vercel & local)
const getBaseUrl = (req) =>
  req.headers["x-forwarded-host"]
    ? `https://${req.headers["x-forwarded-host"]}`
    : "http://localhost:3000";

// Handle /api/plan: trigger Relay with webhook
app.post("/api/plan", async (req, res) => {
  const { name, email, business_type, location } = req.body;
  const webhookUrl = `${getBaseUrl(req)}/api/webhook`;

  console.log(`🔔 Sending webhook callback to: ${webhookUrl}`);

  const payload = {
    inputs: {
      name,
      email,
      business_type,
      location,
      callback_url: webhookUrl,
    },
  };

  try {
    await fetch(RELAY_TRIGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    res.json({ status: "Triggered" });
  } catch (error) {
    console.error("❌ Error triggering Relay:", error);
    res.status(500).json({ error: "Failed to trigger Relay" });
  }
});

// Handle Relay webhook
app.post("/api/webhook", (req, res) => {
  const { outputs } = req.body;

  if (outputs?.final_plan) {
    latestPlan = outputs.final_plan;
    console.log("✅ Plan received from Relay");
    res.status(200).json({ ok: true });
  } else {
    console.warn("⚠️ Missing final_plan in webhook");
    res.status(400).json({ error: "No final_plan received" });
  }
});

// Polling route
app.get("/api/check", (req, res) => {
  if (latestPlan) {
    const result = latestPlan;
    latestPlan = null; // Clear after sending
    res.json({ final_plan: result });
  } else {
    res.status(202).json({ status: "waiting" });
  }
});

// Export app for Vercel (no app.listen)
export default serverless(app);
