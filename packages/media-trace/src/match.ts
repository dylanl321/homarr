export const normalizeTitleForMatch = (title: string) =>
  title
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const titlesLikelyMatch = (left: string, right: string) => {
  const a = normalizeTitleForMatch(left);
  const b = normalizeTitleForMatch(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};
