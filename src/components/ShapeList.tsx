import React from 'react';
import { observer } from 'mobx-react';
import {
  Stack,
  Text,
  DetailsList,
  IColumn,
  SelectionMode,
  IconButton,
  IIconProps,
} from '@fluentui/react';
import { geometryStore } from '../stores/GeometryStore';

const deleteIcon: IIconProps = { iconName: 'Delete' };
const eyeIcon: IIconProps = { iconName: 'View' };
const eyeOffIcon: IIconProps = { iconName: 'Hide' };

export const ShapeList: React.FC = observer(() => {
  const columns: IColumn[] = [
    {
      key: 'type',
      name: '类型',
      fieldName: 'type',
      minWidth: 80,
      maxWidth: 120,
      onRender: (item) => {
        const typeNames = {
          sphere: '球体',
          cube: '立方体',
          cylinder: '圆柱体',
          cone: '圆锥体',
          torus: '圆环体',
        };
        return <Text>{typeNames[item.type as keyof typeof typeNames] || item.type}</Text>;
      },
    },
    {
      key: 'id',
      name: 'ID',
      fieldName: 'id',
      minWidth: 100,
      maxWidth: 150,
      onRender: (item) => <Text>{item.id.substring(0, 8)}...</Text>,
    },
    {
      key: 'position',
      name: '位置',
      fieldName: 'position',
      minWidth: 120,
      maxWidth: 180,
      onRender: (item) => (
        <Text>
          ({item.position.x.toFixed(1)}, {item.position.y.toFixed(1)}, {item.position.z.toFixed(1)})
        </Text>
      ),
    },
    {
      key: 'color',
      name: '颜色',
      fieldName: 'color',
      minWidth: 60,
      maxWidth: 80,
      onRender: (item) => (
        <div
          style={{
            width: 20,
            height: 20,
            backgroundColor: item.color,
            border: '1px solid #ccc',
            borderRadius: 3,
          }}
        />
      ),
    },
    {
      key: 'actions',
      name: '操作',
      minWidth: 100,
      maxWidth: 120,
      onRender: (item) => (
        <Stack horizontal tokens={{ childrenGap: 5 }}>
          <IconButton
            iconProps={item.visible ? eyeIcon : eyeOffIcon}
            title={item.visible ? "隐藏" : "显示"}
            onClick={() => geometryStore.updateShape(item.id, { visible: !item.visible })}
          />
          <IconButton
            iconProps={deleteIcon}
            title="删除"
            onClick={() => geometryStore.removeShape(item.id)}
          />
        </Stack>
      ),
    },
  ];

  const onItemClick = (item: any) => {
    if (geometryStore.selectedShapeId === item.id) {
      geometryStore.selectShape(null);
    } else {
      geometryStore.selectShape(item.id);
    }
  };

  return (
    <Stack styles={{ root: { height: '100%', overflow: 'hidden' } }}>
      <Stack
        styles={{
          root: {
            padding: '10px 20px',
            backgroundColor: '#faf9f8',
            borderBottom: '1px solid #e1dfdd',
          },
        }}
      >
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          图形列表 ({geometryStore.shapes.length})
        </Text>
      </Stack>
      
      <Stack styles={{ root: { flex: 1, overflow: 'auto' } }}>
        {geometryStore.shapes.length === 0 ? (
          <Stack
            styles={{
              root: {
                padding: 20,
                textAlign: 'center',
                color: '#666',
              },
            }}
          >
            <Text>暂无图形，请添加一些图形开始使用</Text>
          </Stack>
        ) : (
          <DetailsList
            items={geometryStore.shapes}
            columns={columns}
            setKey="set"
            selectionMode={SelectionMode.single}
            onItemInvoked={onItemClick}
            styles={{
              root: {
                '& .ms-DetailsRow': {
                  cursor: 'pointer',
                },
                '& .ms-DetailsRow:hover': {
                  backgroundColor: '#f3f2f1',
                },
                '& .ms-DetailsRow.is-selected': {
                  backgroundColor: '#deecf9',
                },
              },
            }}
            getKey={(item) => item.id}
          />
        )}
      </Stack>
    </Stack>
  );
}); 