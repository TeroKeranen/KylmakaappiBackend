// src/routes/device.ts
import { Router } from "express";
import { hub } from "../sse/hub";
import { m } from "../mqtt/client";
import { getLastState, getLastSeen } from "../state/store";

const router = Router();

// Viimeisin tila + lastSeen
router.get("/state/:deviceId", (req, res) => {
  const id = req.params.deviceId!;
  res.json({
    deviceId: id,
    state: getLastState(id) ?? null,
    lastSeen: getLastSeen(id) ?? null,
  });
});

// SSE: reaaliaikainen tilavirta
router.get("/events/:deviceId", (req, res) => {
  const id = req.params.deviceId!;

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // varmuuden vuoksi
  });
  // @ts-ignore
  res.flushHeaders?.();

  // clientille reconnect-viive
  res.write("retry: 5000\n\n");

  // rekisteröi SSE-hubiin
  hub.add(id, res);

  // snapshot heti, jos on
  hub.snapshot(id, {
    deviceId: id,
    state: getLastState(id) ?? null,
    lastSeen: getLastSeen(id) ?? null,
  });
});

// LED ON/OFF
router.post("/led", (req, res) => {
  const { deviceId, state } = req.body || {};
  if (!deviceId || !["on", "off"].includes(state)) {
    return res.status(400).json({ ok: false, error: "Bad params" });
  }
  const topic = `devices/${deviceId}/cmd`;
  const msg = JSON.stringify({ led: state });
  m.publish(topic, msg, { qos: 1 }, (err) => {
    if (err) return res.status(500).json({ ok: false, error: String(err) });
    res.json({ ok: true });
  });
});

// Moottori (ms & suunta)
router.post("/motor", (req, res) => {
  const { deviceId, ms = 5000, dir = "fwd" } = req.body || {};
  if (!deviceId || typeof ms !== "number" || !["fwd", "rev"].includes(dir)) {
    return res.status(400).json({ ok: false, error: "Bad params" });
  }
  const topic = `devices/${deviceId}/cmd`;
  const msg = JSON.stringify({ motorMs: ms, dir });
  m.publish(topic, msg, { qos: 1 }, (err) => {
    if (err) return res.status(500).json({ ok: false, error: String(err) });
    res.json({ ok: true });
  });
});

export default router;
