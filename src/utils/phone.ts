export const normalizeUzPhone = (input: string): string => {
  const digits = (input || '').replace(/\D/g, '');

  if (digits.startsWith('998') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 9) {
    return `+998${digits}`;
  }

  if (digits.length === 12 && !digits.startsWith('998')) {
    return `+${digits}`;
  }

  // fallback: prefix with + and assume full number provided
  return digits ? `+${digits}` : '';
};
