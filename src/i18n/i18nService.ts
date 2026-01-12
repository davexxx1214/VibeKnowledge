import * as vscode from 'vscode';
import { LanguagePack, Language } from './types';
import { en } from './en';
import { zh } from './zh';

/**
 * 国际化服务
 * 提供多语言支持和动态语言切换
 */
export class I18nService {
  private static instance: I18nService;
  private currentLanguage: Language = 'zh';
  private languagePacks: Record<Language, LanguagePack>;
  private onDidChangeLanguageEmitter = new vscode.EventEmitter<Language>();
  public readonly onDidChangeLanguage = this.onDidChangeLanguageEmitter.event;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    this.languagePacks = {
      en,
      zh,
    };

    // 初始化当前语言
    this.initializeLanguage();

    // 监听配置变化
    this.setupConfigurationListener();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  /**
   * 初始化语言设置
   */
  private initializeLanguage(): void {
    const config = vscode.workspace.getConfiguration('knowledgeGraph');
    const language = config.get<string>('language', 'zh') as Language;

    if (this.isValidLanguage(language)) {
      this.currentLanguage = language;
    } else {
      this.currentLanguage = 'zh'; // 默认中文
    }
  }

  /**
   * 设置配置监听器
   */
  private setupConfigurationListener(): void {
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('knowledgeGraph.language')) {
        const config = vscode.workspace.getConfiguration('knowledgeGraph');
        const newLanguage = config.get<string>('language', 'zh') as Language;

        if (this.isValidLanguage(newLanguage) && newLanguage !== this.currentLanguage) {
          this.currentLanguage = newLanguage;
          this.onDidChangeLanguageEmitter.fire(newLanguage);

          vscode.window.showInformationMessage(
            `语言已切换至: ${newLanguage === 'zh' ? '中文' : 'English'}`
          );
        }
      }
    });
  }

  /**
   * 验证语言代码是否有效
   */
  private isValidLanguage(lang: string): lang is Language {
    return lang === 'en' || lang === 'zh';
  }

  /**
   * 获取当前语言
   */
  public getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * 获取当前语言包
   */
  public getCurrentLocale(): LanguagePack {
    return this.languagePacks[this.currentLanguage];
  }

  /**
   * 切换语言
   */
  public async setLanguage(language: Language): Promise<void> {
    if (!this.isValidLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const config = vscode.workspace.getConfiguration('knowledgeGraph');
    await config.update('language', language, vscode.ConfigurationTarget.Global);

    // 配置更新后会触发监听器，自动切换
  }

  /**
   * 获取可用的语言列表
   */
  public getAvailableLanguages(): Array<{ code: Language; label: string }> {
    return [
      { code: 'zh', label: '中文 (Chinese)' },
      { code: 'en', label: 'English' },
    ];
  }

  /**
   * 获取当前语言的 locale 代码（用于日期格式化等）
   */
  public getLocaleCode(): string {
    return this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
  }
}

/**
 * 快捷函数：获取当前语言
 */
export function t(): LanguagePack {
  return I18nService.getInstance().getCurrentLocale();
}

/**
 * 快捷函数：获取当前语言代码
 */
export function currentLang(): Language {
  return I18nService.getInstance().getCurrentLanguage();
}

/**
 * 快捷函数：获取当前 locale 代码（用于日期格式化）
 */
export function getLocale(): string {
  return I18nService.getInstance().getLocaleCode();
}
