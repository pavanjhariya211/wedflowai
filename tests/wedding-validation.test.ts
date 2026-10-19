import { ceremonyInstant, indianDate, parseIndianDate, parseRupees, validateCeremony, validateWedding, weddingError } from '../src/wedding/validation';
import type { CeremonyDraft, WeddingDraft } from '../src/wedding/models';
const wedding: WeddingDraft = { name: 'पवन', title: 'Our wedding', date: '12/12/2027', start: '19/10/2026', city: '', budget: '', mode: 'shared', format: 'single', familyA: '', familyB: '' };
const ceremony: CeremonyDraft = { title: 'Our ceremony', start: '12/12/2027', end: '12/12/2027', allDay: true, startTime: '', endTime: '', venue: '', workspace: 'scope' };
describe('India-specific wedding validation', () => {
  test.each(['31/02/2027', '29/02/2027', '2027-12-12', '12/13/2027', '01/01/1899'])('rejects invalid local date %s', (date) => expect(parseIndianDate(date)).toBeNull());
  test('handles leap days and round trips without UTC date shifts', () => {
    expect(parseIndianDate('29/02/2028')).toBe('2028-02-29');
    expect(indianDate('2028-02-29')).toBe('29/02/2028');
  });
  test('distinguishes unknown, zero and exact paise without floating arithmetic', () => {
    expect(parseRupees('')).toBeNull(); expect(parseRupees('0')).toBe(0);
    expect(parseRupees('23500.10')).toBe(2350010);
  });
  test.each(['-1', '5.001', '1e5', 'NaN', '10000000000', '1,000'])('rejects unsupported monetary input %s', (value) => expect(() => parseRupees(value)).toThrow());
  test('optional city/budget/family labels are not required for a shared wedding', () => expect(validateWedding(wedding)).toEqual({}));
  test('separate mode requires distinct family labels', () => {
    expect(validateWedding({ ...wedding, mode: 'separate' })).toHaveProperty('familyA');
    expect(validateWedding({ ...wedding, mode: 'separate', familyA: 'Our family', familyB: 'our FAMILY' })).toHaveProperty('familyB');
  });
  test('planning cannot start after the wedding', () => expect(validateWedding({ ...wedding, start: '13/12/2027' })).toHaveProperty('start'));
  test('all-day ceremonies do not require time fields', () => expect(validateCeremony(ceremony)).toEqual({}));
  test('India midnight correctly becomes the previous UTC date', () => expect(ceremonyInstant('12/12/2027', '00:15')).toBe('2027-12-11T18:45:00.000Z'));
  test('timed ceremonies validate ranges and 24-hour values', () => {
    expect(validateCeremony({ ...ceremony, allDay: false, startTime: '18:30', endTime: '18:00' })).toHaveProperty('endTime');
    expect(ceremonyInstant('12/12/2027', '24:00')).toBeNull();
  });
  test('multi-day ceremonies accept a later end date', () => expect(validateCeremony({ ...ceremony, end: '14/12/2027' })).toEqual({}));
  test('stale and unauthorized changes have actionable messages, not raw backend text', () => {
    expect(weddingError({ code: '40001' })).toContain('Refresh');
    expect(weddingError({ code: '42501' })).toContain('Access denied');
    expect(weddingError({ message: 'private SQL details' })).not.toContain('private SQL');
  });
});
