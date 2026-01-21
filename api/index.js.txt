const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Import handlers
const { getOKXData } = require('./okx-lending');
const { getGateData } = require('./gate-earn');
const { sendTelegramAlert } = require('./telegram');

// Cron job simulation - Vercel akan trigger via scheduled function
app.get('/api/check-arbitrage', async (req, res) => {
  try {
    const [okxData, gateData] = await Promise.all([
      getOKXData(),
      getGateData()
    ]);
    
    const arbitrageOpportunities = analyzeArbitrage(okxData, gateData);
    
    // Kirim alert jika ada opportunity > 2%
    if (arbitrageOpportunities.length > 0) {
      await sendTelegramAlert(arbitrageOpportunities);
    }
    
    res.json({ opportunities: arbitrageOpportunities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard endpoint
app.get('/api/dashboard', async (req, res) => {
  const [okxData, gateData] = await Promise.all([
    getOKXData(),
    getGateData()
  ]);
  
  res.json({
    okx: okxData,
    gate: gateData,
    lastUpdated: new Date().toISOString()
  });
});

module.exports = app;