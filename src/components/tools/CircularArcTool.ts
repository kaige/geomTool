import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, ArcCreationState, IToolManager, ToolType } from '../../types/ToolTypes';
import { SnapManager } from '../../utils/SnapManager';

export class CircularArcTool extends BaseTool {
  private mouseState: MouseState;
  private arcCreationState: ArcCreationState;
  private tempLine: THREE.Line | null = null;
  private tempArc: THREE.Line | null = null;
  private tempDottedLine: THREE.Line | null = null;
  private snapManager: SnapManager;
  private snapMarker: THREE.Group | null = null;

  constructor(mouseState: MouseState, arcCreationState: ArcCreationState, toolManager: IToolManager) {
    super('Circular Arc', toolManager);
    this.mouseState = mouseState;
    this.arcCreationState = arcCreationState;
    this.snapManager = new SnapManager();
    this.snapMarker = this.snapManager.createSnapMarker();
  }

  activate(): void {
    super.activate();
    this.arcCreationState.isCreatingArc = true;
    this.arcCreationState.step = 'pick_start';
    this.arcCreationState.startPoint = null;
    this.arcCreationState.endPoint = null;
    this.arcCreationState.arcPoint = null;
    this.arcCreationState.tempArcId = null;
    this.snapManager.resetVisualState();
  }

  deactivate(): void {
    super.deactivate();
    this.arcCreationState.isCreatingArc = false;
    this.arcCreationState.step = null;
    this.cleanupTempGeometry();
    this.snapManager.resetVisualState();
  }

  onMouseDown = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = true;
    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
    this.mouseState.startMouseX = event.clientX;
    this.mouseState.startMouseY = event.clientY;

    const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
    if (!worldPos) return;

    // Apply snap to the clicked position
    const snapResult = this.snapManager.findSnapPoint(worldPos);
    const snappedPos = snapResult.snappedPosition;

    if (this.arcCreationState.step === 'pick_start') {
      // 第一步：选择起点
      this.arcCreationState.startPoint = snappedPos;
      this.arcCreationState.step = 'pick_end';
      this.createTempLine(snappedPos, camera, renderer);
    } else if (this.arcCreationState.step === 'pick_end') {
      // 第二步：选择终点
      this.arcCreationState.endPoint = snappedPos;
      this.arcCreationState.step = 'pick_arc_point';
      this.updateTempLine(snappedPos);

      // 创建一个合理的初始临时圆弧，使用起点和终点中点上方的一个点作为弧点
      if (this.arcCreationState.startPoint) {
        const midX = (this.arcCreationState.startPoint.x + snappedPos.x) / 2;
        const midY = (this.arcCreationState.startPoint.y + snappedPos.y) / 2;
        const distance = Math.sqrt(Math.pow(snappedPos.x - this.arcCreationState.startPoint.x, 2) + Math.pow(snappedPos.y - this.arcCreationState.startPoint.y, 2));
        const arcHeight = distance * 0.3; // 使用弦长的30%作为初始弧高

        // 计算垂直于弦的方向
        const dx = worldPos.x - this.arcCreationState.startPoint.x;
        const dy = worldPos.y - this.arcCreationState.startPoint.y;
        const perpX = -dy;
        const perpY = dx;
        const length = Math.sqrt(perpX * perpX + perpY * perpY);

        const initialArcPoint = new THREE.Vector3(
          midX + (perpX / length) * arcHeight,
          midY + (perpY / length) * arcHeight,
          0
        );

        this.createTempArc(initialArcPoint, camera, renderer);
      }
    } else if (this.arcCreationState.step === 'pick_arc_point') {
      // 第三步：选择弧上的点，创建圆弧
      if (this.arcCreationState.startPoint && this.arcCreationState.endPoint) {
        geometryStore.addCircularArc(
          this.arcCreationState.startPoint,
          this.arcCreationState.endPoint,
          snappedPos
        );

        // 重置圆弧创建状态，准备创建下一个圆弧
        this.cleanupTempGeometry();
        this.arcCreationState.step = 'pick_start';
        this.arcCreationState.startPoint = null;
        this.arcCreationState.endPoint = null;
        this.arcCreationState.arcPoint = null;
        this.snapManager.resetVisualState();
      }
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    const worldPos = this.screenToWorld(event.clientX, event.clientY, camera, renderer);
    if (!worldPos) return;

    // Apply snap to the mouse position
    const snapResult = this.snapManager.findSnapPoint(worldPos);
    const snappedPos = snapResult.snappedPosition;

    // Update snap marker
    if (this.snapMarker) {
      this.snapManager.updateSnapMarker(this.snapMarker);
    }

    if (this.arcCreationState.step === 'pick_end' && this.tempLine) {
      // 更新临时线条到鼠标位置
      this.updateTempLine(snappedPos);
    } else if (this.arcCreationState.step === 'pick_arc_point' && this.arcCreationState.startPoint && this.arcCreationState.endPoint) {
      // 更新临时圆弧到鼠标位置
      this.updateTempArc(snappedPos);

      // 创建或更新从终点到鼠标的虚线
      if (!this.tempDottedLine) {
        this.createTempDottedLine(snappedPos);
      } else {
        this.updateTempDottedLine(snappedPos);
      }
    }
  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = false;
  };

