import type { CeremonyDraft, WeddingDraft } from './models';
export function parseIndianDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === iso && Number(yyyy) >= 1900 ? iso : null;
}
export function indianDate(iso: string) { const [year, month, day] = iso.slice(0, 10).split('-'); return `${day}/${month}/${year}`; }
export function todayIndia() { return indianDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())); }
export function parseRupees(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a valid budget in rupees with up to two decimal places.');
  const [whole = '0', fraction = ''] = value.trim().split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (paise > 999999999999) throw new Error('Budget exceeds the supported limit.');
  return paise;
}
export function validateWedding(draft: WeddingDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.name.trim() || draft.name.trim().length > 80) errors.name = 'Enter your name (up to 80 characters).';
  if (!draft.title.trim() || draft.title.trim().length > 120) errors.title = 'Enter a wedding name (up to 120 characters).';
  const date = parseIndianDate(draft.date), start = parseIndianDate(draft.start);
  if (!date) errors.date = 'Use a valid DD/MM/YYYY date.';
  if (!start) errors.start = 'Use a valid DD/MM/YYYY date.';
  if (date && start && start > date) errors.start = 'Planning must start on or before the wedding date.';
  if (draft.city.trim().length > 120) errors.city = 'Use up to 120 characters.';
  try { parseRupees(draft.budget); } catch { errors.budget = 'Enter up to ₹9,99,99,99,999.99 with two decimal places.'; }
  if (draft.mode === 'separate') {
    if (!draft.familyA.trim() || draft.familyA.trim().length > 80) errors.familyA = 'Name your family workspace (up to 80 characters).';
    if (!draft.familyB.trim() || draft.familyB.trim().length > 80) errors.familyB = 'Name the other family workspace (up to 80 characters).';
    if (draft.familyA.trim().toLowerCase() === draft.familyB.trim().toLowerCase()) errors.familyB = 'Use different family names for clarity.';
  }
  return errors;
}
export function ceremonyInstant(date: string, time: string): string | null {
  const day = parseIndianDate(date);
  if (!day || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) return null;
  return new Date(`${day}T${time.trim()}:00+05:30`).toISOString();
}
export function indiaTime(instant: string | null): string {
  if (!instant) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant));
}
export function validateCeremony(draft: CeremonyDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.title.trim() || draft.title.trim().length > 120) errors.title = 'Enter a ceremony name (up to 120 characters).';
  const start = parseIndianDate(draft.start), end = parseIndianDate(draft.end);
  if (!start) errors.start = 'Use a valid DD/MM/YYYY date.';
  if (!end || (start && end < start)) errors.end = 'End date must be valid and on or after the start.';
  if (!draft.workspace) errors.workspace = 'Select a permitted workspace.';
  if (!draft.allDay) {
    const a = ceremonyInstant(draft.start, draft.startTime), b = ceremonyInstant(draft.end, draft.endTime);
    if (!a) errors.startTime = 'Use a valid 24-hour HH:mm time.';
    if (!b || (a && b < a)) errors.endTime = 'End time must be valid and on or after the start.';
  }
  if (draft.venue.trim().length > 180) errors.venue = 'Use up to 180 characters.';
  return errors;
}
export function weddingError(error: unknown): string {
  const value = error as { code?: string; name?: string } | null;
  if (value?.code === '40001') return 'Someone changed this record. Refresh, review the latest values and try again.';
  if (value?.code === '42501') return 'Access denied, membership changed, or the invitation is invalid. Check the invited email and refresh.';
  if (value?.code === '23514') return 'Check the values. A workspace must keep at least one admin.';
  if (value?.code === '23505') return 'This record already exists. Refresh to see the latest version.';
  if (value?.name === 'TypeError' || value?.code === '') return 'Could not connect. Check your network and try again.';
  return 'Could not save this change. Check your connection and refresh before trying again.';
}
