import i18n from '../i18n';

export type Language = 'zh' | 'en';

export interface Translations {
  create: string;
  manage: string;
  sphere: string;
  cube: string;
  cylinder: string;
  cone: string;
  torus: string;
  deleteSelected: string;
  clearAll: string;
  shapeList: string;
  noShapes: string;
  type: string;
  actions: string;
  hide: string;
  show: string;
  delete: string;
  totalShapes: string;
  selectedShape: string;
  unknown: string;
  language: string;
  chinese: string;
  english: string;
  appName: string;
  version: string;
}

class LanguageService {
  private translations: Record<Language, Translations | null> = {
    zh: null,
    en: null,
  };

  // 检测浏览器语言
  private detectBrowserLanguage(): Language {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
    return 'en'; // 默认英文
  }

  // 获取初始语言（从localStorage或浏览器检测）
  getInitialLanguage(): Language {
    const savedLang = localStorage.getItem('app-language') as Language;
    if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
      return savedLang;
    }
    return this.detectBrowserLanguage();
  }

  // 保存语言选择到localStorage
  saveLanguage(language: Language): void {
    localStorage.setItem('app-language', language);
  }

  // 根据环境设置基础路径
  private basePath = process.env.NODE_ENV === 'production' ? '/geomTool/locales' : '/locales';

  // 加载指定语言的翻译文件
  async loadTranslations(language: Language): Promise<Translations> {
    // 如果已经加载过，直接返回
    if (this.translations[language]) {
      return this.translations[language]!;
    }

    try {
      const response = await fetch(`${this.basePath}/${language}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${language} translations`);
      }
      
      const translations = await response.json() as Translations;
      this.translations[language] = translations;
      
      return translations;
    } catch (error) {
      console.error(`Error loading translations for ${language}:`, error);
      
      // 如果加载失败，使用fallback翻译（英文）
      if (language !== 'en') {
        return this.loadTranslations('en');
      }
      
      // 如果英文也加载失败，返回默认翻译
      return this.getFallbackTranslations();
    }
  }

  // 获取默认的fallback翻译
  private getFallbackTranslations(): Translations {
    return {
      create: 'Create',
      manage: 'Manage',
      sphere: 'Sphere',
      cube: 'Cube',
      cylinder: 'Cylinder',
      cone: 'Cone',
      torus: 'Torus',
      deleteSelected: 'Delete Selected',
      clearAll: 'Clear All',
      shapeList: 'Shape List',
      noShapes: 'No shapes available. Please add some shapes to get started.',
      type: 'Type',
      actions: 'Actions',
      hide: 'Hide',
      show: 'Show',
      delete: 'Delete',
      totalShapes: 'Total Shapes',
      selectedShape: 'Selected',
      unknown: 'Unknown',
      language: 'Language',
      chinese: '中文',
      english: 'English',
      appName: 'GeomTool',
      version: 'v1.0',
    };
  }

  // 清理缓存（可选）
  clearCache(): void {
    this.translations = { zh: null, en: null };
  }
}

export const languageService = new LanguageService(); 