  onKeyDown(event: KeyboardEvent, camera: THREE.OrthographicCamera): void {
    if (event.key === 'Escape') {
      // 取消创建
      this.deactivate();
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

    // 使用Z=0平面
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      return intersectPoint;
    }
    return null;
  }

  private createTempLine(endPos: THREE.Vector3, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void {
    if (!this.arcCreationState.startPoint) return;

    const startVec = new THREE.Vector3(
      this.arcCreationState.startPoint.x,
      this.arcCreationState.startPoint.y,
      this.arcCreationState.startPoint.z
    );
    const points = [startVec, endPos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xff6b35,
      linewidth: 2,
      dashSize: 0.2,
      gapSize: 0.1
    });

    this.tempLine = new THREE.Line(geometry, material);
    // 计算虚线段
    this.tempLine.computeLineDistances();
    // 需要将临时线条添加到场景中，这里先存储，稍后在ThreeCanvas中处理
  }

  private updateTempLine(endPos: THREE.Vector3): void {
    if (!this.tempLine || !this.arcCreationState.startPoint) return;

    const startVec = new THREE.Vector3(
      this.arcCreationState.startPoint.x,
      this.arcCreationState.startPoint.y,
      this.arcCreationState.startPoint.z
    );
    const points = [startVec, endPos];
    this.tempLine.geometry.setFromPoints(points);
    // 重新计算虚线段
    this.tempLine.computeLineDistances();
  }

  private createTempArc(arcPos: THREE.Vector3, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void {
    if (!this.arcCreationState.startPoint || !this.arcCreationState.endPoint) return;

    // 创建临时圆弧几何体
    const startVec = new THREE.Vector3(
      this.arcCreationState.startPoint.x,
      this.arcCreationState.startPoint.y,
      this.arcCreationState.startPoint.z
    );
    const endVec = new THREE.Vector3(
      this.arcCreationState.endPoint.x,
      this.arcCreationState.endPoint.y,
      this.arcCreationState.endPoint.z
    );
    const points = this.generateArcPoints(startVec, endVec, arcPos);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff6b35,
      linewidth: 2
    });

