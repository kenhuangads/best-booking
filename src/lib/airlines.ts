export type AirlineTier = 'lcc' | 'full' | 'premium';
export interface Airline {
  name: string;
  tier: AirlineTier;
}

export const AIRLINES: Record<string, Airline> = {
  CI: { name: '中華航空', tier: 'full' },
  BR: { name: '長榮航空', tier: 'full' },
  JX: { name: '星宇航空', tier: 'premium' },
  IT: { name: '台灣虎航', tier: 'lcc' },
  B7: { name: '立榮航空', tier: 'full' },
  AE: { name: '華信航空', tier: 'full' },
  DA: { name: '德安航空', tier: 'full' },
  JL: { name: '日本航空', tier: 'premium' },
  NH: { name: '全日空', tier: 'premium' },
  MM: { name: '樂桃航空', tier: 'lcc' },
  GK: { name: '捷星日本', tier: 'lcc' },
  KE: { name: '大韓航空', tier: 'full' },
  OZ: { name: '韓亞航空', tier: 'full' },
  LJ: { name: '真航空', tier: 'lcc' },
  '7C': { name: '濟州航空', tier: 'lcc' },
  TW: { name: '德威航空', tier: 'lcc' },
  CX: { name: '國泰航空', tier: 'premium' },
  HX: { name: '香港航空', tier: 'full' },
  UO: { name: '香港快運', tier: 'lcc' },
  NX: { name: '澳門航空', tier: 'full' },
  MU: { name: '中國東方航空', tier: 'full' },
  CA: { name: '中國國際航空', tier: 'full' },
  CZ: { name: '中國南方航空', tier: 'full' },
  MF: { name: '廈門航空', tier: 'full' },
  '9C': { name: '春秋航空', tier: 'lcc' },
  TR: { name: '酷航', tier: 'lcc' },
  SQ: { name: '新加坡航空', tier: 'premium' },
  AK: { name: '亞洲航空', tier: 'lcc' },
  D7: { name: '亞洲航空 X', tier: 'lcc' },
  MH: { name: '馬來西亞航空', tier: 'full' },
  TG: { name: '泰國航空', tier: 'full' },
  VJ: { name: '越捷航空', tier: 'lcc' },
  VN: { name: '越南航空', tier: 'full' },
  PR: { name: '菲律賓航空', tier: 'full' },
  '5J': { name: '宿霧太平洋', tier: 'lcc' },
  GA: { name: '印尼航空', tier: 'full' },
  UA: { name: '聯合航空', tier: 'full' },
  DL: { name: '達美航空', tier: 'full' },
  AA: { name: '美國航空', tier: 'full' },
  AC: { name: '加拿大航空', tier: 'full' },
  EK: { name: '阿聯酋航空', tier: 'premium' },
  QR: { name: '卡達航空', tier: 'premium' },
  EY: { name: '阿提哈德航空', tier: 'premium' },
  TK: { name: '土耳其航空', tier: 'full' },
  KL: { name: '荷蘭皇家航空', tier: 'full' },
  AF: { name: '法國航空', tier: 'full' },
  LH: { name: '漢莎航空', tier: 'full' },
  BA: { name: '英國航空', tier: 'full' },
  QF: { name: '澳洲航空', tier: 'full' },
  NZ: { name: '紐西蘭航空', tier: 'full' },
};

export function airlineName(code: string): string {
  return AIRLINES[code]?.name ?? code;
}
