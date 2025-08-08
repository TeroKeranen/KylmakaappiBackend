import "dotenv/config";
import express from "express";
import cors from "cors"

const app = express();

// Middlewaret
app.use(cors());            // sallii RN:n yhteyden
app.use(express.json());    // json-bodyjen parsiminen


//Testireitti
app.get("/api/hello", (_req, res) => {
    res.json({message: "Hei react native!!!"});
});

app.post("/api/echo", (req, res) => res.json({youSent: req.body}));

// Portti .env:stä tai 3000 oletuksena

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Serveri käynnistyy http://localhost:${PORT}`);
});
