import { makeAutoObservable } from 'mobx';
import * as THREE from 'three';

export interface GeometryShape {
  id: string;
  type: 'sphere' | 'cube' | 'cylinder' | 'cone' | 'torus';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  visible: boolean;
}

export class GeometryStore {
  shapes: GeometryShape[] = [];
  selectedShapeId: string | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.OrthographicCamera | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  private nextId: number = 0; // 自增ID计数器

  constructor() {
    makeAutoObservable(this);
  }

  // 添加图形
  addShape(type: GeometryShape['type']): void {
    // 随机生成一个位置，避免图形重叠
    const randomPos = () => (Math.random() - 0.5) * 4; // -2到2之间的随机数
    const newShape: GeometryShape = {
      id: this.nextId.toString(),
      type,
      position: { x: randomPos(), y: 1, z: randomPos() }, // Y设为1，避免与地面重叠
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
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
    this.selectedShapeId = id;
  }

  // 更新图形属性
  updateShape(id: string, updates: Partial<GeometryShape>): void {
    const shapeIndex = this.shapes.findIndex(shape => shape.id === id);
    if (shapeIndex !== -1) {
      this.shapes[shapeIndex] = { ...this.shapes[shapeIndex], ...updates };
    }
  }

  // 获取选中的图形
  get selectedShape(): GeometryShape | null {
    return this.selectedShapeId 
      ? this.shapes.find(shape => shape.id === this.selectedShapeId) || null
      : null;
  }

  // 设置Three.js对象引用
  setThreeObjects(scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  // 清空所有图形
  clearShapes(): void {
    this.shapes = [];
    this.selectedShapeId = null;
    this.nextId = 0; // 重置ID计数器
  }
}

export const geometryStore = new GeometryStore(); 