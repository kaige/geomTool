import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { IToolManager, MouseState, SelectionState, ToolType } from '../../types/ToolTypes';

export class RotateShapeTool extends BaseTool {
  private mouseState: MouseState;
  private selectionState: SelectionState;

  constructor(mouseState: MouseState, selectionState: SelectionState, toolManager: IToolManager) {
    super('Rotate Shape', toolManager);
    this.mouseState = mouseState;
    this.selectionState = selectionState;
  }

  onMouseDown = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = true;
    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
    this.mouseState.startMouseX = event.clientX;
    this.mouseState.startMouseY = event.clientY;
    this.selectionState.isRotatingObject = true;
    renderer.domElement.style.cursor = 'crosshair';

    const selectedShape = geometryStore.selectedShape;
    if (selectedShape) {
      this.selectionState.dragStartObjectRotation = {
        x: selectedShape.rotation.x,
        y: selectedShape.rotation.y,
        z: selectedShape.rotation.z
      };
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    if (!this.mouseState.isMouseDown || !this.selectionState.isRotatingObject || !this.selectionState.dragStartObjectRotation || !this.selectionState.rotationAxis) return;

    const rotationSensitivity = 0.01;
    
    const totalMouseDeltaX = (event.clientX - this.mouseState.startMouseX) * rotationSensitivity;
    const totalMouseDeltaY = (event.clientY - this.mouseState.startMouseY) * rotationSensitivity;
    
    let rotationDelta: number;
    switch (this.selectionState.rotationAxis) {
      case 'x':
        rotationDelta = totalMouseDeltaY;
        break;
      case 'y':
        rotationDelta = totalMouseDeltaX;
        break;
      case 'z':
        rotationDelta = -totalMouseDeltaX;
        break;
      default:
        rotationDelta = 0;
    }
    
    const newRotation = {
      ...this.selectionState.dragStartObjectRotation,
      [this.selectionState.rotationAxis]: this.selectionState.dragStartObjectRotation[this.selectionState.rotationAxis] + rotationDelta
    };
    
    geometryStore.updateShape(geometryStore.selectedShapeId!, {
      rotation: newRotation
    });
  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = false;
    this.selectionState.isRotatingObject = false;
    this.selectionState.rotationAxis = null;
    this.selectionState.dragStartObjectRotation = null;
    renderer.domElement.style.cursor = 'grab';
    
    // 切换回选择工具
    this.deactivate();
    this.toolManager.activateTool(ToolType.SELECT);
  };

  setRotationAxis = (axis: 'x' | 'y' | 'z'): void => {
    this.selectionState.rotationAxis = axis;
  };

  onKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    // 无操作
  }
} 