export const ORDER_STATUS = {
  CONFIRMED: 'Confirmed',
  DELIVERED: 'Delivered',
  PENDING: 'Pending',
} as const;

export type OrderStatusKind = 'confirmed' | 'delivered' | 'pending';

export type PaymentStatusKind = 'unpaid' | 'pending' | 'paid' | 'failed';

export type OrderFilterTab = 'all' | 'confirmed' | 'delivered';

export function normalizePaymentStatus(
  paymentStatus: string | null | undefined,
): PaymentStatusKind {
  const s = (paymentStatus ?? 'unpaid').trim().toLowerCase();
  if (s === 'paid') return 'paid';
  if (s === 'pending') return 'pending';
  if (s === 'failed') return 'failed';
  return 'unpaid';
}

export function normalizeOrderStatus(status: string): OrderStatusKind {
  const s = status.trim().toLowerCase();
  if (s === 'delivered' || s === 'хүргэгдсэн') return 'delivered';
  if (s === 'confirmed' || s === 'баталгаажсан') return 'confirmed';
  if (s === 'pending' || s === 'хүлээгдэж буй') return 'pending';
  return 'pending';
}

/** Customer-facing status: paid orders show as confirmed even if webhook lagged on `status`. */
export function displayOrderStatusKind(
  status: string,
  paymentStatus?: string | null,
): OrderStatusKind {
  const orderKind = normalizeOrderStatus(status);
  if (orderKind === 'delivered') return 'delivered';
  if (normalizePaymentStatus(paymentStatus) === 'paid') return 'confirmed';
  return orderKind;
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

export function orderDisplayLabelMn(
  status: string,
  paymentStatus?: string | null,
): string {
  const orderKind = normalizeOrderStatus(status);
  const paymentKind = normalizePaymentStatus(paymentStatus);

  if (orderKind === 'delivered') return 'Хүргэгдсэн';
  if (paymentKind === 'paid') return 'Баталгаажсан';
  if (
    orderKind === 'pending' &&
    (paymentKind === 'unpaid' || paymentKind === 'pending')
  ) {
    return 'Төлбөр хүлээгдэж буй';
  }
  if (orderKind === 'confirmed') return 'Баталгаажсан';
  return 'Хүлээгдэж буй';
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
