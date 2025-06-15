import React, { useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react';
import * as THREE from 'three';
import { geometryStore, GeometryShape } from '../stores/GeometryStore';

// 自定义的 EdgesGeometry，根据面的可见性和夹角决定边的显示
class CustomEdgesGeometry extends THREE.EdgesGeometry {
  public solidEdges: THREE.BufferAttribute;
  public dashedEdges: THREE.BufferAttribute;

  constructor(geometry: THREE.BufferGeometry) {
    super(geometry, 30); // 30度锐角阈值

    // 初始化属性
    this.solidEdges = new THREE.BufferAttribute(new Float32Array(0), 3);
    this.dashedEdges = new THREE.BufferAttribute(new Float32Array(0), 3);

    // 获取面的法线
    const normalAttribute = geometry.getAttribute('normal');
    if (!normalAttribute) {
      console.warn('Geometry has no normal attribute');
      return;
    }

    // 获取面的顶点索引
    const indexAttribute = geometry.getIndex();
    if (!indexAttribute) {
      console.warn('Geometry has no index attribute');
      return;
    }

    // 获取顶点位置
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) {
      console.warn('Geometry has no position attribute');
      return;
    }

    // 获取相机信息
    const camera = geometry.userData.camera as THREE.Camera;
    if (!camera) {
      console.warn('Geometry has no camera information');
      return;
    }

    // 获取meshGroup信息
    const meshGroup = geometry.userData.meshGroup as THREE.Group;
    if (!meshGroup) {
      console.warn('Geometry has no meshGroup information');
      return;
    }


    // 存储每个面的可见性和法线
    const faces = new Array(indexAttribute.count / 3).fill(null).map((_, faceIndex) => {
      const a = indexAttribute.getX(faceIndex * 3);
      
      // 从normalAttribute获取法向量并转换到世界坐标系
      const faceNormal = new THREE.Vector3().fromBufferAttribute(normalAttribute, a);
      const worldFaceNormal = faceNormal.clone().applyMatrix4(meshGroup.matrixWorld).normalize();
      
      // 使用相机的LookAt方向（负的z轴方向）作为视线方向
      const toCamera = new THREE.Vector3(0, 0, -1).applyMatrix4(camera.matrixWorld).normalize();
      
      // 计算面的可见性
      const isVisible = worldFaceNormal.dot(toCamera) < 0;
      
      return {
        normal: faceNormal,
        visible: isVisible,
      };
    });

    // 存储边的信息
    const edgeMap = new Map();

    // 遍历所有面，建立邻接关系
    for (let i = 0; i < indexAttribute.count; i += 3) {
      const a = indexAttribute.getX(i);
      const b = indexAttribute.getX(i + 1);
      const c = indexAttribute.getX(i + 2);

      // 获取顶点位置
      const posA = new THREE.Vector3(
        positionAttribute.getX(a),
        positionAttribute.getY(a),
        positionAttribute.getZ(a)
      );
      const posB = new THREE.Vector3(
        positionAttribute.getX(b),
        positionAttribute.getY(b),
        positionAttribute.getZ(b)
      );
      const posC = new THREE.Vector3(
        positionAttribute.getX(c),
        positionAttribute.getY(c),
        positionAttribute.getZ(c)
      );

      // 存储每条边对应的面
      addEdge(posA, posB, i / 3);
      addEdge(posB, posC, i / 3);
      addEdge(posC, posA, i / 3);
    }
    
    function addEdge(v1: THREE.Vector3, v2: THREE.Vector3, faceIndex: number) {
      // 计算边的中点作为唯一标识
      const midPoint = new THREE.Vector3()
        .addVectors(v1, v2)
        .multiplyScalar(0.5);
      const key = `${midPoint.x.toFixed(6)}-${midPoint.y.toFixed(6)}-${midPoint.z.toFixed(6)}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, {startPoint: v1, endPoint: v2, faceIndices: [faceIndex]});
      } else {
        const edgeInfo = edgeMap.get(key);
        if (!edgeInfo.faceIndices.includes(faceIndex)) {
          edgeInfo.faceIndices.push(faceIndex);
        }
      }
    }
    
    // 获取需要显示的边
    const solidEdgesArray: number[] = [];  // 实线边
    const dashedEdgesArray: number[] = []; // 虚线边
    // 遍历edgesMap处理每条边
    edgeMap.forEach((edgeInfo, key) => {
      if (!edgeInfo || edgeInfo.faceIndices.length === 0) return;
  
      const edgeVertices = [edgeInfo.startPoint.x, edgeInfo.startPoint.y, edgeInfo.startPoint.z,
        edgeInfo.endPoint.x, edgeInfo.endPoint.y, edgeInfo.endPoint.z];
      
      // 如果只有一个面，说明是边界边，显示为实线
      if (edgeInfo.faceIndices.length === 1) {
        const faceIndex = edgeInfo.faceIndices[0];
        const face = faces[faceIndex];
        if (face.visible) {
          solidEdgesArray.push(...edgeVertices);
        }
        else {
          dashedEdgesArray.push(...edgeVertices);
        }
      }else {
          // 如果有两个面，检查可见性
          const [face1, face2] = edgeInfo.faceIndices;
          const face1Visible = faces[face1].visible;
          const face2Visible = faces[face2].visible;

          // 计算两个面之间的夹角
          const face1Normal = faces[face1].normal;
          const face2Normal = faces[face2].normal;
          const dotProduct = face1Normal.dot(face2Normal);
          const angle = Math.acos(dotProduct);

          const isSharpEdge = angle > (this.parameters.thresholdAngle) * Math.PI / 180;

          // 如果两个面可见性相同，且夹角大于阈值，则显示为实线,否则显示为虚线
          if (face1Visible && face2Visible && isSharpEdge) {
            solidEdgesArray.push(...edgeVertices);
          } else if (!face1Visible && !face2Visible && isSharpEdge) {
            dashedEdgesArray.push(...edgeVertices);
          // 如果两个面可见性不同，则显示为实线
          } else if (face1Visible !== face2Visible) {
            solidEdgesArray.push(...edgeVertices);
          }
      }
    });

     this.solidEdges = new THREE.BufferAttribute(new Float32Array(solidEdgesArray), 3);
     this.dashedEdges = new THREE.BufferAttribute(new Float32Array(dashedEdgesArray), 3);
  }
}

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

  // 共享状态
  const stateRef = useRef({
    frustumSize: 20,
    isMouseDown: false,
    mouseX: 0,
    mouseY: 0,
    startMouseX: 0,
    startMouseY: 0,
    isDraggingObject: false,
    isRotatingObject: false,
    isRotatingCamera: false,
    rotationAxis: null as 'x' | 'y' | 'z' | null,
    dragStartWorldPos: null as THREE.Vector3 | null,
    dragStartObjectPos: null as { x: number; y: number; z: number } | null,
    dragStartObjectRotation: null as { x: number; y: number; z: number } | null,
    cameraRotationStart: null as { azimuth: number; elevation: number } | null,
  });

  // 用于防止updateScene函数重复执行，避免在更新过程中触发新的更新
  // 这是一个防重复执行的锁
  // 当 updateScene 函数正在执行时，将其设置为 true
  // 防止在更新过程中触发新的更新，避免可能的死循环或性能问题
  //
  const isUpdatingRef = useRef(false);
  // 用于标记是否需要重置geometryStore中的hasChanged状态，避免在渲染过程中直接修改MobX状态
  // 这是一个状态更新标记
  // 当场景中的对象发生变化时（如添加、删除、修改等），将其设置为 true
  // 在 useEffect 中检查这个标记，决定是否需要重置 geometryStore 中的 hasChanged 状态
  // 这样可以避免在 React 渲染过程中直接修改 MobX 状态，防止出现警告或错误
  // 
  const needsUpdateRef = useRef(false);

  // 辅助函数：开始旋转操作
  const startRotation = (axis: 'x' | 'y' | 'z', selectedShape: any) => {
    stateRef.current.isRotatingObject = true;
    stateRef.current.rotationAxis = axis;
    if (rendererRef.current) {
      rendererRef.current.domElement.style.cursor = 'crosshair';
    }
    
    if (selectedShape) {
      stateRef.current.dragStartObjectRotation = {
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

  // 初始化主场景
  const initializeMainScene = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // 创建正交相机
    const aspect = width / height;
    stateRef.current.frustumSize = 20;
    const camera = new THREE.OrthographicCamera(
      -stateRef.current.frustumSize * aspect / 2, 
      stateRef.current.frustumSize * aspect / 2, 
      stateRef.current.frustumSize / 2, 
      -stateRef.current.frustumSize / 2, 
      0.1, 
      1000
    );
    camera.position.set(0, 0, 15);
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

    return { scene, camera, renderer };
  };

  // 初始化坐标轴场景
  const initializeAxesScene = () => {
    const axesScene = new THREE.Scene();
    axesScene.background = null;
    axesSceneRef.current = axesScene;

    const axesFrustumSize = 2 / 1.8;
    const axesCamera = new THREE.OrthographicCamera(
      -axesFrustumSize, 
      axesFrustumSize, 
      axesFrustumSize, 
      -axesFrustumSize, 
      0.1, 
      10
    );
    axesCamera.position.set(0, 0, 5);
    axesCameraRef.current = axesCamera;

    // 创建坐标轴组
    const axesGroup = new THREE.Group();
    
    // X轴
    const xGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = 0.5;
    axesGroup.add(xAxis);
    
    const xArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = 1.1;
    axesGroup.add(xArrow);

    // Y轴
    const yGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = 0.5;
    axesGroup.add(yAxis);
    
    const yArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.y = 1.1;
    axesGroup.add(yArrow);

    // Z轴
    const zGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = 0.5;
    axesGroup.add(zAxis);
    
    const zArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = 1.1;
    axesGroup.add(zArrow);

    axesScene.add(axesGroup);
  };

  // 渲染循环
  const setupRenderLoop = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) => {
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 渲染主场景
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.setScissorTest(false);
      renderer.render(scene, camera);
      
      // 同步坐标轴相机视角
      if (axesCameraRef.current && camera) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        const cameraUp = new THREE.Vector3();
        camera.getWorldDirection(cameraUp);
        cameraUp.crossVectors(camera.up, cameraDirection).normalize();
        
        const axesCameraDistance = 5;
        axesCameraRef.current.position.copy(cameraDirection).multiplyScalar(-axesCameraDistance);
        axesCameraRef.current.lookAt(0, 0, 0);
        axesCameraRef.current.up.copy(camera.up);
        axesCameraRef.current.updateMatrix();
        axesCameraRef.current.updateMatrixWorld();
      }
      
      // 渲染坐标轴
      const axesViewportSize = 100;
      const axesOffset = 5;
      renderer.setViewport(axesOffset, axesOffset, axesViewportSize, axesViewportSize);
      renderer.setScissor(axesOffset, axesOffset, axesViewportSize, axesViewportSize);
      renderer.setScissorTest(true);
      
      renderer.autoClear = false;
      renderer.clear(false, true, false);
      if (axesSceneRef.current && axesCameraRef.current) {
        renderer.render(axesSceneRef.current, axesCameraRef.current);
      }
      renderer.autoClear = true;
      
      renderer.setScissorTest(false);
    };
    
    animate();
  };

  // 鼠标事件处理
  const setupMouseEvents = (renderer: THREE.WebGLRenderer, camera: THREE.OrthographicCamera) => {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      
      const zoomSpeed = 0.1;
      const delta = event.deltaY > 0 ? 1 : -1;
      stateRef.current.frustumSize += delta * zoomSpeed * stateRef.current.frustumSize;
      
      stateRef.current.frustumSize = Math.max(1, Math.min(100, stateRef.current.frustumSize));
      
      const aspect = width / height;
      camera.left = -stateRef.current.frustumSize * aspect / 2;
      camera.right = stateRef.current.frustumSize * aspect / 2;
      camera.top = stateRef.current.frustumSize / 2;
      camera.bottom = -stateRef.current.frustumSize / 2;
      camera.updateProjectionMatrix();
    };

    const handleMouseDown = (event: MouseEvent) => {
      stateRef.current.isMouseDown = true;
      stateRef.current.mouseX = event.clientX;
      stateRef.current.mouseY = event.clientY;
      stateRef.current.startMouseX = event.clientX;
      stateRef.current.startMouseY = event.clientY;
      stateRef.current.isDraggingObject = false;
      stateRef.current.isRotatingObject = false;
      stateRef.current.isRotatingCamera = false;
      stateRef.current.rotationAxis = null;
      stateRef.current.dragStartWorldPos = null;
      stateRef.current.dragStartObjectPos = null;
      stateRef.current.dragStartObjectRotation = null;
      stateRef.current.cameraRotationStart = null;

      if (geometryStore.selectedShapeId) {
        const clickedShape = checkObjectAtMouse(event);
        if (clickedShape && clickedShape === geometryStore.selectedShapeId) {
          const selectedShape = geometryStore.selectedShape;
          
          let targetRotationAxis: 'x' | 'y' | 'z' | null = null;
          if (event.altKey) {
            targetRotationAxis = 'x';
          }
          else if (event.shiftKey) {
            targetRotationAxis = 'y';
          }
          else if (event.ctrlKey) {
            targetRotationAxis = 'z';
          }  
          
          if (targetRotationAxis) {
            startRotation(targetRotationAxis, selectedShape);
          } else {
            stateRef.current.isDraggingObject = true;
            renderer.domElement.style.cursor = 'grabbing';
            
            const worldPos = screenToWorld(event.clientX, event.clientY);
            if (worldPos && selectedShape) {
              stateRef.current.dragStartWorldPos = worldPos.clone();
              stateRef.current.dragStartObjectPos = {
                x: selectedShape.position.x,
                y: selectedShape.position.y,
                z: selectedShape.position.z
              };
            }
          }
        }
      } else if (event.ctrlKey) {
        stateRef.current.isRotatingCamera = true;
        renderer.domElement.style.cursor = 'move';
        
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        const azimuth = Math.atan2(-cameraDirection.x, -cameraDirection.z);
        const elevation = Math.asin(cameraDirection.y);
        
        stateRef.current.cameraRotationStart = { azimuth, elevation };
      }
    };

    const screenToWorld = (screenX: number, screenY: number): THREE.Vector3 | null => {
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
      if (!stateRef.current.isMouseDown) return;

      const deltaX = event.clientX - stateRef.current.mouseX;
      const deltaY = event.clientY - stateRef.current.mouseY;

      if (stateRef.current.isRotatingObject && geometryStore.selectedShapeId && stateRef.current.dragStartObjectRotation && stateRef.current.rotationAxis) {
        const rotationSensitivity = 0.01;
        
        const totalMouseDeltaX = (event.clientX - stateRef.current.startMouseX) * rotationSensitivity;
        const totalMouseDeltaY = (event.clientY - stateRef.current.startMouseY) * rotationSensitivity;
        
        let rotationDelta: number;
        switch (stateRef.current.rotationAxis) {
          case 'x':
            rotationDelta = totalMouseDeltaY;
            break;
          case 'y':
            rotationDelta = totalMouseDeltaX;
            break;
          case 'z':
            rotationDelta = totalMouseDeltaX;
            break;
          default:
            rotationDelta = 0;
        }
        
        const newRotation = {
          ...stateRef.current.dragStartObjectRotation,
          [stateRef.current.rotationAxis]: stateRef.current.dragStartObjectRotation[stateRef.current.rotationAxis] + rotationDelta
        };
        
        geometryStore.updateShape(geometryStore.selectedShapeId, {
          rotation: newRotation
        });
        
      } else if (stateRef.current.isRotatingCamera && stateRef.current.cameraRotationStart) {
        const rotationSensitivity = 0.005;
        
        const totalMouseDeltaX = (event.clientX - stateRef.current.startMouseX) * rotationSensitivity;
        const totalMouseDeltaY = (event.clientY - stateRef.current.startMouseY) * rotationSensitivity;
        
        const newAzimuth = stateRef.current.cameraRotationStart.azimuth - totalMouseDeltaX;
        const newElevation = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, stateRef.current.cameraRotationStart.elevation + totalMouseDeltaY));
        
        const distance = 15;
        const newCameraX = distance * Math.sin(newAzimuth) * Math.cos(newElevation);
        const newCameraY = distance * Math.sin(newElevation);
        const newCameraZ = distance * Math.cos(newAzimuth) * Math.cos(newElevation);
        
        camera.position.set(newCameraX, newCameraY, newCameraZ);
        camera.lookAt(0, 0, 0);

      } else if (stateRef.current.isDraggingObject && geometryStore.selectedShapeId && stateRef.current.dragStartWorldPos && stateRef.current.dragStartObjectPos) {
        const currentWorldPos = screenToWorld(event.clientX, event.clientY);
        if (currentWorldPos) {
          const totalDelta = new THREE.Vector3();
          totalDelta.subVectors(currentWorldPos, stateRef.current.dragStartWorldPos);
          
          geometryStore.updateShape(geometryStore.selectedShapeId, {
            position: {
              x: stateRef.current.dragStartObjectPos.x + totalDelta.x,
              y: stateRef.current.dragStartObjectPos.y + totalDelta.y,
              z: stateRef.current.dragStartObjectPos.z + totalDelta.z,
            }
          });
        }
      } else if (!stateRef.current.isRotatingCamera) {
        const aspect = width / height;
        const worldWidth = stateRef.current.frustumSize * aspect;
        const worldHeight = stateRef.current.frustumSize;
        
        const deltaScreenX = (deltaX / width) * worldWidth;
        const deltaScreenY = (deltaY / height) * worldHeight;
        
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

      stateRef.current.mouseX = event.clientX;
      stateRef.current.mouseY = event.clientY;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (stateRef.current.isMouseDown) {
        const deltaX = Math.abs(event.clientX - stateRef.current.mouseX);
        const deltaY = Math.abs(event.clientY - stateRef.current.mouseY);
        
        if (deltaX < 5 && deltaY < 5) {
          handleClick(event);
        }
      }
      
      stateRef.current.isMouseDown = false;
      stateRef.current.isDraggingObject = false;
      stateRef.current.isRotatingObject = false;
      stateRef.current.isRotatingCamera = false;
      stateRef.current.rotationAxis = null;
      stateRef.current.dragStartWorldPos = null;
      stateRef.current.dragStartObjectPos = null;
      stateRef.current.dragStartObjectRotation = null;
      stateRef.current.cameraRotationStart = null;
      
      const hoveredShape = checkObjectAtMouse(event);
      if (hoveredShape && hoveredShape === geometryStore.selectedShapeId) {
        renderer.domElement.style.cursor = 'grab';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleClick = (event: MouseEvent) => {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      raycaster.params.Line.threshold = 0.1;

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

      console.log('射线检测结果:', intersects.length, '个交点');
      intersects.forEach((intersect, index) => {
        console.log(`交点 ${index}:`, {
          distance: intersect.distance,
          object: intersect.object,
          point: intersect.point
        });
      });

      if (intersects.length > 0) {
        const closestIntersect = intersects[0];
        const clickedMesh = closestIntersect.object;
        const clickedShapeId = idMap.get(clickedMesh);

        console.log('选中的物体ID:', clickedShapeId);

        if (clickedShapeId) {
          geometryStore.selectShape(clickedShapeId);
          
          const selectedShape = geometryStore.shapes.find(shape => shape.id === clickedShapeId);
          if (selectedShape) {
            printRotationDebug(clickedShapeId, selectedShape);
          }
        }
      } else {
        console.log('没有检测到交点，取消选择');
        geometryStore.selectShape(null);
        console.log('[取消选择] 没有选中任何物体');
      }
    };

    const handleMouseHover = (event: MouseEvent) => {
      if (stateRef.current.isMouseDown) return;
      
      const hoveredShape = checkObjectAtMouse(event);
      
      if (hoveredShape && hoveredShape === geometryStore.selectedShapeId) {
        renderer.domElement.style.cursor = 'grab';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mouseover', handleMouseHover);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mouseover', handleMouseHover);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
    };
  };

  // 键盘事件处理
  const setupKeyboardEvents = (camera: THREE.OrthographicCamera) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !geometryStore.selectedShapeId) {
        resetCameraToDefault(camera);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  };

  // 重置相机到默认位置
  const resetCameraToDefault = (camera: THREE.OrthographicCamera) => {
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.updateMatrix();
    camera.updateMatrixWorld();
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // 初始化场景
    const { scene, camera, renderer } = initializeMainScene();
    
    // 初始化坐标轴场景
    initializeAxesScene();
    
    // 设置渲染循环
    setupRenderLoop(renderer, scene, camera);
    
    // 设置事件监听
    const cleanupMouseEvents = setupMouseEvents(renderer, camera);
    const cleanupKeyboardEvents = setupKeyboardEvents(camera);

    // 挂载到DOM
    mountRef.current.appendChild(renderer.domElement);

    return () => {
      cleanupMouseEvents();
      cleanupKeyboardEvents();
      
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
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  //////// all above are for useEffect, useEffect is called once when the component is mounted ////////

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

  const updateScene = useCallback(() => {
    if (!sceneRef.current || isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    const scene = sceneRef.current;
    const meshes = meshesRef.current;

    // 1. 删除不再存在的对象
    meshes.forEach((meshGroup, id) => {
      if (!geometryStore.shapes.find(shape => shape.id === id)) {
        if (meshGroup instanceof THREE.Group) {
          scene.remove(meshGroup);
          meshGroup.children.forEach(child => {
            if (child instanceof THREE.LineSegments || child instanceof THREE.Mesh) {
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
        meshes.delete(id);
        needsUpdateRef.current = true;
      }
    });

    // 2. 更新或创建对象
    geometryStore.shapes.forEach(shape => {
      let meshGroup = meshes.get(shape.id);
      let needsUpdate = shape.hasChanged;  // 使用 hasChanged 标记判断是否需要更新

      if (!meshGroup) {
        // 创建新对象
        meshGroup = new THREE.Group();
        meshGroup.position.set(shape.position.x, shape.position.y, shape.position.z);
        meshGroup.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
        meshGroup.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
        meshGroup.updateMatrix();
        meshGroup.updateMatrixWorld(true);

        const geometry = createGeometry(shape.type);
        
        // 将相机和meshGroup信息添加到geometry的userData中
        geometry.userData.camera = cameraRef.current;
        geometry.userData.meshGroup = meshGroup;
        geometry.userData.camera.updateMatrix();
        geometry.userData.camera.updateMatrixWorld(true);
        
        const edges = new CustomEdgesGeometry(geometry);
        
        // 创建实线边缘
        const solidLineMaterial = new THREE.LineBasicMaterial({ 
          color: shape.color,
          linewidth: 1
        });
        const solidLineGeometry = new THREE.BufferGeometry();
        solidLineGeometry.setAttribute('position', edges.solidEdges);
        const solidLineSegments = new THREE.LineSegments(solidLineGeometry, solidLineMaterial);
        meshGroup.add(solidLineSegments);

        // 创建虚线边缘
        const dashedLineMaterial = new THREE.LineDashedMaterial({ 
          color: shape.color,
          linewidth: 1,
          opacity: 0.5,
          transparent: true,
          dashSize: 0.2,
          gapSize: 0.1
        });
        const dashedLineGeometry = new THREE.BufferGeometry();
        dashedLineGeometry.setAttribute('position', edges.dashedEdges);
        const dashedLineSegments = new THREE.LineSegments(dashedLineGeometry, dashedLineMaterial);
        dashedLineSegments.computeLineDistances(); // 计算虚线距离
        meshGroup.add(dashedLineSegments);
        
        const solidMaterial = new THREE.MeshBasicMaterial({ 
          transparent: true, 
          opacity: 0,
          side: THREE.DoubleSide 
        });
        const solidMesh = new THREE.Mesh(geometry.clone(), solidMaterial);
        meshGroup.add(solidMesh);
        
        scene.add(meshGroup);
        meshes.set(shape.id, meshGroup);
        needsUpdate = true;
        needsUpdateRef.current = true;
      } else if (needsUpdate) {
        // 检查是否需要更新
        const currentMesh = meshGroup as THREE.Group;
        const currentPosition = currentMesh.position;
        const currentRotation = currentMesh.rotation;
        const currentScale = currentMesh.scale;
        const currentVisible = currentMesh.visible;
        
        // 检查位置、旋转、缩放、可见性是否变化
        if (
          currentPosition.x !== shape.position.x ||
          currentPosition.y !== shape.position.y ||
          currentPosition.z !== shape.position.z ||
          currentRotation.x !== shape.rotation.x ||
          currentRotation.y !== shape.rotation.y ||
          currentRotation.z !== shape.rotation.z ||
          currentScale.x !== shape.scale.x ||
          currentScale.y !== shape.scale.y ||
          currentScale.z !== shape.scale.z ||
          currentVisible !== shape.visible
        ) {
          needsUpdate = true;
          needsUpdateRef.current = true;
        }

        // 检查颜色是否变化
        const lineSegments = currentMesh.children.find(child => child instanceof THREE.LineSegments);
        if (lineSegments instanceof THREE.LineSegments && lineSegments.material instanceof THREE.LineBasicMaterial) {
          const isSelected = geometryStore.selectedShapeId === shape.id;
          const newColor = isSelected ? '#ff6b35' : shape.color;
          if (lineSegments.material.color.getHexString() !== newColor.replace('#', '')) {
            needsUpdate = true;
            needsUpdateRef.current = true;
          }
        }
      }

      // 只在需要时更新
      if (needsUpdate && meshGroup instanceof THREE.Group) {
        meshGroup.position.set(shape.position.x, shape.position.y, shape.position.z);
        meshGroup.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
        meshGroup.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
        meshGroup.visible = shape.visible;
        
        // 确保更新矩阵
        meshGroup.updateMatrix();
        meshGroup.updateMatrixWorld(true);
        
        const lineSegments = meshGroup.children.find(child => child instanceof THREE.LineSegments);
        if (lineSegments instanceof THREE.LineSegments && lineSegments.material instanceof THREE.LineBasicMaterial) {
          const isSelected = geometryStore.selectedShapeId === shape.id;
          const color = isSelected ? '#ff6b35' : shape.color;
          lineSegments.material.color.setHex(parseInt(color.replace('#', '0x')));
        }
      }
    });

    isUpdatingRef.current = false;
  }, [geometryStore.shapes, geometryStore.selectedShapeId]);

  // 使用useEffect来处理状态更新
  useEffect(() => {
    if (needsUpdateRef.current) {
      geometryStore.resetChangeFlags();
      needsUpdateRef.current = false;
    }
  }, [geometryStore.shapes, geometryStore.selectedShapeId]);

  // 直接调用updateScene，让MobX observer处理重新渲染
  updateScene();

  //////// all above are for updateScene, updateScene is called everytime the geometryStore is updated ////////

  return <div ref={mountRef} style={{ width, height }} />;
}); 