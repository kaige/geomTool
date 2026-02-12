import React, { useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react';
import * as THREE from 'three';
import { geometryStore } from '../stores/GeometryStore';
import { GeometryShape, CircularArc } from '../types/GeometryTypes';
import { MouseState, CameraState, SelectionState, LineEndpointState, ArcEndpointState, ArcCreationState } from '../types/ToolTypes';
import { ToolManager } from './tools/ToolManager';
import {
  createLineEndpoints,
  createArcEndpoints,
  updateLineEndpoints,
  updateArcEndpoints,
  updateAllEndpointsDirection,
  updateAllEndpointsScale
} from './three/EndpointMarkers';
import { createGeometry, hasVerticesChanged } from './three/GeometryFactory';
import {
  CustomEdgesGeometry,
  createEdgeSegments,
  updateFaceColors,
  DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR
} from './three/EdgeGeometry';
import {
  isTransformOrVisibilityChanged,
  disposeMesh,
  cleanupMeshGroup,
  updateMeshTransform,
  setupGeometryUserData,
  parseColor
} from './three/SceneUtils';

// Global tool manager reference
export let globalToolManager: ToolManager | null = null;

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
  const axesSceneRef = useRef<THREE.Scene>();
  const axesCameraRef = useRef<THREE.OrthographicCamera>();

  // Tool manager states
  const mouseState = useRef<MouseState>({
    isMouseDown: false,
    mouseX: 0,
    mouseY: 0,
    startMouseX: 0,
    startMouseY: 0,
  });
  const cameraState = useRef<CameraState>({
    frustumSize: 20,
    isRotatingCamera: false,
    cameraRotationStart: null,
  });
  const selectionState = useRef<SelectionState>({
    isDraggingObject: false,
    isRotatingObject: false,
    rotationAxis: null,
    dragStartWorldPos: null,
    dragStartObjectPos: null,
    dragStartObjectRotation: null,
    dragStartVertexPositions: null,
  });
  const lineEndpointState = useRef<LineEndpointState>({
    isDraggingEndpoint: false,
    draggedEndpoint: null,
    draggedLineId: null,
    dragStartEndpointPos: null,
    dragStartVertexPositions: null,
  });
  const arcEndpointState = useRef<ArcEndpointState>({
    isDraggingEndpoint: false,
    draggedEndpoint: null,
    draggedArcId: null,
    dragStartEndpointPos: null,
    dragStartVertexPositions: null,
  });
  const arcCreationState = useRef<ArcCreationState>({
    isCreatingArc: false,
    step: null,
    startPoint: null,
    endPoint: null,
    arcPoint: null,
    tempArcId: null,
  });

  const isUpdatingRef = useRef(false);
  const needsUpdateRef = useRef(false);

  const toolManagerRef = useRef<ToolManager | null>(null);
  if (!toolManagerRef.current) {
    toolManagerRef.current = new ToolManager(
      mouseState.current,
      cameraState.current,
      selectionState.current,
      lineEndpointState.current,
      arcEndpointState.current,
      arcCreationState.current,
      meshesRef
    );
    globalToolManager = toolManagerRef.current;
  }

  // Initialize main scene
  const initializeMainScene = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const aspect = width / height;
    cameraState.current.frustumSize = 20;
    const camera = new THREE.OrthographicCamera(
      -cameraState.current.frustumSize * aspect / 2,
      cameraState.current.frustumSize * aspect / 2,
      cameraState.current.frustumSize / 2,
      -cameraState.current.frustumSize / 2,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    return { scene, camera, renderer };
  };

  // Initialize axes scene
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

    const axesGroup = new THREE.Group();

    // X axis
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

    // Y axis
    const yGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = 0.5;
    axesGroup.add(yAxis);

    const yArrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.y = 1.1;
    axesGroup.add(yArrow);

    // Z axis
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

  // Render loop
  const setupRenderLoop = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) => {
    const animate = () => {
      requestAnimationFrame(animate);

      updateAllEndpointsDirection(camera, meshesRef.current);
      updateAllEndpointsScale(camera, meshesRef.current);

      // Render main scene
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.setScissorTest(false);
      renderer.render(scene, camera);

      // Render endpoint markers on top
      renderer.autoClear = false;
      renderer.clear(false, false, false);
      meshesRef.current.forEach((meshGroup) => {
        if (meshGroup instanceof THREE.Group) {
          meshGroup.children.forEach(child => {
            if (child instanceof THREE.Mesh &&
                (child.geometry instanceof THREE.CircleGeometry || child.geometry instanceof THREE.RingGeometry)) {
              renderer.render(child, camera);
            }
          });
        }
      });

      // Render temporary geometry from tools
      if (toolManagerRef.current?.currentTool) {
        const currentTool = toolManagerRef.current.currentTool;
        if (currentTool && typeof (currentTool as any).getTempGeometry === 'function') {
          const tempGeometry = (currentTool as any).getTempGeometry();
          if (tempGeometry) {
            if (tempGeometry.line && tempGeometry.line instanceof THREE.Line) {
              renderer.render(tempGeometry.line, camera);
            }
            if (tempGeometry.arc && tempGeometry.arc instanceof THREE.Line) {
              renderer.render(tempGeometry.arc, camera);
            }
            if (tempGeometry.dottedLine && tempGeometry.dottedLine instanceof THREE.Line) {
              renderer.render(tempGeometry.dottedLine, camera);
            }
          }
        }
      }

      renderer.autoClear = true;

      // Sync axes camera
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

      // Render axes
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

  // Event handlers
  const setupMouseEvents = (renderer: THREE.WebGLRenderer, camera: THREE.OrthographicCamera) => {
    const handleWheel = (event: WheelEvent) => {
      toolManagerRef.current?.handleWheel(event, camera);
    };
    const handleMouseDown = (event: MouseEvent) => {
      toolManagerRef.current?.handleMouseDown(event, camera, renderer);
    };
    const handleMouseMove = (event: MouseEvent) => {
      toolManagerRef.current?.handleMouseMove(event, camera, renderer);
    };
    const handleMouseUp = (event: MouseEvent) => {
      toolManagerRef.current?.handleMouseUp(event, camera, renderer);
    };
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
    };
  };

  const setupKeyboardEvents = (camera: THREE.OrthographicCamera) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      toolManagerRef.current?.handleKeyDown(event, camera);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  };

  // Create line or arc shape
  const createLineOrArcShape = (
    shape: GeometryShape,
    geometry: THREE.BufferGeometry,
    meshGroup: THREE.Group,
    isSelected: boolean
  ): void => {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: isSelected ? 0xff6b35 : parseColor(shape.color),
      linewidth: 2,
      depthTest: true,
      depthWrite: true
    });
    const line = new THREE.Line(geometry, lineMaterial);
    line.renderOrder = 0;
    meshGroup.add(line);

    if (isSelected) {
      if (shape.type === 'lineSegment') {
        createLineEndpoints(geometry, meshGroup, true, cameraRef.current);
      } else if (shape.type === 'circularArc') {
        const arcShape = shape as CircularArc;
        const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);
        const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
        const endVertex = geometryStore.getVertexById(arcShape.endVertexId);

        if (centerVertex && startVertex && endVertex) {
          const centerPos = new THREE.Vector3(centerVertex.position.x, centerVertex.position.y, centerVertex.position.z);
          const startPos = new THREE.Vector3(startVertex.position.x, startVertex.position.y, startVertex.position.z);
          const endPos = new THREE.Vector3(endVertex.position.x, endVertex.position.y, endVertex.position.z);
          createArcEndpoints(centerPos, startPos, endPos, meshGroup, true, cameraRef.current);
        }
      }
    }
  };

  // Create solid mesh shape
  const createSolidMeshShape = (
    shape: GeometryShape,
    geometry: THREE.BufferGeometry,
    meshGroup: THREE.Group,
    isSelected: boolean
  ): void => {
    const edges = new CustomEdgesGeometry(geometry);
    createEdgeSegments(edges, shape.color, meshGroup, isSelected);

    const solidMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR ? 0.3 : 0,
      side: THREE.DoubleSide,
      vertexColors: true
    });
    const solidMesh = new THREE.Mesh(geometry.clone(), solidMaterial);

    if (DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR) {
      updateFaceColors(solidMesh.geometry, edges, cameraRef.current!, meshGroup);
    }

    meshGroup.add(solidMesh);
  };

  // Update scene
  const updateScene = useCallback(() => {
    if (!sceneRef.current || isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    const scene = sceneRef.current;
    const meshes = meshesRef.current;

    // Remove deleted shapes
    meshes.forEach((meshGroup, id) => {
      if (!geometryStore.shapes.find(shape => shape.id === id)) {
        if (meshGroup instanceof THREE.Group) {
          scene.remove(meshGroup);
          meshGroup.children.forEach(child => disposeMesh(child));
        }
        meshes.delete(id);
        needsUpdateRef.current = true;
      }
    });

    // Update or create shapes
    geometryStore.shapes.forEach(shape => {
      let meshGroup = meshes.get(shape.id) as THREE.Group | undefined;

      if (!meshGroup) {
        // Create new shape
        meshGroup = new THREE.Group();
        updateMeshTransform(meshGroup, shape);

        const geometry = createGeometry(shape);
        setupGeometryUserData(geometry, cameraRef.current!, meshGroup);

        const isSelected = geometryStore.selectedShapeId === shape.id;

        if (shape.type === 'lineSegment' || shape.type === 'circularArc') {
          createLineOrArcShape(shape, geometry, meshGroup, isSelected);
        } else {
          createSolidMeshShape(shape, geometry, meshGroup, isSelected);
        }

        scene.add(meshGroup);
        meshes.set(shape.id, meshGroup);
      } else {
        // Update existing shape
        const currentMesh = meshGroup;
        const isXformOrVisibilityChanged = isTransformOrVisibilityChanged(currentMesh, shape);
        const verticesChanged = hasVerticesChanged(shape);

        if (isXformOrVisibilityChanged || shape.hasSelectionChanged || shape.hasChanged || verticesChanged) {
          needsUpdateRef.current = true;

          if (isXformOrVisibilityChanged) {
            updateMeshTransform(meshGroup, shape);
          }

          if (verticesChanged) {
            // Recreate geometry
            cleanupMeshGroup(currentMesh);

            const newGeometry = createGeometry(shape);
            setupGeometryUserData(newGeometry, cameraRef.current!, meshGroup);

            const isSelected = geometryStore.selectedShapeId === shape.id;

            if (shape.type === 'lineSegment' || shape.type === 'circularArc') {
              createLineOrArcShape(shape, newGeometry, meshGroup, isSelected);
            } else {
              createSolidMeshShape(shape, newGeometry, meshGroup, isSelected);
            }
          } else {
            // Update materials and endpoints
            const line = currentMesh.children.find(child => child instanceof THREE.Line) as THREE.Line;
            const solidMesh = currentMesh.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;

            if ((shape.type === 'lineSegment' || shape.type === 'circularArc') && line) {
              if (shape.hasSelectionChanged) {
                const lineMaterial = line.material as THREE.LineBasicMaterial;
                lineMaterial.color.setHex(geometryStore.selectedShapeId === shape.id ? 0xff6b35 : parseColor(shape.color));
                lineMaterial.depthTest = true;
                lineMaterial.depthWrite = true;
              }

              const isSelected = geometryStore.selectedShapeId === shape.id;
              if (shape.type === 'lineSegment') {
                updateLineEndpoints(meshGroup, line.geometry, isSelected, cameraRef.current);
              } else if (shape.type === 'circularArc') {
                const arcShape = shape as CircularArc;
                const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);
                const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
                const endVertex = geometryStore.getVertexById(arcShape.endVertexId);

                if (centerVertex && startVertex && endVertex) {
                  const centerPos = new THREE.Vector3(centerVertex.position.x, centerVertex.position.y, centerVertex.position.z);
                  const startPos = new THREE.Vector3(startVertex.position.x, startVertex.position.y, startVertex.position.z);
                  const endPos = new THREE.Vector3(endVertex.position.x, endVertex.position.y, endVertex.position.z);
                  updateArcEndpoints(meshGroup, centerPos, startPos, endPos, isSelected, cameraRef.current);
                }
              }
            } else if (solidMesh && solidMesh.geometry) {
              if (isXformOrVisibilityChanged) {
                setupGeometryUserData(solidMesh.geometry, cameraRef.current!, meshGroup);
              }

              // Update edges
              currentMesh.children.forEach(child => {
                if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
                  disposeMesh(child);
                  currentMesh.remove(child);
                }
              });

              const edges = new CustomEdgesGeometry(solidMesh.geometry);
              createEdgeSegments(edges, shape.color, meshGroup, geometryStore.selectedShapeId === shape.id);

              if (DEBUG_SHOW_FACES_VISIBILITY_BY_COLOR) {
                updateFaceColors(solidMesh.geometry, edges, cameraRef.current!, meshGroup);
              }
            }
          }
        }
      }

      if (shape.hasChanged) {
        shape.hasChanged = false;
      }
    });

    isUpdatingRef.current = false;
  }, [geometryStore.shapes, geometryStore.selectedShapeId]);

  useEffect(() => {
    if (needsUpdateRef.current) {
      geometryStore.resetChangeFlags();
      needsUpdateRef.current = false;
    }
  }, [geometryStore.shapes, geometryStore.selectedShapeId]);

  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer } = initializeMainScene();
    initializeAxesScene();
    setupRenderLoop(renderer, scene, camera);

    const cleanupMouseEvents = setupMouseEvents(renderer, camera);
    const cleanupKeyboardEvents = setupKeyboardEvents(camera);

    mountRef.current.appendChild(renderer.domElement);

    return () => {
      cleanupMouseEvents();
      cleanupKeyboardEvents();

      if (axesSceneRef.current) {
        axesSceneRef.current.traverse((child) => {
          disposeMesh(child);
        });
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  updateScene();

  return <div ref={mountRef} style={{ width, height }} />;
});
