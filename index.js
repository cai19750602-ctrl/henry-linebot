// index.js (robust version: manual signature validation)
import express from "express";
import crypto from "crypto";
import line from "@line/bot-sdk";

const {
  CHANNEL_ACCESS_TOKEN,
  CHANNEL_SECRET,
  CRON_SECRET,
  PUSH_USER_ID,
  PORT,
} = process.env;

// 只給 Client 用的設定（middleware 我們自己做）
const client = new line.Client({
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
});

const app = express();

// 健康檢查
app.get("/", (_req, res) => res.status(200).send("OK"));

/**
 * Webhook：
 * 1) 用 express.raw() 取得「原始 body」
 * 2) 自己計算 HMAC-SHA256(base64) 與 x-line-signature 比對
 * 3) 通過後再 JSON.parse 原始字串進行事件處理
 */
app.post("/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const signature = req.get("x-line-signature") || "";
    const rawBody = req.body?.toString() || "";

    // 驗簽
    const hash = crypto
      .createHmac("SHA256", CHANNEL_SECRET)
      .update(rawBody)
      .digest("base64");

    if (hash !== signature) {
      console.error("Invalid signature");
      return res.status(401).send("Invalid signature");
    }

    // 驗簽 OK，才把 body 轉回 JSON
    const json = JSON.parse(rawBody);
    const events = json.events || [];

    for (const event of events) {
      console.log("EVENT:", JSON.stringify(event)); // 這裡能看到 userId

      if (event.type === "message" && event.message?.type === "text") {
        await client.replyMessage(event.replyToken, {
          type: "text",
          text: `你說了：${event.message.text}`,
        });
      }
    }

    return res.status(200).end();
  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).end();
  }
});

// 可選：Cron 推播
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
    return res.status(200).send("pushed");
  } catch (e) {
    console.error("Push Error:", e);
    return res.status(500).send("push failed");
  }
});

const port = PORT || 3000;
app.listen(port, () => console.log(`✅ Bot is running on port ${port}`));
