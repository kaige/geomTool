import React from 'react';
import { observer } from 'mobx-react';
import {
  Pivot,
  PivotItem,
  Stack,
  CommandBarButton,
} from '@fluentui/react';
import { geometryStore } from '../stores/GeometryStore';
import { GeometryShape } from '../types/GeometryTypes';
import { languageStore } from '../stores/LanguageStore';
import { LanguageSelector } from './LanguageSelector';
import { CustomIcon } from './CustomIcon';

export const Toolbar: React.FC = observer(() => {
  const addShape = (type: GeometryShape['type']) => {
    // 对于3D形状，使用原有的addShape方法
    if (['sphere', 'cube', 'cylinder', 'cone', 'torus'].includes(type)) {
      geometryStore.addShape(type as 'sphere' | 'cube' | 'cylinder' | 'cone' | 'torus');
    }
    // 对于平面形状，使用新的方法
    else if (type === 'lineSegment') {
      geometryStore.addLineSegment(
        { x: -1, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 }
      );
    }
    else if (type === 'rectangle') {
      geometryStore.addRectangle([
        { x: -0.5, y: -0.5, z: 0 },
        { x: 0.5, y: -0.5, z: 0 },
        { x: 0.5, y: 0.5, z: 0 },
        { x: -0.5, y: 0.5, z: 0 }
      ]);
    }
    else if (type === 'circle') {
      geometryStore.addCircle({ x: 0, y: 0, z: 0 }, 1);
    }
    else if (type === 'triangle') {
      geometryStore.addTriangle([
        { x: 0, y: 0.5, z: 0 },
        { x: -0.5, y: -0.5, z: 0 },
        { x: 0.5, y: -0.5, z: 0 }
      ]);
    }
    else if (type === 'polygon') {
      // 创建一个正六边形
      const positions = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        positions.push({
          x: Math.cos(angle) * 0.5,
          y: Math.sin(angle) * 0.5,
          z: 0
        });
      }
      geometryStore.addPolygon(positions);
    }
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
      height: 60,
      minWidth: 60,
      border: '1px solid transparent',
      borderRadius: '4px',
      margin: '0px 1px',
      padding: '0px 4px 0px 4px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      color: '#0078d4',
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
      marginTop: '4px',
      marginBottom: '0px',
      textAlign: 'center' as const,
      lineHeight: '12px',
      whiteSpace: 'nowrap' as const,
      marginLeft: '1px !important' as const,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      color: '#323130',
    },
    icon: {
      fontSize: '36px',
      height: '42px',
      width: '42px',
      marginRight: '0 !important' as const,
      marginTop: '2px',
      marginBottom: '2px',
    },
    rootDisabled: {
      color: '#a19f9d !important',
      border: 'none !important',
      backgroundColor: 'transparent !important',
      '& .ms-Button-icon': {
        color: '#a19f9d !important',
      },
      '& .ms-Button-flexContainer .ms-Button-icon': {
        color: '#a19f9d !important',
      },
      '& .ms-Button-label': {
        color: '#a19f9d !important',
      },
      '& div': {
        color: '#a19f9d !important',
      },
      '&:hover': {
        border: 'none !important',
        backgroundColor: 'transparent !important',
      },
    },
  };

  return (
    <div style={{ 
      backgroundColor: '#faf9f8', 
      borderBottom: '2px solid #e1dfdd',
      minHeight: '85px',
      position: 'relative'
    }}>
      {/* 语言切换器 - 右上角 */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '16px',
        zIndex: 1000,
      }}>
        <LanguageSelector />
      </div>
      
      <Pivot
        styles={{
          root: {
            padding: '0 16px',
            paddingLeft: '35%',
          },
          itemContainer: {
            padding: '2px 0 0px 0',
            minHeight: '70px',
          },
          link: {
            marginBottom: '0px',
            paddingBottom: '0px',
            padding: '2px 8px 0px 8px',
            lineHeight: '1',
            fontSize: '16px',
            margin: '0px',
          },
          linkIsSelected: {
            marginBottom: '0px',
            paddingBottom: '0px',
            padding: '2px 8px 0px 8px',
            lineHeight: '1',
            fontSize: '16px',
            margin: '0px',
            '&::before': {
              bottom: '-3px',
              height: '2px',
            },
          },
        }}
      >
        {/* 创建 Tab */}
        <PivotItem headerText={languageStore.t.create} key="create">
          <div style={{ backgroundColor: '#ffffff', padding: '8px 0', borderTop: '1px solid #e1dfdd' }}>
            <Stack horizontal styles={{ root: { alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', paddingLeft: '25%' } }}>
              <Stack horizontal tokens={{ childrenGap: 4 }}>
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="sphere" size={36} />}
                  text={languageStore.t.sphere}
                  onClick={() => addShape('sphere')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="cube" size={36} />}
                  text={languageStore.t.cube}
                  onClick={() => addShape('cube')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="cylinder" size={36} />}
                  text={languageStore.t.cylinder}
                  onClick={() => addShape('cylinder')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="cone" size={36} />}
                  text={languageStore.t.cone}
                  onClick={() => addShape('cone')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="torus" size={36} />}
                  text={languageStore.t.torus}
                  onClick={() => addShape('torus')}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="line" size={36} />}
                  text={languageStore.t.lineSegment || "线段"}
                  onClick={() => addShape('lineSegment')}
                  styles={ribbonButtonStyle}
                />
              </Stack>
            </Stack>
          </div>
        </PivotItem>

        {/* 管理 Tab */}
        <PivotItem headerText={languageStore.t.manage} key="manage">
          <div style={{ backgroundColor: '#ffffff', padding: '8px 0', borderTop: '1px solid #e1dfdd' }}>
            <Stack horizontal styles={{ root: { alignItems: 'center', justifyContent: 'flex-start', padding: '0 16px', paddingLeft: '25%' } }}>
              <Stack horizontal tokens={{ childrenGap: 4 }}>
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="delete" size={36} />}
                  text={languageStore.t.deleteSelected}
                  onClick={deleteSelected}
                  disabled={!geometryStore.selectedShapeId}
                  styles={ribbonButtonStyle}
                />
                <CommandBarButton
                  onRenderIcon={() => <CustomIcon name="clear" size={36} />}
                  text={languageStore.t.clearAll}
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