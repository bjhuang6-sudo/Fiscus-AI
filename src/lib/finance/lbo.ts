export interface LboInputs {
  entryEV: number;
  entryEbitda: number;
  ebitdaGrowthRate: number; // annual, e.g. 0.08
  leverageRatio: number; // debt as a fraction of entry EV, e.g. 0.6
  interestRate: number; // on outstanding debt, e.g. 0.08
  fcfConversion: number; // FCF available for paydown as a fraction of EBITDA, e.g. 0.5
  exitMultiple: number; // EV/EBITDA at exit
  years: number;
}

export interface LboYear {
  year: number;
  ebitda: number;
  interestExpense: number;
  debtPaydown: number;
  endingDebt: number;
}

export interface LboResult {
  entryDebt: number;
  entryEquity: number;
  schedule: LboYear[];
  exitEbitda: number;
  exitEV: number;
  exitDebt: number;
  exitEquity: number;
  moic: number;
  irr: number;
}

/**
 * Standard "buy, delever, sell" LBO: debt funds part of the purchase,
 * free cash flow pays it down each year (cash sweep, no dividends), and the
 * sponsor exits at a multiple of exit-year EBITDA. With no interim
 * distributions this structure's IRR is exactly MOIC^(1/years) - 1 — not an
 * approximation, the exact closed form for this cash-flow shape.
 */
export function runLbo(inputs: LboInputs): LboResult {
  const { entryEV, entryEbitda, ebitdaGrowthRate, leverageRatio, interestRate, fcfConversion, exitMultiple, years } =
    inputs;

  const entryDebt = entryEV * leverageRatio;
  const entryEquity = entryEV - entryDebt;

  let debtBalance = entryDebt;
  let ebitda = entryEbitda;
  const schedule: LboYear[] = [];

  for (let year = 1; year <= years; year++) {
    ebitda *= 1 + ebitdaGrowthRate;
    const interestExpense = debtBalance * interestRate;
    const fcfAvailable = Math.max(ebitda * fcfConversion - interestExpense, 0);
    const debtPaydown = Math.min(fcfAvailable, debtBalance);
    debtBalance -= debtPaydown;
    schedule.push({ year, ebitda, interestExpense, debtPaydown, endingDebt: debtBalance });
  }

  const exitEbitda = ebitda;
  const exitEV = exitEbitda * exitMultiple;
  const exitDebt = debtBalance;
  const exitEquity = Math.max(exitEV - exitDebt, 0);

  const moic = entryEquity > 0 ? exitEquity / entryEquity : 0;
  const irr = moic > 0 ? Math.pow(moic, 1 / years) - 1 : -1;

  return { entryDebt, entryEquity, schedule, exitEbitda, exitEV, exitDebt, exitEquity, moic, irr };
}
