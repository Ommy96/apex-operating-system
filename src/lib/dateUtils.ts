export function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return String(dateStr).split("T")[0];
}

export function formatDisplayDate(dateStr: string | null | undefined): string {
  const value = toDateInputValue(dateStr);
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
