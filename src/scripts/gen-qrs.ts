// qr_generate.ts
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { createHmac } from "crypto";

/**
 * MUOKATTAVAT:
 * - CODES: mitä koodeja haluat tulostaa
 * - BASE_URL: mille URL:lle koodi johtaa (esim. https://oma-domain.fi/d)
 * - QR_SECRET: jos haluat allekirjoituksen (?sig=) mukaan
 * - TARGET_W: ulostulon leveys pikseleinä
 */
const CODES = ["DEV-001", "DEV-XYZ-123"];
const BASE_URL = process.env.BASE_URL || "https://oma-domain.fi/d";
const QR_SECRET = process.env.QR_SECRET || "";
const TARGET_W = 1000;

/** Muodosta allekirjoitettu URL halutulla tavalla */
function signedUrl(code: string) {
  const u = new URL(BASE_URL);
  u.searchParams.set("code", code);
  if (QR_SECRET) {
    const sig = createHmac("sha256", QR_SECRET).update(code).digest("hex");
    u.searchParams.set("sig", sig);
  }
  return u.toString();
}

/** Puhdista ulompi <svg> ja palauta sisus */
function stripOuterSvg(svg: string) {
  return svg
    .replace(/^<\?xml[^>]*>\s*/i, "")
    .replace(/<!DOCTYPE[^>]*>\s*/i, "")
    .replace(/^<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
}

/** Lue alkuperäisen SVG:n mitat (viewBox tai width/height) */
function readSvgSize(svg: string) {
  const vbMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/i);
  const wMatch = svg.match(/width="([\d.]+)"/i);
  const hMatch = svg.match(/height="([\d.]+)"/i);

  const W = Number(vbMatch?.[1] || wMatch?.[1] || 256);
  const H = Number(vbMatch?.[2] || hMatch?.[1] || 256);
  return { W, H };
}

/** Rakenna lopullinen, tekstitetty SVG */
function buildLabeledSvg(inner: string, W: number, H: number, code: string) {
  // Mitat viewBox-yksiköissä -> skaalaus pysyy oikeassa suhteessa
  const GAP = Math.max(8, Math.round(W * 0.02));     // väli QR:n ja tekstialueen reunoihin
  const FONT = Math.max(12, Math.round(W * 0.05));   // fonttikoko suhteessa leveyteen
  const LABEL_H = GAP + FONT + GAP;                  // tekstikaistan korkeus
  const VIEW_W = W;
  const VIEW_H = H + LABEL_H;

  // Teksti keskitetään pystysuunnassa label-kaistaan
  const TEXT_Y = H + GAP + (LABEL_H - 2 * GAP) / 2;

  // Pikselikorkeus suhteessa TARGET_W:iin
  const TARGET_H = Math.round(VIEW_H * (TARGET_W / VIEW_W));

  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${TARGET_W}" height="${TARGET_H}"
     viewBox="0 0 ${VIEW_W} ${VIEW_H}"
     shape-rendering="crispEdges">
  <!-- QR-koodi -->
  ${inner}
  <!-- Valkoinen tausta tekstille, jotta skannaus ei häiriinny -->
  <rect x="0" y="${H}" width="${VIEW_W}" height="${LABEL_H}" fill="white"/>
  <!-- Keskitetty tekstirivi -->
  <text x="${VIEW_W / 2}" y="${TEXT_Y}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-size="${FONT}">
    ${code}
  </text>
</svg>
`.trim();
}

async function main() {
  const outDir = path.join(process.cwd(), "qr_out");
  fs.mkdirSync(outDir, { recursive: true });

  for (const code of CODES) {
    const url = signedUrl(code);

    // Tee QR:stä SVG – margin auttaa skannauksessa
    const qrSvg = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "Q",
      margin: 16,
      width: 512, // vain "ohje"; luemme oikeat mitat SVG:stä
    });

    const { W, H } = readSvgSize(qrSvg);
    const inner = stripOuterSvg(qrSvg);
    const labeled = buildLabeledSvg(inner, W, H, code);

    const file = path.join(outDir, `QR_${code}.svg`);
    fs.writeFileSync(file, labeled, "utf8");
    console.log("Wrote", file, "→", url);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
