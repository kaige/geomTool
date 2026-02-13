import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, ArcEndpointState, IToolManager, ToolType } from '../../types/ToolTypes';
import { CircularArc } from '../../types/GeometryTypes';
import { SnapManager } from '../../utils/SnapManager';

export class MoveArcEndpointTool extends BaseTool {
  private mouseState: MouseState;
  private arcEndpointState: ArcEndpointState;
  private snapManager: SnapManager;
  private snapMarker: THREE.Group | null = null;

  constructor(mouseState: MouseState, arcEndpointState: ArcEndpointState, toolManager: IToolManager) {
    super('Move Arc Endpoint', toolManager);
    this.mouseState = mouseState;
    this.arcEndpointState = arcEndpointState;
    this.snapManager = new SnapManager();
    this.snapMarker = this.snapManager.createSnapMarker();
  }

  activate(): void {
    super.activate();
    this.snapManager.resetVisualState();
  }

  deactivate(): void {
    super.deactivate();
    this.snapManager.resetVisualState();
  }

  onMouseDown = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = true;
    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
    this.mouseState.startMouseX = event.clientX;
    this.mouseState.startMouseY = event.clientY;
    this.arcEndpointState.isDraggingEndpoint = true;
    renderer.domElement.style.cursor = 'crosshair';

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'circularArc') {
      const arcShape = selectedShape as CircularArc;
      let vertexId: string;

      if (this.arcEndpointState.draggedEndpoint === 'start') {
        vertexId = arcShape.startVertexId;
      } else if (this.arcEndpointState.draggedEndpoint === 'end') {
        vertexId = arcShape.endVertexId;
      } else {
        return;
      }

      const vertex = geometryStore.getVertexById(vertexId);
      if (vertex) {
        this.arcEndpointState.dragStartEndpointPos = { ...vertex.position };

        // Record all relevant vertex positions for arc recalculation
        const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);
        const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
        const endVertex = geometryStore.getVertexById(arcShape.endVertexId);

        if (centerVertex && startVertex && endVertex) {
          this.arcEndpointState.dragStartVertexPositions = {
            center: { ...centerVertex.position },
            start: { ...startVertex.position },
            end: { ...endVertex.position }
          };
        }
      }
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    if (!this.mouseState.isMouseDown ||
        !this.arcEndpointState.isDraggingEndpoint ||
        !this.arcEndpointState.draggedArcId ||
        !this.arcEndpointState.draggedEndpoint ||
        !this.arcEndpointState.dragStartEndpointPos) return;

    let snappedPos = undefined;

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'circularArc') {
      const arcShape = selectedShape as CircularArc;
      const arcCenterVertex = geometryStore.getVertexById(arcShape.centerVertexId);

      if (arcCenterVertex) {
        // Use the arc's center position as reference plane point
        const arcCenterPosition = new THREE.Vector3(arcCenterVertex.position.x, arcCenterVertex.position.y, arcCenterVertex.position.z);
        const currentWorldPos = this.screenToWorldForEndpoint(event.clientX, event.clientY, camera, renderer, arcCenterPosition);

        if (currentWorldPos) {
          // Check if Ctrl key is held - if so, slide on circle (preserve radius and center)
          if (event.ctrlKey) {
            // For Ctrl+drag, we project onto the circle without snap
            // to maintain smooth sliding along the arc
            geometryStore.slideArcEndpointOnCircle(
              arcShape.id,
              this.arcEndpointState.draggedEndpoint!,
              {
                x: currentWorldPos.x,
                y: currentWorldPos.y,
                z: currentWorldPos.z
              }
            );
          } else {
            // Normal drag: apply snap and recalculate center to preserve radius
            const snapResult = this.snapManager.findSnapPoint(currentWorldPos, arcShape.id);
            snappedPos = snapResult.snappedPosition;

            // Use the new update method for arc endpoints
            geometryStore.updateArcEndpoint(
              arcShape.id,
              this.arcEndpointState.draggedEndpoint!,
              {
                x: snappedPos.x,
                y: snappedPos.y,
                z: snappedPos.z
              }
            );
          }
        }
      }
    }

    // Update snap marker visibility (only for non-Ctrl drag)
    if (!event.ctrlKey && snappedPos) {
      const worldPos = this.screenToWorldForEndpoint(event.clientX, event.clientY, camera, renderer, new THREE.Vector3(snappedPos.x, snappedPos.y, snappedPos.z));
      if (worldPos) {
        this.snapManager.findSnapPoint(worldPos);
        if (this.snapMarker) {
          this.snapManager.updateSnapMarker(this.snapMarker);
        }
      }
    }

  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = false;
    this.arcEndpointState.isDraggingEndpoint = false;
    this.arcEndpointState.draggedEndpoint = null;
    this.arcEndpointState.draggedArcId = null;
    this.arcEndpointState.dragStartEndpointPos = null;
    this.arcEndpointState.dragStartVertexPositions = null;
    renderer.domElement.style.cursor = 'grab';

    // Switch back to select tool
    this.deactivate();
    this.toolManager.activateTool(ToolType.SELECT);
  };

  setEndpointInfo = (arcId: string, endpoint: 'start' | 'end'): void => {
    this.arcEndpointState.draggedArcId = arcId;
    this.arcEndpointState.draggedEndpoint = endpoint;
  };

  private screenToWorldForEndpoint = (
    screenX: number,
    screenY: number,
    camera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer,
    planePoint: THREE.Vector3
  ): THREE.Vector3 | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Use the provided plane point and camera direction to define the reference plane
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(cameraDirection, planePoint);

    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint;
    }
    return null;
  };

  // Get snap marker for rendering
  getSnapMarker(): THREE.Group | null {
    return this.snapMarker;
  }

  onKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    // No operation
  }

  updateCursor(renderer: THREE.WebGLRenderer): void {
    renderer.domElement.style.cursor = 'crosshair';
  }
}
