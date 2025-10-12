import { makeObservable, observable, action, runInAction } from 'mobx';
import { Language, Translations, languageService } from '../services/LanguageService';

class LanguageStore {
  currentLanguage: Language = 'zh';
  translations: Translations | null = null;
  isLoading: boolean = false;

  constructor() {
    makeObservable(this, {
      currentLanguage: observable,
      translations: observable,
      isLoading: observable,
      setLanguage: action,
    });
    
    this.initialize();
  }

  private async initialize() {
    const initialLanguage = languageService.getInitialLanguage();
    await this.setLanguage(initialLanguage);
  }

  async setLanguage(language: Language) {
    if (this.currentLanguage === language && this.translations) {
      return; // 已经是当前语言且已加载
    }

    this.setLoading(true);
    
    try {
      const translations = await languageService.loadTranslations(language);
      
      runInAction(() => {
        this.currentLanguage = language;
        this.translations = translations;
        this.isLoading = false;
      });
      
      // 保存用户选择
      languageService.saveLanguage(language);
    } catch (error) {
      console.error('Failed to load language:', error);
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  get t(): Translations {
    return this.translations || {
      // 提供默认值，避免渲染错误
      create: 'Create',
      manage: 'Manage',
      sphere: 'Sphere',
      cube: 'Cube',
      cylinder: 'Cylinder',
      cone: 'Cone',
      torus: 'Torus',
      lineSegment: 'Line Segment',
      circularArc: 'Circular Arc',
      deleteSelected: 'Delete Selected',
      clearAll: 'Clear All',
      shapeList: 'Shape List',
      noShapes: 'No shapes available.',
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
}

export const languageStore = new LanguageStore();
export type { Language, Translations }; 