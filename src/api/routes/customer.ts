import {Router, Request, Response} from "express";
import {createHmac, timingSafeEqual} from "crypto";

const router = Router();


const codeToDevice = new Map<string, string>([
    ["DEV-001", "dev-001"],
]);


// (Valinnainen) allekirjoituksen tarkistus QR:lle: ?sig=...
const QR_SECRET = process.env.QR_SECRET || "";
function validSig(code: string, sig?: string): boolean {
  if (!QR_SECRET || !sig) return true; // ei käytössä -> hyväksy
  const mac = createHmac("sha256", QR_SECRET).update(code).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

router.get("/resolve/:customerCode", (req: Request, res: Response) => {
    const raw = String(req.params.customerCode || "");
    const code = raw.trim().toUpperCase();
    const sig = typeof req.query.sig == "string" ? req.query.sig : undefined;

    if (!code) return res.status(400).json({error: "CustomerCode required"});
    if (!validSig(code, sig)) return res.status(401).json({error: "Bad signature"});

    const deviceId = codeToDevice.get(code);
    if (!deviceId) return res.status(404).json({ error: "unknown code" });

    return res.json({ deviceId });

})

// POST /pay -> { ok:true } (demo)
router.post("/pay", (req: Request, res: Response) => {
    type PayBody = { deviceCode?: string; product?: string; amount?: number };
    const body = req.body as PayBody;
  
    if (!body?.deviceCode) {
      return res.status(400).json({ ok: false, error: "deviceCode required" });
    }
  
    // TODO: lisää oikea maksulogiikka (Stripe/Paytrail) myöhemmin.
    // Nyt vain demo-OK:
    return res.json({ ok: true });
  });
  
  export default router;