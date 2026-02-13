import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, IToolManager, ToolType } from '../../types/ToolTypes';

export class CreateShape3DTool extends BaseTool {
  private mouseState: MouseState;
  private shapeType: 'sphere' | 'cube' | 'cylinder' | 'cone' | 'torus';
  private mouseDownTime: number = 0;
  private readonly CLICK_THRESHOLD = 300; // ms threshold for click vs drag

  constructor(shapeType: 'sphere' | 'cube' | 'cylinder' | 'cone' | 'torus', mouseState: MouseState, toolManager: IToolManager) {
    const nameMap = {
      sphere: 'Sphere',
      cube: 'Cube',
      cylinder: 'Cylinder',
      cone: 'Cone',
      torus: 'Torus'
    };
    super(nameMap[shapeType], toolManager);
    this.mouseState = mouseState;
    this.shapeType = shapeType;
  }

  activate(): void {
    super.activate();
  }

  deactivate(): void {
    super.deactivate();
  }

  onMouseDown = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = true;
    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
    this.mouseState.startMouseX = event.clientX;
    this.mouseState.startMouseY = event.clientY;
    this.mouseDownTime = Date.now();
  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = false;

    const mouseUpTime = Date.now();
    const timeDiff = mouseUpTime - this.mouseDownTime;

    // Only create shape on quick click (not drag)
    if (timeDiff < this.CLICK_THRESHOLD) {
      const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
      if (worldPos) {
        // Create 3D shape at clicked position (y=1 to be visible above the plane)
        geometryStore.addShape(this.shapeType, {
          x: worldPos.x,
          y: 1,
          z: worldPos.y // Use y for z since we're in 2D plane
        });
      }
    }
  };

  onKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    if (event.key === 'Escape') {
      this.toolManager.activateTool(ToolType.SELECT);
    }
  }

  updateCursor(renderer: THREE.WebGLRenderer): void {
    renderer.domElement.style.cursor = 'crosshair';
  }

  private screenToWorld(screenX: number, screenY: number, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): THREE.Vector3 | null {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Use Z=0 plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint;
    }
    return null;
  }
}
