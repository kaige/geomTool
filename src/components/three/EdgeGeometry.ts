import * as THREE from 'three';

// Debug flags
export const DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR = false;
export const DEBUG_SHOW_NORMALS = false;

// Custom EdgesGeometry that determines edge visibility based on face visibility and angles
export class CustomEdgesGeometry extends THREE.EdgesGeometry {
  public solidEdges: THREE.BufferAttribute;
  public dashedEdges: THREE.BufferAttribute;
  public faces: Array<{
    normal: THREE.Vector3;
    visible: boolean;
    vertices: number[];
  }>;

  constructor(geometry: THREE.BufferGeometry) {
    super(geometry, 30); // 30 degree threshold

    this.solidEdges = new THREE.BufferAttribute(new Float32Array(0), 3);
    this.dashedEdges = new THREE.BufferAttribute(new Float32Array(0), 3);
    this.faces = [];

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

    const normalLinesGroup = new THREE.Group();
    if (DEBUG_SHOW_NORMALS) {
      meshGroup.add(normalLinesGroup);
    }

    this.faces = this.calculateFacesVisibility(geometry, camera, meshGroup, normalLinesGroup);

    const edgeMap = new Map();

    // Build edge adjacency
    for (let i = 0; i < geometry.getIndex()!.count; i += 3) {
      const a = geometry.getIndex()!.getX(i);
      const b = geometry.getIndex()!.getX(i + 1);
      const c = geometry.getIndex()!.getX(i + 2);

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

      this.addEdge(edgeMap, posA, posB, i / 3);
      this.addEdge(edgeMap, posB, posC, i / 3);
      this.addEdge(edgeMap, posC, posA, i / 3);
    }

    const solidEdgesArray: number[] = [];
    const dashedEdgesArray: number[] = [];

    edgeMap.forEach((edgeInfo) => {
      if (!edgeInfo || edgeInfo.faceIndices.length === 0) return;

      const edgeVertices = [
        edgeInfo.startPoint.x, edgeInfo.startPoint.y, edgeInfo.startPoint.z,
        edgeInfo.endPoint.x, edgeInfo.endPoint.y, edgeInfo.endPoint.z
      ];

      if (edgeInfo.faceIndices.length === 1) {
        // Boundary edge
        const faceIndex = edgeInfo.faceIndices[0];
        const face = this.faces[faceIndex];
        if (face.visible) {
          solidEdgesArray.push(...edgeVertices);
        } else {
          dashedEdgesArray.push(...edgeVertices);
        }
      } else {
        // Internal edge
        const [face1, face2] = edgeInfo.faceIndices;
        const face1Visible = this.faces[face1].visible;
        const face2Visible = this.faces[face2].visible;

        const face1Normal = this.faces[face1].normal;
        const face2Normal = this.faces[face2].normal;
        const dotProduct = face1Normal.dot(face2Normal);
        const angle = Math.acos(dotProduct);

        const isSharpEdge = angle > (this.parameters.thresholdAngle) * Math.PI / 180;

        if (face1Visible && face2Visible && isSharpEdge) {
          solidEdgesArray.push(...edgeVertices);
        } else if (!face1Visible && !face2Visible && isSharpEdge) {
          dashedEdgesArray.push(...edgeVertices);
        } else if (face1Visible !== face2Visible) {
          solidEdgesArray.push(...edgeVertices);
        }
      }
    });

    this.solidEdges = new THREE.BufferAttribute(new Float32Array(solidEdgesArray), 3);
    this.dashedEdges = new THREE.BufferAttribute(new Float32Array(dashedEdgesArray), 3);
  }

