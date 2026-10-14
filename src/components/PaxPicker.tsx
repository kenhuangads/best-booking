'use client';

import { useEffect, useState } from 'react';
import type { Cabin } from '@/lib/types';
import { Sheet } from './Sheet';
import { PrimaryButton, SegmentedControl, Stepper } from './ui';

export interface Pax {
  adults: number;
  children: number;
  infants: number;
  cabin: Cabin;
}

export function PaxPicker({ open, onClose, value, onChange }: { open: boolean; onClose: () => void; value: Pax; onChange: (v: Pax) => void }) {
  const [v, setV] = useState<Pax>(value);
  useEffect(() => {
    if (open) setV(value);
  }, [open, value]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="旅客與艙等"
      footer={
        <PrimaryButton
          onClick={() => {
            onChange(v);
            onClose();
          }}
        >
          確定
        </PrimaryButton>
      }
    >
      <div className="divide-y divide-gray-100">
        <Stepper label="成人" hint="12 歲以上" value={v.adults} min={1} max={9} onChange={(n) => setV({ ...v, adults: n, infants: Math.min(v.infants, n) })} />
        <Stepper label="兒童" hint="2–11 歲" value={v.children} min={0} max={8} onChange={(n) => setV({ ...v, children: n })} />
        <Stepper label="嬰兒" hint="未滿 2 歲，不佔位" value={v.infants} min={0} max={v.adults} onChange={(n) => setV({ ...v, infants: n })} />
      </div>
      <div className="mt-4">
        <div className="mb-2 text-sm font-medium">艙等</div>
        <SegmentedControl
          value={v.cabin}
          onChange={(c) => setV({ ...v, cabin: c })}
          options={[
            { value: 'ECONOMY', label: '經濟' },
            { value: 'PREMIUM_ECONOMY', label: '豪經' },
            { value: 'BUSINESS', label: '商務' },
            { value: 'FIRST', label: '頭等' },
          ]}
        />
      </div>
    </Sheet>
  );
}

export interface Guests {
  adults: number;
  rooms: number;
}

export function GuestPicker({ open, onClose, value, onChange }: { open: boolean; onClose: () => void; value: Guests; onChange: (v: Guests) => void }) {
  const [v, setV] = useState<Guests>(value);
  useEffect(() => {
    if (open) setV(value);
  }, [open, value]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="房間與人數"
      footer={
        <PrimaryButton
          onClick={() => {
            onChange(v);
            onClose();
          }}
        >
          確定
        </PrimaryButton>
      }
    >
      <div className="divide-y divide-gray-100">
        <Stepper label="房間" value={v.rooms} min={1} max={5} onChange={(n) => setV({ ...v, rooms: n, adults: Math.max(v.adults, n) })} />
        <Stepper label="成人" hint="每房至少 1 位" value={v.adults} min={v.rooms} max={9} onChange={(n) => setV({ ...v, adults: n })} />
      </div>
    </Sheet>
  );
}
