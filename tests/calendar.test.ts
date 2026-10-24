import { monthDays, moveMonth } from '../src/planning/calendar';
test('calendar aligns Monday-first weeks and handles leap-year month lengths',()=>{
 const leap=monthDays('2028-02');expect(leap[0]).toBeNull();expect(leap.filter(Boolean)).toHaveLength(29);expect(leap).toContain('2028-02-29');expect(leap.length%7).toBe(0);
 expect(monthDays('2026-06')[0]).toBe('2026-06-01');
});
test('calendar month navigation crosses year boundaries without shifting event dates',()=>{
 expect(moveMonth('2026-12',1)).toBe('2027-01');expect(moveMonth('2027-01',-1)).toBe('2026-12');
});
