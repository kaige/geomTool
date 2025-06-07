import React from 'react';
import { observer } from 'mobx-react';
import {
  Pivot,
  PivotItem,
  Stack,
  Text,
  DefaultButton,
  IconButton,
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

  return (
    <div style={{ backgroundColor: '#faf9f8', borderBottom: '1px solid #e1dfdd' }}>
      <Pivot
        styles={{
          root: {
            padding: '0 20px',
          },
        }}
      >
        {/* 创建 Tab */}
        <PivotItem headerText="创建" key="create">
          <Stack 
            horizontal 
            tokens={{ childrenGap: 15 }} 
            styles={{ 
              root: { 
                padding: '15px 0',
                alignItems: 'center'
              } 
            }}
          >
            <DefaultButton 
              text="球体" 
              onClick={() => addShape('sphere')}
              styles={{ root: { minWidth: 80 } }}
            />
            <DefaultButton 
              text="立方体" 
              onClick={() => addShape('cube')}
              styles={{ root: { minWidth: 80 } }}
            />
            <DefaultButton 
              text="圆柱体" 
              onClick={() => addShape('cylinder')}
              styles={{ root: { minWidth: 80 } }}
            />
            <DefaultButton 
              text="圆锥体" 
              onClick={() => addShape('cone')}
              styles={{ root: { minWidth: 80 } }}
            />
            <DefaultButton 
              text="圆环体" 
              onClick={() => addShape('torus')}
              styles={{ root: { minWidth: 80 } }}
            />
          </Stack>
        </PivotItem>

        {/* 管理 Tab */}
        <PivotItem headerText="管理" key="manage">
          <Stack 
            horizontal 
            tokens={{ childrenGap: 15 }} 
            styles={{ 
              root: { 
                padding: '15px 0',
                alignItems: 'center'
              } 
            }}
          >
            <IconButton
              iconProps={{ iconName: 'Delete' }}
              text="删除选中"
              onClick={deleteSelected}
              disabled={!geometryStore.selectedShapeId}
              styles={{ root: { minWidth: 100 } }}
            />
            <IconButton
              iconProps={{ iconName: 'ClearFormatting' }}
              text="清空全部"
              onClick={clearAll}
              disabled={geometryStore.shapes.length === 0}
              styles={{ root: { minWidth: 100 } }}
            />
            <Text styles={{ root: { marginLeft: 20, color: '#666' } }}>
              图形数量: {geometryStore.shapes.length}
            </Text>
          </Stack>
        </PivotItem>
      </Pivot>
    </div>
  );
}); 