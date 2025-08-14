// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";

import { m } from "./mqtt/client";
import { setState, getLastSeen } from "./state/store";
import { hub } from "./sse/hub";

import deviceRoutes from "./routes/device";
import customerRoutes from "./routes/customer"; // sinulla jo
import landingRoutes from "./routes/landing";   // sinulla jo

// -------------------- App setup --------------------
const app = express();

// dev: vapaa; prod: rajaa origin-listaan
app.use(cors());
app.use(express.json());

// -------------------- Routes --------------------
app.use(deviceRoutes);
app.use(customerRoutes);
app.use(landingRoutes);

// health & root
app.get("/health", (_req, res) => res.send("ok"));
app.get("/", (_req, res) => res.redirect("/health"));

// -------------------- MQTT → state → SSE --------------------
m.on("message", (topic, payload) => {
  const match = /^devices\/([^/]+)\/state$/.exec(String(topic));
  if (!match) return;
  const deviceId = match[1]!;
  try {
    const data = JSON.parse(payload.toString());
    // päivitä muistiin
    setState(deviceId, data);
    // broadcast RN-asiakkaille
    hub.broadcast(deviceId, {
      deviceId,
      state: data,
      lastSeen: getLastSeen(deviceId),
    });
  } catch {
    // huono JSON → ignooraa
  }
});

// -------------------- Start --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveri käynnissä http://localhost:${PORT}`);
});