  private addEdge(edgeMap: Map<string, any>, v1: THREE.Vector3, v2: THREE.Vector3, faceIndex: number): void {
    const midPoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    const key = `${midPoint.x.toFixed(6)}-${midPoint.y.toFixed(6)}-${midPoint.z.toFixed(6)}`;
    
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { startPoint: v1, endPoint: v2, faceIndices: [faceIndex] });
    } else {
      const edgeInfo = edgeMap.get(key);
      if (!edgeInfo.faceIndices.includes(faceIndex)) {
        edgeInfo.faceIndices.push(faceIndex);
      }
    }
  }

  public calculateFacesVisibility(
    geometry: THREE.BufferGeometry,
    camera: THREE.Camera,
    meshGroup: THREE.Group,
    normalLinesGroup?: THREE.Group
  ): Array<{ normal: THREE.Vector3; visible: boolean; vertices: number[] }> {
    const indexAttribute = geometry.getIndex();
    const normalAttribute = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;

    if (!indexAttribute || !normalAttribute || !positionAttribute) {
      console.warn('Geometry missing required attributes');
      return [];
    }

    const facesArr: Array<{ normal: THREE.Vector3; visible: boolean; vertices: number[] }> = [];

    for (let faceIndex = 0; faceIndex < indexAttribute.count / 3; faceIndex++) {
      const a = indexAttribute.getX(faceIndex * 3);

      const faceNormal = new THREE.Vector3(
        normalAttribute.getX(a),
        normalAttribute.getY(a),
        normalAttribute.getZ(a)
      ).normalize();

      const rotationMatrix = new THREE.Matrix3().setFromMatrix4(meshGroup.matrixWorld);
      const worldFaceNormal = faceNormal.clone().applyMatrix3(rotationMatrix).normalize();

      const toCamera = new THREE.Vector3(0, 0, -1);
      camera.getWorldDirection(toCamera);

      const isVisible = worldFaceNormal.dot(toCamera) < 0;

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

  public getNormalColor(normal: THREE.Vector3): number {
    const x = Math.abs(normal.x);
    const y = Math.abs(normal.y);
    const z = Math.abs(normal.z);

    if (x > 0.95) return 0xff0000; // Red - X axis
    if (y > 0.95) return 0x00ff00; // Green - Y axis
    if (z > 0.95) return 0x0000ff; // Blue - Z axis

    if (x > 0.7) return 0xff8080; // Light red
    if (y > 0.7) return 0x80ff80; // Light green
    if (z > 0.7) return 0x8080ff; // Light blue

    return 0xffffff; // White
  }
}

// Create edge segments for a shape
export function createEdgeSegments(
  edges: CustomEdgesGeometry,
  shapeColor: string,
  meshGroup: THREE.Group,
  isSelected: boolean = false
): { solidLineSegments: THREE.LineSegments; dashedLineSegments: THREE.LineSegments } {
  const solidLineMaterial = new THREE.LineBasicMaterial({
    color: isSelected ? 0xff6b35 : shapeColor,
    linewidth: 1
  });
  const solidLineGeometry = new THREE.BufferGeometry();
  solidLineGeometry.setAttribute('position', edges.solidEdges);
  const solidLineSegments = new THREE.LineSegments(solidLineGeometry, solidLineMaterial);
  meshGroup.add(solidLineSegments);

  const dashedLineMaterial = new THREE.LineDashedMaterial({
    color: isSelected ? 0xffb380 : 0x00aaff,
    dashSize: 0.02,
    gapSize: 0.008,
    linewidth: 0.5
  });
  const dashedLineGeometry = new THREE.BufferGeometry();
  dashedLineGeometry.setAttribute('position', edges.dashedEdges);
  const dashedLineSegments = new THREE.LineSegments(dashedLineGeometry, dashedLineMaterial);

  dashedLineSegments.computeLineDistances();
  meshGroup.add(dashedLineSegments);

  return { solidLineSegments, dashedLineSegments };
}

// Update face colors for debugging
export function updateFaceColors(
  geometry: THREE.BufferGeometry,
  edges: CustomEdgesGeometry,
  camera: THREE.Camera,
  meshGroup: THREE.Group
): void {
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  const faces = edges.calculateFacesVisibility(geometry, camera, meshGroup);
  
  faces.forEach((face) => {
    const color = face.visible ? [0, 1, 0] : [1, 0, 0];
    for (let i = 0; i < 3; i++) {
      const vertexIndex = face.vertices[i];
      colors[vertexIndex * 3] = color[0];
      colors[vertexIndex * 3 + 1] = color[1];
      colors[vertexIndex * 3 + 2] = color[2];
    }
  });
  
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
