import { describe, expect, it } from "vitest";
import { dailyMealCost, describeMeals, FEDERAL_MEAL_RATES, mealRatesFromProfile, parseMealChoice, parseMealRates } from "./meals";

describe("meals", () => {
  it("federal rates add up to the $68 per diem", () => {
    expect(dailyMealCost(FEDERAL_MEAL_RATES, { breakfast: true, lunch: true, dinner: true, incidentals: true })).toBe(68);
  });

  it("profile rates fall back to federal ones", () => {
    expect(mealRatesFromProfile({ meal_dinner_rate: "35.00" })).toEqual({ ...FEDERAL_MEAL_RATES, dinner: 35 });
    expect(mealRatesFromProfile(null)).toEqual(FEDERAL_MEAL_RATES);
  });

  it("reads saved values defensively", () => {
    expect(parseMealRates(null)).toBeNull();
    expect(parseMealRates({ breakfast: 16, lunch: 19, dinner: 28 })).toBeNull();
    expect(parseMealChoice(null)).toBeNull();
    expect(parseMealChoice({ dinner: true })).toEqual({ breakfast: false, lunch: false, dinner: true, incidentals: false });
  });

  it("describes the chosen meals", () => {
    expect(describeMeals({ breakfast: false, lunch: true, dinner: true, incidentals: false })).toBe("lunch, dinner");
  });
});
