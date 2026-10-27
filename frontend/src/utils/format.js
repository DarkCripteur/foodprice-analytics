export const formatNumber = (value) => value == null
  ? "—"
  : Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export const formatDate = (value) => new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${value}T00:00:00Z`));
