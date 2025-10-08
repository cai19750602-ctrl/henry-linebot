import express from "express";
import bodyParser from "body-parser";
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
app.use(bodyParser.json());
const client = new line.Client(config);

const katakanaFixMap = {
  シ: "shi",
  ツ: "tsu",
  ソ: "so",
  ン: "n",
  ス: "su",
  フ: "fu",
  ヂ: "ji",
  ヅ: "zu",
  ジ: "ji",
  ズ: "zu",
};

// 健康檢查
app.get("/", (_req, res) => res.status(200).send("OK"));

// Webhook
app.post("/webhook", line.middleware(config), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const input = event.message.text.trim();

      const corrections = [];
      for (const [kana, roma] of Object.entries(katakanaFixMap)) {
        if (input.includes(kana)) corrections.push(`${kana} → ${roma}`);
      }

      let replyText;
      if (corrections.length > 0) {
        replyText = `👀 發現了片假名可以改得更好喔！\n${corrections.join("\n")}`;
      } else if (/おはよう|早安/.test(input)) {
        replyText = "おはよう〜☀️ 今日もがんばろうね！";
      } else if (/こんばんは|晚安/.test(input)) {
        replyText = "おやすみ💤 ゆっくり休んでね〜";
      } else {
        replyText = `你說了：${input}`;
      }

      await client.replyMessage(event.replyToken, {
        type: "text",
        text: replyText
      });
    }
  }
  res.status(200).end();
});

// CRON
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

  await client.pushMessage(PUSH_USER_ID, { type: "text", text: msg });
  res.status(200).send("pushed");
});

// ✅ 結尾一定要有這兩行
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot is running on port", PORT));
