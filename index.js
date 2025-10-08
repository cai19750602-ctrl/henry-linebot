// index.js
import express from "express";
import line from "@line/bot-sdk";

const {
  CHANNEL_ACCESS_TOKEN,
  CHANNEL_SECRET,
  CRON_SECRET,       // 自訂給 /cron 用
  PUSH_USER_ID       // 拿到 userId 後再填
} = process.env;

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET
};

const app = express();

// 健康檢查（Render ping 或自己測試時用）
app.get("/", (_req, res) => res.status(200).send("OK"));

// LINE Webhook
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;

    for (const event of events) {
      console.log("EVENT:", JSON.stringify(event)); // 這裡會顯示 userId

      if (event.type === "message" && event.message.type === "text") {
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: `你說了：${event.message.text}`
        });
      }
    }

    res.status(200).end();
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).end();
  }
});

// LINE SDK Client
const client = new line.Client(config);

// 可選：給 Render Cron Jobs 打的端點
app.post("/cron", async (req, res) => {
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

  try {
    await client.pushMessage(PUSH_USER_ID, { type: "text", text: msg });
    res.status(200).send("pushed");
  } catch (err) {
    console.error("Push Error:", err);
    res.status(500).send("push failed");
  }
});

// 啟動服務
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Bot is running on port ${port}`));
