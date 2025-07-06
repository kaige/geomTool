import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { IToolManager, MouseState, SelectionState, ToolType } from '../../types/ToolTypes';
import { LineSegment } from '../../types/GeometryTypes';

export class MoveShapeTool extends BaseTool {
  private mouseState: MouseState;
  private selectionState: SelectionState;

  constructor(mouseState: MouseState, selectionState: SelectionState, toolManager: IToolManager) {
    super('Move Shape', toolManager);
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
    if (selectedShape) {
      const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
      if (worldPos) {
        this.selectionState.dragStartWorldPos = worldPos.clone();
        this.selectionState.dragStartObjectPos = {
          x: selectedShape.position.x,
          y: selectedShape.position.y,
          z: selectedShape.position.z
        };

        // 如果是线段，还需要记录顶点的初始位置
        if (selectedShape.type === 'lineSegment') {
          const lineShape = selectedShape as LineSegment;
          const startVertex = geometryStore.getVertexById(lineShape.startVertexId);
          const endVertex = geometryStore.getVertexById(lineShape.endVertexId);
          
          if (startVertex && endVertex) {
            this.selectionState.dragStartVertexPositions = {
              start: { ...startVertex.position },
              end: { ...endVertex.position }
            };
          }
        }
      }
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    if (!this.mouseState.isMouseDown || !this.selectionState.isDraggingObject) {
      return;
    }

    const currentWorldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
    if (currentWorldPos && this.selectionState.dragStartWorldPos && this.selectionState.dragStartObjectPos) {
      const totalDelta = new THREE.Vector3();
      totalDelta.subVectors(currentWorldPos, this.selectionState.dragStartWorldPos);

      const selectedShape = geometryStore.selectedShape;
      if (selectedShape && selectedShape.type === 'lineSegment') {
        const lineShape = selectedShape as LineSegment;
        
        // 使用拖拽开始时记录的顶点位置
        if (this.selectionState.dragStartVertexPositions) {
          geometryStore.updateVertex(lineShape.startVertexId, {
            x: this.selectionState.dragStartVertexPositions.start.x + totalDelta.x,
            y: this.selectionState.dragStartVertexPositions.start.y + totalDelta.y,
            z: this.selectionState.dragStartVertexPositions.start.z + totalDelta.z,
          });
          
          geometryStore.updateVertex(lineShape.endVertexId, {
            x: this.selectionState.dragStartVertexPositions.end.x + totalDelta.x,
            y: this.selectionState.dragStartVertexPositions.end.y + totalDelta.y,
            z: this.selectionState.dragStartVertexPositions.end.z + totalDelta.z,
          });
        }
      } else if (selectedShape) {
        // 如果是其他形状，更新形状的位置
        geometryStore.updateShape(geometryStore.selectedShapeId!, {
          position: {
            x: this.selectionState.dragStartObjectPos.x + totalDelta.x,
            y: this.selectionState.dragStartObjectPos.y + totalDelta.y,
            z: this.selectionState.dragStartObjectPos.z + totalDelta.z,
          }
        });
        console.log('update shape position', geometryStore.selectedShapeId);
      }
    }

    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
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

  private screenToWorld = (screenX: number, screenY: number, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): THREE.Vector3 | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    let planePoint = new THREE.Vector3(0, 0, 0);
    if (geometryStore.selectedShape) {
      planePoint.set(
        geometryStore.selectedShape.position.x,
        geometryStore.selectedShape.position.y,
        geometryStore.selectedShape.position.z
      );
    }
    
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(cameraDirection, planePoint);
    
    const intersectPoint = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint;
    }
    return null;
  };
} 