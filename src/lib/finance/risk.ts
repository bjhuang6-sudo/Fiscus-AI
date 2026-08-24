export function calcVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const dailyStdDev = Math.sqrt(variance);
  return dailyStdDev * Math.sqrt(252) * 100; // annualized, as a percent
}

export function calcMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDrawdown = 0;
  for (const price of prices) {
    if (price > peak) peak = price;
    const drawdown = ((price - peak) / peak) * 100;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown; // negative percent
}
