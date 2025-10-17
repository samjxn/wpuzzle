const DATE_OVERRIDE_PARAM = "date";

const normalizeIsoDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
};

const coerceOverrideDate = (raw: string | null): Date | null => {
  if (raw == null || raw.trim().length === 0) {
    return null;
  }

  const trimmed = raw.trim();
  const normalized = normalizeIsoDate(trimmed);
  if (normalized != null) {
    return normalized;
  }

  const parsedTimestamp = Date.parse(trimmed);
  if (Number.isNaN(parsedTimestamp)) {
    return null;
  }

  const parsed = new Date(parsedTimestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getReferenceDate = (): Date => {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return new Date();
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const override = coerceOverrideDate(params.get(DATE_OVERRIDE_PARAM));
    return override ?? new Date();
  } catch {
    return new Date();
  }
};

export const getDateOverrideParamName = (): string => DATE_OVERRIDE_PARAM;
