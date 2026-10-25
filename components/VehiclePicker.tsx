"use client";

import { useEffect, useState } from "react";

type MenuItem = { text: string; value: string };

export type Vehicle = {
  year: string;
  make: string;
  model: string;
  option: string; // trim label
  id: string; // fueleconomy.gov vehicle id
};

async function menu(params: Record<string, string>): Promise<MenuItem[]> {
  const res = await fetch(`/api/vehicles?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error();
  return ((await res.json()) as { items: MenuItem[] }).items;
}

// Year -> make -> model -> trim drop-downs. Calls onMpg with the combined MPG
// when a trim is chosen.
export function VehiclePicker({
  value,
  onChange,
  onMpg,
  onError,
}: {
  value: Vehicle;
  onChange: (v: Vehicle) => void;
  onMpg: (mpg: number | null) => void;
  onError: (message: string | null) => void;
}) {
  const [years, setYears] = useState<MenuItem[]>([]);
  const [makes, setMakes] = useState<MenuItem[]>([]);
  const [models, setModels] = useState<MenuItem[]>([]);
  const [options, setOptions] = useState<MenuItem[]>([]);

  const fail = () => onError("Couldn't load car details from fueleconomy.gov. You can type your MPG instead.");

  useEffect(() => {
    menu({ level: "year" }).then(setYears, fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setMakes([]);
    if (value.year) menu({ level: "make", year: value.year }).then(setMakes, fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.year]);
  useEffect(() => {
    setModels([]);
    if (value.year && value.make)
      menu({ level: "model", year: value.year, make: value.make }).then(setModels, fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.year, value.make]);
  useEffect(() => {
    setOptions([]);
    if (value.year && value.make && value.model)
      menu({ level: "options", year: value.year, make: value.make, model: value.model }).then(
        setOptions,
        fail,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.year, value.make, value.model]);

  async function chooseOption(id: string) {
    const label = options.find((o) => o.value === id)?.text ?? "";
    onChange({ ...value, id, option: label });
    if (!id) return;
    try {
      const res = await fetch(`/api/vehicles?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error();
      onMpg(((await res.json()) as { mpg: number | null }).mpg);
      onError(null);
    } catch {
      fail();
    }
  }

  // Keep the saved choice visible even before its menu has loaded.
  const withCurrent = (items: MenuItem[], v: string, text = v) =>
    v && !items.some((i) => i.value === v) ? [{ text, value: v }, ...items] : items;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Select
        label="Year"
        value={value.year}
        items={withCurrent(years, value.year)}
        onChange={(year) => onChange({ year, make: "", model: "", option: "", id: "" })}
      />
      <Select
        label="Make"
        value={value.make}
        items={withCurrent(makes, value.make)}
        disabled={!value.year}
        onChange={(make) => onChange({ ...value, make, model: "", option: "", id: "" })}
      />
      <div className="col-span-2">
        <Select
          label="Model"
          value={value.model}
          items={withCurrent(models, value.model)}
          disabled={!value.make}
          onChange={(model) => onChange({ ...value, model, option: "", id: "" })}
        />
      </div>
      <div className="col-span-2">
        <Select
          label="Trim / engine"
          value={value.id}
          items={withCurrent(options, value.id, value.option)}
          disabled={!value.model}
          onChange={chooseOption}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  items,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  items: MenuItem[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <select
        className="field mt-1 disabled:bg-stone-100"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose…</option>
        {items.map((i) => (
          <option key={i.value} value={i.value}>
            {i.text}
          </option>
        ))}
      </select>
    </label>
  );
}
