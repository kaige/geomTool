import { IToolManager, ITool, ToolType } from '../../types/ToolTypes';
import { SelectTool } from './SelectTool';
import { MoveShapeTool } from './MoveShapeTool';
import { RotateShapeTool } from './RotateShapeTool';
import { MoveLineEndpointTool } from './MoveLineEndpointTool';
import { CircularArcTool } from './CircularArcTool';
import { MoveArcEndpointTool } from './MoveArcEndpointTool';
import { MoveArcTool } from './MoveArcTool';
import { LineSegmentTool } from './LineSegmentTool';
import { MouseState, CameraState, SelectionState, LineEndpointState, ArcEndpointState, ArcCreationState } from '../../types/ToolTypes';
import * as THREE from 'three';

export class ToolManager implements IToolManager {
  currentTool: ITool | null = null;
  tools: Map<ToolType, ITool> = new Map();

  constructor(
    mouseState: MouseState,
    cameraState: CameraState,
    selectionState: SelectionState,
    lineEndpointState: LineEndpointState,
    arcEndpointState: ArcEndpointState,
    arcCreationState: ArcCreationState,
    meshesRef: React.MutableRefObject<Map<string, THREE.Object3D>>
  ) {
    // 初始化所有工具（除了SelectTool，因为它需要ToolManager引用）
    this.tools.set(ToolType.MOVE_SHAPE, new MoveShapeTool(mouseState, selectionState, this));
    this.tools.set(ToolType.ROTATE_SHAPE, new RotateShapeTool(mouseState, selectionState, this));
    this.tools.set(ToolType.MOVE_LINE_ENDPOINT, new MoveLineEndpointTool(mouseState, lineEndpointState, this));
    this.tools.set(ToolType.CREATE_CIRCULAR_ARC, new CircularArcTool(mouseState, arcCreationState, this));
    this.tools.set(ToolType.MOVE_ARC_ENDPOINT, new MoveArcEndpointTool(mouseState, arcEndpointState, this));
    this.tools.set(ToolType.MOVE_ARC, new MoveArcTool(mouseState, selectionState, this));
    this.tools.set(ToolType.CREATE_LINE_SEGMENT, new LineSegmentTool(mouseState, this));

    // 初始化SelectTool（需要传入this引用）
    this.tools.set(ToolType.SELECT, new SelectTool(mouseState, cameraState, meshesRef, this));

    // 默认激活选择工具
    this.activateTool(ToolType.SELECT);
  }

  activateTool(toolType: ToolType): void {
    // 停用当前工具
    if (this.currentTool) {
      this.currentTool.deactivate();
    }

    // 激活新工具
    const newTool = this.tools.get(toolType);
    if (newTool) {
      this.currentTool = newTool;
      this.currentTool.activate();
    }
  }                      

  deactivateCurrentTool(): void {
    if (this.currentTool) {
      this.currentTool.deactivate();
      this.activateTool(ToolType.SELECT);
    }
  }

  getTool(toolType: ToolType): ITool | null {
    return this.tools.get(toolType) || null;
  }

  // 获取当前工具
  getCurrentTool(): ITool | null {
    return this.currentTool;
  }

  // 处理鼠标事件
  handleMouseDown(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void {
    if (this.currentTool && this.currentTool.onMouseDown) {
      this.currentTool.onMouseDown(event, camera, renderer);
    }
  }

  handleMouseMove(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void {
    if (this.currentTool && this.currentTool.onMouseMove) {
      this.currentTool.onMouseMove(event, camera, renderer);
    }
  }

  handleMouseUp(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void {
    if (this.currentTool && this.currentTool.onMouseUp) {
      this.currentTool.onMouseUp(event, camera, renderer);
    }
  }

  handleWheel(event: WheelEvent, camera: THREE.OrthographicCamera): void {
    if (this.currentTool && this.currentTool.onWheel) {
      this.currentTool.onWheel(event, camera);
    }
  }

  handleKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    if (this.currentTool && this.currentTool.onKeyDown) {
      this.currentTool.onKeyDown(event, camera);
    }
  }

  updateCursor(renderer: THREE.WebGLRenderer): void {
    if (this.currentTool && this.currentTool.updateCursor) {
      this.currentTool.updateCursor(renderer);
    }
  }
} 