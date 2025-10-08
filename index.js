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

// 片假名簡易糾正對照表（可自行擴充）
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

// LINE Webhook
app.post("/webhook", line.middleware(config), async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    console.log("EVENT:", JSON.stringify(event));

    if (event.type === "message" && event.message.type === "text") {
      const input = event.message.text.trim();

      // 片假名糾正
      const corrections = [];
      for (const [kana, roma] of Object.entries(katakanaFixMap)) {
        if (input.includes(kana)) {
          corrections.push(`${kana} → ${roma}`);
        }
      }

      let replyText;
      if (corrections.length > 0) {
        replyText = `👀 發現了片假名可以改得更好喔！\n${corrections.join("\n")}`;
      } else if (/おはよう|早安/.test(input)) {
        replyText = "おはよう〜☀️ 今日もがんばろうね！";
      } else if (/こんばんは|晚安/.test(input))
