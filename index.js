const express = require("express");
const Omise = require("omise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY
});

app.get("/", (req, res) => {
  res.send("Paybox server is running");
});

app.post("/create-qr", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        ok: false,
        error: "amount is required"
      });
    }

    const amountInSatang = Math.round(Number(amount) * 100);

    const source = await omise.sources.create({
      type: "promptpay",
      amount: amountInSatang,
      currency: "THB"
    });

    const charge = await omise.charges.create({
      amount: amountInSatang,
      currency: "THB",
      source: source.id
    });

    const qrImage = charge?.source?.scannable_code?.image?.download_uri;

    if (!qrImage) {
      return res.status(500).json({
        ok: false,
        error: "qrImage not found",
        debugVersion: "v3-safe-qr",
        charge
      });
    }

    res.json({
      ok: true,
      amount: Number(amount),
      sourceId: source.id,
      chargeId: charge.id,
      debugVersion: "v3-safe-qr",
      qrImage
    });
  } catch (err) {
    console.error("create-qr error:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
      debugVersion: "v3-safe-qr"
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
