const axios = require("axios");

// Pastikan nama file sama persis dengan yang ada di folder api/
// Dari file yang kamu upload: gate-earn.js dan okx-lending.js
const { getGateData } = require("./gate-earn");
const { getOKXData } = require("./okx-lending");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// Heuristik normalisasi rate -> persen (%)
// - kalau 0.05 dianggap 5%
// - kalau 5 dianggap 5%
function toPercent(rate) {
  const r = toNum(rate);
  if (r === null) return null;
  if (r <= 1) return r * 100;
  return r;
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("Telegram env missing, skip notify");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

function analyze(okxRows, gateRows) {
  // Map Gate earnRate by currency
  const gateMap = new Map();
  for (const g of gateRows || []) {
    const c = (g.currency || "").toUpperCase();
    const earnPct = toPercent(g.earnRate);
    if (!c || earnPct === null) continue;

    gateMap.set(c, {
      earnPct,
      availableAmount: toNum(g.availableAmount),
      totalAmount: toNum(g.totalAmount),
    });
  }

  const opportunities = [];
  for (const o of okxRows || []) {
    const c = (o.currency || "").toUpperCase();
    const borrowPct = toPercent(o.borrowRate);
    if (!c || borrowPct === null) continue;

    const g = gateMap.get(c);
    if (!g) continue;

    const netApr = g.earnPct - borrowPct;

    // maxAmount: pakai yang available paling kecil (kalau ada)
    const okxAvail = toNum(o.availableAmount);
    const gateAvail = toNum(g.availableAmount);
    const candidates = [okxAvail, gateAvail].filter(v => typeof v === "number" && v > 0);
    const maxAmount = candidates.length ? Math.min(...candidates) : null;

    opportunities.push({
      currency: c,
      netApr: Number(netApr.toFixed(4)),
      borrowFrom: "OKX",
      earnFrom: "Gate.io",
      maxAmount,
      // info tambahan biar gampang debug
      okxBorrowApr: Number(borrowPct.toFixed(4)),
      gateEarnApr: Number(g.earnPct.toFixed(4)),
    });
  }

  // urutkan netApr terbesar
  opportunities.sort((a, b) => b.netApr - a.netApr);
  return opportunities;
}

module.exports = async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end("ok");
  }

  const ts = new Date().toISOString();
  console.log(`[${ts}] Checking arbitrage...`);

  try {
    const [okxData, gateData] = await Promise.all([getOKXData(), getGateData()]);
    console.log(`OKX items: ${okxData.length}`);
    console.log(`Gate items: ${gateData.length}`);

    const opportunities = analyze(okxData, gateData);

    // Filter opportunity yang “worth it”
    const MIN_NET_APR = Number(process.env.MIN_NET_APR || 1); // default 1% net
    const good = opportunities.filter(x => x.netApr >= MIN_NET_APR);

    if (good.length > 0) {
      const top = good.slice(0, 5);
      const lines = top.map(o =>
        `• <b>${o.currency}</b> netApr <b>${o.netApr.toFixed(2)}%</b> (Gate ${o.gateEarnApr.toFixed(2)}% - OKX ${o.okxBorrowApr.toFixed(2)}%)` +
        (o.maxAmount ? ` | max≈${o.maxAmount}` : "")
      );

      await sendTelegram(
        `🔎 <b>Arbitrage Found</b>\n` +
        `Min netApr: ${MIN_NET_APR}%\n` +
        lines.join("\n") +
        `\n\n⏱ ${ts}`
      );
    } else {
      console.log("No opportunities above threshold");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(
      JSON.stringify({
        success: true,
        opportunities: good.map(({ okxBorrowApr, gateEarnApr, ...rest }) => rest),
        timestamp: ts,
        thresholdMinNetApr: MIN_NET_APR,
      })
    );
  } catch (error) {
    console.error("Arbitrage check failed:", error);

    // kirim error ke telegram (biar kamu tau bot mati)
    try {
      await sendTelegram(`❌ <b>Bot error</b>\n${String(error?.message || error)}\n⏱ ${ts}`);
    } catch (_) {}

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ success: false, error: String(error?.message || error), timestamp: ts }));
  }
};
