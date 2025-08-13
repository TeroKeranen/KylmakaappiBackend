import "dotenv/config";
import express from "express";
import cors from "cors";
import mqtt from "mqtt";
import customerRoutes from "./api/routes/customer";

// -------------------- App setup --------------------
const app = express();
app.use(cors());               // dev: vapaa. tuotannossa: app.use(cors({ origin: ["https://oma-frontti.com"] }))
app.use(express.json());       // json-bodyn parsiminen

app.use(customerRoutes); // nyt /resolve ja /pay ovat käytössä

// -------------------- MQTT --------------------
const { MQTT_URL, MQTT_USER, MQTT_PASS } = process.env; // Haetaan MQTT-yhdeyden asetukset ympäristömuuttujista

// Jos joku näistä puuttuu, heitetään virhe ja lopetetaan ohjelma
if (!MQTT_URL || !MQTT_USER || !MQTT_PASS) {
  throw new Error("Missing MQTT envs: MQTT_URL, MQTT_USER, MQTT_PASS");
}

// Yhdistetään MQTT-brokeriin
const m = mqtt.connect(MQTT_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
  // keepalive: 60, reconnectPeriod: 2000, // (oletukset ok)
});

type DeviceState = Record<string, any>;

const lastState = new Map<string, DeviceState>(); // Tallennetaan viimeisin laitteelta tullut tila
const lastSeen  = new Map<string, number>(); // Tallennetaan milloin laitteelta viimeksi kuultiin (aikaleima)

// Tallennetaan kaikki SSE-yhteydet per laite
// (Nämä ovat React Native -sovelluksia, jotka kuuntelevat reaaliaikaista dataa)
const sseClients = new Map<string, Set<express.Response>>();

// Kun MQTT-yhteys muodostuu onnistuneesti:
m.on("connect", () => {
  console.log("MQTT connected");
  // Tilataan kaikki topicit muodossa devices/<deviceId>/state
  m.subscribe("devices/+/state", { qos: 1 });
});


// Kun MQTT:ltä tulee viesti:
m.on("message", (topic, payload) => {
  // Etsitään laite-id topicista
  const match = /^devices\/([^/]+)\/state$/.exec(String(topic));
  if (!match) return;

  const deviceId = match[1]!; // Laite-id

  try {
    const data = JSON.parse(payload.toString()); // Muutetaan JSON-teksti JavaScript-olioksi

    // Tallennetaan laitteelta saatu tila ja aikaleima
    lastState.set(deviceId, data);
    lastSeen.set(deviceId, Date.now());

    // Jos SSE-yhteyksiä on olemassa tälle laitteelle,
    // lähetetään niille uusi tila heti
    const clients = sseClients.get(deviceId);
    if (clients && clients.size) {
      const frame = `data: ${JSON.stringify({
        deviceId,
        state: data,
        lastSeen: lastSeen.get(deviceId),
      })}\n\n`;

      // Kirjoitetaan kaikille asiakkaille uusi data
      for (const res of clients) res.write(frame);
    }
  } catch (e) {
    // huono JSON → sivuutetaan
  }
});

// -------------------- Routes --------------------

// LED ON/OFF
app.post("/led", (req, res) => {
  const { deviceId, state } = req.body || {};

  // Tarkistetaan että parametrit ovat oikein
  if (!deviceId || !["on", "off"].includes(state)) {
    return res.status(400).json({ ok: false, error: "Bad params" });
  }

  // MQTT-topic johon lähetetään komento
  const topic = `devices/${deviceId}/cmd`;
  // Komennon sisältö
  const msg = JSON.stringify({ led: state });

  // Lähetetään komento laitteelle MQTT:n kautta
  m.publish(topic, msg, { qos: 1 }, (err) => {
    if (err) return res.status(500).json({ ok: false, error: String(err) });
    res.json({ ok: true });
  });
});

// Moottori (ms & suunta)
app.post("/motor", (req, res) => {
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

// Viimeisin tila + lastSeen
app.get("/state/:deviceId", (req, res) => {
  const id = req.params.deviceId!; // <-- non-null assertion
  res.json({
    deviceId: id,
    state: lastState.get(id) ?? null,
    lastSeen: lastSeen.get(id) ?? null,
  });
});

// SSE: reaaliaikainen tilavirta ilman jatkuvaa kyselyä
app.get("/events/:deviceId", (req, res) => {
  const id = req.params.deviceId!; // <-- non-null assertion

  // SSE-headereita
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // @ts-ignore
  res.flushHeaders?.();

  // rekisteröi client
  let set = sseClients.get(id);
  if (!set) sseClients.set(id, (set = new Set()));
  set.add(res);

  // lähetä heti viimeisin tila jos on
  const snapshot = lastState.get(id);
  if (snapshot) {
    res.write(
      `data: ${JSON.stringify({
        deviceId: id,
        state: snapshot,
        lastSeen: lastSeen.get(id) ?? null,
      })}\n\n`
    );
  }

  // siivoa yhteys sulkeutuessa
  req.on("close", () => {
    set!.delete(res);
    if (set!.size === 0) sseClients.delete(id);
    res.end();
  });
});

// Health & juuren ohjaus
app.get("/health", (_req, res) => res.send("ok"));
app.get("/", (_req, res) => res.redirect("/health"));

// -------------------- Start --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveri käynnistyy http://localhost:${PORT}`);
});
