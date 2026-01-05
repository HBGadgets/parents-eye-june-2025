export const parseUniqueIds = (value?: string): number[] => {
  if (!value) return [];

  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number)
    .filter((id) => !Number.isNaN(id));
};
