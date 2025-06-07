import React from 'react';
import { observer } from 'mobx-react';
import {
  Stack,
  Text,
  TextField,
  Slider,
  Toggle,
  Separator,
  Panel,
  PanelType,
} from '@fluentui/react';
import { geometryStore } from '../stores/GeometryStore';

interface PropertyPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = observer(({ isOpen, onDismiss }) => {
  const selectedShape = geometryStore.selectedShape;

  if (!selectedShape) {
    return (
      <Panel
        isOpen={isOpen}
        onDismiss={onDismiss}
        type={PanelType.medium}
        headerText="属性面板"
        closeButtonAriaLabel="关闭"
      >
        <Text>请选择一个图形来编辑其属性</Text>
      </Panel>
    );
  }

  const updateProperty = (property: string, value: any) => {
    geometryStore.updateShape(selectedShape.id, { [property]: value });
  };

  const updatePosition = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...selectedShape.position, [axis]: value };
    geometryStore.updateShape(selectedShape.id, { position: newPosition });
  };

  const updateRotation = (axis: 'x' | 'y' | 'z', value: number) => {
    const newRotation = { ...selectedShape.rotation, [axis]: value };
    geometryStore.updateShape(selectedShape.id, { rotation: newRotation });
  };

  const updateScale = (axis: 'x' | 'y' | 'z', value: number) => {
    const newScale = { ...selectedShape.scale, [axis]: value };
    geometryStore.updateShape(selectedShape.id, { scale: newScale });
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.medium}
      headerText={`属性面板 - ${selectedShape.type}`}
      closeButtonAriaLabel="关闭"
    >
      <Stack tokens={{ childrenGap: 20 }} styles={{ root: { padding: 20 } }}>
        {/* 基本信息 */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
            基本信息
          </Text>
          <Text>ID: {selectedShape.id}</Text>
          <Text>类型: {selectedShape.type}</Text>
          <Toggle
            label="可见性"
            checked={selectedShape.visible}
            onChange={(_, checked) => updateProperty('visible', checked)}
          />
        </Stack>

        <Separator />

        {/* 颜色 */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            颜色
          </Text>
          <input
            type="color"
            value={selectedShape.color}
            onChange={(e) => updateProperty('color', e.target.value)}
            style={{ width: 50, height: 30, border: 'none', cursor: 'pointer' }}
          />
        </Stack>

        <Separator />

        {/* 位置 */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            位置
          </Text>
          <Stack horizontal tokens={{ childrenGap: 10 }}>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>X</Text>
              <Slider
                min={-10}
                max={10}
                step={0.1}
                value={selectedShape.position.x}
                onChange={(value) => updatePosition('x', value)}
              />
              <TextField
                value={selectedShape.position.x.toFixed(1)}
                onChange={(_, value) => updatePosition('x', parseFloat(value || '0'))}
                styles={{ root: { marginTop: 5 } }}
              />
            </Stack>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>Y</Text>
              <Slider
                min={-10}
                max={10}
                step={0.1}
                value={selectedShape.position.y}
                onChange={(value) => updatePosition('y', value)}
              />
              <TextField
                value={selectedShape.position.y.toFixed(1)}
                onChange={(_, value) => updatePosition('y', parseFloat(value || '0'))}
                styles={{ root: { marginTop: 5 } }}
              />
            </Stack>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>Z</Text>
              <Slider
                min={-10}
                max={10}
                step={0.1}
                value={selectedShape.position.z}
                onChange={(value) => updatePosition('z', value)}
              />
              <TextField
                value={selectedShape.position.z.toFixed(1)}
                onChange={(_, value) => updatePosition('z', parseFloat(value || '0'))}
                styles={{ root: { marginTop: 5 } }}
              />
            </Stack>
          </Stack>
        </Stack>

        <Separator />

        {/* 旋转 */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            旋转 (弧度)
          </Text>
          <Stack horizontal tokens={{ childrenGap: 10 }}>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>X</Text>
              <Slider
                min={-Math.PI}
                max={Math.PI}
                step={0.1}
                value={selectedShape.rotation.x}
                onChange={(value) => updateRotation('x', value)}
              />
            </Stack>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>Y</Text>
              <Slider
                min={-Math.PI}
                max={Math.PI}
                step={0.1}
                value={selectedShape.rotation.y}
                onChange={(value) => updateRotation('y', value)}
              />
            </Stack>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>Z</Text>
              <Slider
                min={-Math.PI}
                max={Math.PI}
                step={0.1}
                value={selectedShape.rotation.z}
                onChange={(value) => updateRotation('z', value)}
              />
            </Stack>
          </Stack>
        </Stack>

        <Separator />

        {/* 缩放 */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
            缩放
          </Text>
          <Stack horizontal tokens={{ childrenGap: 10 }}>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>X</Text>
              <Slider
                min={0.1}
                max={5}
                step={0.1}
                value={selectedShape.scale.x}
                onChange={(value) => updateScale('x', value)}
              />
            </Stack>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>Y</Text>
              <Slider
                min={0.1}
                max={5}
                step={0.1}
                value={selectedShape.scale.y}
                onChange={(value) => updateScale('y', value)}
              />
            </Stack>
            <Stack styles={{ root: { flex: 1 } }}>
              <Text>Z</Text>
              <Slider
                min={0.1}
                max={5}
                step={0.1}
                value={selectedShape.scale.z}
                onChange={(value) => updateScale('z', value)}
              />
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Panel>
  );
}); 