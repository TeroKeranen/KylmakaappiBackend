"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = require("crypto");
const CODES = ["DEV-001", "DEV-XYZ-123"]; // lisää koodit tähän (tai lue CSV:stä)
const BASE_URL = process.env.BASE_URL || "https://oma-domain.fi/d";
const QR_SECRET = process.env.QR_SECRET || ""; // jos haluat allekirjoituksen (?sig=)
function signedUrl(code) {
    const u = new URL(BASE_URL);
    u.searchParams.set("code", code);
    if (QR_SECRET) {
        const sig = (0, crypto_1.createHmac)("sha256", QR_SECRET).update(code).digest("hex");
        u.searchParams.set("sig", sig);
    }
    return u.toString();
}
async function main() {
    const outDir = path_1.default.join(process.cwd(), "qr_out");
    fs_1.default.mkdirSync(outDir, { recursive: true });
    for (const code of CODES) {
        const url = signedUrl(code);
        const svg = await qrcode_1.default.toString(url, { type: "svg", errorCorrectionLevel: "Q", margin: 4 });
        const labeled = svg.replace(/<\/svg>\s*$/, `\n<text x="50%" y="98%" text-anchor="middle" font-family="Arial, sans-serif" font-size="28">${code}</text>\n</svg>`);
        const file = path_1.default.join(outDir, `QR_${code}.svg`);
        fs_1.default.writeFileSync(file, labeled, "utf8");
        console.log("Wrote", file, "→", url);
    }
}
main().catch(e => { console.error(e); process.exit(1); });
//# sourceMappingURL=gen-qrs.js.map