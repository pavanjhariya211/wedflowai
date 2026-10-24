export type IntakeFacts = {
 guestCount: number | null; venueBooked: boolean | null; cateringBooked: boolean | null;
 photographyBooked: boolean | null; functions: string[]; travelNeeded: boolean | null;
};
export const emptyFacts: IntakeFacts = { guestCount: null, venueBooked: null, cateringBooked: null, photographyBooked: null, functions: [], travelNeeded: null };
// Conservative offline interpretation: only explicit statements, never vendor availability.
export function readBrief(brief: string): IntakeFacts {
 const count = /\b(\d{1,5})\s*(?:guests?|people|attendees)\b/i.exec(brief);
 const booked = (rawName: string) => {
  const name = `(?:${rawName})`;
  const yes = new RegExp(`\\b${name}\\s+(?:(?:is|already)\\s+)*(?:booked|confirmed|arranged)\\b|\\bbooked\\s+(?:the\\s+)?${name}\\b`, 'i');
  const negative = new RegExp(`\\b(?:not|haven.t|isn.t|not yet|need to)\\b[^.!?;]{0,35}\\b${name}\\b|\\b${name}\\b[^.!?;]{0,20}\\b(?:not|unbooked|pending)\\b`, 'i');
  return !negative.test(brief) && yes.test(brief) ? true : null;
 };
 const functions = ['haldi','mehendi','sangeet','reception','engagement'].filter((name) =>
  new RegExp(`\\b${name}\\b`, 'i').test(brief) && !new RegExp(`\\b(?:no|without|skip)\\s+(?:a\\s+)?${name}\\b`, 'i').test(brief));
 return { guestCount: count && Number(count[1]) >= 1 && Number(count[1]) <= 10000 ? Number(count[1]) : null,
  venueBooked: booked('venue'), cateringBooked: booked('caterer|catering'), photographyBooked: booked('photographer|photography'), functions,
  travelNeeded: /\b(?:outstation guests|guest travel|guest accommodation)\b/i.test(brief) ? true : null };
}
export function validateFacts(value: unknown): IntakeFacts {
 if (!value || typeof value !== 'object') throw new Error('Invalid interpretation');
 const v = value as Record<string, unknown>;
 for (const key of ['venueBooked','cateringBooked','photographyBooked','travelNeeded']) {
  if (v[key] !== null && typeof v[key] !== 'boolean') throw new Error('Invalid fact');
 }
 if (v.guestCount !== null && (typeof v.guestCount !== 'number' || !Number.isInteger(v.guestCount) || v.guestCount < 1 || v.guestCount > 10000)) throw new Error('Invalid guest count');
 if (!Array.isArray(v.functions) || v.functions.length > 10 || v.functions.some((x) => typeof x !== 'string' || !x.trim() || x.length > 60)) throw new Error('Invalid functions');
 return { guestCount: v.guestCount as number | null, venueBooked: v.venueBooked as boolean | null,
  cateringBooked: v.cateringBooked as boolean | null, photographyBooked: v.photographyBooked as boolean | null,
  travelNeeded: v.travelNeeded as boolean | null, functions: [...new Set(v.functions as string[])].map((x) => x.trim()) };
}
