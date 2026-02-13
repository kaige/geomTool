import { makeAutoObservable, action } from 'mobx';
import {
  GeometryShape,
  GeometryShape3D,
  LineSegment,
  Rectangle,
  Circle,
  Triangle,
  Polygon,
  CircularArc,
  Vertex,
  CircleCurve
} from '../types/GeometryTypes';
import { ToolType } from '../types/ToolTypes';

export class GeometryStore {
  vertices: Vertex[] = [];
  curves: CircleCurve[] = [];
  shapes: GeometryShape[] = [];
  selectedShapeId: string | null = null;
  selectedVertexId: string | null = null;
  activeToolType: ToolType = ToolType.SELECT;
  private nextId: number = 0; // 自增ID计数器

  constructor() {
    makeAutoObservable(this);
  }

  setActiveToolType(toolType: ToolType): void {
    this.activeToolType = toolType;
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
        } else if (shape.type === 'circularArc') {
          const arc = shape as CircularArc;
          if (arc.centerVertexId === id || arc.startVertexId === id || arc.endVertexId === id) {
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
      } else if (shape.type === 'circularArc') {
        const arc = shape as CircularArc;
        return arc.centerVertexId === id || arc.startVertexId === id || arc.endVertexId === id;
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
  addShape3D(type: GeometryShape3D['type'], position?: { x: number; y: number; z: number }): void {
    let defaultRotation = { x: 0, y: 0, z: 0 };
    if (type === 'cube') {
      defaultRotation = { x: 1.745, y: 0.055, z: 0.283 };
    }

    // Use provided position or generate random one
    const pos = position || { x: (Math.random() - 0.5) * 4, y: 1, z: (Math.random() - 0.5) * 4 };

    const newShape: GeometryShape3D = {
      id: this.nextId.toString(),
      type,
      position: pos,
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

  // 圆弧相关方法
  addCircularArc(startPosition: { x: number; y: number; z: number },
                  endPosition: { x: number; y: number; z: number },
                  arcPosition: { x: number; y: number; z: number }): void {
    const arcData = this.calculateCircularArc(startPosition, endPosition, arcPosition);

    const centerVertexId = this.addVertex(arcData.center);
    const startVertexId = this.addVertex(startPosition);
    const endVertexId = this.addVertex(endPosition);

    const newShape: CircularArc = {
      id: this.nextId.toString(),
      type: 'circularArc',
      centerVertexId,
      startVertexId,
      endVertexId,
      clockwise: arcData.clockwise,
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

  // 计算圆弧的中心点和方向
  private calculateCircularArc(start: { x: number; y: number; z: number },
                               end: { x: number; y: number; z: number },
                               arc: { x: number; y: number; z: number }): {
    center: { x: number; y: number; z: number };
    clockwise: boolean;
  } {
    // 简化为2D计算（忽略z坐标）
    const start2D = { x: start.x, y: start.y };
    const end2D = { x: end.x, y: end.y };
    const arc2D = { x: arc.x, y: arc.y };

    // 计算两条线段的垂直平分线
    const mid1 = { x: (start2D.x + arc2D.x) / 2, y: (start2D.y + arc2D.y) / 2 };
    const mid2 = { x: (arc2D.x + end2D.x) / 2, y: (arc2D.y + end2D.y) / 2 };

    // 计算垂直平分线的方向
    const dir1 = { x: arc2D.x - start2D.x, y: arc2D.y - start2D.y };
    const dir2 = { x: end2D.x - arc2D.x, y: end2D.y - arc2D.y };

    // 旋转90度得到垂直方向
    const perp1 = { x: -dir1.y, y: dir1.x };
    const perp2 = { x: -dir2.y, y: dir2.x };

    // 求两条垂直平分线的交点（圆心）
    const center = this.calculateLineIntersection(
      mid1, perp1,
      mid2, perp2
    );

    // 判断方向：使用叉积判断
    const v1 = { x: start2D.x - center.x, y: start2D.y - center.y };
    const v2 = { x: arc2D.x - center.x, y: arc2D.y - center.y };
    const cross = v1.x * v2.y - v1.y * v2.x;
    const clockwise = cross < 0;

    return {
      center: { x: center.x, y: center.y, z: 0 },
      clockwise
    };
  }

  // 计算两条直线的交点
  private calculateLineIntersection(p1: { x: number; y: number }, d1: { x: number; y: number },
                                   p2: { x: number; y: number }, d2: { x: number; y: number }): { x: number; y: number } {
    const det = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(det) < 1e-10) {
      // 平行或重合，返回中点
      return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const t1 = (dx * d2.y - dy * d2.x) / det;

    return {
      x: p1.x + t1 * d1.x,
      y: p1.y + t1 * d1.y
    };
  }

  // 更新圆弧的端点位置
  updateArcEndpoint(arcId: string, endpoint: 'start' | 'end', position: { x: number; y: number; z: number }): void {
    const arcIndex = this.shapes.findIndex(shape => shape.id === arcId);
    if (arcIndex === -1) return;

    const arc = this.shapes[arcIndex] as CircularArc;
    const vertexId = endpoint === 'start' ? arc.startVertexId : arc.endVertexId;
    const otherVertexId = endpoint === 'start' ? arc.endVertexId : arc.startVertexId;
    const otherVertex = this.getVertexById(otherVertexId);
    const centerVertex = this.getVertexById(arc.centerVertexId);

    if (otherVertex && centerVertex) {
      // Calculate the original radius (distance from center to the other fixed endpoint)
      const originalRadius = Math.sqrt(
        Math.pow(otherVertex.position.x - centerVertex.position.x, 2) +
        Math.pow(otherVertex.position.y - centerVertex.position.y, 2)
      );

      // Update the dragged endpoint
      this.updateVertex(vertexId, position);

      // Calculate new chord (between new endpoint and fixed endpoint)
      const chordVector = {
        x: otherVertex.position.x - position.x,
        y: otherVertex.position.y - position.y
      };
      const chordLength = Math.sqrt(chordVector.x * chordVector.x + chordVector.y * chordVector.y);

      if (chordLength > 0.001) {
        // Calculate the midpoint of the new chord
        const midpoint = {
          x: (position.x + otherVertex.position.x) / 2,
          y: (position.y + otherVertex.position.y) / 2,
          z: (position.z + otherVertex.position.z) / 2
        };

        // Calculate perpendicular bisector direction
        const perpVector = {
          x: -chordVector.y / chordLength,
          y: chordVector.x / chordLength
        };

        // Calculate the distance from chord midpoint to center along perpendicular bisector
        // Using the Pythagorean theorem: distance = sqrt(radius^2 - (chord/2)^2)
        const halfChord = chordLength / 2;
        let centerDistance = 0;

        if (originalRadius > halfChord) {
          centerDistance = Math.sqrt(originalRadius * originalRadius - halfChord * halfChord);
        } else {
          // If chord is longer than diameter, use a minimum distance
          centerDistance = halfChord * 0.1;
        }

        // Determine which side of the chord the center should be on
        // Create a vector from midpoint to current center
        const midToCenter = {
          x: centerVertex.position.x - midpoint.x,
          y: centerVertex.position.y - midpoint.y
        };

        // Check the sign of dot product to determine which side
        const dotProduct = midToCenter.x * perpVector.x + midToCenter.y * perpVector.y;
        const side = dotProduct >= 0 ? 1 : -1;

        // Calculate new center position
        const newCenter = {
          x: midpoint.x + perpVector.x * centerDistance * side,
          y: midpoint.y + perpVector.y * centerDistance * side,
          z: midpoint.z
        };

        // Update center vertex
        this.updateVertex(arc.centerVertexId, newCenter);
      }
    }
  }

  // 更新圆弧端点沿圆周滑动（保持圆心和半径不变）
  slideArcEndpointOnCircle(arcId: string, endpoint: 'start' | 'end', position: { x: number; y: number; z: number }): void {
    const arcIndex = this.shapes.findIndex(shape => shape.id === arcId);
    if (arcIndex === -1) return;

    const arc = this.shapes[arcIndex] as CircularArc;
    const vertexId = endpoint === 'start' ? arc.startVertexId : arc.endVertexId;
    const centerVertex = this.getVertexById(arc.centerVertexId);
    const otherVertexId = endpoint === 'start' ? arc.endVertexId : arc.startVertexId;
    const otherVertex = this.getVertexById(otherVertexId);

    if (centerVertex && otherVertex) {
      // Calculate the radius (distance from center to other endpoint)
      const radius = Math.sqrt(
        Math.pow(otherVertex.position.x - centerVertex.position.x, 2) +
        Math.pow(otherVertex.position.y - centerVertex.position.y, 2)
      );

      // Calculate direction from center to the desired position
      const dirX = position.x - centerVertex.position.x;
      const dirY = position.y - centerVertex.position.y;
      const dirZ = position.z - centerVertex.position.z;
      const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

      if (length > 0.001) {
        // Normalize and scale to radius to get the new position on the circle
        const newPosition = {
          x: centerVertex.position.x + (dirX / length) * radius,
          y: centerVertex.position.y + (dirY / length) * radius,
          z: centerVertex.position.z + (dirZ / length) * radius
        };

        // Update the endpoint position
        this.updateVertex(vertexId, newPosition);
      }
    }
  }

  // 更新圆弧半径（保持中心点不变）
  updateArcRadius(arcId: string, scale: number): void {
    const arcIndex = this.shapes.findIndex(shape => shape.id === arcId);
    if (arcIndex === -1) return;

    const arc = this.shapes[arcIndex] as CircularArc;
    const centerVertex = this.getVertexById(arc.centerVertexId);
    const startVertex = this.getVertexById(arc.startVertexId);
    const endVertex = this.getVertexById(arc.endVertexId);

    if (centerVertex && startVertex && endVertex) {
      // 计算新的端点位置
      const newStartPos = {
        x: centerVertex.position.x + (startVertex.position.x - centerVertex.position.x) * scale,
        y: centerVertex.position.y + (startVertex.position.y - centerVertex.position.y) * scale,
        z: centerVertex.position.z + (startVertex.position.z - centerVertex.position.z) * scale
      };

      const newEndPos = {
        x: centerVertex.position.x + (endVertex.position.x - centerVertex.position.x) * scale,
        y: centerVertex.position.y + (endVertex.position.y - centerVertex.position.y) * scale,
        z: centerVertex.position.z + (endVertex.position.z - centerVertex.position.z) * scale
      };

      this.updateVertex(arc.startVertexId, newStartPos);
      this.updateVertex(arc.endVertexId, newEndPos);
    }
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
  addShape(type: GeometryShape3D['type'], position?: { x: number; y: number; z: number }): void {
    this.addShape3D(type, position);
  }

  clearShapes(): void {
    this.clearAll();
  }
}

export const geometryStore = new GeometryStore(); 