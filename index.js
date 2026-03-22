const express = require("express");
const Omise = require("omise");

const app = express();
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
      return res.status(400).json({ error: "amount is required" });
    }

    const source = await omise.sources.create({
      type: "promptpay",
      amount: Math.round(Number(amount) * 100),
      currency: "THB"
    });

    res.json({
      ok: true,
      amount,
      sourceId: source.id,
      qrImage: source.scannable_code.image.download_uri
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
