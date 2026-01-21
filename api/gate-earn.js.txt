const axios = require('axios');

const getGateData = async () => {
  try {
    // Gate.io Simple Earn API
    const response = await axios.get('https://api.gateio.ws/api/v4/earn/savings', {
      params: {
        currency: 'USDT,BTC,ETH'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ArbitrageBot/1.0)'
      }
    });
    
    return response.data.map(item => ({
      currency: item.currency,
      earnRate: parseFloat(item.annual_rate),
      availableAmount: parseFloat(item.available_amount),
      totalAmount: parseFloat(item.total_amount)
    }));
  } catch (error) {
    console.error('Gate.io API Error:', error.message);
    return [];
  }
};

module.exports = { getGateData };