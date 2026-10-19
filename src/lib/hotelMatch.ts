/** 飯店名稱比對（前後端與各資料來源共用，沒有其他相依） */

export const normHotel = (s: string) => s.toLowerCase().replace(/[\s·・\-–—_,.()（）'’「」]/g, '');

/** 同一間飯店：去掉空白標點後相同，或一方包含另一方（至少 4 個字，避免太短誤判） */
export function sameHotelName(a: string, b: string): boolean {
  const x = normHotel(a);
  const y = normHotel(b);
  if (!x || !y) return false;
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}

/** 搜尋關鍵字是否出現在飯店名稱裡（用來判斷這次搜尋有沒有找到使用者要的飯店） */
export function hotelNameHas(name: string, keyword: string): boolean {
  const n = normHotel(name);
  const k = normHotel(keyword);
  return !!n && !!k && (n.includes(k) || k.includes(n));
}
