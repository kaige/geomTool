import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, SelectionState, IToolManager, ToolType } from '../../types/ToolTypes';
import { CircularArc } from '../../types/GeometryTypes';

export class MoveArcTool extends BaseTool {
  private mouseState: MouseState;
  private selectionState: SelectionState;
  private initialRadius: number = 0;
  private initialDistance: number = 0;

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

      if (centerVertex && startVertex) {
        // 记录初始半径
        const centerVec = new THREE.Vector3(
          centerVertex.position.x,
          centerVertex.position.y,
          centerVertex.position.z
        );
        const startVec = new THREE.Vector3(
          startVertex.position.x,
          startVertex.position.y,
          startVertex.position.z
        );
        this.initialRadius = centerVec.distanceTo(startVec);

        // 记录鼠标到圆心的初始距离
        const worldPos = this.screenToWorld(
          event.clientX,
          event.clientY,
          camera,
          renderer
        );

        if (worldPos) {
          this.initialDistance = worldPos.distanceTo(new THREE.Vector3(
            centerVertex.position.x,
            centerVertex.position.y,
            centerVertex.position.z
          ));
        }

        // 记录拖拽开始时的位置
        this.selectionState.dragStartWorldPos = worldPos;
        this.selectionState.dragStartObjectPos = { ...selectedShape.position };

        // 记录顶点起始位置
        const endVertex = geometryStore.getVertexById(arcShape.endVertexId);
        if (endVertex) {
          this.selectionState.dragStartVertexPositions = {
            start: { ...startVertex.position },
            end: { ...endVertex.position }
          };
        }
      }
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    if (!this.mouseState.isMouseDown || !this.selectionState.isDraggingObject) return;

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape && selectedShape.type === 'circularArc') {
      const arcShape = selectedShape as CircularArc;
      const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);

      if (centerVertex) {
        const worldPos = this.screenToWorld(
          event.clientX,
          event.clientY,
          camera,
          renderer
        );

        if (worldPos) {
          // 计算当前鼠标到圆心的距离
          const currentDistance = worldPos.distanceTo(new THREE.Vector3(
            centerVertex.position.x,
            centerVertex.position.y,
            centerVertex.position.z
          ));

          // 计算缩放比例
          if (this.initialDistance > 0) {
            const scale = currentDistance / this.initialDistance;

            // 更新圆弧半径（保持中心点不变）
            geometryStore.updateArcRadius(arcShape.id, scale);
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

    // 使用Z=0平面
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint;
    }
    return null;
  };
}