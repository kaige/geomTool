import React, { useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react';
import * as THREE from 'three';
import { geometryStore } from '../stores/GeometryStore';
import { GeometryShape, GeometryShape3D, LineSegment, Rectangle, Circle, Triangle, Polygon } from '../types/GeometryTypes';
import { MouseState, CameraState, SelectionState, LineEndpointState, ToolType } from '../types/ToolTypes';
import { ToolManager } from './tools/ToolManager';

// 调试开关
const DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR = false;
const DEBUG_SHOW_NORMALS = false;

// 创建线段端点标记的工具函数
function createLineEndpoints(
  geometry: THREE.BufferGeometry,
  meshGroup: THREE.Group,
  isSelected: boolean = false
): { startPoint: THREE.Mesh; endPoint: THREE.Mesh } | null {
  if (!isSelected) return null;

  // 获取线段的起点和终点
  const positions = geometry.getAttribute('position');
  if (!positions || positions.count < 2) return null;

  // 获取线段的原始起点和终点
  const startPos = new THREE.Vector3(
    positions.getX(0),
    positions.getY(0),
    positions.getZ(0)
  );
  const endPos = new THREE.Vector3(
    positions.getX(1),
    positions.getY(1),
    positions.getZ(1)
  );

  const circleR = 0.05;
  const ringInnerR = circleR * 0.9;
  const ringOuterR = circleR;
  const numOfSegments = 16;
  const circleRenderOrder = 10;
  const ringRenderOrder = 11;

  // 创建实心圆的几何体（使用CircleGeometry）
  const circleGeometry = new THREE.CircleGeometry(circleR, numOfSegments);
  
  // 创建白色实心圆的材质 - 为每个端点创建独立的材质实例
  const startCircleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, // 白色
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false, // 禁用深度测试，确保圆始终在线的上面
    depthWrite: false // 不写入深度缓冲区
  });

  const endCircleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, // 白色
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false, // 禁用深度测试，确保圆始终在线的上面
    depthWrite: false // 不写入深度缓冲区
  });

  // 创建起点标记
  const startPoint = new THREE.Mesh(circleGeometry, startCircleMaterial);
  startPoint.position.copy(startPos); // 相对于meshGroup的位置
  // 设置较高的渲染顺序，确保圆在线的上面
  startPoint.renderOrder = circleRenderOrder;
  meshGroup.add(startPoint);

  // 创建终点标记 - 使用独立的几何体和材质
  const endCircleGeometry = new THREE.CircleGeometry(circleR, numOfSegments);
  const endPoint = new THREE.Mesh(endCircleGeometry, endCircleMaterial);
  endPoint.position.copy(endPos); // 相对于meshGroup的位置
  // 设置较高的渲染顺序，确保圆在线的上面
  endPoint.renderOrder = circleRenderOrder;
  meshGroup.add(endPoint);

  // 创建边缘线（使用RingGeometry）
  const ringGeometry = new THREE.RingGeometry(ringInnerR, ringOuterR, numOfSegments);
  
  // 为每个边缘创建独立的材质实例
  const startRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6b35, // 深橙色，与选中状态一致
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
    depthTest: false, // 禁用深度测试，确保边缘线始终在最上面
    depthWrite: false // 不写入深度缓冲区
  });

  const endRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6b35, // 深橙色，与选中状态一致
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
    depthTest: false, // 禁用深度测试，确保边缘线始终在最上面
    depthWrite: false // 不写入深度缓冲区
  });

  // 创建起点边缘
  const startRing = new THREE.Mesh(ringGeometry, startRingMaterial);
  startRing.position.copy(startPos); // 相对于meshGroup的位置
  startRing.renderOrder = ringRenderOrder; // 边缘在最上面
  meshGroup.add(startRing);

  // 创建终点边缘 - 使用独立的几何体和材质
  const endRingGeometry = new THREE.RingGeometry(ringInnerR, ringOuterR, numOfSegments);
  const endRing = new THREE.Mesh(endRingGeometry, endRingMaterial);
  endRing.position.copy(endPos); // 相对于meshGroup的位置
  endRing.renderOrder = ringRenderOrder; // 边缘在最上面
  meshGroup.add(endRing);

  return { startPoint, endPoint };
}

// 更新线段端点标记的工具函数
function updateLineEndpoints(
  meshGroup: THREE.Group,
  geometry: THREE.BufferGeometry,
  isSelected: boolean
): void {

  // 移除现有的端点标记（包括实心圆和边缘线）
  const childrenToRemove: THREE.Object3D[] = [];
  meshGroup.children.forEach(child => {
    if (child instanceof THREE.Mesh && 
        (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
      childrenToRemove.push(child);
    }
  });

  // 清理要移除的对象
  childrenToRemove.forEach(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    meshGroup.remove(child);
  });

  // 如果被选中，创建新的端点标记
  if (isSelected) {
    createLineEndpoints(geometry, meshGroup, true);
  }
}

