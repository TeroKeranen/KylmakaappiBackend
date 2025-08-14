// src/mqtt/client.ts
import mqtt from "mqtt";

const { MQTT_URL, MQTT_USER, MQTT_PASS } = process.env;
if (!MQTT_URL || !MQTT_USER || !MQTT_PASS) {
  throw new Error("Missing MQTT envs: MQTT_URL, MQTT_USER, MQTT_PASS");
}

export const m = mqtt.connect(MQTT_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
  // keepalive jne. default ok
});

m.on("connect", () => {
  console.log("MQTT connected");
  m.subscribe("devices/+/state", { qos: 1 });
});
