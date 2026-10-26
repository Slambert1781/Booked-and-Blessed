import { NextResponse, type NextRequest } from "next/server";
import { getCombinedMpg, getMakes, getModelMpg, getModels, getOptions, getYears } from "@/lib/fueleconomy";

// GET /api/vehicles?level=year|make|model|options&year=&make=&model=
// GET /api/vehicles?id=12345  -> { mpg }
// GET /api/vehicles?level=mpg&year=&make=&model= -> { mpg, versions, low, high } (average of all trims)
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const year = p.get("year") ?? "";
  const make = p.get("make") ?? "";
  const model = p.get("model") ?? "";
  const id = p.get("id");

  try {
    if (id) return NextResponse.json({ mpg: await getCombinedMpg(id) });
    switch (p.get("level")) {
      case "year":
        return NextResponse.json({ items: await getYears() });
      case "make":
        return NextResponse.json({ items: await getMakes(year) });
      case "model":
        return NextResponse.json({ items: await getModels(year, make) });
      case "mpg":
        return NextResponse.json(await getModelMpg(year, make, model));
      case "options":
        return NextResponse.json({ items: await getOptions(year, make, model) });
      default:
        return NextResponse.json({ error: "Unknown level" }, { status: 400 });
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach fueleconomy.gov. You can type your MPG in instead." },
      { status: 502 },
    );
  }
}