// 更新所有线段端点标记的方向，让它们始终面向相机
function updateAllLineEndpointsDirection(camera: THREE.Camera, meshes: Map<string, THREE.Object3D>): void {
  meshes.forEach((meshGroup) => {
    if (meshGroup instanceof THREE.Group) {
      // 检查是否是线段（包含Line对象）
      const line = meshGroup.children.find(child => child instanceof THREE.Line);
      if (line) {
        // 找到端点标记（CircleGeometry和RingGeometry）
        meshGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh && 
              (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
            // 让端点标记始终面向相机
            child.lookAt(camera.position);
          }
        });
      }
    }
  });
}

// 创建几何体
const createGeometry = (shape: GeometryShape): THREE.BufferGeometry => {
  switch (shape.type) {
    case 'sphere':
      return new THREE.SphereGeometry(1, 32, 32);
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'cylinder':
      return new THREE.CylinderGeometry(1, 1, 2, 32);
    case 'cone':
      return new THREE.ConeGeometry(1, 2, 32);
    case 'torus':
      return new THREE.TorusGeometry(1, 0.4, 16, 100);
    case 'lineSegment': {
      // 线段几何体 - 根据实际顶点位置创建
      const lineShape = shape as LineSegment;
      const startVertex = geometryStore.getVertexById(lineShape.startVertexId);
      const endVertex = geometryStore.getVertexById(lineShape.endVertexId);
      
      if (!startVertex || !endVertex) {
        console.warn('线段顶点未找到，使用默认位置');
        const lineGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array([0, 0, 0, 1, 0, 0]);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return lineGeometry;
      }
      
      const lineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        startVertex.position.x, startVertex.position.y, startVertex.position.z,
        endVertex.position.x, endVertex.position.y, endVertex.position.z
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return lineGeometry;
    }
    case 'rectangle': {
      // 矩形几何体 - 根据实际顶点位置创建
      const rectShape = shape as Rectangle;
      const vertices = rectShape.vertexIds.map(id => geometryStore.getVertexById(id)).filter(Boolean);
      
      if (vertices.length !== 4) {
        console.warn('矩形顶点未找到或数量不正确，使用默认矩形');
        return new THREE.PlaneGeometry(1, 1);
      }
      
      const rectGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        vertices[0]!.position.x, vertices[0]!.position.y, vertices[0]!.position.z,
        vertices[1]!.position.x, vertices[1]!.position.y, vertices[1]!.position.z,
        vertices[2]!.position.x, vertices[2]!.position.y, vertices[2]!.position.z,
        vertices[0]!.position.x, vertices[0]!.position.y, vertices[0]!.position.z,
        vertices[2]!.position.x, vertices[2]!.position.y, vertices[2]!.position.z,
        vertices[3]!.position.x, vertices[3]!.position.y, vertices[3]!.position.z
      ]);
      rectGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return rectGeometry;
    }
    case 'circle': {
      // 圆形几何体 - 根据实际半径创建
      const circleShape = shape as Circle;
      const curve = geometryStore.getCurveById(circleShape.curveId);
      
      if (!curve) {
        console.warn('圆形曲线未找到，使用默认半径');
        return new THREE.CircleGeometry(1, 32);
      }
      
      return new THREE.CircleGeometry(curve.radius, 32);
    }
    case 'triangle': {
      // 三角形几何体 - 根据实际顶点位置创建
      const triangleShape = shape as Triangle;
      const vertices = triangleShape.vertexIds.map(id => geometryStore.getVertexById(id)).filter(Boolean);
      
      if (vertices.length !== 3) {
        console.warn('三角形顶点未找到或数量不正确，使用默认三角形');
        const triangleGeometry = new THREE.BufferGeometry();
        const trianglePositions = new Float32Array([
          0, 0.5, 0,    // 顶点1
          -0.5, -0.5, 0, // 顶点2
          0.5, -0.5, 0   // 顶点3
        ]);
        triangleGeometry.setAttribute('position', new THREE.BufferAttribute(trianglePositions, 3));
        return triangleGeometry;
      }
      
      const triangleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        vertices[0]!.position.x, vertices[0]!.position.y, vertices[0]!.position.z,
        vertices[1]!.position.x, vertices[1]!.position.y, vertices[1]!.position.z,
        vertices[2]!.position.x, vertices[2]!.position.y, vertices[2]!.position.z
      ]);
      triangleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return triangleGeometry;
    }
    case 'polygon': {
      // 多边形几何体 - 根据实际顶点位置创建
      const polygonShape = shape as Polygon;
      const vertices = polygonShape.vertexIds.map(id => geometryStore.getVertexById(id)).filter(Boolean);
      
      if (vertices.length < 3) {
        console.warn('多边形顶点数量不足，使用默认六边形');
        return new THREE.CircleGeometry(1, 6);
      }
      
      // 创建多边形几何体
      const polygonGeometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      
      // 使用三角形扇形来构建多边形
      const center = { x: 0, y: 0, z: 0 };
      vertices.forEach(vertex => {
        center.x += vertex!.position.x;
        center.y += vertex!.position.y;
        center.z += vertex!.position.z;
      });
      center.x /= vertices.length;
      center.y /= vertices.length;
      center.z /= vertices.length;
      
      // 创建三角形扇形
      for (let i = 0; i < vertices.length; i++) {
        const current = vertices[i]!;
        const next = vertices[(i + 1) % vertices.length]!;
        
        positions.push(
          center.x, center.y, center.z,
          current.position.x, current.position.y, current.position.z,
          next.position.x, next.position.y, next.position.z
        );
      }
      
      polygonGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      return polygonGeometry;
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
};

