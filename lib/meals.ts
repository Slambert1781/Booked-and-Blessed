// Meals: the four parts of a daily food allowance, with federal defaults.

export type Meal = "breakfast" | "lunch" | "dinner" | "incidentals";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "incidentals"];

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  incidentals: "Incidentals",
};

export type MealRates = Record<Meal, number>;
export type MealChoice = Record<Meal, boolean>;

/**
 * The federal (GSA) standard per diem for meals and incidental expenses:
 * $68 a day, split as below.
 */
export const FEDERAL_MEAL_RATES: MealRates = { breakfast: 16, lunch: 19, dinner: 28, incidentals: 5 };

/** Which meals a new gig starts with: dinner locally, everything when away overnight. */
export function defaultMeals(stayingOvernight: boolean): MealChoice {
  return stayingOvernight
    ? { breakfast: true, lunch: true, dinner: true, incidentals: true }
    : { breakfast: false, lunch: false, dinner: true, incidentals: false };
}

/** Cost of the chosen meals for one day. */
export const dailyMealCost = (rates: MealRates, chosen: MealChoice) =>
  MEALS.reduce((sum, m) => sum + (chosen[m] ? rates[m] : 0), 0);

/** "breakfast, lunch, dinner" */
export const describeMeals = (chosen: MealChoice) =>
  MEALS.filter((m) => chosen[m])
    .map((m) => MEAL_LABEL[m].toLowerCase())
    .join(", ");

/** Read saved meal prices (a gig's stored copy); null if missing or malformed. */
export function parseMealRates(raw: unknown): MealRates | null {
  if (!raw || typeof raw !== "object") return null;
  const out = {} as MealRates;
  for (const m of MEALS) {
    const v = Number((raw as Record<string, unknown>)[m]);
    if (!Number.isFinite(v) || v < 0) return null;
    out[m] = v;
  }
  return out;
}

/** Read a saved meal choice; null if missing (use the defaults). */
export function parseMealChoice(raw: unknown): MealChoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return { breakfast: r.breakfast === true, lunch: r.lunch === true, dinner: r.dinner === true, incidentals: r.incidentals === true };
}

/** The profile's meal prices, falling back to the federal rates. */
export function mealRatesFromProfile(p: Partial<Record<`meal_${Meal}_rate`, number | string | null>> | null | undefined): MealRates {
  const out = { ...FEDERAL_MEAL_RATES };
  for (const m of MEALS) {
    const v = Number(p?.[`meal_${m}_rate`]);
    if (p?.[`meal_${m}_rate`] != null && Number.isFinite(v) && v >= 0) out[m] = v;
  }
  return out;
}
