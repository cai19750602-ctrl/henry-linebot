// index.js
import express from "express";
import bodyParser from "body-parser";
import line from "@line/bot-sdk";

const {
  CHANNEL_ACCESS_TOKEN,
  CHANNEL_SECRET,
  CRON_SECRET,       // 自訂，給 /cron 用
  PUSH_USER_ID       // 之後拿到再填，先留空也可以
} = process.env;

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET
};

const app = express();
app.use(bodyParser.json());

const client = new line.Client(config);

// 健康檢查
app.get("/", (_req, res) => res.status(200).send("OK"));

// LINE Webhook：收到訊息就原樣回覆，並把 userId 印在 log（用來取得你的 PUSH_USER_ID）
app.post("/webhook", line.middleware(config), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    console.log("EVENT:", JSON.stringify(event)); // 這裡會看到 event.source.userId
    if (event.type === "message" && event.message.type === "text") {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `你說了：${event.message.text}`
      });
    }
  }
  res.status(200).end();
});

// 可選：給 Render Cron Jobs 打的端點，每天觸發推一句話
app.post("/cron", async (req, res) => {
  // 簡單驗證
  const token = req.query.token;
  if (!CRON_SECRET || token !== CRON_SECRET) return res.sendStatus(403);

  if (!PUSH_USER_ID) return res.status(200).send("PUSH_USER_ID not set");

  const messages = [
    "おはよう！きょうもがんばろう！",
    "すこしずつ、じぶんのペースで。",
    "きょうはいいひですね。",
    "やすむことも、たいせつです。"
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  await client.pushMessage(PUSH_USER_ID, { type: "text", text: msg });
  res.status(200).send("pushed");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Bot is running on port", port));
