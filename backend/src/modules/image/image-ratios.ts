/** نسبت تصویر و ابعاد بر اساس طول بزرگتر (base) */
export const RATIO_OPTIONS: { value: string; label: string; labelEn: string }[] = [
  { value: '1:1', label: 'مربعی (۱:۱)', labelEn: '1:1' },
  { value: '4:3', label: 'افقی (۴:۳)', labelEn: '4:3' },
  { value: '3:4', label: 'عمودی (۳:۴)', labelEn: '3:4' },
  { value: '16:9', label: 'واید (۱۶:۹)', labelEn: '16:9' },
  { value: '9:16', label: 'استوری (۹:۱۶)', labelEn: '9:16' },
  { value: '3:2', label: 'عکس (۳:۲)', labelEn: '3:2' },
  { value: '2:3', label: 'عمودی عکس (۲:۳)', labelEn: '2:3' },
];

const BASE_SMALL = 256;
const BASE_MEDIUM = 512;
const BASE_LARGE = 1024;

function parseRatio(ratio: string): { w: number; h: number } {
  const [a, b] = ratio.split(':').map(Number);
  if (!a || !b) return { w: 512, h: 512 };
  return { w: a, h: b };
}

/** محاسبه عرض و ارتفاع از نسبت و سایز (طول بزرگتر = base) */
export function getDimensionsFromRatio(ratio: string, sizeTier: 'small' | 'medium' | 'large'): { w: number; h: number } {
  const base = sizeTier === 'small' ? BASE_SMALL : sizeTier === 'large' ? BASE_LARGE : BASE_MEDIUM;
  const { w: rw, h: rh } = parseRatio(ratio);
  const longest = Math.max(rw, rh);
  const scale = base / longest;
  return {
    w: Math.round(rw * scale),
    h: Math.round(rh * scale),
  };
}

/** نگاشت سایز قدیمی به ابعاد (برای سازگاری) */
export const LEGACY_SIZE_MAP: Record<string, { w: number; h: number }> = {
  '256x256': { w: 256, h: 256 },
  '512x512': { w: 512, h: 512 },
  '1024x1024': { w: 1024, h: 1024 },
};

export function getDimensions(ratio?: string, sizeTier?: string, legacySize?: string): { w: number; h: number } {
  if (ratio && sizeTier && ['small', 'medium', 'large'].includes(sizeTier)) {
    return getDimensionsFromRatio(ratio, sizeTier as 'small' | 'medium' | 'large');
  }
  if (legacySize && LEGACY_SIZE_MAP[legacySize]) {
    return LEGACY_SIZE_MAP[legacySize];
  }
  return { w: 512, h: 512 };
}
