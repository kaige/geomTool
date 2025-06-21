// 顶点定义
export interface Vertex {
  id: string;
  position: { x: number; y: number; z: number };
  hasChanged?: boolean;
}

// 曲线定义（用于圆形等）
export interface CircleCurve {
  id: string;
  centerVertexId: string;
  radius: number;
  hasChanged?: boolean;
}

// 基础几何形状接口 - 所有几何形状都继承这个接口
export interface BaseGeometryShape {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  visible: boolean;
  hasChanged?: boolean;
  hasSelectionChanged?: boolean;
}

// 3D几何形状
export interface GeometryShape3D extends BaseGeometryShape {
  type: 'sphere' | 'cube' | 'cylinder' | 'cone' | 'torus';
}

// 平面几何形状类型
export interface LineSegment extends BaseGeometryShape {
  type: 'lineSegment';
  startVertexId: string;
  endVertexId: string;
}

export interface Rectangle extends BaseGeometryShape {
  type: 'rectangle';
  vertexIds: string[]; // 四个顶点的ID，按顺时针或逆时针顺序
}

export interface Circle extends BaseGeometryShape {
  type: 'circle';
  centerVertexId: string;
  curveId: string; // 引用CircleCurve
}

export interface Triangle extends BaseGeometryShape {
  type: 'triangle';
  vertexIds: string[]; // 三个顶点的ID
}

export interface Polygon extends BaseGeometryShape {
  type: 'polygon';
  vertexIds: string[]; // 多个顶点的ID
}

// 联合类型，包含所有几何形状
export type GeometryShape = GeometryShape3D | LineSegment | Rectangle | Circle | Triangle | Polygon;

// 几何存储的完整状态
export interface GeometryState {
  vertices: Vertex[];
  curves: CircleCurve[];
  shapes: GeometryShape[];
  selectedShapeId: string | null;
  selectedVertexId: string | null;
} 