import { makeAutoObservable, action } from 'mobx';
import { 
  GeometryShape, 
  GeometryShape3D, 
  LineSegment, 
  Rectangle, 
  Circle, 
  Triangle, 
  Polygon,
  Vertex, 
  CircleCurve 
} from '../types/GeometryTypes';

export class GeometryStore {
  vertices: Vertex[] = [];
  curves: CircleCurve[] = [];
  shapes: GeometryShape[] = [];
  selectedShapeId: string | null = null;
  selectedVertexId: string | null = null;
  private nextId: number = 0; // 自增ID计数器

  constructor() {
    makeAutoObservable(this);
  }

  // 顶点管理方法
  addVertex(position: { x: number; y: number; z: number }): string {
    const vertexId = this.nextId.toString();
    const newVertex: Vertex = {
      id: vertexId,
      position,
      hasChanged: true
    };
    this.vertices.push(newVertex);
    this.nextId++;
    return vertexId;
  }

  updateVertex(id: string, position: { x: number; y: number; z: number }): void {
    const vertexIndex = this.vertices.findIndex(vertex => vertex.id === id);
    if (vertexIndex !== -1) {
      this.vertices[vertexIndex] = {
        ...this.vertices[vertexIndex],
        position,
        hasChanged: true
      };
      
      // 更新使用这个顶点的所有形状
      this.shapes.forEach(shape => {
        if (shape.type === 'lineSegment') {
          const line = shape as LineSegment;
          if (line.startVertexId === id || line.endVertexId === id) {
            shape.hasChanged = true;
          }
        } else if (shape.type === 'rectangle' || shape.type === 'triangle' || shape.type === 'polygon') {
          const polygon = shape as Rectangle | Triangle | Polygon;
          if (polygon.vertexIds.includes(id)) {
            shape.hasChanged = true;
          }
        } else if (shape.type === 'circle') {
          const circle = shape as Circle;
          if (circle.centerVertexId === id) {
            shape.hasChanged = true;
          }
        }
      });
    }
  }

  removeVertex(id: string): void {
    // 检查是否有形状在使用这个顶点
    const shapesUsingVertex = this.shapes.filter(shape => {
      if (shape.type === 'lineSegment') {
        const line = shape as LineSegment;
        return line.startVertexId === id || line.endVertexId === id;
      } else if (shape.type === 'rectangle' || shape.type === 'triangle' || shape.type === 'polygon') {
        const polygon = shape as Rectangle | Triangle | Polygon;
        return polygon.vertexIds.includes(id);
      } else if (shape.type === 'circle') {
        const circle = shape as Circle;
        return circle.centerVertexId === id;
      }
      return false;
    });

    if (shapesUsingVertex.length > 0) {
      console.warn(`无法删除顶点 ${id}，因为它被 ${shapesUsingVertex.length} 个形状使用`);
      return;
    }

    this.vertices = this.vertices.filter(vertex => vertex.id !== id);
  }

  // 曲线管理方法
  addCircleCurve(centerVertexId: string, radius: number): string {
    const curveId = this.nextId.toString();
    const newCurve: CircleCurve = {
      id: curveId,
      centerVertexId,
      radius,
      hasChanged: true
    };
    this.curves.push(newCurve);
    this.nextId++;
    return curveId;
  }

  updateCircleCurve(id: string, radius: number): void {
    const curveIndex = this.curves.findIndex(curve => curve.id === id);
    if (curveIndex !== -1) {
      this.curves[curveIndex] = {
        ...this.curves[curveIndex],
        radius,
        hasChanged: true
      };
    }
  }

  // 3D几何形状方法（保持原有功能）
  addShape3D(type: GeometryShape3D['type']): void {
    const randomPos = () => (Math.random() - 0.5) * 4;
    
    let defaultRotation = { x: 0, y: 0, z: 0 };
    if (type === 'cube') {
      defaultRotation = { x: 1.745, y: 0.055, z: 0.283 };
    }
    
    const newShape: GeometryShape3D = {
      id: this.nextId.toString(),
      type,
      position: { x: randomPos(), y: 1, z: randomPos() },
      rotation: defaultRotation,
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
      hasChanged: true
    };
    this.shapes.push(newShape);
    this.nextId++;
  }

  // 平面几何形状方法
  addLineSegment(startPosition: { x: number; y: number; z: number }, 
                 endPosition: { x: number; y: number; z: number }): void {
    const startVertexId = this.addVertex(startPosition);
    const endVertexId = this.addVertex(endPosition);
    
    const newShape: LineSegment = {
      id: this.nextId.toString(),
      type: 'lineSegment',
      startVertexId,
      endVertexId,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
      hasChanged: true
    };
    this.shapes.push(newShape);
    this.nextId++;
  }

