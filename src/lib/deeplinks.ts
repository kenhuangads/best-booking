import { getAirport, isTaiwan } from './airports';
import { getCity } from './cities';
import type { DeepLink, FlightSearchParams, HotelSearchParams } from './types';

const yymmdd = (iso: string) => iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
const enc = encodeURIComponent;

/** 各大 OTA / 比價網站的預填搜尋連結（台灣常用：Google 航班、Skyscanner、Trip.com） */
export function flightDeepLinks(p: FlightSearchParams): DeepLink[] {
  const rt = !!p.returnDate;
  const links: DeepLink[] = [];

  const q = `Flights from ${p.from} to ${p.to} on ${p.departDate}${rt ? ` returning ${p.returnDate}` : ' one way'}`;
  links.push({
    kind: 'google',
    label: 'Google 航班',
    url: `https://www.google.com/travel/flights?hl=zh-TW&gl=TW&curr=TWD&q=${enc(q)}`,
  });

  const skyCabin = { ECONOMY: 'economy', PREMIUM_ECONOMY: 'premiumeconomy', BUSINESS: 'business', FIRST: 'first' }[p.cabin];
  links.push({
    kind: 'skyscanner',
    label: 'Skyscanner',
    url:
      `https://www.skyscanner.com.tw/transport/flights/${p.from.toLowerCase()}/${p.to.toLowerCase()}/${yymmdd(p.departDate)}/` +
      (rt ? `${yymmdd(p.returnDate!)}/` : '') +
      `?adultsv2=${p.adults}&childrenv2=${p.children > 0 ? Array(p.children).fill('8').join('%7C') : ''}&cabinclass=${skyCabin}&rtn=${rt ? 1 : 0}` +
      `&preferdirects=${p.nonStop ? 'true' : 'false'}&currency=TWD&locale=zh-TW&market=TW`,
  });

  const tripClass = { ECONOMY: 'y', PREMIUM_ECONOMY: 's', BUSINESS: 'c', FIRST: 'f' }[p.cabin];
  links.push({
    kind: 'trip',
    label: 'Trip.com',
    url:
      `https://tw.trip.com/flights/showfarefirst?dcity=${p.from.toLowerCase()}&acity=${p.to.toLowerCase()}&ddate=${p.departDate}` +
      (rt ? `&rdate=${p.returnDate}` : '') +
      `&triptype=${rt ? 'rt' : 'ow'}&class=${tripClass}&quantity=${p.adults}&childqty=${p.children}&babyqty=${p.infants}` +
      `&nonstoponly=${p.nonStop ? 'on' : 'off'}&searchboxarg=t&locale=zh-TW&curr=TWD`,
  });

  if (isTaiwan(p.from) && isTaiwan(p.to)) {
    const remote = ['KYD', 'GNI'].includes(p.from) || ['KYD', 'GNI'].includes(p.to);
    if (remote) {
      links.push({ kind: 'airline', label: '德安航空官網', url: 'https://www.dailyair.com.tw/' });
    } else {
      links.push({ kind: 'airline', label: '立榮航空官網', url: 'https://www.uniair.com.tw/' });
      links.push({ kind: 'airline', label: '華信航空官網', url: 'https://www.mandarin-airlines.com/' });
    }
  }
  return links;
}

export function hotelDeepLinks(p: HotelSearchParams, hotelName?: string): DeepLink[] {
  const city = getCity(p.city);
  const text = hotelName || city?.searchName || p.city;
  return [
    {
      kind: 'agoda',
      label: 'Agoda',
      url:
        `https://www.agoda.com/zh-tw/search?textToSearch=${enc(text)}&checkIn=${p.checkIn}&checkOut=${p.checkOut}` +
        `&rooms=${p.rooms}&adults=${p.adults}&children=0&currency=TWD`,
    },
    {
      kind: 'booking',
      label: 'Booking.com',
      url:
        `https://www.booking.com/searchresults.zh-tw.html?ss=${enc(text)}&checkin=${p.checkIn}&checkout=${p.checkOut}` +
        `&group_adults=${p.adults}&no_rooms=${p.rooms}&group_children=0&selected_currency=TWD`,
    },
    {
      kind: 'google',
      label: 'Google 飯店',
      url: `https://www.google.com/travel/search?q=${enc(text)}&hl=zh-TW&gl=TW&curr=TWD`,
    },
  ];
}

export function flightTitle(p: FlightSearchParams): string {
  const f = getAirport(p.from);
  const t = getAirport(p.to);
  return `${f?.city ?? p.from} → ${t?.city ?? p.to}${p.returnDate ? ' 來回' : ' 單程'}`;
}

export function hotelTitle(p: HotelSearchParams): string {
  return `${getCity(p.city)?.name ?? p.city} 住宿`;
}
