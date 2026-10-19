'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { airlineSummary } from '@/lib/airlines';
import { getAirport, POPULAR_FROM, POPULAR_TO, QUICK_ROUTES } from '@/lib/airports';
import { loadLocal, saveLocal } from '@/lib/client';
import { addDays, fmtDate, todayISO } from '@/lib/format';
import { flightParamsToQuery } from '@/lib/schemas';
import { CABIN_LABEL, type Cabin, type FlightSearchParams } from '@/lib/types';
import { AirlinePicker } from './AirlinePicker';
import { AirportPicker } from './AirportPicker';
import { DatePicker } from './DatePicker';
import { PaxPicker } from './PaxPicker';
import { toast } from './Toast';
import { FieldButton, PrimaryButton, SegmentedControl, Toggle } from './ui';

interface FormState {
  tripType: 'round' | 'oneway';
  from: string;
  to: string;
  dep: string;
  ret: string;
  adults: number;
  children: number;
  infants: number;
  cabin: Cabin;
  nonStop: boolean;
  carriers: string[];
}

const KEY = 'bb:flightForm';

function defaults(): FormState {
  const dep = addDays(todayISO(), 21);
  return { tripType: 'round', from: 'TPE', to: 'NRT', dep, ret: addDays(dep, 4), adults: 1, children: 0, infants: 0, cabin: 'ECONOMY', nonStop: false, carriers: [] };
}

function AirportValue({ code }: { code: string }) {
  const a = getAirport(code);
  if (!a) return <span>{code}</span>;
  return (
    <span>
      {a.city} <span className="text-sm font-normal text-gray-400">{a.code}</span>
    </span>
  );
}

export function FlightSearchForm() {
  const router = useRouter();
  const [f, setF] = useState<FormState>(defaults);
  const [sheet, setSheet] = useState<null | 'from' | 'to' | 'dates' | 'pax' | 'airline'>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = loadLocal<FormState>(KEY, defaults());
    const today = todayISO();
    if (saved.dep < today) {
      const d = defaults();
      saved.dep = d.dep;
      saved.ret = d.ret;
    }
    if (saved.ret < saved.dep) saved.ret = addDays(saved.dep, 4);
    setF(saved);
  }, []);

  const update = (patch: Partial<FormState>) => setF((x) => ({ ...x, ...patch }));

  const submit = () => {
    if (f.from === f.to) {
      toast('出發地與目的地不可相同', 'err');
      return;
    }
    const params: FlightSearchParams = {
      from: f.from,
      to: f.to,
      departDate: f.dep,
      returnDate: f.tripType === 'round' ? f.ret : undefined,
      adults: f.adults,
      children: f.children,
      infants: f.infants,
      cabin: f.cabin,
      nonStop: f.nonStop,
      carriers: f.carriers.length ? f.carriers : undefined,
    };
    saveLocal(KEY, f);
    setSubmitting(true);
    router.push(`/search?${flightParamsToQuery(params)}`);
  };

  const paxLabel = `${f.adults} 成人${f.children ? ` ${f.children} 兒童` : ''}${f.infants ? ` ${f.infants} 嬰兒` : ''} · ${CABIN_LABEL[f.cabin]}`;

  return (
    <div className="space-y-3">
      <SegmentedControl
        value={f.tripType}
        onChange={(v) => update({ tripType: v })}
        options={[
          { value: 'round', label: '來回' },
          { value: 'oneway', label: '單程' },
        ]}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="relative flex">
          <FieldButton label="出發地" value={<AirportValue code={f.from} />} onClick={() => setSheet('from')} className="flex-1" />
          <button
            type="button"
            aria-label="交換出發地與目的地"
            onClick={() => update({ from: f.to, to: f.from })}
            className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-brand-600 shadow-sm tap"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h13l-3-3M20 16H7l3 3" />
            </svg>
          </button>
          <FieldButton label="目的地" value={<AirportValue code={f.to} />} onClick={() => setSheet('to')} className="flex-1 border-l border-gray-200" align="right" />
        </div>
        <div className="flex border-t border-gray-200">
          <FieldButton label="出發日期" value={fmtDate(f.dep)} onClick={() => setSheet('dates')} className="flex-1" />
          {f.tripType === 'round' && (
            <FieldButton label="回程日期" value={fmtDate(f.ret)} onClick={() => setSheet('dates')} className="flex-1 border-l border-gray-200" align="right" />
          )}
        </div>
        <div className="border-t border-gray-200">
          <FieldButton label="旅客 · 艙等" value={paxLabel} onClick={() => setSheet('pax')} />
        </div>
        <div className="border-t border-gray-200">
          <FieldButton label="航空公司" value={f.carriers.length ? airlineSummary(f.carriers) : '不限'} onClick={() => setSheet('airline')} />
        </div>
        <div className="border-t border-gray-200">
          <Toggle checked={f.nonStop} onChange={(v) => update({ nonStop: v })} label="只看直飛" />
        </div>
      </div>

      <PrimaryButton onClick={submit} loading={submitting} className="h-14">
        🔍 搜尋最低價
      </PrimaryButton>

      <div>
        <div className="mb-2 text-xs font-semibold text-gray-500">熱門路線</div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 no-scrollbar">
          {QUICK_ROUTES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => update({ from: r.from, to: r.to })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium tap ${
                f.from === r.from && f.to === r.to ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <AirportPicker open={sheet === 'from'} onClose={() => setSheet(null)} title="選擇出發地" popular={[...POPULAR_FROM, ...POPULAR_TO.slice(0, 6)]} onSelect={(code) => update({ from: code })} />
      <AirportPicker open={sheet === 'to'} onClose={() => setSheet(null)} title="選擇目的地" onSelect={(code) => update({ to: code })} />
      <DatePicker
        open={sheet === 'dates'}
        onClose={() => setSheet(null)}
        mode={f.tripType === 'round' ? 'range' : 'single'}
        farNote={{ afterDays: 330, text: '出發日超過 11 個月，部分航空公司可能還沒開賣，查不到價格是正常的' }}
        start={f.dep}
        end={f.tripType === 'round' ? f.ret : null}
        onConfirm={({ start, end }) => update({ dep: start, ret: end ?? (f.ret < start ? addDays(start, 4) : f.ret) })}
      />
      <PaxPicker
        open={sheet === 'pax'}
        onClose={() => setSheet(null)}
        value={{ adults: f.adults, children: f.children, infants: f.infants, cabin: f.cabin }}
        onChange={(v) => update(v)}
      />
      <AirlinePicker
        open={sheet === 'airline'}
        onClose={() => setSheet(null)}
        from={f.from}
        to={f.to}
        value={f.carriers}
        onChange={(carriers) => update({ carriers })}
      />
    </div>
  );
}
