import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import {
  Stack,
  Text,
  initializeIcons,
  ThemeProvider,
  createTheme,
} from '@fluentui/react';
import { Toolbar } from './components/Toolbar';
import { ThreeCanvas } from './components/ThreeCanvas';
import { ShapeList } from './components/ShapeList';
import { StatusBar } from './components/StatusBar';
import { geometryStore } from './stores/GeometryStore';
import './i18n';
import './App.css';

// 初始化图标
initializeIcons();

// 创建主题
const theme = createTheme({
  palette: {
    themePrimary: '#0078d4',
    themeLighterAlt: '#eff6fc',
    themeLighter: '#deecf9',
    themeLight: '#c7e0f4',
    themeTertiary: '#71afe5',
    themeSecondary: '#2b88d8',
    themeDarkAlt: '#106ebe',
    themeDark: '#005a9e',
    themeDarker: '#004578',
  },
});

const App: React.FC = observer(() => {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      const sidebar = document.getElementById('sidebar');
      const toolbar = document.getElementById('toolbar');
      const statusbar = document.querySelector('.status-bar') as HTMLElement;
      
      if (sidebar && toolbar) {
        const sidebarWidth = sidebar.offsetWidth;
        const toolbarHeight = toolbar.offsetHeight;
        const statusbarHeight = statusbar ? statusbar.offsetHeight : 32; // StatusBar默认32px高度
        const newWidth = window.innerWidth - sidebarWidth - 4; // 考虑边框和很小的padding
        const newHeight = window.innerHeight - toolbarHeight - statusbarHeight - 4;
        
        setCanvasSize({
          width: Math.max(400, newWidth),
          height: Math.max(300, newHeight),
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <Stack styles={{ root: { height: '100vh' } }}>
          <div id="toolbar">
            <Toolbar />
          </div>

          <Stack horizontal styles={{ root: { flex: 1, overflow: 'hidden' } }}>
            <div id="sidebar" className="sidebar">
              <ShapeList />
            </div>

            <Stack
              styles={{
                root: {
                  flex: 1,
                  padding: '1px',
                  backgroundColor: '#f5f5f5',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              }}
            >
              <Stack tokens={{ childrenGap: 1 }} horizontalAlign="center">
                <div
                  style={{
                    border: '2px solid #ccc',
                    borderRadius: 8,
                    backgroundColor: 'white',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <ThreeCanvas width={canvasSize.width} height={canvasSize.height} />
                </div>
              </Stack>
            </Stack>
          </Stack>

          <StatusBar />
        </Stack>
      </div>
    </ThemeProvider>
  );
});

export default App; 