import express from "express";
import line from "@line/bot-sdk";

const {
  CHANNEL_ACCESS_TOKEN,
  CHANNEL_SECRET,
  CRON_SECRET,
  PUSH_USER_ID
} = process.env;

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET
};

const app = express();
const client = new line.Client(config);

// 健康檢查
app.get("/", (_req, res) => res.status(200).send("OK"));

// Webhook 路由（一定要放在 JSON middleware 之前！）
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.get("x-line-signature") || "";
    const bodyText = req.body.toString("utf8");

    // 驗證簽章
    const ok = line.validateSignature(bodyText, CHANNEL_SECRET, signature);
    if (!ok) {
      console.error("Invalid signature");
      return res.sendStatus(401);
    }

    // 驗完後才 parse JSON
    const body = JSON.parse(bodyText);
    const events = body.events || [];

    // 處理事件
    await Promise.all(
      events.map(async (event) => {
        console.log("EVENT:", JSON.stringify(event));

        if (event.type === "message" && event.message.type === "text") {
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: `你說了：${event.message.text}`
          });
        }
      })
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    // 即使出錯，也要回 200，避免 LINE 重複重試
    return res.sendStatus(200);
  }
});

// 這裡之後才啟用 JSON middleware
app.use(express.json());

// CRON 推播路由
app.post("/cron", async (req, res) => {
  try {
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
    return res.status(200).send("pushed");
  } catch (e) {
    console.error("Cron error:", e);
    return res.sendStatus(200);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Bot is running on port", port));
