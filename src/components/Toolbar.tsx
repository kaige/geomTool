import React from 'react';
import { observer } from 'mobx-react';
import {
  CommandBar,
  ICommandBarItemProps,
  Stack,
  Text,
  DefaultButton,
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

  const commandBarItems: ICommandBarItemProps[] = [
    {
      key: 'addShapes',
      text: '添加图形',
      iconProps: { iconName: 'Add' },
      subMenuProps: {
        items: [
          {
            key: 'sphere',
            text: '球体',
            iconProps: { iconName: 'CircleRing' },
            onClick: () => addShape('sphere'),
          },
          {
            key: 'cube',
            text: '立方体',
            iconProps: { iconName: 'Stop' },
            onClick: () => addShape('cube'),
          },
          {
            key: 'cylinder',
            text: '圆柱体',
            iconProps: { iconName: 'RingerSolid' },
            onClick: () => addShape('cylinder'),
          },
          {
            key: 'cone',
            text: '圆锥体',
            iconProps: { iconName: 'TriangleUp12' },
            onClick: () => addShape('cone'),
          },
          {
            key: 'torus',
            text: '圆环体',
            iconProps: { iconName: 'RingerOff' },
            onClick: () => addShape('torus'),
          },
        ],
      },
    },
    {
      key: 'delete',
      text: '删除选中',
      iconProps: { iconName: 'Delete' },
      onClick: deleteSelected,
      disabled: !geometryStore.selectedShapeId,
    },
    {
      key: 'clear',
      text: '清空全部',
      iconProps: { iconName: 'ClearFormatting' },
      onClick: clearAll,
      disabled: geometryStore.shapes.length === 0,
    },
  ];

  const farItems: ICommandBarItemProps[] = [
    {
      key: 'info',
      text: `图形数量: ${geometryStore.shapes.length}`,
    },
  ];

  return (
    <Stack>
      <CommandBar
        items={commandBarItems}
        farItems={farItems}
        styles={{
          root: {
            padding: '0 20px',
            backgroundColor: '#faf9f8',
            borderBottom: '1px solid #e1dfdd',
          },
        }}
      />
      
      <Stack horizontal tokens={{ childrenGap: 10 }} styles={{ root: { padding: 10 } }}>
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          快速添加：
        </Text>
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
    </Stack>
  );
}); 