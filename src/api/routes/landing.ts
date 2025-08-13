import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";

const router = Router();
const QR_SECRET = process.env.QR_SECRET || "";

function validSig(code: string, sig?: string) {
    if (!QR_SECRET || !sig) return true;
    const mac = createHmac("sha256", QR_SECRET).update(code).digest("hex");
    const a = Buffer.from(mac), b = Buffer.from(String(sig));
    if (a.length !== b.length) return false;
    try { return timingSafeEqual(a, b); } catch { return false; }
  }

  router.get("/d", (req, res) => {
    const code = String(req.query.code || "").toUpperCase().trim();
    const sig  = typeof req.query.sig === "string" ? req.query.sig : undefined;
  
    if (!code) return res.status(400).send("Puuttuva koodi.");
    if (!validSig(code, sig)) return res.status(401).send("Virheellinen allekirjoitus.");
  
    // Tässä voit yrittää avata appin custom-scheme:llä, jos sellainen on:
    // const appLink = `kylmakaappi://device?code=${encodeURIComponent(code)}`;
  
    res.type("html").send(`
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <h2>Koodi luettu</h2>
      <p>Laitteen asiakaskoodi: <b>${code}</b></p>
      <p>Avaa sovellus ja syötä koodi, tai jatka asiakkaanäkymään webissä (tulevaa):</p>
      <p><a href="/web-pay?code=${encodeURIComponent(code)}">Jatka webissä</a></p>
    `);
  });
  
  export default router;