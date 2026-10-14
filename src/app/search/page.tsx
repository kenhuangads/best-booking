'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CreateWatchSheet } from '@/components/CreateWatchSheet';
import { FlightCard } from '@/components/FlightCard';
import { FlightDetailSheet } from '@/components/FlightDetailSheet';
import { HotelCard } from '@/components/HotelCard';
import { HotelDetailSheet } from '@/components/HotelDetailSheet';
import { PriceCalendarSheet } from '@/components/PriceCalendarSheet';
import { ErrorBox, Footnote, ListSkeleton, Panel, PriceSummary, ResultHeader, ResultsLayout, StickyCTA } from '@/components/ResultBits';
import { Chip, EmptyState } from '@/components/ui';
import { airlineName, airlineSummary } from '@/lib/airlines';
import { airportCity } from '@/lib/airports';
import { getCity } from '@/lib/cities';
import { fetcher } from '@/lib/client';
import { flightTitle, hotelTitle } from '@/lib/deeplinks';
import { addDays, diffDays, fmtPrice, fmtRange } from '@/lib/format';
import { flightParamsToQuery, hotelParamsToQuery, parseFlightQuery, parseHotelQuery } from '@/lib/schemas';
import {
  CABIN_LABEL,
  type FlightOffer,
  type FlightSearchParams,
  type HotelOffer,
  type HotelSearchParams,
  type SearchResponse,
  type StatusResponse,
} from '@/lib/types';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-4">
          <ListSkeleton />
        </main>
      }
    >
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const sp = useSearchParams();
  const plain = new URLSearchParams(sp.toString());
  if (plain.get('type') === 'hotel') {
    const p = parseHotelQuery(plain);
    return p.ok ? <HotelResults params={p.value} /> : <BadParams error={p.error} />;
  }
  const p = parseFlightQuery(plain);
  return p.ok ? <FlightResults params={p.value} /> : <BadParams error={p.error} />;
}

function BadParams({ error }: { error: string }) {
  return (
    <main className="px-4 py-10">
      <EmptyState
        icon="🤔"
        title="搜尋條件有誤"
        hint={error}
        action={
          <Link href="/" className="block h-12 rounded-2xl bg-brand-600 text-center font-semibold leading-[48px] text-white">
            回到搜尋
          </Link>
        }
      />
    </main>
  );
}

type WatchDraft<P> = { params: P; price: number | null; title: string };

/* ───────────── 機票 ───────────── */

