import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { detectLocale, locales, messages } from '../src/i18n';
import { loadLocale, saveLocale } from '../src/save';

describe('多國語言', () => {
  it.each([
    [['ja-JP', 'en-US'], 'ja'],
    [['zh-TW'], 'zh-Hant'],
    [['zh-CN', 'ja'], 'zh-Hant'],
    [['fr-FR', 'en-GB'], 'en'],
    [['fr-FR', 'de'], 'en'],
    [[], 'en'],
  ])('瀏覽器偏好 %j 選用 %s，未支援時以英文為主', (preferred, expected) => {
    expect(detectLocale(preferred)).toBe(expected);
  });

  it('每種語言的文字都不是空字串', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(messages[locale])) {
        const text = typeof value === 'function' ? value(1, 2, 3) : value;
        expect(text.trim(), `${locale}.${key}`).not.toBe('');
      }
    }
  });

  it('記住手動選擇的語言，忽略被竄改的值', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value) };
    expect(loadLocale(storage)).toBeUndefined();
    saveLocale('ja', storage);
    expect(loadLocale(storage)).toBe('ja');
    values.set(config.localeStorageKey, 'xx<script>');
    expect(loadLocale(storage)).toBeUndefined();
  });
});
