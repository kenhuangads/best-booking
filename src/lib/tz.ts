import { getAirport, type Region } from './airports';

/** 機場所在時區（小時），用來把飛行時間換算成當地到達時間 */
const TZ_BY_CODE: Record<string, number> = {
  BKK: 7, DMK: 7, CNX: 7, HKT: 7, HAN: 7, SGN: 7, DAD: 7, CXR: 7, PQC: 7, CGK: 7, PNH: 7, REP: 7,
  RGN: 6.5, DPS: 8, BWN: 8,
  LHR: 0, LGW: 0, LIS: 0, IST: 3, HEL: 2,
  LAX: -8, SFO: -8, SEA: -8, YVR: -8, JFK: -5, EWR: -5, BOS: -5, YYZ: -5, ORD: -6, IAH: -6, DFW: -6, HNL: -10,
  SYD: 10, MEL: 10, BNE: 10, PER: 8, AKL: 12, GUM: 10, SPN: 10, ROR: 9,
  DXB: 4, AUH: 4, DOH: 3,
};
const TZ_BY_REGION: Record<Region, number> = {
  台灣: 8, 日本: 9, 韓國: 9, 港澳: 8, 中國大陸: 8, 東南亞: 8, 歐洲: 1, 美洲: -5, 大洋洲: 10, 中東: 4,
};

export function tzOffset(code: string): number {
  const a = getAirport(code);
  if (!a) return 8;
  return TZ_BY_CODE[a.code] ?? TZ_BY_REGION[a.region];
}

/** 以「無時區」的當地時間字串做加減：2026-11-04T08:30 + 195 分 → 2026-11-04T11:45 */
export function addMinutesLocal(local: string, minutes: number): string {
  const [date, time] = local.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = (time ?? '00:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) + minutes * 60000).toISOString().slice(0, 16);
}
