import "dotenv/config";
import express from "express";
import cors from "cors"

import mqtt from "mqtt";



const app = express();

app.use(cors());            // sallii RN:n yhteyden
app.use(express.json());    // json-bodyjen parsiminen




// MQTT-yhteys

// Haetaan tarvittavat tiedot envistä
const { MQTT_URL, MQTT_USER, MQTT_PASS } = process.env;
if (!MQTT_URL || !MQTT_USER || !MQTT_PASS) {
  throw new Error("Missing MQTT envs: MQTT_URL, MQTT_USER, MQTT_PASS");
}

// Yhdistetään HiveMq brokeriin
const m = mqtt.connect(MQTT_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
});

const lastState = new Map<string, any>();

m.on("connect", () => {
    console.log("MQTT connected");
    m.subscribe("devices/+/state", {qos: 1});
});

m.on("message", (topic, payload) => {
    const match = topic.toString().match(/^devices\/([^/]+)\/state$/);
    if (!match) return;

    const [, deviceId] = match;
    if (!deviceId) return;

    try {
        const data = JSON.parse(payload.toString());
        lastState.set(deviceId,data);
    } catch (error) {
        
    }
})


app.post("/led", (req,res) => {
    const {deviceId, state} = req.body;

    if (!deviceId || !["on", "off"].includes(state)) {
        return res.status(400).json({ok: false, error: "Bad params"});
    }

    const topic = `devices/${deviceId}/cmd`;
    const msg = JSON.stringify({led:state});
    m.publish(topic, msg, {qos: 1}, (err) => {
        if (err) return res.status(500).json({ok: false, error: String(err)});
        res.json({ok: true})
    })
})

// RN → hae viimeisin tila
app.get("/state/:deviceId", (req, res) => {
    res.json({
      deviceId: req.params.deviceId,
      state: lastState.get(req.params.deviceId) ?? null,
    });
  });

  app.get("/health", (_req, res) => res.send("ok"));
  app.get("/", (_req, res) => res.redirect("/health"));



// Portti .env:stä tai 3000 oletuksena

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Serveri käynnistyy http://localhost:${PORT}`);
});
