import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { createHmac } from "crypto";

const CODES = ["DEV-001", "DEV-XYZ-123"];            // lisää koodit tähän (tai lue CSV:stä)
const BASE_URL = process.env.BASE_URL || "https://oma-domain.fi/d";
const QR_SECRET = process.env.QR_SECRET || "";       // jos haluat allekirjoituksen (?sig=)

function signedUrl(code: string) {
  const u = new URL(BASE_URL);
  u.searchParams.set("code", code);
  if (QR_SECRET) {
    const sig = createHmac("sha256", QR_SECRET).update(code).digest("hex");
    u.searchParams.set("sig", sig);
  }
  return u.toString();
}

async function main() {
  const outDir = path.join(process.cwd(), "qr_out");
  fs.mkdirSync(outDir, { recursive: true });

  for (const code of CODES) {
    const url = signedUrl(code);
    const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "Q", margin: 4 });

    const labeled = svg.replace(
      /<\/svg>\s*$/,
      `\n<text x="50%" y="98%" text-anchor="middle" font-family="Arial, sans-serif" font-size="28">${code}</text>\n</svg>`
    );

    const file = path.join(outDir, `QR_${code}.svg`);
    fs.writeFileSync(file, labeled, "utf8");
    console.log("Wrote", file, "→", url);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
