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

    // 🔹 STEP 1: create source
    const source = await omise.sources.create({
      type: "promptpay",
      amount: amountInSatang,
      currency: "THB"
    });

    // 🔹 STEP 2: create charge (สำคัญมาก)
    const charge = await omise.charges.create({
      amount: amountInSatang,
      currency: "THB",
      source: source.id
    });

    // 🔹 STEP 3: ดึง QR จาก charge
    const qrImage = charge.source.scannable_code.image.download_uri;

    res.json({
      ok: true,
      amount,
      sourceId: source.id,
      chargeId: charge.id,
      qrImage
    });

  } catch (err) {
    console.error("create-qr error:", err);

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
app.post("/webhook", (req, res) => {
  const event = req.body;

  console.log("📩 webhook:", event.key);

  if (event.key === "charge.complete") {
    const charge = event.data;

    console.log("💰 มีคนจ่ายแล้ว:", charge.amount / 100, "บาท");

    // 👉 ตรงนี้คือจุดที่เราจะสั่ง "กล่องพูด"
    // เดี๋ยว step ต่อไปจะใส่ตรงนี้
  }

  res.sendStatus(200);
});
