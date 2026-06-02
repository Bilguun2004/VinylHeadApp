export function formatChatListTime(iso: string | null | undefined): string | null {
  if (!iso) return null;

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'одоо';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'одоо';
  if (minutes < 60) return `${minutes} мин`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цаг`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} өдөр`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} дол`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} сар`;

  const years = Math.floor(days / 365);
  return `${years} жил`;
}
