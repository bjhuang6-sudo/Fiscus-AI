export interface DcfInputs {
  baseFcf: number;
  growthRate: number; // e.g. 0.08 for 8%
  discountRate: number; // WACC, e.g. 0.09
  terminalGrowthRate: number; // e.g. 0.025
  years: number;
  sharesOutstanding: number;
  netDebt: number;
}

export interface DcfResult {
  projectedFcf: number[];
  presentValues: number[];
  terminalValue: number;
  presentTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  impliedSharePrice: number;
}

export function runDcf(inputs: DcfInputs): DcfResult {
  const { baseFcf, growthRate, discountRate, terminalGrowthRate, years, sharesOutstanding, netDebt } = inputs;

  const projectedFcf: number[] = [];
  const presentValues: number[] = [];
  let fcf = baseFcf;

  for (let year = 1; year <= years; year++) {
    fcf = fcf * (1 + growthRate);
    projectedFcf.push(fcf);
    presentValues.push(fcf / Math.pow(1 + discountRate, year));
  }

  const terminalValue =
    (projectedFcf[projectedFcf.length - 1] * (1 + terminalGrowthRate)) /
    (discountRate - terminalGrowthRate);
  const presentTerminalValue = terminalValue / Math.pow(1 + discountRate, years);

  const enterpriseValue =
    presentValues.reduce((sum, v) => sum + v, 0) + presentTerminalValue;
  const equityValue = enterpriseValue - netDebt;
  const impliedSharePrice = equityValue / sharesOutstanding;

  return {
    projectedFcf,
    presentValues,
    terminalValue,
    presentTerminalValue,
    enterpriseValue,
    equityValue,
    impliedSharePrice,
  };
}
