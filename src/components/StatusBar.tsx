import React from 'react';
import { observer } from 'mobx-react';
import { Stack, Text } from '@fluentui/react';
import { geometryStore } from '../stores/GeometryStore';
import { languageStore } from '../stores/LanguageStore';

export const StatusBar: React.FC = observer(() => {
  return (
    <div className="status-bar" style={{
      height: '32px',
      backgroundColor: '#f3f2f1',
      borderTop: '1px solid #e1dfdd',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      fontSize: '12px',
      color: '#666'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* 左侧：版本信息 */}
        <div>
          <Text styles={{ root: { fontSize: '12px', color: '#666' } }}>
            {languageStore.t.appName} {languageStore.t.version}
          </Text>
        </div>

        {/* 中间：选中状态 */}
        <div style={{ marginLeft: 'auto', marginRight: 'auto' }}>
          {geometryStore.selectedShapeId && (
            <Stack horizontal tokens={{ childrenGap: 6 }}>
              <Text styles={{ root: { fontSize: '12px', color: '#666' } }}>
                {languageStore.t.selectedShape}:
              </Text>
              <Text styles={{ root: { fontSize: '12px', fontWeight: 600, color: '#0078d4' } }}>
                {geometryStore.selectedShape ? 
                  (languageStore.t as any)[geometryStore.selectedShape.type] || geometryStore.selectedShape.type : 
                  languageStore.t.unknown
                }
              </Text>
            </Stack>
          )}
        </div>
        
        {/* 右侧：图形数量 */}
        <div style={{ marginLeft: 'auto' }}>
          <Stack horizontal tokens={{ childrenGap: 6 }}>
            <Text styles={{ root: { fontSize: '12px', color: '#666' } }}>
              {languageStore.t.totalShapes}:
            </Text>
            <Text styles={{ root: { fontSize: '12px', fontWeight: 600, color: '#0078d4' } }}>
              {geometryStore.shapes.length}
            </Text>
          </Stack>
        </div>
      </div>
    </div>
  );
}); 