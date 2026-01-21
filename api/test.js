module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      success: true,
      message: "Serverless working!",
      timestamp: new Date().toISOString(),
    })
  );
};
