// Expects an IANA timezone string from the user (e.g. "Asia/Kolkata", "America/New_York")
// Store this in users.timezone column — get it from the client via
// Intl.DateTimeFormat().resolvedOptions().timeZone on the frontend
export function getLocalDate(timezone?: string | null): string {
  const tz = timezone ?? "UTC";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}