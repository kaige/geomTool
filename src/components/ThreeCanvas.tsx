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
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

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

    const handleMouseUp = () => {
      isMouseDown = false;
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
    meshes.forEach((mesh, id) => {
      if (!geometryStore.shapes.find(shape => shape.id === id)) {
        scene.remove(mesh);
        meshes.delete(id);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    });

    // 添加或更新物体
    geometryStore.shapes.forEach(shape => {
      let mesh = meshes.get(shape.id);

      if (!mesh) {
        // 创建新物体
        const geometry = createGeometry(shape.type);
        const material = new THREE.MeshLambertMaterial({ color: shape.color });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshes.set(shape.id, mesh);
      }

      // 更新物体属性
      mesh.position.set(shape.position.x, shape.position.y, shape.position.z);
      mesh.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
      mesh.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);
      mesh.visible = shape.visible;
      
      // 更新材质颜色
      if (mesh.material instanceof THREE.MeshLambertMaterial) {
        mesh.material.color.setHex(parseInt(shape.color.replace('#', '0x')));
      }
    });
  };

  // 直接调用updateScene，让MobX observer处理重新渲染
  updateScene();

  return <div ref={mountRef} style={{ width, height }} />;
}); 