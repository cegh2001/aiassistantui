export const cls = (...c: (string | boolean | undefined | null)[]): string => 
  c.filter(Boolean).join(" ");

export function timeAgo(date: string | Date, locale: string = 'en'): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const sec = Math.max(1, Math.floor((now.getTime() - d.getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  
  const ranges: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"], 
    [3600, "minute"], 
    [86400, "hour"],
    [604800, "day"], 
    [2629800, "week"], 
    [31557600, "month"],
  ];
  
  let unit: Intl.RelativeTimeFormatUnit = "year";
  let value = -Math.floor(sec / 31557600);
  
  for (const [limit, u] of ranges) {
    if (sec < limit) {
      unit = u;
      const div =
        unit === "second" ? 1 :
        limit / (unit === "minute" ? 60 :
        unit === "hour" ? 3600 :
        unit === "day" ? 86400 :
        unit === "week" ? 604800 : 2629800);
      value = -Math.floor(sec / div);
      break;
    }
  }
  
  return rtf.format(value, unit);
}

export const makeId = (prefix: string): string => 
  `${prefix}${Math.random().toString(36).slice(2, 10)}`;
