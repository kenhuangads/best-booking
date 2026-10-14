import { getAirport } from './airports';

export type AirlineTier = 'lcc' | 'full' | 'premium';
export interface Airline {
  name: string;
  tier: AirlineTier;
  /** 官網：指定航空公司時提供直接前往官網訂票的連結 */
  site?: string;
}

export const AIRLINES: Record<string, Airline> = {
  CI: { name: '中華航空', tier: 'full', site: 'https://www.china-airlines.com/' },
  BR: { name: '長榮航空', tier: 'full', site: 'https://www.evaair.com/' },
  JX: { name: '星宇航空', tier: 'premium', site: 'https://www.starlux-airlines.com/' },
  IT: { name: '台灣虎航', tier: 'lcc', site: 'https://www.tigerairtw.com/' },
  B7: { name: '立榮航空', tier: 'full', site: 'https://www.uniair.com.tw/' },
  AE: { name: '華信航空', tier: 'full', site: 'https://www.mandarin-airlines.com/' },
  DA: { name: '德安航空', tier: 'full', site: 'https://www.dailyair.com.tw/' },
  JL: { name: '日本航空', tier: 'premium', site: 'https://www.jal.co.jp/' },
  NH: { name: '全日空', tier: 'premium', site: 'https://www.ana.co.jp/' },
  MM: { name: '樂桃航空', tier: 'lcc', site: 'https://www.flypeach.com/' },
  GK: { name: '捷星日本', tier: 'lcc', site: 'https://www.jetstar.com/' },
  KE: { name: '大韓航空', tier: 'full', site: 'https://www.koreanair.com/' },
  OZ: { name: '韓亞航空', tier: 'full', site: 'https://flyasiana.com/' },
  LJ: { name: '真航空', tier: 'lcc', site: 'https://www.jinair.com/' },
  '7C': { name: '濟州航空', tier: 'lcc', site: 'https://www.jejuair.net/' },
  TW: { name: '德威航空', tier: 'lcc', site: 'https://www.twayair.com/' },
  CX: { name: '國泰航空', tier: 'premium', site: 'https://www.cathaypacific.com/' },
  HX: { name: '香港航空', tier: 'full', site: 'https://www.hongkongairlines.com/' },
  UO: { name: '香港快運', tier: 'lcc', site: 'https://www.hkexpress.com/' },
  NX: { name: '澳門航空', tier: 'full' },
  MU: { name: '中國東方航空', tier: 'full' },
  CA: { name: '中國國際航空', tier: 'full' },
  CZ: { name: '中國南方航空', tier: 'full' },
  MF: { name: '廈門航空', tier: 'full' },
  '9C': { name: '春秋航空', tier: 'lcc' },
  TR: { name: '酷航', tier: 'lcc', site: 'https://www.flyscoot.com/' },
  SQ: { name: '新加坡航空', tier: 'premium', site: 'https://www.singaporeair.com/' },
  AK: { name: '亞洲航空', tier: 'lcc', site: 'https://www.airasia.com/' },
  D7: { name: '亞洲航空 X', tier: 'lcc', site: 'https://www.airasia.com/' },
  MH: { name: '馬來西亞航空', tier: 'full', site: 'https://www.malaysiaairlines.com/' },
  TG: { name: '泰國航空', tier: 'full', site: 'https://www.thaiairways.com/' },
  VJ: { name: '越捷航空', tier: 'lcc', site: 'https://www.vietjetair.com/' },
  VN: { name: '越南航空', tier: 'full', site: 'https://www.vietnamairlines.com/' },
  PR: { name: '菲律賓航空', tier: 'full', site: 'https://www.philippineairlines.com/' },
  '5J': { name: '宿霧太平洋', tier: 'lcc', site: 'https://www.cebupacificair.com/' },
  GA: { name: '印尼航空', tier: 'full', site: 'https://www.garuda-indonesia.com/' },
  UA: { name: '聯合航空', tier: 'full', site: 'https://www.united.com/' },
  DL: { name: '達美航空', tier: 'full', site: 'https://www.delta.com/' },
  AA: { name: '美國航空', tier: 'full', site: 'https://www.aa.com/' },
  AC: { name: '加拿大航空', tier: 'full', site: 'https://www.aircanada.com/' },
  EK: { name: '阿聯酋航空', tier: 'premium', site: 'https://www.emirates.com/' },
  QR: { name: '卡達航空', tier: 'premium', site: 'https://www.qatarairways.com/' },
  EY: { name: '阿提哈德航空', tier: 'premium', site: 'https://www.etihad.com/' },
  TK: { name: '土耳其航空', tier: 'full', site: 'https://www.turkishairlines.com/' },
  KL: { name: '荷蘭皇家航空', tier: 'full', site: 'https://www.klm.com/' },
  AF: { name: '法國航空', tier: 'full', site: 'https://www.airfrance.com/' },
  LH: { name: '漢莎航空', tier: 'full', site: 'https://www.lufthansa.com/' },
  BA: { name: '英國航空', tier: 'full', site: 'https://www.britishairways.com/' },
  QF: { name: '澳洲航空', tier: 'full', site: 'https://www.qantas.com/' },
  NZ: { name: '紐西蘭航空', tier: 'full', site: 'https://www.airnewzealand.com/' },
};

export function airlineName(code: string): string {
  return AIRLINES[code]?.name ?? code;
}

/** 星宇航空、長榮航空；超過兩家時顯示「星宇航空、長榮航空 等 3 家」 */
export function airlineSummary(codes?: string[]): string {
  const names = (codes ?? []).map(airlineName);
  if (names.length <= 2) return names.join('、');
  return `${names.slice(0, 2).join('、')} 等 ${names.length} 家`;
}

/** 這條航線常見的航空公司（依地區粗估）；示範資料也依這份清單產生航班 */
export function routeAirlineCodes(from: string, to: string): string[] {
  const a = getAirport(from);
  const b = getAirport(to);
  if (!a || !b) return [];
  if (a.region === '台灣' && b.region === '台灣') {
    const remote = ['KYD', 'GNI'];
    if (remote.includes(a.code) || remote.includes(b.code)) return ['DA'];
    return ['B7', 'AE'];
  }
  const other = a.region === '台灣' ? b.region : a.region;
  const tw = ['CI', 'BR', 'JX', 'IT'];
  switch (other) {
    case '日本':
      return [...tw, 'JL', 'NH', 'MM', 'GK'];
    case '韓國':
      return [...tw, 'KE', 'OZ', 'LJ', '7C', 'TW'];
    case '港澳':
      return ['CI', 'BR', 'JX', 'CX', 'HX', 'UO', 'NX'];
    case '中國大陸':
      return ['CI', 'BR', 'JX', 'MU', 'CA', 'CZ', 'MF', '9C'];
    case '東南亞':
      return [...tw, 'TR', 'AK', 'VJ', 'TG', 'SQ', '5J', 'PR', 'MH', 'VN'];
    case '歐洲':
      return ['CI', 'BR', 'JX', 'CX', 'EK', 'QR', 'TK', 'KL', 'AF', 'LH', 'BA'];
    case '美洲':
      return ['CI', 'BR', 'JX', 'UA', 'DL', 'AA', 'CX', 'JL', 'NH', 'KE', 'AC'];
    case '大洋洲':
      return ['CI', 'BR', 'JX', 'CX', 'SQ', 'QF', 'NZ', 'UA'];
    case '中東':
      return ['EK', 'QR', 'EY', 'CI', 'BR', 'CX', 'TK'];
    default:
      return [...tw, 'CX', 'SQ'];
  }
}