// 创建边缘线段的工具函数
function createEdgeSegments(
  edges: CustomEdgesGeometry,
  shapeColor: string,
  meshGroup: THREE.Group,
  isSelected: boolean = false
): { solidLineSegments: THREE.LineSegments; dashedLineSegments: THREE.LineSegments } {
  // 创建实线边缘
  const solidLineMaterial = new THREE.LineBasicMaterial({ 
    color: isSelected ? 0xff6b35 : shapeColor,  // 选中时使用深橙色
    linewidth: 1
  });
  const solidLineGeometry = new THREE.BufferGeometry();
  solidLineGeometry.setAttribute('position', edges.solidEdges);
  const solidLineSegments = new THREE.LineSegments(solidLineGeometry, solidLineMaterial);
  meshGroup.add(solidLineSegments);

  // 创建虚线边缘
  const dashedLineMaterial = new THREE.LineDashedMaterial({ 
    color: isSelected ? 0xffb380 : 0x00aaff,  // 选中时使用浅橙色，否则使用浅蓝色
    dashSize: 0.02,   // 虚线大小
    gapSize: 0.008,   // 间隔大小
    linewidth: 0.5    // 线宽
  });
  const dashedLineGeometry = new THREE.BufferGeometry();
  dashedLineGeometry.setAttribute('position', edges.dashedEdges);
  const dashedLineSegments = new THREE.LineSegments(dashedLineGeometry, dashedLineMaterial);
  
  // 计算线段距离
  dashedLineSegments.computeLineDistances();
  meshGroup.add(dashedLineSegments);

  return { solidLineSegments, dashedLineSegments };
}

// 更新面的颜色的工具函数
function updateFaceColors(
  geometry: THREE.BufferGeometry,
  edges: CustomEdgesGeometry,
  camera: THREE.Camera,
  meshGroup: THREE.Group
): void {
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  const faces = edges.calculateFacesVisibility(
    geometry,
    camera,
    meshGroup
  );
  faces.forEach((face) => {
    const color = face.visible ? [0, 1, 0] : [1, 0, 0]; // 绿色表示可见，红色表示不可见
    for (let i = 0; i < 3; i++) {
      const vertexIndex = face.vertices[i];
      colors[vertexIndex * 3] = color[0];
      colors[vertexIndex * 3 + 1] = color[1];
      colors[vertexIndex * 3 + 2] = color[2];
    }
  });
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// 检查形状的变换或可见性是否变化的工具函数
function isTransformOrVisibilityChanged(currentMesh: THREE.Group<THREE.Object3DEventMap>, shape: GeometryShape) {
  return currentMesh.position.x !== shape.position.x ||
    currentMesh.position.y !== shape.position.y ||
    currentMesh.position.z !== shape.position.z ||
    currentMesh.rotation.x !== shape.rotation.x ||
    currentMesh.rotation.y !== shape.rotation.y ||
    currentMesh.rotation.z !== shape.rotation.z ||
    currentMesh.scale.x !== shape.scale.x ||
    currentMesh.scale.y !== shape.scale.y ||
    currentMesh.scale.z !== shape.scale.z ||
    currentMesh.visible !== shape.visible;
}

// 检查顶点是否发生变化的工具函数
function hasVerticesChanged(shape: GeometryShape): boolean {
  switch (shape.type) {
    case 'lineSegment': {
      const lineShape = shape as LineSegment;
      const startVertex = geometryStore.getVertexById(lineShape.startVertexId);
      const endVertex = geometryStore.getVertexById(lineShape.endVertexId);
      return startVertex?.hasChanged || endVertex?.hasChanged || false;
    }
    case 'rectangle':
    case 'triangle':
    case 'polygon': {
      const polygonShape = shape as Rectangle | Triangle | Polygon;
      return polygonShape.vertexIds.some(id => {
        const vertex = geometryStore.getVertexById(id);
        return vertex?.hasChanged || false;
      });
    }
    case 'circle': {
      const circleShape = shape as Circle;
      const centerVertex = geometryStore.getVertexById(circleShape.centerVertexId);
      const curve = geometryStore.getCurveById(circleShape.curveId);
      return centerVertex?.hasChanged || curve?.hasChanged || false;
    }
    default:
      return false;
  }
}

function updateShapeEdgesGeometry(meshGroup: THREE.Object3D<THREE.Object3DEventMap> | undefined, solidMeshGeometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>, shape: GeometryShape) {
  const group = meshGroup as THREE.Group;
  group.children.forEach(child => {
    if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
      group.remove(child);
    }
  });

  const edges = new CustomEdgesGeometry(solidMeshGeometry);
  createEdgeSegments(edges, shape.color, meshGroup as THREE.Group, geometryStore.selectedShapeId === shape.id);

  return edges;
}

