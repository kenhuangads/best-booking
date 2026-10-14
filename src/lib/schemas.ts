import { z } from 'zod';
import { getAirport } from './airports';
import { getCity } from './cities';
import type { FlightSearchParams, HotelSearchParams } from './types';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式須為 YYYY-MM-DD');
const bool = z.preprocess((v) => v === true || v === 'true' || v === '1' || v === 'on', z.boolean());

export const flightParamsSchema = z
  .object({
    from: z.string().trim().toUpperCase().length(3, '出發機場代碼須為 3 碼'),
    to: z.string().trim().toUpperCase().length(3, '目的地機場代碼須為 3 碼'),
    departDate: dateStr,
    returnDate: dateStr.optional(),
    adults: z.coerce.number().int().min(1).max(9).default(1),
    children: z.coerce.number().int().min(0).max(8).default(0),
    infants: z.coerce.number().int().min(0).max(4).default(0),
    cabin: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
    nonStop: bool.default(false),
    carriers: z.preprocess(
      (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
      z
        .array(z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2}$/, '航空公司代碼須為 2 碼'))
        .max(10, '最多指定 10 家航空公司')
        .optional()
        .transform((a) => (a && a.length ? [...new Set(a)] : undefined)),
    ),
  })
  .superRefine((d, ctx) => {
    if (d.from === d.to) ctx.addIssue({ code: 'custom', message: '出發地與目的地不可相同' });
    if (!getAirport(d.from)) ctx.addIssue({ code: 'custom', message: `不支援的出發機場 ${d.from}` });
    if (!getAirport(d.to)) ctx.addIssue({ code: 'custom', message: `不支援的目的地機場 ${d.to}` });
    if (d.returnDate && d.returnDate < d.departDate) ctx.addIssue({ code: 'custom', message: '回程日期不可早於出發日期' });
    if (d.infants > d.adults) ctx.addIssue({ code: 'custom', message: '嬰兒人數不可超過成人人數' });
  });

export const hotelParamsSchema = z
  .object({
    city: z.string().trim().toUpperCase().min(2).max(5),
    checkIn: dateStr,
    checkOut: dateStr,
    adults: z.coerce.number().int().min(1).max(9).default(2),
    rooms: z.coerce.number().int().min(1).max(5).default(1),
    hotelName: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((d, ctx) => {
    if (!getCity(d.city)) ctx.addIssue({ code: 'custom', message: `不支援的目的地 ${d.city}` });
    if (d.checkOut <= d.checkIn) ctx.addIssue({ code: 'custom', message: '退房日期需晚於入住日期' });
  });

export const watchInputSchema = z.object({
  type: z.enum(['flight', 'hotel']),
  title: z.string().trim().min(1).max(80).optional(),
  params: z.record(z.unknown()),
  targetPrice: z.number().int().positive().nullable().optional(),
  notifyOnDrop: z.boolean().optional(),
  dropPercent: z.number().min(1).max(50).optional(),
  intervalMin: z.number().int().min(5).max(1440).optional(),
});

export const watchPatchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  targetPrice: z.number().int().positive().nullable().optional(),
  notifyOnDrop: z.boolean().optional(),
  dropPercent: z.number().min(1).max(50).optional(),
  intervalMin: z.number().int().min(5).max(1440).optional(),
  active: z.boolean().optional(),
});

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function issues(e: z.ZodError): string {
  return e.issues.map((i) => i.message).join('；');
}

type Source = URLSearchParams | Record<string, unknown>;
function getter(sp: Source) {
  return (k: string): unknown => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return v === '' || v === null ? undefined : v;
  };
}

export function parseFlightQuery(sp: Source): Parsed<FlightSearchParams> {
  const g = getter(sp);
  const r = flightParamsSchema.safeParse({
    from: g('from'),
    to: g('to'),
    departDate: g('dep') ?? g('departDate'),
    returnDate: g('ret') ?? g('returnDate'),
    adults: g('adults'),
    children: g('children'),
    infants: g('infants'),
    cabin: g('cabin'),
    nonStop: g('nonstop') ?? g('nonStop'),
    carriers: g('airlines') ?? g('carriers') ?? g('carrier'),
  });
  return r.success ? { ok: true, value: r.data } : { ok: false, error: issues(r.error) };
}

export function parseHotelQuery(sp: Source): Parsed<HotelSearchParams> {
  const g = getter(sp);
  const r = hotelParamsSchema.safeParse({
    city: g('city'),
    checkIn: g('checkin') ?? g('checkIn'),
    checkOut: g('checkout') ?? g('checkOut'),
    adults: g('adults'),
    rooms: g('rooms'),
    hotelName: g('hotel') ?? g('hotelName'),
  });
  return r.success ? { ok: true, value: r.data } : { ok: false, error: issues(r.error) };
}

export function flightParamsToQuery(p: FlightSearchParams): string {
  const sp = new URLSearchParams({
    type: 'flight',
    from: p.from,
    to: p.to,
    dep: p.departDate,
    adults: String(p.adults),
    children: String(p.children),
    infants: String(p.infants),
    cabin: p.cabin,
    nonstop: p.nonStop ? '1' : '0',
  });
  if (p.returnDate) sp.set('ret', p.returnDate);
  if (p.carriers?.length) sp.set('airlines', p.carriers.join(','));
  return sp.toString();
}

export function hotelParamsToQuery(p: HotelSearchParams): string {
  const sp = new URLSearchParams({
    type: 'hotel',
    city: p.city,
    checkin: p.checkIn,
    checkout: p.checkOut,
    adults: String(p.adults),
    rooms: String(p.rooms),
  });
  if (p.hotelName) sp.set('hotel', p.hotelName);
  return sp.toString();
}
