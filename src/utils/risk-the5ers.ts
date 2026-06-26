import type { T5AccountOverview, T5AccountDetail, T5RiskMetrics } from "../types";

export function calculateT5RiskBuffer(
  account: T5AccountOverview,
  detail: T5AccountDetail | null
): T5RiskMetrics {
  const startBalance = account.balance - account.pnl;
  const dailyLimitPercent = detail?.dailyDrawdownLimit || 5;
  const overallLimitPercent = detail?.maxDrawdownLimit || 10;

  const dailyLimitAmt = (startBalance * dailyLimitPercent) / 100;
  const overallLimitAmt = (startBalance * overallLimitPercent) / 100;

  const currentDailyDD = detail ? detail.dailyDrawdown : 0;
  const currentOverallDD = detail
    ? detail.maxDrawdown
    : account.pnl < 0
      ? Math.abs(account.pnl)
      : 0;

  const dailyBuffer = Math.max(0, dailyLimitAmt - Math.abs(currentDailyDD));
  const overallBuffer = Math.max(0, overallLimitAmt - Math.abs(currentOverallDD));

  const getStatus = (buffer: number, limit: number) => {
    if (limit === 0) return "safe" as const;
    const ratio = buffer / limit;
    if (ratio < 0.2) return "danger" as const;
    if (ratio < 0.4) return "warning" as const;
    return "safe" as const;
  };

  const dailyStatus = getStatus(dailyBuffer, dailyLimitAmt);
  const overallStatus = getStatus(overallBuffer, overallLimitAmt);

  const target = detail?.challenge?.profitTarget || startBalance * 0.1;
  const targetRemaining = Math.max(0, target - Math.max(0, account.pnl));

  return {
    dailyBuffer,
    overallBuffer,
    dailyStatus,
    overallStatus,
    targetRemaining,
  };
}
