src/
  server.ts                  // Express bootstrap + reittien käyttöönotto + MQTT wire-up
  config/index.ts            // (valinnainen) CORS-allowlist tms. — jätän tyhjäksi nyt
  mqtt/
    client.ts                // MQTT-yhteys (m.connect)
  state/
    store.ts                 // lastState/lastSeen getterit/setterit
  sse/
    hub.ts                   // SSE-hubi (asiakkaiden hallinta + keepalive + broadcast)
  routes/
    device.ts                // /state, /events, /led, /motor
    customer.ts              // (sinulla jo) /resolve, /pay
    landing.ts               // (sinulla jo) /d