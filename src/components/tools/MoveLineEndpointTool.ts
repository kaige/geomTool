import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, LineEndpointState, IToolManager, ToolType } from '../../types/ToolTypes';
import { LineSegment } from '../../types/GeometryTypes';

export class MoveLineEndpointTool extends BaseTool {
  private mouseState: MouseState;
  private lineEndpointState: LineEndpointState;

  constructor(mouseState: MouseState, lineEndpointState: LineEndpointState, toolManager: IToolManager) {
    super('Move Line Endpoint', toolManager);
    this.mouseState = mouseState;
    this.lineEndpointState = lineEndpointState;
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
    if (selectedShape && selectedShape.type === 'lineSegment') {
      const lineShape = selectedShape as LineSegment;
      const vertexId = this.lineEndpointState.draggedEndpoint === 'start' ? lineShape.startVertexId : lineShape.endVertexId;
      const vertex = geometryStore.getVertexById(vertexId);
      
      if (vertex) {
        // 使用线段的位置作为平面参考点，避免累积误差
        const linePosition = new THREE.Vector3(
          selectedShape.position.x,
          selectedShape.position.y,
          selectedShape.position.z
        );
        const currentWorldPos = this.screenToWorldForEndpoint(event.clientX, event.clientY, camera, renderer, linePosition);
        
        if (currentWorldPos) {
          // 更新顶点位置
          geometryStore.updateVertex(vertexId, {
            x: currentWorldPos.x,
            y: currentWorldPos.y,
            z: currentWorldPos.z
          });
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
    
    // 切换回选择工具
    this.deactivate();
    this.toolManager.activateTool(ToolType.SELECT);
  };

  setEndpointInfo = (lineId: string, endpoint: 'start' | 'end'): void => {
    this.lineEndpointState.draggedLineId = lineId;
    this.lineEndpointState.draggedEndpoint = endpoint;
  };

  private screenToWorldForEndpoint = (screenX: number, screenY: number, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer, planePoint: THREE.Vector3): THREE.Vector3 | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // 使用传入的平面点和相机朝向定义平面
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
} 