    this.tempArc = new THREE.Line(geometry, material);
  }

  private updateTempArc(arcPos: THREE.Vector3): void {
    if (!this.tempArc || !this.arcCreationState.startPoint || !this.arcCreationState.endPoint) return;

    const startVec = new THREE.Vector3(
      this.arcCreationState.startPoint.x,
      this.arcCreationState.startPoint.y,
      this.arcCreationState.startPoint.z
    );
    const endVec = new THREE.Vector3(
      this.arcCreationState.endPoint.x,
      this.arcCreationState.endPoint.y,
      this.arcCreationState.endPoint.z
    );
    const points = this.generateArcPoints(startVec, endVec, arcPos);

    this.tempArc.geometry.setFromPoints(points);
  }

  private createTempDottedLine(mousePos: THREE.Vector3): void {
    if (!this.arcCreationState.endPoint) return;

    const endVec = new THREE.Vector3(
      this.arcCreationState.endPoint.x,
      this.arcCreationState.endPoint.y,
      this.arcCreationState.endPoint.z
    );
    const points = [endVec, mousePos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // 创建虚线材质
    const material = new THREE.LineDashedMaterial({
      color: 0x888888,
      linewidth: 1,
      dashSize: 0.2,
      gapSize: 0.1
    });

    this.tempDottedLine = new THREE.Line(geometry, material);
    // 计算虚线段
    this.tempDottedLine.computeLineDistances();
  }

  private updateTempDottedLine(mousePos: THREE.Vector3): void {
    if (!this.tempDottedLine || !this.arcCreationState.endPoint) return;

    const endVec = new THREE.Vector3(
      this.arcCreationState.endPoint.x,
      this.arcCreationState.endPoint.y,
      this.arcCreationState.endPoint.z
    );
    const points = [endVec, mousePos];

    this.tempDottedLine.geometry.setFromPoints(points);
    this.tempDottedLine.computeLineDistances();
  }

  private generateArcPoints(start: THREE.Vector3, end: THREE.Vector3, arc: THREE.Vector3): THREE.Vector3[] {
    // 简化的圆弧生成，使用圆弧的几何属性
    const points: THREE.Vector3[] = [];
    const numPoints = 32; // 圆弧分段数

    // 计算圆心和半径
    const center = this.calculateArcCenter(start, end, arc);
    const radius = start.distanceTo(center);
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);

    // 判断方向
    const arcAngle = Math.atan2(arc.y - center.y, arc.x - center.x);
    let clockwise = false;

    // 计算叉积确定方向
    const v1 = { x: start.x - center.x, y: start.y - center.y };
    const v2 = { x: arc.x - center.x, y: arc.y - center.y };
    const cross = v1.x * v2.y - v1.y * v2.x;
    clockwise = cross < 0;

    // 生成圆弧点
    let currentAngle = startAngle;
    const angleStep = this.calculateAngleStep(startAngle, endAngle, clockwise, numPoints);

    for (let i = 0; i <= numPoints; i++) {
      const x = center.x + radius * Math.cos(currentAngle);
      const y = center.y + radius * Math.sin(currentAngle);
      const z = 0;

      points.push(new THREE.Vector3(x, y, z));
      currentAngle += angleStep;
    }

    return points;
  }

  private calculateArcCenter(start: THREE.Vector3, end: THREE.Vector3, arc: THREE.Vector3): THREE.Vector3 {
    // 使用更稳健的方法计算圆弧中心
    // 基于三点确定圆的几何原理

    const ax = start.x, ay = start.y;
    const bx = arc.x, by = arc.y;
    const cx = end.x, cy = end.y;

    // 计算中点
    const midABx = (ax + bx) / 2;
    const midABy = (ay + by) / 2;
    const midBCx = (bx + cx) / 2;
    const midBCy = (by + cy) / 2;

    // 计算AB和BC的斜率
    const slopeAB = (by - ay) / (bx - ax);
    const slopeBC = (cy - by) / (cx - bx);

    // 处理垂直线的情况
    let centerX: number, centerY: number;

    if (Math.abs(bx - ax) < 1e-10 && Math.abs(cx - bx) < 1e-10) {
      // 两线都垂直，使用中点
      centerX = (ax + cx) / 2;
      centerY = (midABy + midBCy) / 2;
    } else if (Math.abs(bx - ax) < 1e-10) {
      // AB垂直，使用AB中点和BC的垂直平分线
      centerX = ax;
      const perpSlopeBC = -(cx - bx) / (cy - by);
      centerY = midBCy + perpSlopeBC * (centerX - midBCx);
    } else if (Math.abs(cx - bx) < 1e-10) {
      // BC垂直，使用BC中点和AB的垂直平分线
      centerX = cx;
      const perpSlopeAB = -(bx - ax) / (by - ay);
      centerY = midABy + perpSlopeAB * (centerX - midABx);
    } else if (Math.abs(slopeAB - slopeBC) < 1e-10) {
      // 斜率相近，三点接近共线，使用外接圆近似
      const radius = Math.sqrt(Math.pow(cx - ax, 2) + Math.pow(cy - ay, 2)) / 2;
      const angle = Math.atan2(cy - ay, cx - ax);
      centerX = (ax + cx) / 2 - radius * Math.sin(angle);
      centerY = (ay + cy) / 2 + radius * Math.cos(angle);
    } else {
      // 一般情况：求两条垂直平分线的交点
      const perpSlopeAB = -(bx - ax) / (by - ay);
      const perpSlopeBC = -(cx - bx) / (cy - by);

      // 解方程组求交点
      centerX = (perpSlopeAB * midABx - perpSlopeBC * midBCx + midBCy - midABy) / (perpSlopeAB - perpSlopeBC);
      centerY = perpSlopeAB * (centerX - midABx) + midABy;
    }

    // 验证计算结果，确保三点到圆心的距离大致相等
    const radius1 = Math.sqrt(Math.pow(ax - centerX, 2) + Math.pow(ay - centerY, 2));
    const radius2 = Math.sqrt(Math.pow(bx - centerX, 2) + Math.pow(by - centerY, 2));
    const radius3 = Math.sqrt(Math.pow(cx - centerX, 2) + Math.pow(cy - centerY, 2));

    // 如果半径差异太大，使用近似方法
    if (Math.max(radius1, radius2, radius3) - Math.min(radius1, radius2, radius3) > Math.max(radius1, radius2, radius3) * 0.5) {
      // 使用三点的外接圆公式
      const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      if (Math.abs(d) > 1e-10) {
        const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
        const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
        centerX = ux;
        centerY = uy;
      }
    }

    return new THREE.Vector3(centerX, centerY, 0);
  }

  private calculateAngleStep(startAngle: number, endAngle: number, clockwise: boolean, numPoints: number): number {
    let angleDiff = endAngle - startAngle;

    if (clockwise) {
      if (angleDiff > 0) {
        angleDiff -= 2 * Math.PI;
      }
    } else {
      if (angleDiff < 0) {
        angleDiff += 2 * Math.PI;
      }
    }

    return angleDiff / numPoints;
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

    if (this.tempArc) {
      if (this.tempArc.geometry) this.tempArc.geometry.dispose();
      if (this.tempArc.material) {
        const material = this.tempArc.material as THREE.Material;
        material.dispose();
      }
      this.tempArc = null;
    }

    if (this.tempDottedLine) {
      if (this.tempDottedLine.geometry) this.tempDottedLine.geometry.dispose();
      if (this.tempDottedLine.material) {
        const material = this.tempDottedLine.material as THREE.Material;
        material.dispose();
      }
      this.tempDottedLine = null;
    }
  }

  // 获取临时几何体用于渲染
  getTempGeometry(): { line?: THREE.Line, arc?: THREE.Line, dottedLine?: THREE.Line } {
    const result: { line?: THREE.Line, arc?: THREE.Line, dottedLine?: THREE.Line } = {};
    if (this.tempLine) result.line = this.tempLine;
    if (this.tempArc) result.arc = this.tempArc;
    if (this.tempDottedLine) result.dottedLine = this.tempDottedLine;
    return result;
  }

  // Get snap marker for rendering
  getSnapMarker(): THREE.Group | null {
    return this.snapMarker;
  }
}