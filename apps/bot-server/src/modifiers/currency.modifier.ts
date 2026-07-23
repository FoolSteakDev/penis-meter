import {
  getUsdRateChange,
  type UsdRateChange,
} from "../services/currency.service";
import { rollBaseDelta } from "../utils/delta-roll.util";
import type {
  GrowthModifierContext,
  GrowthModifierHandler,
  GrowthModifierResult,
} from "./growth-modifier.types";

const SIGNIFICANT_CHANGE_PERCENT = 0.05;

function adjustDeltaForCurrency(
  baseDelta: number,
  changePercent: number,
  minDelta: number,
  maxDelta: number,
): number {
  const magnitude = Math.min(Math.abs(changePercent) / 2, 1);
  let delta = baseDelta;

  if (changePercent > SIGNIFICANT_CHANGE_PERCENT) {
    // долар росте, гривня слабшає - інфляція "з'їдає" сантиметри
    delta -= Math.abs(minDelta) * magnitude;
  } else if (changePercent < -SIGNIFICANT_CHANGE_PERCENT) {
    // долар падає, гривня міцніє - і не тільки гривня
    delta += Math.abs(maxDelta) * magnitude;
  }

  delta = Math.min(maxDelta, Math.max(minDelta, delta));

  return Math.round(delta * 100) / 100;
}

function buildFlavorText(rateChange: UsdRateChange, delta: number): string {
  const { previousRate, currentRate, changePercent } = rateChange;
  const arrow = changePercent > 0 ? "📈" : changePercent < 0 ? "📉" : "➡️";
  const changeStr = `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`;

  const joke =
    changePercent > SIGNIFICANT_CHANGE_PERCENT
      ? "інфляція з'їдає не лише зарплату..."
      : changePercent < -SIGNIFICANT_CHANGE_PERCENT
        ? "гривня міцніє - і не тільки вона"
        : "курс стабільний, як і твоя психіка";

  return `${arrow} Долар: ${previousRate.toFixed(2)} → ${currentRate.toFixed(2)} грн (${changeStr}) - ${joke}`;
}

export class CurrencyModifier implements GrowthModifierHandler {
  code = "currency";

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;

    try {
      const rateChange = await getUsdRateChange();
      const baseDelta = rollBaseDelta(context.condition);
      const delta = adjustDeltaForCurrency(
        baseDelta,
        rateChange.changePercent,
        minDelta,
        maxDelta,
      );
      return {
        delta,
        message: buildFlavorText(rateChange, delta),
      };
    } catch (error) {
      console.error("[currency.modifier] failed to fetch USD/UAH rate", error);
      const delta = rollBaseDelta(context.condition);
      return {
        delta,
        message: "Курс валют сьогодні вирішив втрутитись у результат.",
      };
    }
  }
}
