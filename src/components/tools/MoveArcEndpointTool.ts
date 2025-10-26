import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, ArcEndpointState, IToolManager, ToolType } from '../../types/ToolTypes';
import { CircularArc } from '../../types/GeometryTypes';

export class MoveArcEndpointTool extends BaseTool {
  private mouseState: MouseState;
  private arcEndpointState: ArcEndpointState;

  constructor(mouseState: MouseState, arcEndpointState: ArcEndpointState, toolManager: IToolManager) {
    super('Move Arc Endpoint', toolManager);
    this.mouseState = mouseState;
    this.arcEndpointState = arcEndpointState;
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

        // 记录所有相关顶点的起始位置
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

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'circularArc') {
      const arcShape = selectedShape as CircularArc;
      const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);

      if (centerVertex) {
        const currentWorldPos = this.screenToWorldForEndpoint(
          event.clientX,
          event.clientY,
          camera,
          renderer,
          new THREE.Vector3(centerVertex.position.x, centerVertex.position.y, centerVertex.position.z)
        );

        if (currentWorldPos) {
          // 更新端点位置，让GeometryStore重新计算圆弧
          geometryStore.updateArcEndpoint(
            arcShape.id,
            this.arcEndpointState.draggedEndpoint!,
            {
              x: currentWorldPos.x,
              y: currentWorldPos.y,
              z: currentWorldPos.z
            }
          );
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

    // 切换回选择工具
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

  onKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    // 无操作
  }

  updateCursor(renderer: THREE.WebGLRenderer): void {
    renderer.domElement.style.cursor = 'crosshair';
  }
}