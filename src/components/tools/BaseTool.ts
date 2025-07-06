import * as THREE from 'three';
import { ITool, IToolManager } from '../../types/ToolTypes';

export abstract class BaseTool implements ITool {
  name: string;
  isActive: boolean = false;
  toolManager: IToolManager;

  constructor(name: string, toolManager: IToolManager) {
    this.name = name;
    this.toolManager = toolManager;
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  onMouseDown?(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void;
  onMouseMove?(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void;
  onMouseUp?(event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void;
  onWheel?(event: WheelEvent, camera: THREE.OrthographicCamera): void;
  onKeyDown?(event: KeyboardEvent, camera: THREE.OrthographicCamera): void;
  updateCursor?(renderer: THREE.WebGLRenderer): void;
} 