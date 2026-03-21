import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { GOTHENBURG } from './constants';

const TZ = GOTHENBURG.TIMEZONE;

export function convertUtcToStockholm(utc: Date): Date {
  return toZonedTime(utc, TZ);
}

export function convertStockholmToUtc(local: Date): Date {
  return fromZonedTime(local, TZ);
}

export function isDaylightSavingTime(utc: Date): boolean {
  const local = toZonedTime(utc, TZ);
  const jan = toZonedTime(new Date(Date.UTC(utc.getFullYear(), 0, 15)), TZ);

  const localOffset = local.getTime() - utc.getTime();
  const janOffset = jan.getTime() - new Date(Date.UTC(utc.getFullYear(), 0, 15)).getTime();

  return localOffset > janOffset;
}

export function getUtcOffset(utc: Date): number {
  const local = toZonedTime(utc, TZ);
  return (local.getTime() - utc.getTime()) / 3600000;
}

export function getTimezoneAbbreviation(utc: Date): string {
  return isDaylightSavingTime(utc) ? 'CEST' : 'CET';
}

export function formatWithTimezone(utc: Date): string {
  const local = convertUtcToStockholm(utc);
  const abbr = getTimezoneAbbreviation(utc);
  const offset = getUtcOffset(utc);
  const sign = offset >= 0 ? '+' : '-';
  const h = String(Math.floor(Math.abs(offset))).padStart(2, '0');
  const m = String(Math.round((Math.abs(offset) % 1) * 60)).padStart(2, '0');
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ` +
    `${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())} ` +
    `${abbr} (UTC${sign}${h}:${m})`
  );
}
