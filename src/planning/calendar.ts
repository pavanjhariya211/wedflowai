export function moveMonth(month: string, offset: number) {
 const [year, number] = month.split('-').map(Number);
 return new Date(Date.UTC(year!, number! - 1 + offset, 1)).toISOString().slice(0,7);
}
export function monthDays(month: string): (string | null)[] {
 const [year,number] = month.split('-').map(Number);
 const first = new Date(Date.UTC(year!,number!-1,1)); const offset = (first.getUTCDay()+6)%7;
 const count = new Date(Date.UTC(year!,number!,0)).getUTCDate();
 const cells: (string | null)[] = Array.from({length:offset},() => null);
 for(let n=1;n<=count;n++) cells.push(`${month}-${String(n).padStart(2,'0')}`);
 while(cells.length%7)cells.push(null); return cells;
}
export function monthLabel(month: string) {
 return new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
}
