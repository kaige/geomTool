import React from 'react';
import { observer } from 'mobx-react';
import {
  Pivot,
  PivotItem,
  Stack,
  Text,
  CommandBarButton,
} from '@fluentui/react';
import { geometryStore, GeometryShape } from '../stores/GeometryStore';

export const Toolbar: React.FC = observer(() => {
  const addShape = (type: GeometryShape['type']) => {
    geometryStore.addShape(type);
  };

  const clearAll = () => {
    geometryStore.clearShapes();
  };

  const deleteSelected = () => {
    if (geometryStore.selectedShapeId) {
      geometryStore.removeShape(geometryStore.selectedShapeId);
    }
  };

  const ribbonButtonStyle = {
    root: {
      height: 72,
      minWidth: 84,
      flexDirection: 'column' as const,
      border: '1px solid transparent',
      borderRadius: '4px',
      margin: '4px 2px',
      padding: '8px 6px',
      '&:hover': {
        border: '1px solid #c7e0f4',
        backgroundColor: '#f3f2f1',
      },
      '&:active': {
        backgroundColor: '#edebe9',
      },
    },
    label: {
      fontSize: '11px',
      fontWeight: '400',
      marginTop: '4px',
      textAlign: 'center' as const,
    },
    icon: {
      fontSize: '20px',
      height: '32px',
      width: '32px',
    },
  };



  return (
    <div style={{ 
      backgroundColor: '#faf9f8', 
      borderBottom: '2px solid #e1dfdd',
      minHeight: '110px'
    }}>
      <Pivot
        styles={{
          root: {
            padding: '0 16px',
          },
          itemContainer: {
            padding: '8px 0',
            minHeight: '80px',
          },
        }}
      >
        {/* 创建 Tab */}
        <PivotItem headerText="创建" key="create">
          <div style={{ backgroundColor: '#ffffff', padding: '8px 0', borderTop: '1px solid #e1dfdd' }}>
            <Stack horizontal styles={{ root: { alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px' } }}>
              <Stack horizontal tokens={{ childrenGap: 4 }}>
                <CommandBarButton
                  iconProps={{ iconName: 'CircleRing' }}
                  text="球体"
                  onClick={() => addShape('sphere')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  iconProps={{ iconName: 'Stop' }}
                  text="立方体"
                  onClick={() => addShape('cube')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  iconProps={{ iconName: 'RingerSolid' }}
                  text="圆柱体"
                  onClick={() => addShape('cylinder')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  iconProps={{ iconName: 'TriangleUp12' }}
                  text="圆锥体"
                  onClick={() => addShape('cone')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  iconProps={{ iconName: 'RingerOff' }}
                  text="圆环体"
                  onClick={() => addShape('torus')}
                  styles={ribbonButtonStyle}
                />
              </Stack>
            </Stack>
          </div>
        </PivotItem>

        {/* 管理 Tab */}
        <PivotItem headerText="管理" key="manage">
          <div style={{ backgroundColor: '#ffffff', padding: '8px 0', borderTop: '1px solid #e1dfdd' }}>
            <Stack horizontal styles={{ root: { alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px' } }}>
              <Stack horizontal tokens={{ childrenGap: 4 }}>
                <CommandBarButton
                  iconProps={{ iconName: 'Delete' }}
                  text="删除选中"
                  onClick={deleteSelected}
                  disabled={!geometryStore.selectedShapeId}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  iconProps={{ iconName: 'ClearFormatting' }}
                  text="清空全部"
                  onClick={clearAll}
                  disabled={geometryStore.shapes.length === 0}
                  styles={ribbonButtonStyle}
                />
              </Stack>
            </Stack>
          </div>
        </PivotItem>
      </Pivot>
    </div>
  );
}); 