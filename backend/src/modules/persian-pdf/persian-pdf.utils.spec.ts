import { normalizePersianText, convertDigits, reverseForRtlDisplay, escapeHtml } from './persian-pdf.utils';

describe('PersianPdfUtils', () => {
  describe('normalizePersianText', () => {
    it('replaces ي with ی', () => {
      expect(normalizePersianText('عربي')).toBe('عربی');
    });
    it('replaces ك with ک', () => {
      expect(normalizePersianText('كتاب')).toBe('کتاب');
    });
    it('trims and collapses spaces', () => {
      expect(normalizePersianText('  hello   world  ')).toBe('hello world');
    });
    it('returns empty for empty input', () => {
      expect(normalizePersianText('')).toBe('');
      expect(normalizePersianText('   ')).toBe('');
    });
  });

  describe('convertDigits', () => {
    it('converts 0-9 to ۰-۹ when to=fa', () => {
      expect(convertDigits('123', 'fa')).toBe('۱۲۳');
      expect(convertDigits('0', 'fa')).toBe('۰');
    });
    it('converts ۰-۹ to 0-9 when to=en', () => {
      expect(convertDigits('۱۲۳', 'en')).toBe('123');
      expect(convertDigits('۰', 'en')).toBe('0');
    });
    it('returns empty for empty input', () => {
      expect(convertDigits('', 'fa')).toBe('');
    });
  });

  describe('reverseForRtlDisplay', () => {
    it('reverses only RTL segments, keeps LTR as-is', () => {
      expect(reverseForRtlDisplay('MacBook Air')).toBe('MacBook Air');
      expect(reverseForRtlDisplay('سلام')).toBe('مالس');
      expect(reverseForRtlDisplay('Hello سلام')).toBe('Hello مالس');
      expect(reverseForRtlDisplay('مک بوک ایر')).toBe('ریا کوب کم');
    });
    it('returns empty for empty input', () => {
      expect(reverseForRtlDisplay('')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('escapes < and >', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });
    it('escapes &', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });
    it('returns empty for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});
