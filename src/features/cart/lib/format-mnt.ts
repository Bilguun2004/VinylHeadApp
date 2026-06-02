export function formatMnt(amount: number) {
  return `${Math.round(amount).toLocaleString('en-US')}₮`;
}
