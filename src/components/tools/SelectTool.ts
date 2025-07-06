import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { geometryStore } from '../../stores/GeometryStore';
import { MouseState, CameraState, IToolManager, ToolType } from '../../types/ToolTypes';
import { MoveLineEndpointTool } from './MoveLineEndpointTool';
import { RotateShapeTool } from './RotateShapeTool';

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
      if (moveLineEndpointTool) {
        moveLineEndpointTool.setEndpointInfo(endpointInfo.lineId, endpointInfo.endpoint);
        this.toolManager.activateTool(ToolType.MOVE_LINE_ENDPOINT);
        moveLineEndpointTool.onMouseDown(event, camera, renderer);
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
          if (rotateShapeTool) {
            rotateShapeTool.setRotationAxis(targetRotationAxis);
            this.toolManager.activateTool(ToolType.ROTATE_SHAPE);
            rotateShapeTool.onMouseDown(event, camera, renderer);
          }
          return;
        } else {
          // 激活移动工具
          this.toolManager.activateTool(ToolType.MOVE_SHAPE);
          const moveShapeTool = this.toolManager.getTool(ToolType.MOVE_SHAPE);
          if (moveShapeTool && moveShapeTool.onMouseDown) {
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

  private handleClick = (event: MouseEvent, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer): void => {
    const endpointInfo = this.checkEndpointAtMouse(event, camera, renderer);
    if (endpointInfo) {
      return; // 点击端点时不处理线段选择
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
      // 如果点击距离小于5，则认为是点击了物体
      const distanceThreshold = 10;
      if (intersects[0].distance < distanceThreshold) {
        const clickedMesh = intersects[0].object;
        return idMap.get(clickedMesh) || null;
      }
    }
    return null;
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

  private printRotationDebug = (shapeId: string, shape: any): void => {
    console.log(`[选中物体] ID: ${shapeId}, 旋转值（弧度）:`, {
      x: shape.rotation.x.toFixed(3),
      y: shape.rotation.y.toFixed(3),
      z: shape.rotation.z.toFixed(3)
    });
  };
} 