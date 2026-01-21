const TelegramBot = require("node-telegram-bot-api");

// Reuse instance across invocations (serverless friendly)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

function fmtPct(x) {
  const v = n(x);
  if (v === null) return "-";
  return `${v.toFixed(2)}%`;
}

const formatArbitrageMessage = (opportunities) => {
  const now = new Date().toISOString();
  let msg = `🚨 <b>Arbitrage Opportunity Found!</b>\n`;
  msg += `⏱ ${now}\n\n`;

  for (const opp of opportunities || []) {
    const currency = opp.currency ?? "-";
    const netApr = opp.netApr ?? opp.netAPR ?? opp.net ?? null;

    // Support both naming styles:
    const borrowRate = opp.borrowRate ?? opp.okxBorrowApr ?? opp.borrowApr ?? null;
    const earnRate = opp.earnRate ?? opp.gateEarnApr ?? opp.earnApr ?? null;

    msg += `💰 <b>${currency}</b>\n`;
    msg += `📊 Net APR: <b>${fmtPct(netApr)}</b>\n`;
    msg += `🏦 Borrow: ${opp.borrowFrom ?? "OKX"} (${fmtPct(borrowRate)})\n`;
    msg += `💎 Earn: ${opp.earnFrom ?? "Gate.io"} (${fmtPct(earnRate)})\n`;
    if (opp.maxAmount !== null && opp.maxAmount !== undefined) {
      msg += `💵 Max Amount: ${opp.maxAmount} ${currency}\n`;
    }
    msg += `\n`;
  }
  return msg;
};

const sendTelegramAlert = async (opportunities) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("Telegram env missing, skip notify");
    return;
  }

  const message = formatArbitrageMessage(opportunities);

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Telegram Error:", error.message);
  }
};

module.exports = { sendTelegramAlert };
