import { makeAutoObservable, action } from 'mobx';

export interface GeometryShape {
  id: string;
  type: 'sphere' | 'cube' | 'cylinder' | 'cone' | 'torus';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  visible: boolean;
  hasChanged?: boolean;  // 添加变化标记
  hasSelectionChanged?: boolean;  // 添加选中状态变化标记
}

export class GeometryStore {
  shapes: GeometryShape[] = [];
  selectedShapeId: string | null = null;
  private nextId: number = 0; // 自增ID计数器

  constructor() {
    makeAutoObservable(this);
  }

  // 添加图形
  addShape(type: GeometryShape['type']): void {
    // 随机生成一个位置，避免图形重叠
    const randomPos = () => (Math.random() - 0.5) * 4; // -2到2之间的随机数
    
    // 根据形状类型设置不同的默认旋转角度
    let defaultRotation = { x: 0, y: 0, z: 0 };
    if (type === 'cube') {
      // 立方体保持水平，正对相机显示为正方形
      defaultRotation = { x: 1.745, y: 0.055, z: 0.283 };
    }
    
    const newShape: GeometryShape = {
      id: this.nextId.toString(),
      type,
      position: { x: randomPos(), y: 1, z: randomPos() }, // Y设为1，避免与地面重叠
      rotation: defaultRotation,
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
      hasChanged: true  // 新添加的图形标记为已变化
    };
    this.shapes.push(newShape);
    this.nextId++; // 自增ID
  }

  // 删除图形
  removeShape(id: string): void {
    this.shapes = this.shapes.filter(shape => shape.id !== id);
    if (this.selectedShapeId === id) {
      this.selectedShapeId = null;
    }
  }

  // 选择图形
  selectShape(id: string | null): void {
    // 如果之前有选中的物体，将其标记为已变化
    if (this.selectedShapeId) {
      const oldSelectedShape = this.shapes.find(shape => shape.id === this.selectedShapeId);
      if (oldSelectedShape) {
        oldSelectedShape.hasSelectionChanged = true;
      }
    }
    
    // 如果新选中的物体存在，将其标记为已变化
    if (id) {
      const newSelectedShape = this.shapes.find(shape => shape.id === id);
      if (newSelectedShape) {
        newSelectedShape.hasSelectionChanged = true;
      }
    }
    
    this.selectedShapeId = id;
  }

  // 更新图形属性
  updateShape(id: string, updates: Partial<GeometryShape>): void {
    const shapeIndex = this.shapes.findIndex(shape => shape.id === id);
    if (shapeIndex !== -1) {
      const oldShape = this.shapes[shapeIndex];
      const newShape = { ...oldShape, ...updates, hasChanged: true };
      this.shapes[shapeIndex] = newShape;
    }
  }

  // 获取选中的图形
  get selectedShape(): GeometryShape | null {
    return this.selectedShapeId 
      ? this.shapes.find(shape => shape.id === this.selectedShapeId) || null
      : null;
  }

  // 获取已变化的图形
  get changedShapes(): GeometryShape[] {
    return this.shapes.filter(shape => shape.hasChanged);
  }

  // 重置变化标记
  @action
  resetChangeFlags() {
    this.shapes.forEach(shape => {
      shape.hasChanged = false;
    });
  }

  // 清空所有图形
  clearShapes(): void {
    this.shapes = [];
    this.selectedShapeId = null;
    this.nextId = 0; // 重置ID计数器
  }
}

export const geometryStore = new GeometryStore(); 