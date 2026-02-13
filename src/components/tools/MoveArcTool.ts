import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, SelectionState, IToolManager, ToolType } from '../../types/ToolTypes';
import { CircularArc } from '../../types/GeometryTypes';

export class MoveArcTool extends BaseTool {
  private mouseState: MouseState;
  private selectionState: SelectionState;

  constructor(mouseState: MouseState, selectionState: SelectionState, toolManager: IToolManager) {
    super('Move Arc', toolManager);
    this.mouseState = mouseState;
    this.selectionState = selectionState;
  }

  onMouseDown = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = true;
    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
    this.mouseState.startMouseX = event.clientX;
    this.mouseState.startMouseY = event.clientY;
    this.selectionState.isDraggingObject = true;
    renderer.domElement.style.cursor = 'grabbing';

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'circularArc') {
      const arcShape = selectedShape as CircularArc;
      const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);
      const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
      const endVertex = geometryStore.getVertexById(arcShape.endVertexId);

      if (centerVertex && startVertex && endVertex) {
        // Record the starting center position
        this.selectionState.dragStartObjectPos = { ...centerVertex.position };

        // Record the initial world position under mouse
        const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
        this.selectionState.dragStartWorldPos = worldPos;
      }
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    if (!this.mouseState.isMouseDown || !this.selectionState.isDraggingObject) return;

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'circularArc') {
      const arcShape = selectedShape as CircularArc;
      const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
      const endVertex = geometryStore.getVertexById(arcShape.endVertexId);

      if (startVertex && endVertex && this.selectionState.dragStartWorldPos && this.selectionState.dragStartObjectPos) {
        // Get the current mouse position in world space
        const currentMousePos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
        if (!currentMousePos) return;

        // Calculate the chord (line between start and end)
        const startPoint = new THREE.Vector3(startVertex.position.x, startVertex.position.y, startVertex.position.z);
        const endPoint = new THREE.Vector3(endVertex.position.x, endVertex.position.y, endVertex.position.z);

        // Calculate the midpoint of the chord
        const chordMidpoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);

        // Calculate the perpendicular bisector direction
        const chordDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        const perpBisector = new THREE.Vector3(-chordDirection.y, chordDirection.x, 0).normalize();

        // Get the initial center position
        const initialCenter = new THREE.Vector3(
          this.selectionState.dragStartObjectPos.x,
          this.selectionState.dragStartObjectPos.y,
          this.selectionState.dragStartObjectPos.z
        );

        // Calculate how far along the perpendicular bisector the mouse has moved
        // Project the mouse position onto the perpendicular bisector line
        const mouseFromMidpoint = new THREE.Vector3().subVectors(currentMousePos, chordMidpoint);
        const distanceAlongPerp = mouseFromMidpoint.dot(perpBisector);

        // Calculate the new center position by moving along the perpendicular bisector
        // The center stays on the perpendicular bisector, maintaining equal distance to both endpoints
        const newCenter = new THREE.Vector3().copy(chordMidpoint).addScaledVector(perpBisector, distanceAlongPerp);

        // Update the center vertex position
        geometryStore.updateVertex(arcShape.centerVertexId, {
          x: newCenter.x,
          y: newCenter.y,
          z: newCenter.z
        });
      }
    }
  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = false;
    this.selectionState.isDraggingObject = false;
    this.selectionState.dragStartWorldPos = null;
    this.selectionState.dragStartObjectPos = null;
    renderer.domElement.style.cursor = 'grab';

    // 切换回选择工具
    this.deactivate();
    this.toolManager.activateTool(ToolType.SELECT);
  };

  onKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    // 无操作
  }

  updateCursor(renderer: THREE.WebGLRenderer): void {
    renderer.domElement.style.cursor = 'grab';
  }

  private screenToWorld = (
    screenX: number,
    screenY: number,
    camera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer
  ): THREE.Vector3 | null => {
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
  };
}
