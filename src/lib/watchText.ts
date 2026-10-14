import { airlineSummary } from './airlines';
import { diffDays, fmtRange } from './format';
import { CABIN_LABEL, type Watch } from './types';

/** 追蹤項目的副標：日期、人數、艙等 / 晚數（前後端共用，不含任何伺服器相依） */
export function watchSubtitle(w: Watch): string {
  if (w.type === 'flight') {
    const p = w.params;
    const pax = [`${p.adults} 成人`, p.children ? `${p.children} 兒童` : '', p.infants ? `${p.infants} 嬰兒` : ''].filter(Boolean).join(' ');
    const extra = [p.nonStop ? '直飛' : '', p.carriers?.length ? airlineSummary(p.carriers) : ''].filter(Boolean);
    return [fmtRange(p.departDate, p.returnDate), pax, CABIN_LABEL[p.cabin], ...extra].join(' · ');
  }
  const p = w.params;
  return [fmtRange(p.checkIn, p.checkOut), `${diffDays(p.checkIn, p.checkOut)} 晚`, `${p.adults} 人 ${p.rooms} 房`].join(' · ');
}
