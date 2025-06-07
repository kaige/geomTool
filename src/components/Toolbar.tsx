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

  const groupStyle = {
    root: {
      padding: '8px 12px',
      borderRight: '1px solid #e1dfdd',
      marginRight: '8px',
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
          <Stack horizontal styles={{ root: { alignItems: 'flex-start', padding: '4px 0' } }}>
            {/* 基础图形组 */}
            <Stack styles={groupStyle}>
              <Text 
                variant="small" 
                styles={{ 
                  root: { 
                    color: '#666', 
                    marginBottom: '8px', 
                    fontSize: '11px',
                    textAlign: 'center'
                  } 
                }}
              >
                基础图形
              </Text>
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
              </Stack>
            </Stack>

            {/* 高级图形组 */}
            <Stack styles={groupStyle}>
              <Text 
                variant="small" 
                styles={{ 
                  root: { 
                    color: '#666', 
                    marginBottom: '8px', 
                    fontSize: '11px',
                    textAlign: 'center'
                  } 
                }}
              >
                高级图形
              </Text>
              <Stack horizontal tokens={{ childrenGap: 4 }}>
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
          </Stack>
        </PivotItem>

        {/* 管理 Tab */}
        <PivotItem headerText="管理" key="manage">
          <Stack horizontal styles={{ root: { alignItems: 'flex-start', padding: '4px 0' } }}>
            {/* 编辑操作组 */}
            <Stack styles={groupStyle}>
              <Text 
                variant="small" 
                styles={{ 
                  root: { 
                    color: '#666', 
                    marginBottom: '8px', 
                    fontSize: '11px',
                    textAlign: 'center'
                  } 
                }}
              >
                编辑操作
              </Text>
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

            {/* 信息显示组 */}
            <Stack styles={{ root: { padding: '8px 12px', alignItems: 'center', justifyContent: 'center' } }}>
              <Text 
                variant="small" 
                styles={{ 
                  root: { 
                    color: '#666', 
                    marginBottom: '4px', 
                    fontSize: '11px'
                  } 
                }}
              >
                统计信息
              </Text>
              <Stack styles={{ root: { alignItems: 'center' } }}>
                <Text styles={{ root: { fontSize: '18px', fontWeight: 600, color: '#0078d4' } }}>
                  {geometryStore.shapes.length}
                </Text>
                <Text styles={{ root: { fontSize: '10px', color: '#666' } }}>
                  图形数量
                </Text>
              </Stack>
            </Stack>
          </Stack>
        </PivotItem>
      </Pivot>
    </div>
  );
}); 