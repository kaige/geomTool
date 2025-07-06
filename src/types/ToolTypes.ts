import * as THREE from 'three';
import { geometryStore } from '../stores/GeometryStore';

// 基础 Tool 接口
export interface ITool {
  name: string;
  isActive: boolean;
  
  onMouseDown?(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void;
  onMouseMove?(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void;
  onMouseUp?(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void;
  onWheel?(event: WheelEvent, camera: THREE.OrthographicCamera): void;
  onKeyDown?(event: KeyboardEvent, camera: THREE.OrthographicCamera): void;
  
  activate(): void;
  deactivate(): void;
  updateCursor?(renderer: THREE.WebGLRenderer): void;
}

// 鼠标状态接口
export interface MouseState {
  isMouseDown: boolean;
  mouseX: number;
  mouseY: number;
  startMouseX: number;
  startMouseY: number;
}

// 相机状态接口
export interface CameraState {
  frustumSize: number;
  isRotatingCamera: boolean;
  cameraRotationStart: { azimuth: number; elevation: number } | null;
}

// 选择状态接口
export interface SelectionState {
  isDraggingObject: boolean;
  isRotatingObject: boolean;
  rotationAxis: 'x' | 'y' | 'z' | null;
  dragStartWorldPos: THREE.Vector3 | null;
  dragStartObjectPos: { x: number; y: number; z: number } | null;
  dragStartObjectRotation: { x: number; y: number; z: number } | null;
  dragStartVertexPositions: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } } | null;
}

// 线段端点拖拽状态接口
export interface LineEndpointState {
  isDraggingEndpoint: boolean;
  draggedEndpoint: 'start' | 'end' | null;
  draggedLineId: string | null;
  dragStartEndpointPos: { x: number; y: number; z: number } | null;
  dragStartVertexPositions: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } } | null;
}

// 工具类型枚举
export enum ToolType {
  SELECT = 'select',
  MOVE_SHAPE = 'move_shape',
  MOVE_LINE_ENDPOINT = 'move_line_endpoint',
  ROTATE_SHAPE = 'rotate_shape',
  CREATE_SPHERE = 'create_sphere',
  CREATE_CUBE = 'create_cube',
  CREATE_CYLINDER = 'create_cylinder',
  CREATE_CONE = 'create_cone',
  CREATE_TORUS = 'create_torus',
  CREATE_LINE_SEGMENT = 'create_line_segment',
  CREATE_RECTANGLE = 'create_rectangle',
  CREATE_CIRCLE = 'create_circle',
  CREATE_TRIANGLE = 'create_triangle',
  CREATE_POLYGON = 'create_polygon'
}

// 工具管理器接口
export interface IToolManager {
  currentTool: ITool | null;
  tools: Map<ToolType, ITool>;
  
  activateTool(toolType: ToolType): void;
  deactivateCurrentTool(): void;
  getTool(toolType: ToolType): ITool | null;
  getCurrentTool(): ITool | null;
} 