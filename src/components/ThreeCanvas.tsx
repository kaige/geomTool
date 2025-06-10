import React, { useRef, useEffect } from 'react';
import { observer } from 'mobx-react';
import * as THREE from 'three';
import { geometryStore, GeometryShape } from '../stores/GeometryStore';

interface ThreeCanvasProps {
  width: number;
  height: number;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = observer(({ width, height }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  
  // 坐标轴相关的refs
  const axesSceneRef = useRef<THREE.Scene>();
  const axesCameraRef = useRef<THREE.OrthographicCamera>();

  useEffect(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // 白色背景
    sceneRef.current = scene;

    // 创建正交相机 - 初始画布大小为视口的两倍
    const aspect = width / height;
    let frustumSize = 20; // 初始设置为两倍大小
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, 
      frustumSize * aspect / 2, 
      frustumSize / 2, 
      -frustumSize / 2, 
      0.1, 
      1000
    );
    camera.position.set(0, 0, 15); // 从Z轴正方向看向XOY平面
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 创建坐标轴场景
    const axesScene = new THREE.Scene();
    axesScene.background = null; // 透明背景
    axesSceneRef.current = axesScene;

    // 创建坐标轴相机 - 与主相机保持相同的视角方向
    const axesCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
    axesCamera.position.set(0, 0, 5); // 初始位置，后续会与主相机同步旋转
    axesCameraRef.current = axesCamera;

    // 创建坐标轴
    const axesGroup = new THREE.Group();
    
    // X轴 - 红色
    const xGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = 0.5;
    axesGroup.add(xAxis);
    
    // X轴箭头
    const xArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = 1.1;
    axesGroup.add(xArrow);

    // Y轴 - 绿色
    const yGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = 0.5;
    axesGroup.add(yAxis);
    
    // Y轴箭头
    const yArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.y = 1.1;
    axesGroup.add(yArrow);

    // Z轴 - 蓝色
    const zGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = 0.5;
    axesGroup.add(zAxis);
    
    // Z轴箭头
    const zArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = 1.1;
    axesGroup.add(zArrow);

    axesScene.add(axesGroup);

    // 辅助函数：开始旋转操作
    const startRotation = (axis: 'x' | 'y' | 'z', selectedShape: any) => {
      isRotatingObject = true;
      rotationAxis = axis;
      renderer.domElement.style.cursor = 'crosshair';
      
      if (selectedShape) {
        dragStartObjectRotation = {
          x: selectedShape.rotation.x,
          y: selectedShape.rotation.y,
          z: selectedShape.rotation.z
        };
      }
    };

    // 辅助函数：打印旋转值调试信息
    const printRotationDebug = (shapeId: string, shape: any) => {
      console.log(`[选中物体] ID: ${shapeId}, 旋转值（弧度）:`, {
        x: shape.rotation.x.toFixed(3),
        y: shape.rotation.y.toFixed(3),
        z: shape.rotation.z.toFixed(3)
      });
    };

    // 挂载到DOM
    mountRef.current.appendChild(renderer.domElement);

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 首先渲染主场景到整个画布
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.setScissorTest(false);
      renderer.render(scene, camera);
      
      // 同步坐标轴相机的视角与主相机
      if (axesCamera && camera) {
        // 获取主相机的世界方向
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // 获取主相机的上方向
        const cameraUp = new THREE.Vector3();
        camera.getWorldDirection(cameraUp);
        cameraUp.crossVectors(camera.up, cameraDirection).normalize();
        
        // 保持坐标轴相机在固定位置，但朝向与主相机一致
        const axesCameraDistance = 5;
        axesCamera.position.copy(cameraDirection).multiplyScalar(-axesCameraDistance);
        axesCamera.lookAt(0, 0, 0);
        
        // 保持相机的上方向与主相机一致
        axesCamera.up.copy(camera.up);
        axesCamera.updateMatrix();
        axesCamera.updateMatrixWorld();
      }
      
      // 然后在左下角小区域渲染坐标轴
      const axesViewportSize = 100; // 坐标轴视口大小
      renderer.setViewport(10, 10, axesViewportSize, axesViewportSize);
      renderer.setScissor(10, 10, axesViewportSize, axesViewportSize);
      renderer.setScissorTest(true);
      
      // 清空坐标轴区域的深度缓冲，确保坐标轴始终显示在最前面
      renderer.autoClear = false;
      renderer.clear(false, true, false); // 只清空深度缓冲，不清空颜色和模板缓冲
      renderer.render(axesScene, axesCamera);
      renderer.autoClear = true;
      
      renderer.setScissorTest(false);
    };
    animate();

    // 添加鼠标控制
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let startMouseX = 0; // 记录拖拽开始时的鼠标X位置
    let startMouseY = 0; // 记录拖拽开始时的鼠标Y位置
    let isDraggingObject = false; // 标记是否在拖拽物体
    let isRotatingObject = false; // 标记是否在旋转物体
    let isRotatingCamera = false; // 标记是否在旋转相机
    let rotationAxis: 'x' | 'y' | 'z' | null = null; // 当前旋转轴
    let dragStartWorldPos: THREE.Vector3 | null = null; // 拖拽开始时的世界坐标
    let dragStartObjectPos: { x: number; y: number; z: number } | null = null; // 拖拽开始时的物体位置
    let dragStartObjectRotation: { x: number; y: number; z: number } | null = null; // 拖拽开始时的物体旋转
    let cameraRotationStart: { azimuth: number; elevation: number } | null = null; // 相机旋转开始时的角度

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
      startMouseX = event.clientX; // 记录开始位置
      startMouseY = event.clientY;
      isDraggingObject = false;
      isRotatingObject = false;
      isRotatingCamera = false;
      rotationAxis = null;
      dragStartWorldPos = null;
      dragStartObjectPos = null;
      dragStartObjectRotation = null;
      cameraRotationStart = null;

      // 检查是否点击在选中的物体上
      if (geometryStore.selectedShapeId) {
        const clickedShape = checkObjectAtMouse(event);
        if (clickedShape && clickedShape === geometryStore.selectedShapeId) {
          const selectedShape = geometryStore.selectedShape;
          
          // 检查旋转快捷键并设置旋转轴
          let targetRotationAxis: 'x' | 'y' | 'z' | null = null;
          if (event.altKey) {
            targetRotationAxis = 'x'; // Alt键绕X轴旋转
          }
          else if (event.shiftKey) {
            targetRotationAxis = 'y'; // Shift键绕Y轴旋转
          }
          else if (event.ctrlKey) {
            targetRotationAxis = 'z'; // Ctrl键绕Z轴旋转
          }  
          
          if (targetRotationAxis) {
            // 开始旋转操作
            startRotation(targetRotationAxis, selectedShape);
          } else {
            // 正常拖拽移动
            isDraggingObject = true;
            renderer.domElement.style.cursor = 'grabbing';
            
            // 记录拖拽开始时的世界坐标和物体位置
            const worldPos = screenToWorld(event.clientX, event.clientY);
            if (worldPos && selectedShape) {
              dragStartWorldPos = worldPos.clone();
              dragStartObjectPos = {
                x: selectedShape.position.x,
                y: selectedShape.position.y,
                z: selectedShape.position.z
              };
            }
          }
        }
      } else if (event.ctrlKey) {
        // 没有选中物体且按住Ctrl键，开始相机旋转
        isRotatingCamera = true;
        renderer.domElement.style.cursor = 'move';
        
        // 计算当前相机的球坐标角度
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // 计算方位角和仰角
        const azimuth = Math.atan2(-cameraDirection.x, -cameraDirection.z);
        const elevation = Math.asin(cameraDirection.y);
        
        cameraRotationStart = { azimuth, elevation };
      }
    };

