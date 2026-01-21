const axios = require('axios');

const getOKXData = async () => {
  try {
    // OKX Lending API endpoint
    const response = await axios.get('https://www.okx.com/api/v5/finance/lending-rate', {
      params: {
        ccy: 'USDT,BTC,ETH' // Adjust sesuai kebutuhan
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ArbitrageBot/1.0)'
      }
    });
    
    return response.data.data.map(item => ({
      currency: item.ccy,
      borrowRate: parseFloat(item.borrowRate),
      lendRate: parseFloat(item.lendRate),
      availableAmount: parseFloat(item.availAmt),
      totalAmount: parseFloat(item.totalAmt)
    }));
  } catch (error) {
    console.error('OKX API Error:', error.message);
    return [];
  }
};

module.exports = { getOKXData };