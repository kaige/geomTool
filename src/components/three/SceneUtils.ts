import * as THREE from 'three';
import { GeometryShape } from '../../types/GeometryTypes';

// Check if transform or visibility has changed
export function isTransformOrVisibilityChanged(
  currentMesh: THREE.Group,
  shape: GeometryShape
): boolean {
  return (
    currentMesh.position.x !== shape.position.x ||
    currentMesh.position.y !== shape.position.y ||
    currentMesh.position.z !== shape.position.z ||
    currentMesh.rotation.x !== shape.rotation.x ||
    currentMesh.rotation.y !== shape.rotation.y ||
    currentMesh.rotation.z !== shape.rotation.z ||
    currentMesh.scale.x !== shape.scale.x ||
    currentMesh.scale.y !== shape.scale.y ||
    currentMesh.scale.z !== shape.scale.z ||
    currentMesh.visible !== shape.visible
  );
}

// Dispose of a mesh and its children
export function disposeMesh(mesh: THREE.Object3D): void {
  if (mesh instanceof THREE.Mesh || mesh instanceof THREE.Line || mesh instanceof THREE.LineSegments) {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }
}

// Clean up mesh group children
export function cleanupMeshGroup(meshGroup: THREE.Group): void {
  meshGroup.children.forEach(child => {
    disposeMesh(child);
  });
  meshGroup.clear();
}

// Update mesh group transform
export function updateMeshTransform(meshGroup: THREE.Group, shape: GeometryShape): void {
  meshGroup.position.set(shape.position.x, shape.position.y, shape.position.z);
  meshGroup.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
  meshGroup.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
  meshGroup.visible = shape.visible;
  meshGroup.updateMatrix();
  meshGroup.updateMatrixWorld(true);
}

// Setup geometry user data
export function setupGeometryUserData(
  geometry: THREE.BufferGeometry,
  camera: THREE.OrthographicCamera,
  meshGroup: THREE.Group
): void {
  geometry.userData.camera = camera;
  geometry.userData.meshGroup = meshGroup;
  geometry.userData.camera.updateMatrix();
  geometry.userData.camera.updateMatrixWorld(true);
}

// Parse color string to hex number
export function parseColor(colorString: string): number {
  return parseInt(colorString.replace('#', '0x'));
}
