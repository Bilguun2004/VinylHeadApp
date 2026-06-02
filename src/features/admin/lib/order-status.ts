export const ORDER_STATUS = {
  CONFIRMED: 'Confirmed',
  DELIVERED: 'Delivered',
  PENDING: 'Pending',
} as const;

export type OrderStatusKind = 'confirmed' | 'delivered' | 'pending';

export type OrderFilterTab = 'all' | 'confirmed' | 'delivered';

export function normalizeOrderStatus(status: string): OrderStatusKind {
  const s = status.trim().toLowerCase();
  if (s === 'delivered' || s === 'хүргэгдсэн') return 'delivered';
  if (s === 'confirmed' || s === 'баталгаажсан') return 'confirmed';
  if (s === 'pending' || s === 'хүлээгдэж буй') return 'pending';
  return 'pending';
}

export function statusLabelMn(status: string): string {
  switch (normalizeOrderStatus(status)) {
    case 'delivered':
      return 'Хүргэгдсэн';
    case 'confirmed':
      return 'Баталгаажсан';
    default:
      return 'Хүлээгдэж буй';
  }
}

export function toggleOrderStatus(current: string): string {
  return normalizeOrderStatus(current) === 'delivered'
    ? ORDER_STATUS.CONFIRMED
    : ORDER_STATUS.DELIVERED;
}

export function matchesOrderFilter(
  status: string,
  filter: OrderFilterTab,
): boolean {
  const kind = normalizeOrderStatus(status);
  if (filter === 'all') return true;
  if (filter === 'delivered') return kind === 'delivered';
  return kind === 'confirmed' || kind === 'pending';
}

export function isActiveOrder(status: string): boolean {
  return normalizeOrderStatus(status) !== 'delivered';
}
