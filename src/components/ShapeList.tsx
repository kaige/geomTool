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
      minWidth: 60,
      maxWidth: 80,
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
      minWidth: 40,
      maxWidth: 60,
      onRender: (item) => <Text>{item.id}</Text>,
    },
    {
      key: 'actions',
      name: '操作',
      minWidth: 80,
      maxWidth: 100,
      onRender: (item) => (
        <Stack horizontal tokens={{ childrenGap: 3 }}>
          <IconButton
            iconProps={item.visible ? eyeIcon : eyeOffIcon}
            title={item.visible ? "隐藏" : "显示"}
            onClick={() => geometryStore.updateShape(item.id, { visible: !item.visible })}
            styles={{ root: { width: 28, height: 28 } }}
          />
          <IconButton
            iconProps={deleteIcon}
            title="删除"
            onClick={() => geometryStore.removeShape(item.id)}
            styles={{ root: { width: 28, height: 28 } }}
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
            padding: '10px 10px',
            backgroundColor: '#faf9f8',
            borderBottom: '1px solid #e1dfdd',
          },
        }}
      >
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          图形列表 ({geometryStore.shapes.length})
        </Text>
      </Stack>
      
      <Stack styles={{ root: { flex: 1, overflow: 'hidden' } }}>
        {geometryStore.shapes.length === 0 ? (
          <Stack
            styles={{
              root: {
                padding: 10,
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
                overflow: 'visible',
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