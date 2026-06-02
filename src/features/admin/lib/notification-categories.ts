export type NotificationCategory = 'deals' | 'news' | 'orders' | 'general';

export const NOTIFICATION_CATEGORIES: {
  value: NotificationCategory;
  label: string;
}[] = [
  { value: 'deals', label: 'Deals' },
  { value: 'news', label: 'Мэдээ' },
  { value: 'orders', label: 'Захиалга' },
  { value: 'general', label: 'Ерөнхий' },
];

export function notificationCategoryLabel(
  value: NotificationCategory,
): string {
  return NOTIFICATION_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
