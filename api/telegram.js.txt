const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

const sendTelegramAlert = async (opportunities) => {
  const message = formatArbitrageMessage(opportunities);
  
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Telegram Error:', error.message);
  }
};

const formatArbitrageMessage = (opportunities) => {
  let message = '🚨 <b>Arbitrage Opportunity Found!</b>\n\n';
  
  opportunities.forEach(opp => {
    message += `💰 <b>${opp.currency}</b>\n`;
    message += `📊 Net APR: <b>${opp.netApr}%</b>\n`;
    message += `🏦 Borrow from: ${opp.borrowFrom} (${opp.borrowRate}%)\n`;
    message += `💎 Earn from: ${opp.earnFrom} (${opp.earnRate}%)\n`;
    message += `💵 Max Amount: ${opp.maxAmount} ${opp.currency}\n\n`;
  });
  
  message += `⏰ ${new Date().toLocaleString()}`;
  return message;
};

module.exports = { sendTelegramAlert };