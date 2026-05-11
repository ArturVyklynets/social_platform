export function parseUTC(s) {
  if (!s) return null
  return new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z")
}
