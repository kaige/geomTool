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
      height: 66,
      minWidth: 60,
      border: '1px solid transparent',
      borderRadius: '4px',
      margin: '2px 1px',
      padding: '8px 4px 2px 4px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      '&:hover': {
        border: '1px solid #c7e0f4',
        backgroundColor: '#f3f2f1',
      },
      '&:active': {
        backgroundColor: '#edebe9',
      },
      '& .ms-Button-flexContainer': {
        flexDirection: 'column' as const,
        alignItems: 'center',
      },
    },
    label: {
      fontSize: '12px',
      fontWeight: '400',
      marginTop: '-1px',
      marginBottom: '0px',
      textAlign: 'center' as const,
      lineHeight: '12px',
      whiteSpace: 'nowrap' as const,
      marginLeft: '1px !important' as const,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
    icon: {
      fontSize: '27px',
      height: '36px',
      width: '36px',
      marginRight: '0 !important' as const,
      marginTop: '2px',
      marginBottom: '1px',
    },
  };



  return (
    <div style={{ 
      backgroundColor: '#faf9f8', 
      borderBottom: '2px solid #e1dfdd',
      minHeight: '100px'
    }}>
      <Pivot
        styles={{
          root: {
            padding: '0 16px',
            paddingLeft: '35%',
          },
          itemContainer: {
            padding: '6px 0',
            minHeight: '74px',
          },
        }}
      >
        {/* 创建 Tab */}
        <PivotItem headerText="创建" key="create">
          <div style={{ backgroundColor: '#ffffff', padding: '8px 0', borderTop: '1px solid #e1dfdd' }}>
            <Stack horizontal styles={{ root: { alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', paddingLeft: '25%' } }}>
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
            <Stack horizontal styles={{ root: { alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', paddingLeft: '25%' } }}>
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