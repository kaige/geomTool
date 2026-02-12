import * as THREE from 'three';

// Constants for endpoint markers
const TARGET_SCREEN_SIZE = 150;
const BASE_FRUSTUM_SIZE = 20;
const RING_INNER_RATIO = 0.9;
const NUM_SEGMENTS = 16;
const CIRCLE_RENDER_ORDER = 10;
const RING_RENDER_ORDER = 11;

// Calculate circle radius based on camera zoom
function calculateCircleRadius(camera?: THREE.OrthographicCamera): number {
  const currentFrustumSize = camera ? camera.top - camera.bottom : 20;
  const scaleFactor = currentFrustumSize / BASE_FRUSTUM_SIZE;
  return (TARGET_SCREEN_SIZE / 500) * scaleFactor;
}

// Create a circle marker with ring
function createMarker(
  position: THREE.Vector3,
  circleColor: number,
  ringColor: number,
  circleR: number,
  meshGroup: THREE.Group
): THREE.Mesh {
  const ringInnerR = circleR * RING_INNER_RATIO;
  const ringOuterR = circleR;

  // Create circle
  const circleGeometry = new THREE.CircleGeometry(circleR, NUM_SEGMENTS);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color: circleColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false
  });

  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.position.copy(position);
  circle.renderOrder = CIRCLE_RENDER_ORDER;
  meshGroup.add(circle);

  // Create ring
  const ringGeometry = new THREE.RingGeometry(ringInnerR, ringOuterR, NUM_SEGMENTS);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: ringColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
    depthTest: false,
    depthWrite: false
  });

  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(position);
  ring.renderOrder = RING_RENDER_ORDER;
  meshGroup.add(ring);

  return circle;
}

// Create line segment endpoint markers
export function createLineEndpoints(
  geometry: THREE.BufferGeometry,
  meshGroup: THREE.Group,
  isSelected: boolean = false,
  camera?: THREE.OrthographicCamera
): { startPoint: THREE.Mesh; endPoint: THREE.Mesh } | null {
  if (!isSelected) return null;

  const positions = geometry.getAttribute('position');
  if (!positions || positions.count < 2) return null;

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

  const circleR = calculateCircleRadius(camera);
  const startPoint = createMarker(startPos, 0xffffff, 0xff6b35, circleR, meshGroup);
  const endPoint = createMarker(endPos, 0xffffff, 0xff6b35, circleR, meshGroup);

  return { startPoint, endPoint };
}

// Create arc endpoint markers (center, start, end)
export function createArcEndpoints(
  centerPos: THREE.Vector3,
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  meshGroup: THREE.Group,
  isSelected: boolean = false,
  camera?: THREE.OrthographicCamera
): { centerPoint: THREE.Mesh; startPoint: THREE.Mesh; endPoint: THREE.Mesh } | null {
  if (!isSelected) return null;

  const circleR = calculateCircleRadius(camera);
  const centerPoint = createMarker(centerPos, 0x00ff00, 0x00aa00, circleR, meshGroup);
  const startPoint = createMarker(startPos, 0xffffff, 0xff6b35, circleR, meshGroup);
  const endPoint = createMarker(endPos, 0xffffff, 0xff6b35, circleR, meshGroup);

  return { centerPoint, startPoint, endPoint };
}

// Remove endpoint markers from mesh group
function removeEndpointMarkers(meshGroup: THREE.Group): void {
  const childrenToRemove: THREE.Object3D[] = [];
  meshGroup.children.forEach(child => {
    if (child instanceof THREE.Mesh &&
        (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
      childrenToRemove.push(child);
    }
  });

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
}

// Update arc endpoint markers
export function updateArcEndpoints(
  meshGroup: THREE.Group,
  centerPos: THREE.Vector3,
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  isSelected: boolean,
  camera?: THREE.OrthographicCamera
): void {
  removeEndpointMarkers(meshGroup);
  if (isSelected) {
    createArcEndpoints(centerPos, startPos, endPos, meshGroup, true, camera);
  }
}

// Update line endpoint markers
export function updateLineEndpoints(
  meshGroup: THREE.Group,
  geometry: THREE.BufferGeometry,
  isSelected: boolean,
  camera?: THREE.OrthographicCamera
): void {
  removeEndpointMarkers(meshGroup);
  if (isSelected) {
    createLineEndpoints(geometry, meshGroup, true, camera);
  }
}

// Update all endpoint markers to face camera
export function updateAllEndpointsDirection(camera: THREE.Camera, meshes: Map<string, THREE.Object3D>): void {
  meshes.forEach((meshGroup) => {
    if (meshGroup instanceof THREE.Group) {
      const line = meshGroup.children.find(child => child instanceof THREE.Line);
      if (line) {
        meshGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh &&
              (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
            child.lookAt(camera.position);
          }
        });
      }
    }
  });
}

// Update all endpoint markers scale based on camera zoom
export function updateAllEndpointsScale(camera: THREE.OrthographicCamera, meshes: Map<string, THREE.Object3D>): void {
  const newCircleR = calculateCircleRadius(camera) / 2;

  meshes.forEach((meshGroup) => {
    if (meshGroup instanceof THREE.Group) {
      const line = meshGroup.children.find(child => child instanceof THREE.Line);
      if (line) {
        meshGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh &&
              (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
            const oldGeometry = child.geometry;
            if (oldGeometry instanceof THREE.CircleGeometry) {
              child.geometry = new THREE.CircleGeometry(newCircleR, NUM_SEGMENTS);
            } else if (oldGeometry instanceof THREE.RingGeometry) {
              child.geometry = new THREE.RingGeometry(newCircleR * RING_INNER_RATIO, newCircleR, NUM_SEGMENTS);
            }
            oldGeometry.dispose();
          }
        });
      }
    }
  });
}
