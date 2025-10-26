import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, CameraState, IToolManager, ToolType } from '../../types/ToolTypes';
import { MoveLineEndpointTool } from './MoveLineEndpointTool';
import { RotateShapeTool } from './RotateShapeTool';
import { MoveArcEndpointTool } from './MoveArcEndpointTool';

export class SelectTool extends BaseTool {
  private mouseState: MouseState;
  private cameraState: CameraState;
  private meshesRef: React.MutableRefObject<Map<string, THREE.Object3D>>;

  constructor(
    mouseState: MouseState,
    cameraState: CameraState,
    meshesRef: React.MutableRefObject<Map<string, THREE.Object3D>>,
    toolManager: IToolManager
  ) {
    super('Select', toolManager);
    this.mouseState = mouseState;
    this.cameraState = cameraState;
    this.meshesRef = meshesRef;
    this.toolManager = toolManager;
  }

  onMouseDown = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    this.mouseState.isMouseDown = true;
    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
    this.mouseState.startMouseX = event.clientX;
    this.mouseState.startMouseY = event.clientY;

    // 检查是否点击了线段端点
    const endpointInfo = this.checkEndpointAtMouse(event, camera, renderer);
    if (endpointInfo) {
      // 激活线段端点移动工具
      const moveLineEndpointTool = this.toolManager.getTool(ToolType.MOVE_LINE_ENDPOINT) as MoveLineEndpointTool;
      if (moveLineEndpointTool && moveLineEndpointTool.onMouseDown) {
        moveLineEndpointTool.setEndpointInfo(endpointInfo.lineId, endpointInfo.endpoint);
        this.toolManager.activateTool(ToolType.MOVE_LINE_ENDPOINT);
        moveLineEndpointTool.onMouseDown(event, camera, renderer);
      }
      return;
    }

    // 检查是否点击了圆弧端点
    const arcEndpointInfo = this.checkArcEndpointAtMouse(event, camera, renderer);
    if (arcEndpointInfo) {
      // 激活圆弧端点移动工具
      const moveArcEndpointTool = this.toolManager.getTool(ToolType.MOVE_ARC_ENDPOINT) as MoveArcEndpointTool;
      if (moveArcEndpointTool && moveArcEndpointTool.onMouseDown) {
        moveArcEndpointTool.setEndpointInfo(arcEndpointInfo.arcId, arcEndpointInfo.endpoint);
        this.toolManager.activateTool(ToolType.MOVE_ARC_ENDPOINT);
        moveArcEndpointTool.onMouseDown(event, camera, renderer);
      }
      return;
    }

    // 检查是否点击了已选中的物体
    if (geometryStore.selectedShapeId) {
      const clickedShape = this.checkObjectAtMouse(event, camera, renderer);
      
      if (clickedShape && clickedShape === geometryStore.selectedShapeId) {
       
        let targetRotationAxis: 'x' | 'y' | 'z' | null = null;
        if (event.altKey) {
          targetRotationAxis = 'x';
        } else if (event.shiftKey) {
          targetRotationAxis = 'y';
        } else if (event.ctrlKey) {
          targetRotationAxis = 'z';
        }
        
        if (targetRotationAxis) {
          // 激活旋转工具
          const rotateShapeTool = this.toolManager.getTool(ToolType.ROTATE_SHAPE) as RotateShapeTool;
          if (rotateShapeTool && rotateShapeTool.onMouseDown) {
            rotateShapeTool.setRotationAxis(targetRotationAxis);
            this.toolManager.activateTool(ToolType.ROTATE_SHAPE);
            rotateShapeTool.onMouseDown(event, camera, renderer);
          }
          return;
        } else {
          // 激活移动工具
          const moveShapeTool = this.toolManager.getTool(ToolType.MOVE_SHAPE);
          if (moveShapeTool && moveShapeTool.onMouseDown) {
            this.toolManager.activateTool(ToolType.MOVE_SHAPE);
            moveShapeTool.onMouseDown(event, camera, renderer);
          }
          return;
        }
      }
      else {
        geometryStore.selectShape(clickedShape);
      }
    }

