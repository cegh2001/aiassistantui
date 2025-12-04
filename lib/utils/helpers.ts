export const cls = (...c: (string | boolean | undefined | null)[]): string => 
  c.filter(Boolean).join(" ");

export function timeAgo(date: string | Date, locale: string = 'en'): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Validar fecha
  if (isNaN(d.getTime())) {
    return locale === 'es' ? 'Fecha inválida' : 'Invalid date';
  }
  
  const now = new Date();
  const sec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  
  // Definir rangos con sus divisores correctos
  // [límite_en_segundos, divisor, unidad]
  const ranges: [number, number, Intl.RelativeTimeFormatUnit][] = [
    [60, 1, "second"],           // < 60 seg → segundos
    [3600, 60, "minute"],        // < 1 hora → minutos
    [86400, 3600, "hour"],       // < 1 día → horas
    [604800, 86400, "day"],      // < 1 semana → días
    [2629800, 604800, "week"],   // < 1 mes → semanas
    [31557600, 2629800, "month"], // < 1 año → meses
  ];
  
  // Por defecto: años
  let unit: Intl.RelativeTimeFormatUnit = "year";
  let value = -Math.floor(sec / 31557600);
  
  for (const [limit, divisor, u] of ranges) {
    if (sec < limit) {
      unit = u;
      value = -Math.floor(sec / divisor);
      break;
    }
  }
  
  // Si es 0, mostrar "ahora" o "just now"
  if (value === 0) {
    return locale === 'es' ? 'ahora' : 'just now';
  }
  
  return rtf.format(value, unit);
}

export const makeId = (prefix: string): string => 
  `${prefix}${Math.random().toString(36).slice(2, 10)}`;
