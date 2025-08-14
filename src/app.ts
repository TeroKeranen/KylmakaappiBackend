// src/app.ts
import express from "express";
import cors from "cors";

// HUOM: päivitä polut sen mukaan missä tiedostosi ovat.
// Jos reitit ovat src/routes/… käytä alla olevia polkuja.
// Jos sinulla on ne src/api/routes/… → muuta importit siihen.
import deviceRoutes from "./routes/device";
import customerRoutes from "./routes/customer";
import landingRoutes from "./routes/landing";

const app = express();

// Devissä vapaa CORS; tuotannossa rajaa origin-listaan
app.use(cors());
app.use(express.json());

// Reitit
app.use(deviceRoutes);
app.use(customerRoutes);
app.use(landingRoutes);

// Health + juuren ohjaus
app.get("/health", (_req, res) => res.send("ok"));
app.get("/", (_req, res) => res.redirect("/health"));

export default app;