// 自定义的 EdgesGeometry，根据面的可见性和夹角决定边的显示
class CustomEdgesGeometry extends THREE.EdgesGeometry {
  public solidEdges: THREE.BufferAttribute;
  public dashedEdges: THREE.BufferAttribute;
  public faces: Array<{
    normal: THREE.Vector3;
    visible: boolean;
    vertices: number[];
  }>;

  constructor(geometry: THREE.BufferGeometry) {
    super(geometry, 30); // 30度锐角阈值

    // 初始化属性
    this.solidEdges = new THREE.BufferAttribute(new Float32Array(0), 3);
    this.dashedEdges = new THREE.BufferAttribute(new Float32Array(0), 3);
    this.faces = [];

    // 获取必要的属性
    const camera = geometry.userData.camera as THREE.Camera;
    if (!camera) {
      console.warn('Geometry has no camera information');
      return;
    }

    const meshGroup = geometry.userData.meshGroup as THREE.Group;
    if (!meshGroup) {
      console.warn('Geometry has no meshGroup information');
      return;
    }

    // 创建法向量可视化组
    const normalLinesGroup = new THREE.Group();
    if (DEBUG_SHOW_NORMALS) {
      meshGroup.add(normalLinesGroup);
    }

    // 存储每个面的可见性和法线
    this.faces = this.calculateFacesVisibility(
      geometry,
      camera,
      meshGroup,
      normalLinesGroup
    );

    // 存储边的信息
    const edgeMap = new Map();

    // 遍历所有面，建立邻接关系
    for (let i = 0; i < geometry.getIndex()!.count; i += 3) {
      const a = geometry.getIndex()!.getX(i);
      const b = geometry.getIndex()!.getX(i + 1);
      const c = geometry.getIndex()!.getX(i + 2);

      // 获取顶点位置
      const posA = new THREE.Vector3(
        geometry.getAttribute('position')!.getX(a),
        geometry.getAttribute('position')!.getY(a),
        geometry.getAttribute('position')!.getZ(a)
      );
      const posB = new THREE.Vector3(
        geometry.getAttribute('position')!.getX(b),
        geometry.getAttribute('position')!.getY(b),
        geometry.getAttribute('position')!.getZ(b)
      );
      const posC = new THREE.Vector3(
        geometry.getAttribute('position')!.getX(c),
        geometry.getAttribute('position')!.getY(c),
        geometry.getAttribute('position')!.getZ(c)
      );

      // 存储每条边对应的面
      addEdge(posA, posB, i / 3);
      addEdge(posB, posC, i / 3);
      addEdge(posC, posA, i / 3);
    }
    
    function addEdge(v1: THREE.Vector3, v2: THREE.Vector3, faceIndex: number) {
      // 计算边的中点作为唯一标识
      const midPoint = new THREE.Vector3()
        .addVectors(v1, v2)
        .multiplyScalar(0.5);
      const key = `${midPoint.x.toFixed(6)}-${midPoint.y.toFixed(6)}-${midPoint.z.toFixed(6)}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, {startPoint: v1, endPoint: v2, faceIndices: [faceIndex]});
      } else {
        const edgeInfo = edgeMap.get(key);
        if (!edgeInfo.faceIndices.includes(faceIndex)) {
          edgeInfo.faceIndices.push(faceIndex);
        }
      }
    }
    
    // 获取需要显示的边
    const solidEdgesArray: number[] = [];  // 实线边
    const dashedEdgesArray: number[] = []; // 虚线边
    // 遍历edgesMap处理每条边
    edgeMap.forEach((edgeInfo, key) => {
      if (!edgeInfo || edgeInfo.faceIndices.length === 0) return;
  
      const edgeVertices = [edgeInfo.startPoint.x, edgeInfo.startPoint.y, edgeInfo.startPoint.z,
        edgeInfo.endPoint.x, edgeInfo.endPoint.y, edgeInfo.endPoint.z];
      
      // 如果只有一个面，说明是边界边，显示为实线
      if (edgeInfo.faceIndices.length === 1) {
        const faceIndex = edgeInfo.faceIndices[0];
        const face = this.faces[faceIndex];
        if (face.visible) {
          solidEdgesArray.push(...edgeVertices);
        }
        else {
          dashedEdgesArray.push(...edgeVertices);
        }
      } else {
          // 如果有两个面，检查可见性
          const [face1, face2] = edgeInfo.faceIndices;
          const face1Visible = this.faces[face1].visible;
          const face2Visible = this.faces[face2].visible;

          // 计算两个面之间的夹角
          const face1Normal = this.faces[face1].normal;
          const face2Normal = this.faces[face2].normal;
          const dotProduct = face1Normal.dot(face2Normal);
          const angle = Math.acos(dotProduct);

          const isSharpEdge = angle > (this.parameters.thresholdAngle) * Math.PI / 180;

          // 如果两个面可见性相同，且夹角大于阈值，则显示为实线,否则显示为虚线
          if (face1Visible && face2Visible && isSharpEdge) {
            solidEdgesArray.push(...edgeVertices);
          } else if (!face1Visible && !face2Visible && isSharpEdge) {
            dashedEdgesArray.push(...edgeVertices);
          // 如果两个面可见性不同，则显示为实线
          } else if (face1Visible !== face2Visible) {
            solidEdgesArray.push(...edgeVertices);
          }
      }
    });

     this.solidEdges = new THREE.BufferAttribute(new Float32Array(solidEdgesArray), 3);
     this.dashedEdges = new THREE.BufferAttribute(new Float32Array(dashedEdgesArray), 3);
  }

  // 修改为公共方法
  public calculateFacesVisibility(
    geometry: THREE.BufferGeometry,
    camera: THREE.Camera,
    meshGroup: THREE.Group,
    normalLinesGroup?: THREE.Group
  ): Array<{
    normal: THREE.Vector3;
    visible: boolean;
    vertices: number[];
  }> {
    const indexAttribute = geometry.getIndex();
    const normalAttribute = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;

    if (!indexAttribute || !normalAttribute || !positionAttribute) {
      console.warn('Geometry missing required attributes');
      return [];
    }

    const facesArr: Array<{
      normal: THREE.Vector3;
      visible: boolean;
      vertices: number[];
    }> = [];

    for (let faceIndex = 0; faceIndex < indexAttribute.count / 3; faceIndex++) {
      const a = indexAttribute.getX(faceIndex * 3);
      
      // 从normalAttribute获取法向量并转换到世界坐标系
      const faceNormal = new THREE.Vector3(
        normalAttribute.getX(a),
        normalAttribute.getY(a),
        normalAttribute.getZ(a)
      ).normalize();
      
      // get rotation matrix from meshGroup.matrixWorld
      const rotationMatrix = new THREE.Matrix3().setFromMatrix4(meshGroup.matrixWorld);
      const worldFaceNormal = faceNormal.clone().applyMatrix3(rotationMatrix).normalize();
      
      // 使用相机的LookAt方向（负的z轴方向）作为视线方向
      const toCamera = new THREE.Vector3(0, 0, -1);
      camera.getWorldDirection(toCamera);
      
      // 计算面的可见性
      const isVisible = worldFaceNormal.dot(toCamera) < 0;
      
      // 计算面的中心点
      const center = new THREE.Vector3();
      for (let i = 0; i < 3; i++) {
        const vertexIndex = indexAttribute.getX(faceIndex * 3 + i);
        center.add(new THREE.Vector3(
          positionAttribute.getX(vertexIndex),
          positionAttribute.getY(vertexIndex),
          positionAttribute.getZ(vertexIndex)
        ));
      }
      center.divideScalar(3);

      // 创建法向量线
      if (DEBUG_SHOW_NORMALS && normalLinesGroup) {
        const normalLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            center,
            center.clone().add(faceNormal.multiplyScalar(0.5))
          ]),
          new THREE.LineBasicMaterial({
            color: this.getNormalColor(faceNormal.normalize()),
            linewidth: 2
          })
        );
        normalLinesGroup.add(normalLine);
      }
      
      facesArr.push({
        normal: faceNormal,
        visible: isVisible,
        vertices: [a, a + 1, a + 2]
      });
    }

    return facesArr;
  }

  // 根据法向量方向返回对应的颜色
  public getNormalColor(normal: THREE.Vector3): number {
    const x = Math.abs(normal.x);
    const y = Math.abs(normal.y);
    const z = Math.abs(normal.z);
    
    // 如果法向量与某个轴平行（允许一定的误差）
    if (x > 0.95) return 0xff0000; // 红色 - X轴
    if (y > 0.95) return 0x00ff00; // 绿色 - Y轴
    if (z > 0.95) return 0x0000ff; // 蓝色 - Z轴
    
    // 如果法向量与某个轴接近平行（允许更大的误差）
    if (x > 0.7) return 0xff8080; // 浅红色 - 接近X轴
    if (y > 0.7) return 0x80ff80; // 浅绿色 - 接近Y轴
    if (z > 0.7) return 0x8080ff; // 浅蓝色 - 接近Z轴
    
    return 0xffffff; // 白色 - 其他方向
  }
}

interface ThreeCanvasProps {
  width: number;
  height: number;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = observer(({ width, height }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const axesSceneRef = useRef<THREE.Scene>();
  const axesCameraRef = useRef<THREE.OrthographicCamera>();

  // ToolManager 相关状态
  const mouseState = useRef<MouseState>({
    isMouseDown: false,
    mouseX: 0,
    mouseY: 0,
    startMouseX: 0,
    startMouseY: 0,
  });
  const cameraState = useRef<CameraState>({
    frustumSize: 20,
    isRotatingCamera: false,
    cameraRotationStart: null,
  });
  const selectionState = useRef<SelectionState>({
    isDraggingObject: false,
    isRotatingObject: false,
    rotationAxis: null,
    dragStartWorldPos: null,
    dragStartObjectPos: null,
    dragStartObjectRotation: null,
    dragStartVertexPositions: null,
  });
  const lineEndpointState = useRef<LineEndpointState>({
    isDraggingEndpoint: false,
    draggedEndpoint: null,
    draggedLineId: null,
    dragStartEndpointPos: null,
    dragStartVertexPositions: null,
  });
  // 用于防止updateScene函数重复执行，避免在更新过程中触发新的更新
  // 这是一个防重复执行的锁
  // 当 updateScene 函数正在执行时，将其设置为 true
  // 防止在更新过程中触发新的更新，避免可能的死循环或性能问题
  //
  const isUpdatingRef = useRef(false);
  // 用于标记是否需要重置geometryStore中的hasChanged状态，避免在渲染过程中直接修改MobX状态
  // 这是一个状态更新标记
  // 当场景中的对象发生变化时（如添加、删除、修改等），将其设置为 true
  // 在 useEffect 中检查这个标记，决定是否需要重置 geometryStore 中的 hasChanged 状态
  // 这样可以避免在 React 渲染过程中直接修改 MobX 状态，防止出现警告或错误
  // 
  const needsUpdateRef = useRef(false);
  
  
  
  
  const toolManagerRef = useRef<ToolManager | null>(null);
  if (!toolManagerRef.current) {
    toolManagerRef.current = new ToolManager(
      mouseState.current,
      cameraState.current,
      selectionState.current,
      lineEndpointState.current,
      meshesRef
    );
  }

  // 初始化主场景
  const initializeMainScene = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;
    const aspect = width / height;
    cameraState.current.frustumSize = 20;
    const camera = new THREE.OrthographicCamera(
      -cameraState.current.frustumSize * aspect / 2,
      cameraState.current.frustumSize * aspect / 2,
      cameraState.current.frustumSize / 2,
      -cameraState.current.frustumSize / 2,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    return { scene, camera, renderer };
  };

  // 初始化坐标轴场景
  const initializeAxesScene = () => {
    const axesScene = new THREE.Scene();
    axesScene.background = null;
    axesSceneRef.current = axesScene;

    const axesFrustumSize = 2 / 1.8;
    const axesCamera = new THREE.OrthographicCamera(
      -axesFrustumSize, 
      axesFrustumSize, 
      axesFrustumSize, 
      -axesFrustumSize, 
      0.1, 
      10
    );
    axesCamera.position.set(0, 0, 5);
    axesCameraRef.current = axesCamera;

    // 创建坐标轴组
    const axesGroup = new THREE.Group();
    
    // X轴
    const xGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = 0.5;
    axesGroup.add(xAxis);
    
    const xArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = 1.1;
    axesGroup.add(xArrow);

    // Y轴
    const yGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = 0.5;
    axesGroup.add(yAxis);
    
    const yArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.y = 1.1;
    axesGroup.add(yArrow);

    // Z轴
    const zGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = 0.5;
    axesGroup.add(zAxis);
    
    const zArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = 1.1;
    axesGroup.add(zArrow);

    axesScene.add(axesGroup);
  };

  // 渲染循环
  const setupRenderLoop = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) => {
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 更新线段端点标记的方向
      updateAllLineEndpointsDirection(camera, meshesRef.current);
      
      // 渲染主场景
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.setScissorTest(false);
      renderer.render(scene, camera);
      
      // 额外渲染端点标记，确保它们在最前面
      renderer.autoClear = false;
      renderer.clear(false, false, false);
      meshesRef.current.forEach((meshGroup) => {
        if (meshGroup instanceof THREE.Group) {
          meshGroup.children.forEach(child => {
            if (child instanceof THREE.Mesh && 
                (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
              renderer.render(child, camera);
            }
          });
        }
      });
      renderer.autoClear = true;
      
      // 同步坐标轴相机视角
      if (axesCameraRef.current && camera) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        const cameraUp = new THREE.Vector3();
        camera.getWorldDirection(cameraUp);
        cameraUp.crossVectors(camera.up, cameraDirection).normalize();
        
        const axesCameraDistance = 5;
        axesCameraRef.current.position.copy(cameraDirection).multiplyScalar(-axesCameraDistance);
        axesCameraRef.current.lookAt(0, 0, 0);
        axesCameraRef.current.up.copy(camera.up);
        axesCameraRef.current.updateMatrix();
        axesCameraRef.current.updateMatrixWorld();
      }
      
      // 渲染坐标轴
      const axesViewportSize = 100;
      const axesOffset = 5;
      renderer.setViewport(axesOffset, axesOffset, axesViewportSize, axesViewportSize);
      renderer.setScissor(axesOffset, axesOffset, axesViewportSize, axesViewportSize);
      renderer.setScissorTest(true);
      
      renderer.autoClear = false;
      renderer.clear(false, true, false);
      if (axesSceneRef.current && axesCameraRef.current) {
        renderer.render(axesSceneRef.current, axesCameraRef.current);
      }
      renderer.autoClear = true;
      
      renderer.setScissorTest(false);
    };
    animate();
  };

  // 事件分发
  const setupMouseEvents = (renderer: THREE.WebGLRenderer, camera: THREE.OrthographicCamera) => {
    const handleWheel = (event: WheelEvent) => {
      toolManagerRef.current?.handleWheel(event, camera);
    };
    const handleMouseDown = (event: MouseEvent) => {
      toolManagerRef.current?.handleMouseDown(event, camera, renderer);
    };
    const handleMouseMove = (event: MouseEvent) => {
      toolManagerRef.current?.handleMouseMove(event, camera, renderer);
    };
    const handleMouseUp = (event: MouseEvent) => {
      toolManagerRef.current?.handleMouseUp(event, camera, renderer);
    };
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
    };
  };

  // 键盘事件处理
  const setupKeyboardEvents = (camera: THREE.OrthographicCamera) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      toolManagerRef.current?.handleKeyDown(event, camera);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  };

  // useEffect is called once when the component is mounted
  useEffect(() => {
    if (!mountRef.current) return;

    // 初始化场景
    const { scene, camera, renderer } = initializeMainScene();
    
    // 初始化坐标轴场景
    initializeAxesScene();
    
    // 设置渲染循环
    setupRenderLoop(renderer, scene, camera);
    
    // 设置事件监听
    const cleanupMouseEvents = setupMouseEvents(renderer, camera);
    const cleanupKeyboardEvents = setupKeyboardEvents(camera);

    // 挂载到DOM
    mountRef.current.appendChild(renderer.domElement);

    return () => {
      cleanupMouseEvents();
      cleanupKeyboardEvents();
      
      // 清理坐标轴场景
      if (axesSceneRef.current) {
        axesSceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);


  // updateScene is called everytime the geometryStore is updated
  const updateScene = useCallback(() => {
    if (!sceneRef.current || isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    const scene = sceneRef.current;
    const meshes = meshesRef.current;

    // 1. 删除不再存在的对象
    meshes.forEach((meshGroup, id) => {
      if (!geometryStore.shapes.find(shape => shape.id === id)) {
        if (meshGroup instanceof THREE.Group) {
          scene.remove(meshGroup);
          meshGroup.children.forEach(child => {
            if (child instanceof THREE.LineSegments || child instanceof THREE.Mesh || child instanceof THREE.Line) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(material => material.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }
        meshes.delete(id);
        needsUpdateRef.current = true;
      }
    });

    // 2. 更新或创建对象
    geometryStore.shapes.forEach(shape => {
      let meshGroup = meshes.get(shape.id);
      let needsUpdate = shape.hasChanged;  // 使用 hasChanged 标记判断是否需要更新

      if (!meshGroup) {
        // 创建新对象
        meshGroup = new THREE.Group();
        meshGroup.position.set(shape.position.x, shape.position.y, shape.position.z);
        meshGroup.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
        meshGroup.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
        meshGroup.updateMatrix();
        meshGroup.updateMatrixWorld(true);

        const geometry = createGeometry(shape);
        
        // 将相机和meshGroup信息添加到geometry的userData中
        geometry.userData.camera = cameraRef.current;
        geometry.userData.meshGroup = meshGroup;
        geometry.userData.camera.updateMatrix();
        geometry.userData.camera.updateMatrixWorld(true);
        
        // 对于线段，使用THREE.Line渲染
        if (shape.type === 'lineSegment') {
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: shape.color,
            linewidth: 2,
            depthTest: true, // 启用深度测试
            depthWrite: true // 写入深度缓冲区
          });
          const line = new THREE.Line(geometry, lineMaterial);
          // 设置较低的渲染顺序，确保线段在端点标记下面
          line.renderOrder = 0;
          meshGroup.add(line);
          
          // 为线段添加端点标记（如果被选中）
          const isSelected = geometryStore.selectedShapeId === shape.id;
          if (isSelected) {
            createLineEndpoints(geometry, meshGroup as THREE.Group, true);
          }
        } else {
          // 对于其他几何体，使用原有的Mesh渲染
          const edges = new CustomEdgesGeometry(geometry);
          
          // 使用工具函数创建边缘线段，传入选中状态
          const isSelected = geometryStore.selectedShapeId === shape.id;
          createEdgeSegments(edges, shape.color, meshGroup as THREE.Group, isSelected);
          
          const solidMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true,
            opacity: DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR ? 0.3 : 0,  // 根据调试开关控制面的显示
            side: THREE.DoubleSide,
            vertexColors: true
          });
          const solidMesh = new THREE.Mesh(geometry.clone(), solidMaterial);

          if (DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR) {
            // 使用工具函数更新面的颜色
            updateFaceColors(solidMesh.geometry, edges, cameraRef.current!, meshGroup as THREE.Group);
          }
          
          meshGroup.add(solidMesh);
        }
        scene.add(meshGroup);
        meshes.set(shape.id, meshGroup);
      } else {
        const currentMesh = meshGroup as THREE.Group;
        const isXformOrVisbilityChanged = isTransformOrVisibilityChanged(currentMesh, shape);
        const verticesChanged = hasVerticesChanged(shape);
        
        // 检查位置、旋转、缩放、可见性或顶点是否变化
        if (isXformOrVisbilityChanged || shape.hasSelectionChanged || shape.hasChanged || verticesChanged) {
          needsUpdate = true;
          needsUpdateRef.current = true;

          if (isXformOrVisbilityChanged) {
            // 更新meshGroup的变换
            meshGroup.position.set(shape.position.x, shape.position.y, shape.position.z);
            meshGroup.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
            meshGroup.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
            meshGroup.visible = shape.visible;
            meshGroup.updateMatrix();
            meshGroup.updateMatrixWorld(true);
          }

          // 如果顶点发生变化，需要重新创建几何体
          if (verticesChanged) {
            // 清理现有的几何体和材质（包括端点标记）
            currentMesh.children.forEach(child => {
              if (child instanceof THREE.LineSegments || child instanceof THREE.Mesh || child instanceof THREE.Line) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
                currentMesh.remove(child);
              }
            });

            // 重新创建几何体
            const newGeometry = createGeometry(shape);
            
            // 将相机和meshGroup信息添加到geometry的userData中
            newGeometry.userData.camera = cameraRef.current;
            newGeometry.userData.meshGroup = meshGroup;
            newGeometry.userData.camera.updateMatrix();
            newGeometry.userData.camera.updateMatrixWorld(true);
            
            // 对于线段，使用THREE.Line渲染
            if (shape.type === 'lineSegment') {
              const lineMaterial = new THREE.LineBasicMaterial({ 
                color: geometryStore.selectedShapeId === shape.id ? 0xff6b35 : parseInt(shape.color.replace('#', '0x')),
                linewidth: 2,
                depthTest: true,
                depthWrite: true
              });
              const line = new THREE.Line(newGeometry, lineMaterial);
              line.renderOrder = 0;
              meshGroup.add(line);
              
              // 为线段添加端点标记（如果被选中）
              const isSelected = geometryStore.selectedShapeId === shape.id;
              updateLineEndpoints(meshGroup as THREE.Group, newGeometry, isSelected);
            } else {
              // 对于其他几何体，使用原有的Mesh渲染
              const edges = new CustomEdgesGeometry(newGeometry);
              
              // 使用工具函数创建边缘线段，传入选中状态
              const isSelected = geometryStore.selectedShapeId === shape.id;
              createEdgeSegments(edges, shape.color, meshGroup as THREE.Group, isSelected);
              
              const solidMaterial = new THREE.MeshBasicMaterial({ 
                transparent: true,
                opacity: DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR ? 0.3 : 0,
                side: THREE.DoubleSide,
                vertexColors: true
              });
              const solidMesh = new THREE.Mesh(newGeometry.clone(), solidMaterial);

              if (DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR) {
                // 使用工具函数更新面的颜色
                updateFaceColors(solidMesh.geometry, edges, cameraRef.current!, meshGroup as THREE.Group);
              }
              
              meshGroup.add(solidMesh);
            }
          } else {
            // 重新计算边缘
            const solidMesh = currentMesh.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
            const line = currentMesh.children.find(child => child instanceof THREE.Line) as THREE.Line;
            
            if (shape.type === 'lineSegment' && line) {
              // 线段需要更新材质颜色（如果选中状态改变）或位置（如果变换改变）
              if (shape.hasSelectionChanged || isXformOrVisbilityChanged || verticesChanged) {
                if (shape.hasSelectionChanged) {
                  const lineMaterial = line.material as THREE.LineBasicMaterial;
                  lineMaterial.color.setHex(geometryStore.selectedShapeId === shape.id ? 0xff6b35 : parseInt(shape.color.replace('#', '0x')));
                  // 确保深度测试设置正确
                  lineMaterial.depthTest = true;
                  lineMaterial.depthWrite = true;
                }
                
                // 更新端点标记
                const isSelected = geometryStore.selectedShapeId === shape.id;
                updateLineEndpoints(meshGroup as THREE.Group, line.geometry, isSelected);
              }
            } else if (solidMesh && solidMesh.geometry) {
              if (isXformOrVisbilityChanged){
                // 更新相机信息
                solidMesh.geometry.userData.camera = cameraRef.current;
                solidMesh.geometry.userData.meshGroup = meshGroup;
                solidMesh.geometry.userData.camera.updateMatrix();
                solidMesh.geometry.userData.camera.updateMatrixWorld(true);
              }
              // 更新边缘几何体
              const newEdges = updateShapeEdgesGeometry(meshGroup, solidMesh.geometry, shape);

              if (DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR) {
                // 使用工具函数更新面的颜色
                updateFaceColors(solidMesh.geometry, newEdges, cameraRef.current!, meshGroup as THREE.Group);
              }
            }
          }
        }
      }

      // 清除变化标记
      if (shape.hasChanged) {
        shape.hasChanged = false;
      }

    });

    isUpdatingRef.current = false;
  }, [geometryStore.shapes, geometryStore.selectedShapeId]);

  // 使用useEffect来处理状态更新
  useEffect(() => {
    if (needsUpdateRef.current) {
      geometryStore.resetChangeFlags();
      needsUpdateRef.current = false;
    }
  }, [geometryStore.shapes, geometryStore.selectedShapeId]);

  // 直接调用updateScene，让MobX observer处理重新渲染
  updateScene();

  return <div ref={mountRef} style={{ width, height }} />;
}); 


