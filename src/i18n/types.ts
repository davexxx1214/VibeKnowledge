import type { en } from './en';

export type Language = 'en' | 'zh';

/** English defines the complete key and formatter signatures; other locales must match. */
export type LanguagePack = typeof en;
