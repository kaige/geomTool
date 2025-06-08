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
import { languageStore } from '../stores/LanguageStore';

const deleteIcon: IIconProps = { iconName: 'Delete' };
const eyeIcon: IIconProps = { iconName: 'View' };
const eyeOffIcon: IIconProps = { iconName: 'Hide' };

export const ShapeList: React.FC = observer(() => {
  // 处理列表项点击
  const onItemClick = (item: any) => {
    if (geometryStore.selectedShapeId === item.id) {
      geometryStore.selectShape(null);
    } else {
      geometryStore.selectShape(item.id);
    }
  };

  const columns: IColumn[] = [
    {
      key: 'type',
      name: languageStore.t.type,
      fieldName: 'type',
      minWidth: 60,
      maxWidth: 80,
      onRender: (item) => {
        const typeNames = {
          sphere: languageStore.t.sphere,
          cube: languageStore.t.cube,
          cylinder: languageStore.t.cylinder,
          cone: languageStore.t.cone,
          torus: languageStore.t.torus,
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
      name: languageStore.t.actions,
      minWidth: 80,
      maxWidth: 100,
      onRender: (item) => (
        <Stack horizontal tokens={{ childrenGap: 3 }}>
          <IconButton
            iconProps={item.visible ? eyeIcon : eyeOffIcon}
            title={item.visible ? languageStore.t.hide : languageStore.t.show}
            onClick={() => geometryStore.updateShape(item.id, { visible: !item.visible })}
            styles={{ root: { width: 28, height: 28 } }}
          />
          <IconButton
            iconProps={deleteIcon}
            title={languageStore.t.delete}
            onClick={() => geometryStore.removeShape(item.id)}
            styles={{ root: { width: 28, height: 28 } }}
          />
        </Stack>
      ),
    },
  ];

  // onItemClick 逻辑现在由 Selection 对象的 onSelectionChanged 处理

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
          {languageStore.t.shapeList} ({geometryStore.shapes.length})
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
            <Text>{languageStore.t.noShapes}</Text>
          </Stack>
        ) : (
          <DetailsList
            items={geometryStore.shapes}
            columns={columns}
            setKey={`list-${geometryStore.selectedShapeId || 'none'}`}
            selectionMode={SelectionMode.none}
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
              },
            }}
                         onRenderRow={(props, defaultRender) => {
               if (!props || !defaultRender) return null;
               const isSelected = props.item.id === geometryStore.selectedShapeId;
               
               const customProps = {
                 ...props,
                 styles: {
                   root: {
                     backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                     border: isSelected ? '1px solid #1976d2' : '1px solid transparent',
                     borderRadius: '4px',
                     margin: '1px 4px',
                     padding: '0px',
                     transition: 'all 0.2s ease',
                     ':hover': {
                       backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                     },
                   },
                   cell: {
                     color: isSelected ? '#1565c0' : 'inherit',
                     fontWeight: isSelected ? '600' : 'normal',
                   },
                 },
               };
               
               return defaultRender(customProps);
             }}
            getKey={(item) => item.id}
          />
        )}
      </Stack>
    </Stack>
  );
}); 