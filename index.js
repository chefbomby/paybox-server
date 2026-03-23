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

let clients = [];

app.get("/", (req, res) => {
  res.send("Paybox server is running");
});

app.get("/speaker", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Paybox Speaker</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 40px;
          background: #111;
          color: #fff;
        }
        .box {
          max-width: 520px;
          margin: auto;
          background: #222;
          padding: 30px;
          border-radius: 16px;
        }
        .status {
          font-size: 24px;
          margin-top: 20px;
          color: #7CFC00;
        }
        .small {
          margin-top: 12px;
          color: #ccc;
          font-size: 14px;
          word-break: break-word;
        }
        button {
          margin-top: 20px;
          margin-right: 8px;
          padding: 12px 20px;
          font-size: 16px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>Paybox Speaker</h1>
        <p>เปิดหน้านี้ค้างไว้บนมือถือหรือแท็บเล็ตที่กล่อง</p>
        <button onclick="testSpeak()">ทดสอบเสียง</button>
        <div class="status" id="status">กำลังรอการชำระเงิน...</div>
        <div class="small" id="debug">กำลังเชื่อมต่อ...</div>
      </div>

      <script>
        const statusEl = document.getElementById("status");
        const debugEl = document.getElementById("debug");

        function logDebug(text) {
          debugEl.innerText = text;
        }

        function speakText(text) {
          window.speechSynthesis.cancel();
          const msg = new SpeechSynthesisUtterance(text);
          msg.lang = "th-TH";
          msg.rate = 1;
          msg.volume = 1;
          window.speechSynthesis.speak(msg);
          logDebug("กำลังพูด: " + text);
        }

        function testSpeak() {
          speakText("ระบบพร้อมใช้งาน");
        }

        const eventSource = new EventSource("/events");

        eventSource.onopen = function() {
          logDebug("เชื่อมต่อ events สำเร็จ");
        };

        eventSource.onmessage = function(event) {
          logDebug("ได้รับ event: " + event.data);
          const data = JSON.parse(event.data);
          statusEl.innerText = data.message;
          speakText(data.message);
        };

        eventSource.onerror = function() {
          logDebug("การเชื่อมต่อหลุด กำลังเชื่อมต่อใหม่...");
        };
      </script>
    </body>
    </html>
  `);
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const clientId = Date.now();
  clients.push({ id: clientId, res });

  console.log("speaker connected:", clientId, "clients:", clients.length);

  res.write(`data: ${JSON.stringify({ message: "เชื่อมต่อสำเร็จ" })}\n\n`);

  req.on("close", () => {
    clients = clients.filter(client => client.id !== clientId);
    console.log("speaker disconnected:", clientId, "clients:", clients.length);
  });
});

function sendToSpeaker(message) {
  const data = `data: ${JSON.stringify({ message })}\n\n`;
  console.log("sending to clients:", clients.length, "message:", message);

  clients.forEach(client => {
    client.res.write(data);
  });
}

app.get("/test-pay", (req, res) => {
  const amount = req.query.amount || 100;
  const message = "รับเงินแล้ว " + amount + " บาท";

  console.log("test-pay called");
  sendToSpeaker(message);

  res.json({
    ok: true,
    message,
    connectedClients: clients.length
  });
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

app.post("/webhook", (req, res) => {
  const event = req.body;

  console.log("webhook:", event.key);

  if (event.key === "charge.complete") {
    const charge = event.data;
    const amount = charge.amount / 100;
    const message = "รับเงินแล้ว " + amount + " บาท";

    console.log(message);
    sendToSpeaker(message);
  }

  res.sendStatus(200);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server started on port " + port);
});
