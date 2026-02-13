import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, LineEndpointState, IToolManager, ToolType } from '../../types/ToolTypes';
import { LineSegment } from '../../types/GeometryTypes';
import { SnapManager } from '../../utils/SnapManager';

export class MoveLineEndpointTool extends BaseTool {
  private mouseState: MouseState;
  private lineEndpointState: LineEndpointState;
  private snapManager: SnapManager;
  private snapMarker: THREE.Group | null = null;

  constructor(mouseState: MouseState, lineEndpointState: LineEndpointState, toolManager: IToolManager) {
    super('Move Line Endpoint', toolManager);
    this.mouseState = mouseState;
    this.lineEndpointState = lineEndpointState;
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
    this.lineEndpointState.isDraggingEndpoint = true;
    renderer.domElement.style.cursor = 'crosshair';

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'lineSegment') {
      const lineShape = selectedShape as LineSegment;
      const vertexId = this.lineEndpointState.draggedEndpoint === 'start' ? lineShape.startVertexId : lineShape.endVertexId;
      const vertex = geometryStore.getVertexById(vertexId);

      if (vertex) {
        this.lineEndpointState.dragStartEndpointPos = { ...vertex.position };
      }
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    if (!this.mouseState.isMouseDown || !this.lineEndpointState.isDraggingEndpoint || !this.lineEndpointState.draggedLineId || !this.lineEndpointState.draggedEndpoint || !this.lineEndpointState.dragStartEndpointPos) return;

    const selectedShape = geometryStore.selectedShape;
    let snappedPos = undefined; // Initialize snappedPos variable
    if (selectedShape && selectedShape.type === 'lineSegment') {
      const lineShape = selectedShape as LineSegment;

      // Get the other endpoint to serve as reference plane
      const otherVertexId = this.lineEndpointState.draggedEndpoint === 'start' ? lineShape.endVertexId : lineShape.startVertexId;
      const otherVertex = geometryStore.getVertexById(otherVertexId);

      if (otherVertex) {
        // Use the line segment's position as reference plane point
        const linePosition = new THREE.Vector3(
          selectedShape.position.x,
          selectedShape.position.y,
          selectedShape.position.z
        );

        const currentWorldPos = this.screenToWorldForEndpoint(event.clientX, event.clientY, camera, renderer, linePosition);

        if (currentWorldPos) {
          // Apply snap to the current world position
          const snapResult = this.snapManager.findSnapPoint(currentWorldPos, lineShape.id);
          snappedPos = snapResult.snappedPosition;

          // Update vertex position with snapped value
          const vertexId = this.lineEndpointState.draggedEndpoint === 'start' ? lineShape.startVertexId : lineShape.endVertexId;
          geometryStore.updateVertex(vertexId, {
            x: snappedPos.x,
            y: snappedPos.y,
            z: snappedPos.z
          });
        }
      }
    }

    // Update snap marker visibility
    if (snappedPos) {
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
    this.lineEndpointState.isDraggingEndpoint = false;
    this.lineEndpointState.draggedEndpoint = null;
    this.lineEndpointState.draggedLineId = null;
    this.lineEndpointState.dragStartEndpointPos = null;
    renderer.domElement.style.cursor = 'grab';

    // Switch back to select tool
    this.deactivate();
    this.toolManager.activateTool(ToolType.SELECT);
  };

  setEndpointInfo = (lineId: string, endpoint: 'start' | 'end'): void => {
    this.lineEndpointState.draggedLineId = lineId;
    this.lineEndpointState.draggedEndpoint = endpoint;
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
