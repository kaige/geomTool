import React from 'react';
import { observer } from 'mobx-react';
import {
  Dropdown,
  IDropdownOption,
  Stack,
  Icon,
} from '@fluentui/react';
import { languageStore } from '../stores/LanguageStore';
import { Language } from '../services/LanguageService';

export const LanguageSelector: React.FC = observer(() => {
  const languageOptions: IDropdownOption[] = [
    { key: 'zh', text: languageStore.t.chinese },
    { key: 'en', text: languageStore.t.english },
  ];

  const onLanguageChange = (_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
    if (option) {
      languageStore.setLanguage(option.key as Language);
    }
  };

  // 根据当前语言显示不同的文字
  const getDisplayText = () => {
    return languageStore.currentLanguage === 'zh' ? '中' : 'En';
  };

  return (
    <div style={{ 
      outline: 'none !important' as any,
      border: 'none !important' as any,
    }}>
      <style>
        {`
          .language-selector .ms-Dropdown:focus .ms-Dropdown-title,
          .language-selector .ms-Dropdown:focus-visible .ms-Dropdown-title,
          .language-selector .ms-Dropdown .ms-Dropdown-title:focus,
          .language-selector .ms-Dropdown .ms-Dropdown-title:focus-visible {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
        `}
      </style>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 1 }} className="language-selector">
        <Icon 
          iconName="Globe" 
          styles={{
            root: {
              fontSize: '17px',
              color: '#666',
            }
          }}
        />
        <Dropdown
        selectedKey={languageStore.currentLanguage}
        options={languageOptions}
        onChange={onLanguageChange}
        styles={{
          root: {
            minWidth: '28px',
            width: '28px',
            outline: 'none !important',
            border: 'none !important',
            ':focus': {
              outline: 'none !important',
              border: 'none !important',
            },
            ':focus-within': {
              outline: 'none !important',
              border: 'none !important',
            },
          },
          dropdown: {
            minWidth: '28px',
            width: '28px',
            height: '26px',
            outline: 'none !important',
            border: 'none !important',
            boxShadow: 'none !important',
            ':focus': {
              outline: 'none !important',
              border: 'none !important',
              boxShadow: 'none !important',
            },
            ':focus-visible': {
              outline: 'none !important',
              border: 'none !important',
              boxShadow: 'none !important',
            },
            ':after': {
              display: 'none !important',
            },
          },
          title: {
            fontSize: '13px',
            fontWeight: '500',
            height: '26px',
            lineHeight: '24px',
            border: 'none !important',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            textAlign: 'center',
            padding: '0 2px',
            minWidth: '28px',
            width: '28px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none !important',
            boxShadow: 'none !important',
            ':hover': {
              backgroundColor: '#f3f2f1',
              border: 'none !important',
              outline: 'none !important',
            },
            ':active': {
              backgroundColor: '#edebe9',
              border: 'none !important',
              outline: 'none !important',
            },
            ':focus': {
              border: 'none !important',
              outline: 'none !important',
              backgroundColor: 'transparent',
              boxShadow: 'none !important',
            },
            ':focus-visible': {
              border: 'none !important',
              outline: 'none !important',
              boxShadow: 'none !important',
            },
            ':focus:after': {
              display: 'none !important',
            },
            ':after': {
              display: 'none !important',
            },
          },
          caretDownWrapper: {
            display: 'none', // 隐藏下拉箭头
          },
          caretDown: {
            display: 'none', // 确保箭头完全隐藏
          },
          callout: {
            fontSize: '12px',
            minWidth: '80px',
          },
          dropdownItem: {
            fontSize: '12px',
            height: '32px',
          },
          dropdownItemSelected: {
            backgroundColor: '#e3f2fd',
            color: '#1565c0',
          },
        }}
        // 自定义渲染标题，显示简化的语言标识
        onRenderTitle={() => (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: '14px',
            fontWeight: '400',
            fontFamily: '"Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
          }}>
            {getDisplayText()}
          </div>
        )}
        />
      </Stack>
    </div>
  );
}); 