    // 检查是否要旋转相机
    if (event.ctrlKey) {
      this.cameraState.isRotatingCamera = true;
      renderer.domElement.style.cursor = 'move';
      
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      const azimuth = Math.atan2(-cameraDirection.x, -cameraDirection.z);
      const elevation = Math.asin(cameraDirection.y);
      
      this.cameraState.cameraRotationStart = { azimuth, elevation };
    }
  };

  onMouseMove = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    // 处理悬停检测
    if (!this.mouseState.isMouseDown) {
      const endpointInfo = this.checkEndpointAtMouse(event, camera, renderer);
      if (endpointInfo) {
        renderer.domElement.style.cursor = 'crosshair';
        return;
      }

      const arcEndpointInfo = this.checkArcEndpointAtMouse(event, camera, renderer);
      if (arcEndpointInfo) {
        renderer.domElement.style.cursor = 'crosshair';
        return;
      }

      const hoveredShape = this.checkObjectAtMouse(event, camera, renderer);

      if (hoveredShape && hoveredShape === geometryStore.selectedShapeId) {
        renderer.domElement.style.cursor = 'grab';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    }

    if (!this.mouseState.isMouseDown) return;

    const deltaX = event.clientX - this.mouseState.mouseX;
    const deltaY = event.clientY - this.mouseState.mouseY;

    if (this.cameraState.isRotatingCamera && this.cameraState.cameraRotationStart) {
      const rotationSensitivity = 0.005;
      
      const totalMouseDeltaX = (event.clientX - this.mouseState.startMouseX) * rotationSensitivity;
      const totalMouseDeltaY = (event.clientY - this.mouseState.startMouseY) * rotationSensitivity;
      
      const newAzimuth = this.cameraState.cameraRotationStart.azimuth - totalMouseDeltaX;
      const newElevation = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.cameraState.cameraRotationStart.elevation + totalMouseDeltaY));
      
      const distance = 15;
      const newCameraX = distance * Math.sin(newAzimuth) * Math.cos(newElevation);
      const newCameraY = distance * Math.sin(newElevation);
      const newCameraZ = distance * Math.cos(newAzimuth) * Math.cos(newElevation);
      
      camera.position.set(newCameraX, newCameraY, newCameraZ);
      camera.lookAt(0, 0, 0);
    } else if (!this.cameraState.isRotatingCamera && !geometryStore.selectedShapeId) {
      const aspect = camera.right / camera.top;
      const worldWidth = this.cameraState.frustumSize * aspect;
      const worldHeight = this.cameraState.frustumSize;
      
      const deltaScreenX = (deltaX / renderer.domElement.width) * worldWidth;
      const deltaScreenY = (deltaY / renderer.domElement.height) * worldHeight;
      
      const cameraRight = new THREE.Vector3();
      const cameraUp = new THREE.Vector3();
      
      camera.getWorldDirection(cameraRight);
      cameraRight.cross(camera.up).normalize();
      
      cameraUp.crossVectors(cameraRight, camera.getWorldDirection(new THREE.Vector3())).normalize();
      
      const moveVector = new THREE.Vector3();
      moveVector.addScaledVector(cameraRight, -deltaScreenX);
      moveVector.addScaledVector(cameraUp, deltaScreenY);
      
      camera.position.add(moveVector);
    }

    this.mouseState.mouseX = event.clientX;
    this.mouseState.mouseY = event.clientY;
  };

  onMouseUp = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    // 只有在鼠标确实按下时才处理点击逻辑
    if (this.mouseState.isMouseDown) {
      const deltaX = Math.abs(event.clientX - this.mouseState.mouseX);
      const deltaY = Math.abs(event.clientY - this.mouseState.mouseY);
      
      if (deltaX < 5 && deltaY < 5) {
        this.handleClick(event, camera, renderer);
      }
    }
    
    this.mouseState.isMouseDown = false;
    this.cameraState.isRotatingCamera = false;
    this.cameraState.cameraRotationStart = null;
    
    // 更新光标状态
    const hoveredShape = this.checkObjectAtMouse(event, camera, renderer);
    if (hoveredShape && hoveredShape === geometryStore.selectedShapeId) {
      renderer.domElement.style.cursor = 'grab';
    } else {
      renderer.domElement.style.cursor = 'default';
    }
  };

  onWheel = (event: WheelEvent, camera: THREE.OrthographicCamera): void => {
    event.preventDefault();
    
    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? 1 : -1;
    this.cameraState.frustumSize += delta * zoomSpeed * this.cameraState.frustumSize;
    
    this.cameraState.frustumSize = Math.max(1, Math.min(100, this.cameraState.frustumSize));
    
    const aspect = camera.right / camera.top;
    camera.left = -this.cameraState.frustumSize * aspect / 2;
    camera.right = this.cameraState.frustumSize * aspect / 2;
    camera.top = this.cameraState.frustumSize / 2;
    camera.bottom = -this.cameraState.frustumSize / 2;
    camera.updateProjectionMatrix();
  };

  onKeyDown = (event: KeyboardEvent, camera: THREE.OrthographicCamera): void => {
    if (event.key === 'Escape') {
      // 重置相机到默认位置
      camera.position.set(0, 0, 15);
      camera.lookAt(0, 0, 0);
      camera.up.set(0, 1, 0);
      camera.updateMatrix();
      camera.updateMatrixWorld();
    }
  };

  private handleClick = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    const endpointInfo = this.checkEndpointAtMouse(event, camera, renderer);
    if (endpointInfo) {
      return; // 点击端点时不处理线段选择
    }

    const arcEndpointInfo = this.checkArcEndpointAtMouse(event, camera, renderer);
    if (arcEndpointInfo) {
      return; // 点击圆弧端点时不处理形状选择
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.params.Line.threshold = 0.1;

    const intersectableObjects: THREE.Object3D[] = [];
    const idMap = new Map<THREE.Object3D, string>();
    
    this.meshesRef.current.forEach((meshGroup, id) => {
      if (meshGroup instanceof THREE.Group) {
        const solidMesh = meshGroup.children.find(child => 
          child instanceof THREE.Mesh && 
          !(child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)
        );
        const line = meshGroup.children.find(child => child instanceof THREE.Line);
        if (solidMesh) {
          intersectableObjects.push(solidMesh);
          idMap.set(solidMesh, id);
        } else if (line) {
          intersectableObjects.push(line);
          idMap.set(line, id);
        }
      }
    });

    const intersects = raycaster.intersectObjects(intersectableObjects, false);

    if (intersects.length > 0) {
      const closestIntersect = intersects[0];
      const clickedMesh = closestIntersect.object;
      const clickedShapeId = idMap.get(clickedMesh);

      if (clickedShapeId) {
        geometryStore.selectShape(clickedShapeId);
        
        const selectedShape = geometryStore.shapes.find(shape => shape.id === clickedShapeId);
        if (selectedShape) {
          this.printRotationDebug(clickedShapeId, selectedShape);
        }
      }
    } else {
      geometryStore.selectShape(null);
    }
  };

  private checkObjectAtMouse = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): string | null => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersectableObjects: THREE.Object3D[] = [];
    const idMap = new Map<THREE.Object3D, string>();
    const lineObjects: THREE.Line[] = [];
    const lineIdMap = new Map<THREE.Line, string>();
    
    this.meshesRef.current.forEach((meshGroup, id) => {
      if (meshGroup instanceof THREE.Group) {
        const solidMesh = meshGroup.children.find(child => 
          child instanceof THREE.Mesh && 
          !(child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)
        );
        const line = meshGroup.children.find(child => child instanceof THREE.Line);
        if (solidMesh) {
          intersectableObjects.push(solidMesh);
          idMap.set(solidMesh, id);
        } else if (line) {
          // 对于线段，使用更精确的距离检测
          lineObjects.push(line as THREE.Line);
          lineIdMap.set(line as THREE.Line, id);
        }
      }
    });

    // 先检测非线段对象
    const intersects = raycaster.intersectObjects(intersectableObjects, false);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const result = idMap.get(clickedMesh) || null;
      return result;
    }

    // 对于线段，使用精确的距离检测
    if (lineObjects.length > 0) {
      const closestLine = this.findClosestLine(event, camera, renderer, lineObjects, lineIdMap);
      if (closestLine) {
        return closestLine;
      }
    }

    return null;
  };

  private findClosestLine = (
    event: MouseEvent, 
    camera: THREE.OrthographicCamera, 
    renderer: THREE.WebGLRenderer,
    lineObjects: THREE.Line[],
    lineIdMap: Map<THREE.Line, string>
  ): string | null => {
    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // 创建射线
    const ray = raycaster.ray;
    
    let closestLineId: string | null = null;
    let minDistance = Infinity;
    const distanceThreshold = 0.1; // 线段检测的距离阈值

    lineObjects.forEach(line => {
      const lineId = lineIdMap.get(line);
      if (!lineId) return;

      const geometry = line.geometry;
      if (!geometry) return;

      const positions = geometry.getAttribute('position');
      if (!positions || positions.count < 2) return;

      // 获取线段的起点和终点（世界坐标）
      const startPos = new THREE.Vector3(
        positions.getX(0),
        positions.getY(0),
        positions.getZ(0)
      );
      const endPos = new THREE.Vector3(
        positions.getX(1),
        positions.getY(1),
        positions.getZ(1)
      );

      // 应用变换矩阵
      const worldStartPos = startPos.clone().applyMatrix4(line.matrixWorld);
      const worldEndPos = endPos.clone().applyMatrix4(line.matrixWorld);

      // 计算射线到线段的最短距离
      const distance = this.pointToLineSegmentDistance(ray.origin, ray.direction, worldStartPos, worldEndPos);
      
      if (distance < minDistance && distance <= distanceThreshold) {
        minDistance = distance;
        closestLineId = lineId;
      }
    });

    return closestLineId;
  };

  private pointToLineSegmentDistance = (
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3
  ): number => {
    // 计算射线到线段的最短距离
    const lineVector = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const rayToLineStart = new THREE.Vector3().subVectors(lineStart, rayOrigin);
    
    // 计算射线方向与线段方向的叉积
    const cross = new THREE.Vector3().crossVectors(rayDirection, lineVector);
    const crossLength = cross.length();
    
    if (crossLength === 0) {
      // 射线与线段平行，计算点到线段的距离
      return this.pointToLineDistance(rayOrigin, lineStart, lineEnd);
    }
    
    // 计算射线到线段的距离
    const distance = Math.abs(rayToLineStart.dot(cross)) / crossLength;
    return distance;
  };

  private pointToLineDistance = (
    point: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3
  ): number => {
    const lineVector = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const pointToStart = new THREE.Vector3().subVectors(point, lineStart);
    
    const lineLength = lineVector.length();
    if (lineLength === 0) return pointToStart.length();
    
    const t = pointToStart.dot(lineVector) / (lineLength * lineLength);
    const tClamped = Math.max(0, Math.min(1, t));
    
    const closestPoint = new THREE.Vector3().addVectors(
      lineStart,
      lineVector.clone().multiplyScalar(tClamped)
    );
    
    return point.distanceTo(closestPoint);
  };

  private checkEndpointAtMouse = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): { lineId: string; endpoint: 'start' | 'end' } | null => {
    if (!geometryStore.selectedShapeId) return null;
    
    const selectedShape = geometryStore.selectedShape;
    if (!selectedShape || selectedShape.type !== 'lineSegment') return null;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const selectedMeshGroup = this.meshesRef.current.get(geometryStore.selectedShapeId);
    if (!selectedMeshGroup || !(selectedMeshGroup instanceof THREE.Group)) return null;

    const endpointMeshes: THREE.Mesh[] = [];
    selectedMeshGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh && 
          (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
        endpointMeshes.push(child);
      }
    });

    if (endpointMeshes.length === 0) return null;

    const intersects = raycaster.intersectObjects(endpointMeshes, false);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const meshIndex = endpointMeshes.indexOf(clickedMesh);
      
      const endpoint = (meshIndex === 0 || meshIndex === 2) ? 'start' : 'end';
      
      return {
        lineId: geometryStore.selectedShapeId,
        endpoint
      };
    }

    // 距离检测
    const raycasterForDistance = new THREE.Raycaster();
    raycasterForDistance.setFromCamera(mouse, camera);

    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0)
    );

    const mouseWorldPos = new THREE.Vector3();
    raycasterForDistance.ray.intersectPlane(plane, mouseWorldPos);
    
    if (!mouseWorldPos) return null;

    const line = selectedMeshGroup.children.find(child => child instanceof THREE.Line) as THREE.Line;
    if (!line || !line.geometry) return null;

    const positions = line.geometry.getAttribute('position');
    if (!positions || positions.count < 2) return null;

    const startPos = new THREE.Vector3(
      positions.getX(0),
      positions.getY(0),
      positions.getZ(0)
    );
    const endPos = new THREE.Vector3(
      positions.getX(1),
      positions.getY(1),
      positions.getZ(1)
    );

    const worldStartPos = startPos.clone().applyMatrix4(selectedMeshGroup.matrixWorld);
    const worldEndPos = endPos.clone().applyMatrix4(selectedMeshGroup.matrixWorld);

    const distanceThreshold = 0.2;

    const distanceToStart = mouseWorldPos.distanceTo(worldStartPos);
    const distanceToEnd = mouseWorldPos.distanceTo(worldEndPos);

    if (distanceToStart <= distanceThreshold) {
      return {
        lineId: geometryStore.selectedShapeId,
        endpoint: 'start'
      };
    }

    if (distanceToEnd <= distanceThreshold) {
      return {
        lineId: geometryStore.selectedShapeId,
        endpoint: 'end'
      };
    }

    return null;
  };

  private checkArcEndpointAtMouse = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): { arcId: string; endpoint: 'start' | 'end' } | null => {
    if (!geometryStore.selectedShapeId) return null;

    const selectedShape = geometryStore.selectedShape;
    if (!selectedShape || selectedShape.type !== 'circularArc') return null;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const selectedMeshGroup = this.meshesRef.current.get(geometryStore.selectedShapeId);
    if (!selectedMeshGroup || !(selectedMeshGroup instanceof THREE.Group)) return null;

    const endpointMeshes: THREE.Mesh[] = [];
    selectedMeshGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh &&
          (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
        endpointMeshes.push(child);
      }
    });

    if (endpointMeshes.length === 0) return null;

    const intersects = raycaster.intersectObjects(endpointMeshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const meshIndex = endpointMeshes.indexOf(clickedMesh);

      // 对于圆弧，端点的排列可能与线段不同，需要根据实际渲染逻辑判断
      // 这里假设前两个是端点，后两个可能是中心点或其他
      const endpoint = (meshIndex === 0 || meshIndex === 2) ? 'start' : 'end';

      return {
        arcId: geometryStore.selectedShapeId,
        endpoint
      };
    }

    // 距离检测作为备用方案
    const raycasterForDistance = new THREE.Raycaster();
    raycasterForDistance.setFromCamera(mouse, camera);

    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0)
    );

    const mouseWorldPos = new THREE.Vector3();
    raycasterForDistance.ray.intersectPlane(plane, mouseWorldPos);

    if (!mouseWorldPos) return null;

    const line = selectedMeshGroup.children.find(child => child instanceof THREE.Line) as THREE.Line;
    if (!line || !line.geometry) return null;

    const positions = line.geometry.getAttribute('position');
    if (!positions || positions.count < 2) return null;

    const startPos = new THREE.Vector3(
      positions.getX(0),
      positions.getY(0),
      positions.getZ(0)
    );
    const endPos = new THREE.Vector3(
      positions.getX(positions.count - 1),
      positions.getY(positions.count - 1),
      positions.getZ(positions.count - 1)
    );

    const worldStartPos = startPos.clone().applyMatrix4(selectedMeshGroup.matrixWorld);
    const worldEndPos = endPos.clone().applyMatrix4(selectedMeshGroup.matrixWorld);

    const distanceThreshold = 0.2;

    const distanceToStart = mouseWorldPos.distanceTo(worldStartPos);
    const distanceToEnd = mouseWorldPos.distanceTo(worldEndPos);

    if (distanceToStart <= distanceThreshold) {
      return {
        arcId: geometryStore.selectedShapeId,
        endpoint: 'start'
      };
    }

    if (distanceToEnd <= distanceThreshold) {
      return {
        arcId: geometryStore.selectedShapeId,
        endpoint: 'end'
      };
    }

    return null;
  };

  private printRotationDebug = (shapeId: string, shape: any): void => {
    console.log(`[选中物体] ID: ${shapeId}, 旋转值（弧度）:`, {
      x: shape.rotation.x.toFixed(3),
      y: shape.rotation.y.toFixed(3),
      z: shape.rotation.z.toFixed(3)
    });
  };
} 