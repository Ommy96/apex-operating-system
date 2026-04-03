export interface BurnRateResult {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  pctSpent: number;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  dailyBurnRate: number;
  projectedTotalSpend: number;
  projectedEndDate: Date | null;
  status: 'on_track' | 'underspending' | 'overspending' | 'at_risk';
  statusLabel: string;
  willOverspend: boolean;
  daysUntilDepleted: number | null;
}

export function calculateBurnRate(
  totalBudget: number,
  totalSpent: number,
  grantStartDate: Date,
  grantEndDate: Date
): BurnRateResult {
  const now = new Date();
  const msPerDay = 86400000;

  const daysElapsed = Math.max(1, Math.round((now.getTime() - grantStartDate.getTime()) / msPerDay));
  const daysTotal = Math.max(1, Math.round((grantEndDate.getTime() - grantStartDate.getTime()) / msPerDay));
  const daysRemaining = Math.max(0, Math.round((grantEndDate.getTime() - now.getTime()) / msPerDay));

  const remaining = totalBudget - totalSpent;
  const pctSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const dailyBurnRate = totalSpent / daysElapsed;
  const projectedTotalSpend = dailyBurnRate * daysTotal;

  const daysUntilDepleted = dailyBurnRate > 0 ? remaining / dailyBurnRate : null;
  const projectedEndDate = dailyBurnRate > 0 && daysUntilDepleted !== null
    ? new Date(now.getTime() + daysUntilDepleted * msPerDay)
    : null;

  const expectedPct = (daysElapsed / daysTotal) * 100;
  const willOverspend = projectedTotalSpend > totalBudget;

  let status: BurnRateResult['status'];
  let statusLabel: string;

  if (projectedTotalSpend > totalBudget * 1.05) {
    status = 'overspending';
    statusLabel = 'Overspending';
  } else if (projectedTotalSpend > totalBudget * 0.95) {
    status = 'at_risk';
    statusLabel = 'At Risk';
  } else if (pctSpent < expectedPct - 20) {
    status = 'underspending';
    statusLabel = 'Underspending';
  } else {
    status = 'on_track';
    statusLabel = 'On Track';
  }

  return {
    totalBudget,
    totalSpent,
    remaining,
    pctSpent: Math.round(pctSpent * 100) / 100,
    daysElapsed,
    daysTotal,
    daysRemaining,
    dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
    projectedTotalSpend: Math.round(projectedTotalSpend * 100) / 100,
    projectedEndDate,
    status,
    statusLabel,
    willOverspend,
    daysUntilDepleted: daysUntilDepleted !== null ? Math.round(daysUntilDepleted) : null,
  };
}
