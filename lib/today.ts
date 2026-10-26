// "Today" as a plain YYYY-MM-DD date. The server runs in UTC, so use the
// family's local zone instead.
export const TIME_ZONE = "America/Los_Angeles";

export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
