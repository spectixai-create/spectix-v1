export function getUserInitials(email: string): string {
  const localPart = email.split('@')[0]?.trim() ?? '';
  const parts = localPart
    .split(/[.\-_\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toLocaleUpperCase(
      'he-IL',
    );
  }

  const compact = localPart.replace(/[^A-Za-z0-9\u0590-\u05ff]/g, '');

  return (compact.slice(0, 2) || 'SP').toLocaleUpperCase('he-IL');
}
