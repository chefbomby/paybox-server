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

    const charge = await omise.charges.create({
      amount: Math.round(Number(amount) * 100),
      currency: "THB",
      source: source.id
    });

    res.json({
      ok: true,
      amount,
      sourceId: source.id,
      chargeId: charge.id,
      qrImage: charge.source.scannable_code.image.download_uri
    });
  } catch (err) {
    console.error("create-qr error:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});
