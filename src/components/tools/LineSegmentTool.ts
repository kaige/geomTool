import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, IToolManager, ToolType } from '../../types/ToolTypes';

export class LineSegmentTool extends BaseTool {
  private mouseState: MouseState;
  private startPoint: THREE.Vector3 | null = null;
  private mouseDownTime: number = 0;
  private mouseDownPosition: { x: number; y: number } | null = null;
  private tempLine: THREE.Line | null = null;
  private isDragging: boolean = false;
  private readonly CLICK_THRESHOLD = 150; // 150ms threshold for click vs drag
  private readonly MOVE_THRESHOLD = 5; // 5px threshold for movement detection
  private readonly DEFAULT_LINE_LENGTH = 2; // Default line length

  constructor(mouseState: MouseState, toolManager: IToolManager) {
    super('Line Segment', toolManager);
    this.mouseState = mouseState;
  }

  activate(): void {
    super.activate();
    this.startPoint = null;
    this.isDragging = false;
    this.cleanupTempGeometry();
  }

  deactivate(): void {
    super.deactivate();
    this.cleanupTempGeometry();
    this.startPoint = null;
    this.isDragging = false;
  }

  onMouseDown = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = true;
    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
    this.mouseState.startMouseX = event.clientX;
    this.mouseState.startMouseY = event.clientY;

    this.mouseDownTime = Date.now();
    this.mouseDownPosition = { x: event.clientX, y: event.clientY };

    const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
    if (!worldPos) return;

    this.startPoint = worldPos;
    this.isDragging = false;
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    if (!this.mouseState.isMouseDown || !this.startPoint || !this.mouseDownPosition) return;

    // Check if mouse has moved beyond threshold
    const dx = event.clientX - this.mouseDownPosition.x;
    const dy = event.clientY - this.mouseDownPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.MOVE_THRESHOLD) {
      this.isDragging = true;
    }

    if (this.isDragging) {
      const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
      if (!worldPos) return;

      // Update or create rubber band line
      if (!this.tempLine) {
        this.createTempLine(worldPos);
      } else {
        this.updateTempLine(worldPos);
      }
    }
  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = false;

    if (!this.startPoint) return;

    const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
    if (!worldPos) return;

    const mouseUpTime = Date.now();
    const timeDiff = mouseUpTime - this.mouseDownTime;

    // Determine if this was a click or drag
    if (!this.isDragging && timeDiff < this.CLICK_THRESHOLD) {
      // Quick click - create default length line segment
      this.createDefaultLineSegment(worldPos);
    } else if (this.isDragging) {
      // Drag - create line segment from start to end point
      this.createLineSegment(this.startPoint, worldPos);
    } else {
      // Mouse held but not moved - create default length line segment
      this.createDefaultLineSegment(worldPos);
    }

    // Clean up and reset
    this.cleanupTempGeometry();
    this.startPoint = null;
    this.isDragging = false;
    this.mouseDownPosition = null;

    // Switch back to select tool
    this.toolManager.activateTool(ToolType.SELECT);
  };

  onKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    if (event.key === 'Escape') {
      // Cancel creation
      this.cleanupTempGeometry();
      this.startPoint = null;
      this.isDragging = false;
      this.toolManager.activateTool(ToolType.SELECT);
    }
  }

  updateCursor(renderer: THREE.WebGLRenderer): void {
    renderer.domElement.style.cursor = 'crosshair';
  }

  private screenToWorld(screenX: number, screenY: number, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): THREE.Vector3 | null {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Use Z=0 plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint;
    }
    return null;
  }

  private createDefaultLineSegment(centerPos: THREE.Vector3): void {
    // Create a horizontal line segment with default length centered at click position
    const halfLength = this.DEFAULT_LINE_LENGTH / 2;
    const startPos = {
      x: centerPos.x - halfLength,
      y: centerPos.y,
      z: centerPos.z
    };
    const endPos = {
      x: centerPos.x + halfLength,
      y: centerPos.y,
      z: centerPos.z
    };

    geometryStore.addLineSegment(startPos, endPos);
  }

  private createLineSegment(start: THREE.Vector3, end: THREE.Vector3): void {
    const startPos = { x: start.x, y: start.y, z: start.z };
    const endPos = { x: end.x, y: end.y, z: end.z };
    geometryStore.addLineSegment(startPos, endPos);
  }

  private createTempLine(endPos: THREE.Vector3): void {
    if (!this.startPoint) return;

    const points = [this.startPoint, endPos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff6b35,
      linewidth: 2
    });

    this.tempLine = new THREE.Line(geometry, material);
  }

  private updateTempLine(endPos: THREE.Vector3): void {
    if (!this.tempLine || !this.startPoint) return;

    const points = [this.startPoint, endPos];
    this.tempLine.geometry.setFromPoints(points);
  }

  private cleanupTempGeometry(): void {
    if (this.tempLine) {
      if (this.tempLine.geometry) this.tempLine.geometry.dispose();
      if (this.tempLine.material) {
        const material = this.tempLine.material as THREE.Material;
        material.dispose();
      }
      this.tempLine = null;
    }
  }

  // Get temporary geometry for rendering
  getTempGeometry(): { line?: THREE.Line } {
    const result: { line?: THREE.Line } = {};
    if (this.tempLine) result.line = this.tempLine;
    return result;
  }
}
