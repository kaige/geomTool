import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, SelectionState, IToolManager, ToolType } from '../../types/ToolTypes';
import { CircularArc } from '../../types/GeometryTypes';
import { SnapManager } from '../../utils/SnapManager';

export class MoveArcTool extends BaseTool {
  private mouseState: MouseState;
  private selectionState: SelectionState;
  private snapManager: SnapManager;
  private snapMarker: THREE.Group | null = null;

  constructor(mouseState: MouseState, selectionState: SelectionState, toolManager: IToolManager) {
    super('Move Arc', toolManager);
    this.mouseState = mouseState;
    this.selectionState = selectionState;
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
    this.selectionState.isDraggingObject = true;
    renderer.domElement.style.cursor = 'grabbing';

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'circularArc') {
      const arcShape = selectedShape as CircularArc;
      const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);
      const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
      const endVertex = geometryStore.getVertexById(arcShape.endVertexId);

      if (centerVertex && startVertex && endVertex) {
        // Record the starting positions of all vertices
        this.selectionState.dragStartVertexPositions = {
          start: { ...startVertex.position },
          end: { ...endVertex.position }
        };

        // Record the center position for dragging
        this.selectionState.dragStartObjectPos = { ...centerVertex.position };

        // Record the initial world position under mouse
        const worldPos = this.screenToWorld(
          event.clientX,
          event.clientY,
          camera,
          renderer
        );
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

      if (startVertex && endVertex && this.selectionState.dragStartObjectPos) {
        // Calculate the midpoint between start and end (this is where the arc's chord midpoint is)
        const startPoint = new THREE.Vector3(startVertex.position.x, startVertex.position.y, startVertex.position.z);
        const endPoint = new THREE.Vector3(endVertex.position.x, endVertex.position.y, endVertex.position.z);
        const chordMidpoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);

        // Use chord midpoint as reference plane point
        const currentWorldPos = this.screenToWorld(
          event.clientX,
          event.clientY,
          camera,
          renderer,
          chordMidpoint
        );

        let snappedPos = currentWorldPos;

        if (currentWorldPos) {
          // Apply snap to the current world position
          const snapResult = this.snapManager.findSnapPoint(currentWorldPos, arcShape.id);
          snappedPos = snapResult.snappedPosition;
        }

        // Update the center vertex position
        // When moving the center while keeping endpoints fixed, we're changing the radius
        // The new center position is the snapped position
        if (snappedPos) {
          geometryStore.updateVertex(arcShape.centerVertexId, {
            x: snappedPos.x,
            y: snappedPos.y,
            z: snappedPos.z
          });
        }

        // Update snap marker visibility
        if (snappedPos && this.snapMarker) {
          const markerWorldPos = this.screenToWorld(
            event.clientX,
            event.clientY,
            camera,
            renderer,
            new THREE.Vector3(snappedPos.x, snappedPos.y, snappedPos.z)
          );
          if (markerWorldPos) {
            this.snapManager.findSnapPoint(markerWorldPos);
            this.snapManager.updateSnapMarker(this.snapMarker);
          }
        }
      }
    }
  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = false;
    this.selectionState.isDraggingObject = false;
    this.selectionState.dragStartWorldPos = null;
    this.selectionState.dragStartObjectPos = null;
    this.selectionState.dragStartVertexPositions = null;
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

  // Get snap marker for rendering
  getSnapMarker(): THREE.Group | null {
    return this.snapMarker;
  }

  private screenToWorld = (
    screenX: number,
    screenY: number,
    camera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer,
    planePoint?: THREE.Vector3
  ): THREE.Vector3 | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Use provided plane point or default to Z=0 plane
    let plane: THREE.Plane;
    if (planePoint) {
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(cameraDirection, planePoint);
    } else {
      plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    }

    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint;
    }
    return null;
  };
}