    // 将屏幕坐标转换为世界坐标（在选中物体的Y高度平面上）
    const screenToWorld = (screenX: number, screenY: number): THREE.Vector3 | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // 使用选中物体的Y坐标作为平面高度，如果没有选中物体则使用Y=1
      let planeY = 1; // 默认高度
      if (geometryStore.selectedShape) {
        planeY = geometryStore.selectedShape.position.y;
      }
      
      // 创建一个在指定Y高度的平面，用于计算交点
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
      const intersectPoint = new THREE.Vector3();
      
      if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
        return intersectPoint;
      }
      return null;
    };

    // 检查鼠标位置是否有物体
    const checkObjectAtMouse = (event: MouseEvent): string | null => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersectableObjects: THREE.Object3D[] = [];
      const idMap = new Map<THREE.Object3D, string>();
      
      meshesRef.current.forEach((meshGroup, id) => {
        if (meshGroup instanceof THREE.Group) {
          const solidMesh = meshGroup.children.find(child => child instanceof THREE.Mesh);
          if (solidMesh) {
            intersectableObjects.push(solidMesh);
            idMap.set(solidMesh, id);
          }
        }
      });

      const intersects = raycaster.intersectObjects(intersectableObjects, false);
      
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        return idMap.get(clickedMesh) || null;
      }
      return null;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      if (isRotatingObject && geometryStore.selectedShapeId && dragStartObjectRotation && rotationAxis) {
        // 旋转物体
        const rotationSensitivity = 0.01; // 降低敏感度，避免过度旋转
        
        // 计算从开始位置到当前位置的总位移（避免累积误差）
        const totalMouseDeltaX = (event.clientX - startMouseX) * rotationSensitivity;
        const totalMouseDeltaY = (event.clientY - startMouseY) * rotationSensitivity;
        
        // 根据旋转轴确定使用哪个方向的鼠标移动
        let rotationDelta: number;
        switch (rotationAxis) {
          case 'x':
            rotationDelta = totalMouseDeltaY; // X轴旋转：垂直鼠标移动
            break;
          case 'y':
            rotationDelta = totalMouseDeltaX; // Y轴旋转：水平鼠标移动
            break;
          case 'z':
            rotationDelta = totalMouseDeltaX; // Z轴旋转：水平鼠标移动
            break;
          default:
            rotationDelta = 0;
        }
        
        const newRotation = {
          ...dragStartObjectRotation,
          [rotationAxis]: dragStartObjectRotation[rotationAxis] + rotationDelta
        };
        
        geometryStore.updateShape(geometryStore.selectedShapeId, {
          rotation: newRotation
        });
        
      } else if (isRotatingCamera && cameraRotationStart) {
        // 旋转相机
        const rotationSensitivity = 0.005; // 相机旋转敏感度
        
        // 计算从开始位置到当前位置的总鼠标移动量
        const totalMouseDeltaX = (event.clientX - startMouseX) * rotationSensitivity;
        const totalMouseDeltaY = (event.clientY - startMouseY) * rotationSensitivity;
        
        // 更新方位角和仰角
        const newAzimuth = cameraRotationStart.azimuth - totalMouseDeltaX; // 水平旋转
        const newElevation = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraRotationStart.elevation + totalMouseDeltaY)); // 垂直旋转，限制范围
        
        // 计算新的相机位置（距离原点固定距离）
        const distance = 15; // 相机距离原点的距离
        const newCameraX = distance * Math.sin(newAzimuth) * Math.cos(newElevation);
        const newCameraY = distance * Math.sin(newElevation);
        const newCameraZ = distance * Math.cos(newAzimuth) * Math.cos(newElevation);
        
        // 更新相机位置和朝向
        camera.position.set(newCameraX, newCameraY, newCameraZ);
        camera.lookAt(0, 0, 0);

      } else if (isDraggingObject && geometryStore.selectedShapeId && dragStartWorldPos && dragStartObjectPos) {
        // 拖拽物体
        const currentWorldPos = screenToWorld(event.clientX, event.clientY);
        if (currentWorldPos) {
          // 计算鼠标从开始位置到当前位置的总位移
          const totalDeltaX = currentWorldPos.x - dragStartWorldPos.x;
          const totalDeltaZ = currentWorldPos.z - dragStartWorldPos.z;
          
          // 将总位移应用到物体的起始位置上，不使用累积方式
          geometryStore.updateShape(geometryStore.selectedShapeId, {
            position: {
              x: dragStartObjectPos.x + totalDeltaX,
              y: dragStartObjectPos.y, // 保持Y不变
              z: dragStartObjectPos.z + totalDeltaZ,
            }
          });
        }
      } else if (!isRotatingCamera) {
        // 拖拽画布（只有在非相机旋转模式下才执行）
        const aspect = width / height;
        const worldWidth = frustumSize * aspect;
        const worldHeight = frustumSize;
        
        // 计算屏幕空间的移动量
        const deltaScreenX = (deltaX / width) * worldWidth;
        const deltaScreenY = (deltaY / height) * worldHeight;
        
        // 获取相机的右方向向量和上方向向量
        const cameraRight = new THREE.Vector3();
        const cameraUp = new THREE.Vector3();
        
        // 计算相机的右方向（世界坐标系中的右方向）
        camera.getWorldDirection(cameraRight);
        cameraRight.cross(camera.up).normalize();
        
        // 计算相机的上方向（在相机平面内的上方向）
        cameraUp.crossVectors(cameraRight, camera.getWorldDirection(new THREE.Vector3())).normalize();
        
        // 基于相机的局部坐标系计算移动向量
        const moveVector = new THREE.Vector3();
        moveVector.addScaledVector(cameraRight, -deltaScreenX); // 水平移动（右方向）
        moveVector.addScaledVector(cameraUp, deltaScreenY); // 垂直移动（上方向）
        
        // 应用移动
        camera.position.add(moveVector);
      }

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (isMouseDown) {
        const deltaX = Math.abs(event.clientX - mouseX);
        const deltaY = Math.abs(event.clientY - mouseY);
        
        if (deltaX < 5 && deltaY < 5) {
          // 这是一个点击操作，不是拖拽
          handleClick(event);
        } else if (!isDraggingObject && !isRotatingObject && !isRotatingCamera) {
          // 这是拖拽画布操作，不处理选择逻辑
          // 拖拽画布不应该影响物体选择状态
        }
        // 如果是拖拽物体操作(isDraggingObject = true)或旋转物体操作(isRotatingObject = true)或相机旋转操作(isRotatingCamera = true)，保持当前选中状态不变
      }
      
      isMouseDown = false;
      isDraggingObject = false;
      isRotatingObject = false;
      isRotatingCamera = false;
      rotationAxis = null;
      dragStartWorldPos = null;
      dragStartObjectPos = null;
      dragStartObjectRotation = null;
      cameraRotationStart = null;
      
      // 重置鼠标样式，但要考虑鼠标是否仍在选中物体上
      const hoveredShape = checkObjectAtMouse(event);
      if (hoveredShape && hoveredShape === geometryStore.selectedShapeId) {
        renderer.domElement.style.cursor = 'grab';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    // 处理点击选择
    const handleClick = (event: MouseEvent) => {
      // 创建射线检测器
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      // 计算鼠标在标准化设备坐标中的位置 (-1 to +1)
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 从相机位置和鼠标位置更新射线
      raycaster.setFromCamera(mouse, camera);

      // 设置射线检测的阈值，对于线段检测很重要
      raycaster.params.Line.threshold = 0.1; // 增加线段检测的容错范围

      // 获取所有可交互的物体
      const intersectableObjects: THREE.Object3D[] = [];
      const idMap = new Map<THREE.Object3D, string>();
      
      meshesRef.current.forEach((meshGroup, id) => {
        // 只对透明的实体mesh进行射线检测，不检测线框
        if (meshGroup instanceof THREE.Group) {
          const solidMesh = meshGroup.children.find(child => child instanceof THREE.Mesh);
          if (solidMesh) {
            intersectableObjects.push(solidMesh);
            idMap.set(solidMesh, id);
          }
        }
      });

      // 计算射线与物体的交点
      const intersects = raycaster.intersectObjects(intersectableObjects, false);

      console.log('射线检测结果:', intersects.length, '个交点');
      intersects.forEach((intersect, index) => {
        console.log(`交点 ${index}:`, {
          distance: intersect.distance,
          object: intersect.object,
          point: intersect.point
        });
      });

      if (intersects.length > 0) {
        // 选择距离最近的物体（第一个交点就是最近的）
        const closestIntersect = intersects[0];
        const clickedMesh = closestIntersect.object;
        const clickedShapeId = idMap.get(clickedMesh);

        console.log('选中的物体ID:', clickedShapeId);

        if (clickedShapeId) {
          // 点击物体，选中该物体
          geometryStore.selectShape(clickedShapeId);
          
          // Debug输出：打印选中物体的旋转值（弧度）
          const selectedShape = geometryStore.shapes.find(shape => shape.id === clickedShapeId);
          if (selectedShape) {
            printRotationDebug(clickedShapeId, selectedShape);
          }
        }
      } else {
        console.log('没有检测到交点，取消选择');
        // 只有点击空白区域时，才取消选择
        geometryStore.selectShape(null);
        console.log('[取消选择] 没有选中任何物体');
      }
    };

    // 添加滚轮缩放功能
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      
      const zoomSpeed = 0.1;
      const delta = event.deltaY > 0 ? 1 : -1;
      frustumSize += delta * zoomSpeed * frustumSize;
      
      // 限制缩放范围
      frustumSize = Math.max(1, Math.min(100, frustumSize));
      
      // 更新相机视锥体
      const aspect = width / height;
      camera.left = -frustumSize * aspect / 2;
      camera.right = frustumSize * aspect / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
    };

    // 处理鼠标悬停效果
    const handleMouseHover = (event: MouseEvent) => {
      if (isMouseDown) return; // 拖拽时不处理悬停
      
      const hoveredShape = checkObjectAtMouse(event);
      
      // 更新鼠标样式
      if (hoveredShape && hoveredShape === geometryStore.selectedShapeId) {
        renderer.domElement.style.cursor = 'grab';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    // 处理右键菜单禁用
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault(); // 阻止默认右键菜单
    };

    // 处理键盘事件
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !geometryStore.selectedShapeId) {
        // 没有选中任何物体时，ESC键重置相机视角
        resetCameraToDefault();
      }
    };

    // 重置相机到默认位置
    const resetCameraToDefault = () => {
      // 重置相机位置到默认的从Z轴正方向看向XOY平面
      camera.position.set(0, 0, 15);
      camera.lookAt(0, 0, 0);
      camera.up.set(0, 1, 0); // 重置上方向
      camera.updateMatrix();
      camera.updateMatrixWorld();
    };

    const currentMount = mountRef.current;
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mouseover', handleMouseHover);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    
    // 添加键盘事件监听器到window对象
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mouseover', handleMouseHover);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      
      // 移除键盘事件监听器
      window.removeEventListener('keydown', handleKeyDown);
      
      // 清理坐标轴场景
      if (axesSceneRef.current) {
        axesSceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
      
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  // 创建几何体
  const createGeometry = (type: GeometryShape['type']): THREE.BufferGeometry => {
    switch (type) {
      case 'sphere':
        return new THREE.SphereGeometry(1, 32, 32);
      case 'cube':
        return new THREE.BoxGeometry(1, 1, 1);
      case 'cylinder':
        return new THREE.CylinderGeometry(1, 1, 2, 32);
      case 'cone':
        return new THREE.ConeGeometry(1, 2, 32);
      case 'torus':
        return new THREE.TorusGeometry(1, 0.4, 16, 100);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  };

  // 更新场景中的物体 - 使用一个没有依赖的useEffect，让MobX observer自动处理响应式更新
  const updateScene = () => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const meshes = meshesRef.current;

    // 移除不存在的物体
    meshes.forEach((meshGroup, id) => {
      if (!geometryStore.shapes.find(shape => shape.id === id)) {
        // 移除显示用的线框和检测用的实体
        if (meshGroup instanceof THREE.Group) {
          scene.remove(meshGroup);
          meshGroup.children.forEach(child => {
            if (child instanceof THREE.LineSegments || child instanceof THREE.Mesh) {
              if (child.geometry instanceof THREE.BufferGeometry) {
                child.geometry.dispose();
              }
              if (child.material instanceof THREE.Material) {
                child.material.dispose();
              }
            }
          });
        }
        meshes.delete(id);
      }
    });

    // 添加或更新物体
    geometryStore.shapes.forEach(shape => {
      let meshGroup = meshes.get(shape.id);

      if (!meshGroup) {
        // 创建一个组来包含显示和检测用的mesh
        meshGroup = new THREE.Group();
        
        // 创建几何体
        const geometry = createGeometry(shape.type);
        
        // 1. 创建线框用于显示
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: shape.color });
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        meshGroup.add(lineSegments);
        
        // 2. 创建透明实体用于射线检测
        const solidMaterial = new THREE.MeshBasicMaterial({ 
          transparent: true, 
          opacity: 0, // 完全透明，不可见
          side: THREE.DoubleSide 
        });
        const solidMesh = new THREE.Mesh(geometry.clone(), solidMaterial);
        meshGroup.add(solidMesh);
        
        scene.add(meshGroup);
        meshes.set(shape.id, meshGroup);
      }

      // 更新物体属性
      if (meshGroup instanceof THREE.Group) {
        meshGroup.position.set(shape.position.x, shape.position.y, shape.position.z);
        meshGroup.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
        meshGroup.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
        meshGroup.visible = shape.visible;
        
        // 更新线框材质颜色 - 选中状态显示不同颜色
        const lineSegments = meshGroup.children.find(child => child instanceof THREE.LineSegments);
        if (lineSegments instanceof THREE.LineSegments && lineSegments.material instanceof THREE.LineBasicMaterial) {
          const isSelected = geometryStore.selectedShapeId === shape.id;
          const color = isSelected ? '#ff6b35' : shape.color; // 选中时显示橙色
          lineSegments.material.color.setHex(parseInt(color.replace('#', '0x')));
        }
      }
    });
  };

  // 直接调用updateScene，让MobX observer处理重新渲染
  updateScene();

  return <div ref={mountRef} style={{ width, height }} />;
}); 