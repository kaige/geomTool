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
    camera.position.set(0, 15, 0); // 从上方俯视XOY平面
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

    // 挂载到DOM
    mountRef.current.appendChild(renderer.domElement);

    // 保存到store
    geometryStore.setThreeObjects(scene, camera, renderer);

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 添加鼠标控制（简单的轨道控制）
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      // 正交相机的平移控制 - 根据视锥体大小计算正确的移动距离
      const aspect = width / height;
      const worldWidth = frustumSize * aspect;
      const worldHeight = frustumSize;
      
      // 将像素移动距离转换为世界坐标移动距离
      const deltaWorldX = (deltaX / width) * worldWidth;
      const deltaWorldY = (deltaY / height) * worldHeight;
      
      camera.position.x -= deltaWorldX;
      camera.position.z -= deltaWorldY; // 修改为减号，让上下移动方向与鼠标一致
      
      // 相机始终保持俯视角度，朝向正下方
      // 不需要动态调整朝向，保持固定的俯视角度

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (isMouseDown) {
        // 只在没有拖拽时才处理点击选择
        const deltaX = Math.abs(event.clientX - mouseX);
        const deltaY = Math.abs(event.clientY - mouseY);
        
        if (deltaX < 5 && deltaY < 5) { // 容错范围，避免轻微抖动
          handleClick(event);
        }
      }
      isMouseDown = false;
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
          geometryStore.selectShape(clickedShapeId);
        }
      } else {
        console.log('没有检测到交点，取消选择');
        // 点击空白区域，取消选择
        geometryStore.selectShape(null);
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

    const currentMount = mountRef.current;
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      
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