function FlightResults({ params }: { params: FlightSearchParams }) {
  const router = useRouter();
  const qs = flightParamsToQuery(params);
  const { data, error, isLoading, mutate } = useSWR<SearchResponse<FlightOffer>>(`/api/search/flights?${qs}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const [sort, setSort] = useState<'price' | 'duration' | 'depart'>('price');
  const [nonStopOnly, setNonStopOnly] = useState(false);
  const [carrier, setCarrier] = useState<string | null>(null);
  const [sel, setSel] = useState<FlightOffer | null>(null);
  const [draft, setDraft] = useState<WatchDraft<FlightSearchParams> | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const { data: status } = useSWR<StatusResponse>('/api/status', fetcher, { revalidateOnFocus: false });

  const carriers = useMemo(() => {
    const m = new Map<string, number>();
    data?.offers.forEach((o) => {
      const c = o.carriers[0];
      const cur = m.get(c);
      if (cur == null || o.price < cur) m.set(c, o.price);
    });
    return [...m.entries()].sort((a, b) => a[1] - b[1]);
  }, [data]);

  const list = useMemo(() => {
    let l = data?.offers ?? [];
    if (nonStopOnly) l = l.filter((o) => o.itineraries.every((i) => i.stops === 0));
    if (carrier) l = l.filter((o) => o.carriers.includes(carrier));
    const total = (o: FlightOffer) => o.itineraries.reduce((s, i) => s + i.durationMin, 0);
    const sorters = {
      price: (a: FlightOffer, b: FlightOffer) => a.price - b.price,
      duration: (a: FlightOffer, b: FlightOffer) => total(a) - total(b),
      depart: (a: FlightOffer, b: FlightOffer) => a.itineraries[0].segments[0].departAt.localeCompare(b.itineraries[0].segments[0].departAt),
    };
    return [...l].sort(sorters[sort]);
  }, [data, nonStopOnly, carrier, sort]);

  const best = data?.offers[0] ?? null;
  const title = `${airportCity(params.from)} → ${airportCity(params.to)}`;
  const pax = [`${params.adults} 成人`, params.children ? `${params.children} 兒童` : '', params.infants ? `${params.infants} 嬰兒` : ''].filter(Boolean).join(' ');
  const subtitle = `${fmtRange(params.departDate, params.returnDate)} · ${pax} · ${CABIN_LABEL[params.cabin]}${params.nonStop ? ' · 直飛' : ''}${
    params.carriers?.length ? ` · ${airlineSummary(params.carriers)}` : ''
  }`;

  const openWatch = (o?: FlightOffer) => {
    if (o) {
      const c = o.carriers[0];
      const p = { ...params, carriers: [c] };
      const cheapest = data?.offers.find((x) => x.carriers.every((y) => y === c))?.price ?? o.price;
      setDraft({ params: p, price: cheapest, title: flightTitle(p) });
    } else {
      setDraft({ params, price: best?.price ?? null, title: flightTitle(params) });
    }
  };

  const sortChips = (
    <>
      <Chip active={sort === 'price'} onClick={() => setSort('price')}>
        最便宜
      </Chip>
      <Chip active={sort === 'duration'} onClick={() => setSort('duration')}>
        最快
      </Chip>
      <Chip active={sort === 'depart'} onClick={() => setSort('depart')}>
        最早出發
      </Chip>
    </>
  );
  const filterChips = (
    <>
      <Chip active={nonStopOnly} onClick={() => setNonStopOnly(!nonStopOnly)}>
        直飛
      </Chip>
      {status?.features.calendar && <Chip onClick={() => setCalOpen(true)}>📅 價格日曆</Chip>}
    </>
  );
  const carrierChips = carriers.map(([c, p]) => (
    <Chip key={c} active={carrier === c} onClick={() => setCarrier(carrier === c ? null : c)}>
      {airlineName(c)} <span className="text-gray-400">{fmtPrice(p)}</span>
    </Chip>
  ));

  return (
    <main className={best ? 'pb-24 lg:pb-10' : 'pb-6'}>
      <ResultHeader title={title} subtitle={subtitle} />
      <ResultsLayout
        aside={
          <>
            {best && !isLoading && <PriceSummary price={best.price} currency={best.currency} label={`目前最低 · ${pax}`} onClick={() => openWatch()} />}
            <Panel title="排序">{sortChips}</Panel>
            <Panel title="篩選">{filterChips}</Panel>
            {carriers.length > 1 && <Panel title="航空公司">{carrierChips}</Panel>}
          </>
        }
        bar={
          <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
            {sortChips}
            {filterChips}
          </div>
        }
        subbar={carriers.length > 1 ? <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">{carrierChips}</div> : undefined}
      >
        <div className="space-y-3 px-4 pt-1 lg:px-0 lg:pt-0">
          {isLoading ? (
            <ListSkeleton />
          ) : error ? (
            <ErrorBox message={(error as Error).message} onRetry={() => mutate()} />
          ) : list.length === 0 ? (
            <EmptyState
              icon="🛫"
              title="沒有符合的航班"
              hint={params.carriers?.length ? '你指定的航空公司可能沒飛這條航線，點右上角「修改」調整' : '試試取消篩選、放寬條件或更換日期'}
            />
          ) : (
            list.map((o) => <FlightCard key={o.id} offer={o} best={o.id === best?.id} onClick={() => setSel(o)} />)
          )}
          {data && <Footnote provider={data.provider} fetchedAt={data.fetchedAt} cached={data.cached} warnings={data.warnings} />}
        </div>
      </ResultsLayout>

      {best && !isLoading && <StickyCTA price={best.price} currency={best.currency} label={`目前最低 · ${pax}`} onClick={() => openWatch()} />}

      <FlightDetailSheet
        offer={sel}
        params={params}
        onClose={() => setSel(null)}
        onWatch={(o) => {
          setSel(null);
          openWatch(o);
        }}
      />
      {draft && (
        <CreateWatchSheet
          open
          onClose={() => setDraft(null)}
          type="flight"
          params={draft.params}
          currentPrice={draft.price}
          currency={best?.currency}
          defaultTitle={draft.title}
          subtitle={subtitle}
        />
      )}
      <PriceCalendarSheet
        open={calOpen}
        onClose={() => setCalOpen(false)}
        params={params}
        onPick={(dep) => {
          const len = params.returnDate ? diffDays(params.departDate, params.returnDate) : null;
          router.push(`/search?${flightParamsToQuery({ ...params, departDate: dep, returnDate: len != null ? addDays(dep, len) : undefined })}`);
        }}
      />
    </main>
  );
}

/* ───────────── 住宿 ───────────── */

function HotelResults({ params }: { params: HotelSearchParams }) {
  const qs = hotelParamsToQuery(params);
  const { data, error, isLoading, mutate } = useSWR<SearchResponse<HotelOffer>>(`/api/search/hotels?${qs}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const [sort, setSort] = useState<'price' | 'rating' | 'distance'>('price');
  const [breakfast, setBreakfast] = useState(false);
  const [freeCancel, setFreeCancel] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const [sel, setSel] = useState<HotelOffer | null>(null);
  const [draft, setDraft] = useState<WatchDraft<HotelSearchParams> | null>(null);

  const list = useMemo(() => {
    let l = data?.offers ?? [];
    if (breakfast) l = l.filter((o) => o.breakfast);
    if (freeCancel) l = l.filter((o) => o.freeCancel);
    if (stars) l = l.filter((o) => (o.stars ?? 0) >= stars);
    const sorters = {
      price: (a: HotelOffer, b: HotelOffer) => a.totalPrice - b.totalPrice,
      rating: (a: HotelOffer, b: HotelOffer) => (b.rating ?? 0) - (a.rating ?? 0),
      distance: (a: HotelOffer, b: HotelOffer) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99),
    };
    return [...l].sort(sorters[sort]);
  }, [data, breakfast, freeCancel, stars, sort]);

  const best = data?.offers[0] ?? null;
  const city = getCity(params.city);
  const nights = diffDays(params.checkIn, params.checkOut);
  const subtitle = `${fmtRange(params.checkIn, params.checkOut)} · ${nights} 晚 · ${params.rooms} 房 ${params.adults} 人`;

  const trackCity = () => best && setDraft({ params, price: best.totalPrice, title: hotelTitle(params) });
  const sortChips = (
    <>
      <Chip active={sort === 'price'} onClick={() => setSort('price')}>
        最便宜
      </Chip>
      <Chip active={sort === 'rating'} onClick={() => setSort('rating')}>
        評分最高
      </Chip>
      <Chip active={sort === 'distance'} onClick={() => setSort('distance')}>
        離市中心最近
      </Chip>
    </>
  );
  const filterChips = (
    <>
      <Chip active={breakfast} onClick={() => setBreakfast(!breakfast)}>
        含早餐
      </Chip>
      <Chip active={freeCancel} onClick={() => setFreeCancel(!freeCancel)}>
        免費取消
      </Chip>
      {[3, 4, 5].map((s) => (
        <Chip key={s} active={stars === s} onClick={() => setStars(stars === s ? null : s)}>
          {s}★+
        </Chip>
      ))}
    </>
  );

  return (
    <main className={best ? 'pb-24 lg:pb-10' : 'pb-6'}>
      <ResultHeader title={`${city?.name ?? params.city} 住宿`} subtitle={subtitle} />
      <ResultsLayout
        aside={
          <>
            {best && !isLoading && (
              <PriceSummary price={best.totalPrice} currency={best.currency} label={`${city?.name ?? params.city}最低 · ${nights} 晚總價`} onClick={trackCity} />
            )}
            <Panel title="排序">{sortChips}</Panel>
            <Panel title="篩選">{filterChips}</Panel>
          </>
        }
        bar={
          <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
            {sortChips}
            {filterChips}
          </div>
        }
      >
        <div className="space-y-3 px-4 pt-1 lg:px-0 lg:pt-0">
          {isLoading ? (
            <ListSkeleton />
          ) : error ? (
            <ErrorBox message={(error as Error).message} onRetry={() => mutate()} />
          ) : list.length === 0 ? (
            <EmptyState icon="🏨" title="沒有符合的住宿" hint="試試取消篩選或更換日期" />
          ) : (
            <div className="space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
              {list.map((o) => (
                <HotelCard key={o.id} offer={o} best={o.id === best?.id} onClick={() => setSel(o)} />
              ))}
            </div>
          )}
          {data && <Footnote provider={data.provider} fetchedAt={data.fetchedAt} cached={data.cached} warnings={data.warnings} />}
        </div>
      </ResultsLayout>

      {best && !isLoading && (
        <StickyCTA
          price={best.totalPrice}
          currency={best.currency}
          label={`${city?.name ?? params.city}最低 · ${nights} 晚總價`}
          onClick={() => setDraft({ params, price: best.totalPrice, title: hotelTitle(params) })}
        />
      )}

      <HotelDetailSheet
        offer={sel}
        params={params}
        onClose={() => setSel(null)}
        onWatch={(o) => {
          setSel(null);
          setDraft({ params: { ...params, hotelName: o.name }, price: o.totalPrice, title: o.name });
        }}
      />
      {draft && (
        <CreateWatchSheet
          open
          onClose={() => setDraft(null)}
          type="hotel"
          params={draft.params}
          currentPrice={draft.price}
          currency={best?.currency}
          defaultTitle={draft.title}
          subtitle={subtitle}
        />
      )}
    </main>
  );
}
