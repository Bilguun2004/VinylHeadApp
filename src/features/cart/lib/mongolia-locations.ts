export const DELIVERY_CITIES = ['Улаанбаатар', 'Дархан', 'Эрдэнэт'] as const;

export type DeliveryCity = (typeof DELIVERY_CITIES)[number];

export const DISTRICTS_BY_CITY: Record<DeliveryCity, readonly string[]> = {
  Улаанбаатар: [
    'Сүхбаатар',
    'Баянзүрх',
    'Баянгол',
    'Хан-Уул',
    'Сонгинохайрхан',
    'Чингэлтэй',
  ],
  Дархан: ['Дархан', 'Дархан-Уул'],
  Эрдэнэт: ['Эрдэнэт', 'Баян-Ндүрүүн'],
};

export function districtsForCity(city: string): readonly string[] {
  if (city in DISTRICTS_BY_CITY) {
    return DISTRICTS_BY_CITY[city as DeliveryCity];
  }
  return DISTRICTS_BY_CITY['Улаанбаатар'];
}