  addRectangle(positions: { x: number; y: number; z: number }[]): void {
    if (positions.length !== 4) {
      throw new Error('矩形需要4个顶点位置');
    }
    
    const vertexIds = positions.map(pos => this.addVertex(pos));
    
    const newShape: Rectangle = {
      id: this.nextId.toString(),
      type: 'rectangle',
      vertexIds,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
      hasChanged: true
    };
    this.shapes.push(newShape);
    this.nextId++;
  }

  addCircle(centerPosition: { x: number; y: number; z: number }, radius: number): void {
    const centerVertexId = this.addVertex(centerPosition);
    const curveId = this.addCircleCurve(centerVertexId, radius);
    
    const newShape: Circle = {
      id: this.nextId.toString(),
      type: 'circle',
      centerVertexId,
      curveId,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
      hasChanged: true
    };
    this.shapes.push(newShape);
    this.nextId++;
  }

  addTriangle(positions: { x: number; y: number; z: number }[]): void {
    if (positions.length !== 3) {
      throw new Error('三角形需要3个顶点位置');
    }
    
    const vertexIds = positions.map(pos => this.addVertex(pos));
    
    const newShape: Triangle = {
      id: this.nextId.toString(),
      type: 'triangle',
      vertexIds,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
      hasChanged: true
    };
    this.shapes.push(newShape);
    this.nextId++;
  }

  addPolygon(positions: { x: number; y: number; z: number }[]): void {
    if (positions.length < 3) {
      throw new Error('多边形至少需要3个顶点');
    }
    
    const vertexIds = positions.map(pos => this.addVertex(pos));
    
    const newShape: Polygon = {
      id: this.nextId.toString(),
      type: 'polygon',
      vertexIds,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#0078d4',
      visible: true,
      hasChanged: true
    };
    this.shapes.push(newShape);
    this.nextId++;
  }

  // 通用形状管理方法
  removeShape(id: string): void {
    this.shapes = this.shapes.filter(shape => shape.id !== id);
    if (this.selectedShapeId === id) {
      this.selectedShapeId = null;
    }
  }

  selectShape(id: string | null): void {
    if (this.selectedShapeId) {
      const oldSelectedShape = this.shapes.find(shape => shape.id === this.selectedShapeId);
      if (oldSelectedShape) {
        oldSelectedShape.hasSelectionChanged = true;
      }
    }
    
    if (id) {
      const newSelectedShape = this.shapes.find(shape => shape.id === id);
      if (newSelectedShape) {
        newSelectedShape.hasSelectionChanged = true;
      }
    }
    
    this.selectedShapeId = id;
  }

  selectVertex(id: string | null): void {
    this.selectedVertexId = id;
  }

  updateShape<T extends GeometryShape>(id: string, updates: Partial<T>): void {
    const shapeIndex = this.shapes.findIndex(shape => shape.id === id);
    if (shapeIndex !== -1) {
      const oldShape = this.shapes[shapeIndex];
      const newShape = { ...oldShape, ...updates, hasChanged: true } as T;
      this.shapes[shapeIndex] = newShape;
    }
  }

  // 获取方法
  get selectedShape(): GeometryShape | null {
    return this.selectedShapeId 
      ? this.shapes.find(shape => shape.id === this.selectedShapeId) || null
      : null;
  }

  get selectedVertex(): Vertex | null {
    return this.selectedVertexId 
      ? this.vertices.find(vertex => vertex.id === this.selectedVertexId) || null
      : null;
  }

  get changedShapes(): GeometryShape[] {
    return this.shapes.filter(shape => shape.hasChanged);
  }

  get changedVertices(): Vertex[] {
    return this.vertices.filter(vertex => vertex.hasChanged);
  }

  get changedCurves(): CircleCurve[] {
    return this.curves.filter(curve => curve.hasChanged);
  }

  // 根据顶点ID获取顶点
  getVertexById(id: string): Vertex | null {
    return this.vertices.find(vertex => vertex.id === id) || null;
  }

  // 根据曲线ID获取曲线
  getCurveById(id: string): CircleCurve | null {
    return this.curves.find(curve => curve.id === id) || null;
  }

  // 重置变化标记
  @action
  resetChangeFlags() {
    this.shapes.forEach(shape => {
      shape.hasChanged = false;
      shape.hasSelectionChanged = false;
    });
    this.vertices.forEach(vertex => {
      vertex.hasChanged = false;
    });
    this.curves.forEach(curve => {
      curve.hasChanged = false;
    });
  }

  // 清空所有数据
  clearAll(): void {
    this.vertices = [];
    this.curves = [];
    this.shapes = [];
    this.selectedShapeId = null;
    this.selectedVertexId = null;
    this.nextId = 0;
  }

  // 保持向后兼容的方法
  addShape(type: GeometryShape3D['type']): void {
    this.addShape3D(type);
  }

  clearShapes(): void {
    this.clearAll();
  }
}

export const geometryStore = new GeometryStore(); 