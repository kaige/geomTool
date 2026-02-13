import * as THREE from 'three';
import { geometryStore } from '../stores/GeometryStore';
import { LineSegment, CircularArc } from '../types/GeometryTypes';

/**
 * Types of snap points available
 */
export enum SnapType {
  ENDPOINT = 'endpoint',
  ARC_CENTER = 'arc_center',
  MIDPOINT = 'midpoint',
  INTERSECTION = 'intersection'
}

/**
 * Information about a snap point
 */
export interface SnapPoint {
  position: THREE.Vector3;
  type: SnapType;
  sourceShapeId: string;
  description: string;
}

/**
 * Result of a snap operation
 */
export interface SnapResult {
  snappedPosition: THREE.Vector3;
  snapPoint: SnapPoint | null;
  distance: number;
}

/**
 * Visual state for snap feedback
 */
export interface SnapVisualState {
  isVisible: boolean;
  snapPosition: THREE.Vector3 | null;
  snapType: SnapType | null;
}

/**
 * Manages snap and inference functionality for drawing tools
 * Detects and snaps to existing geometry endpoints, centers, and other key points
 */
export class SnapManager {
  private readonly SNAP_THRESHOLD: number = 0.5;
  private visualState: SnapVisualState = {
    isVisible: false,
    snapPosition: null,
    snapType: null
  };

  /**
   * Find the closest snap point to the given world position
   * @param worldPos - The world position to check for snaps
   * @param excludeShapeId - Optional shape ID to exclude from snapping (e.g., the shape being drawn)
   * @returns SnapResult with the snapped position or the original position if no snap found
   */
  findSnapPoint(worldPos: THREE.Vector3, excludeShapeId?: string): SnapResult {
    let closestPoint: SnapPoint | null = null;
    let minDistance = this.SNAP_THRESHOLD;

    // Get all snappable points from existing geometry
    const snapPoints = this.collectAllSnapPoints(excludeShapeId);

    // Find the closest snap point within threshold
    for (const snapPoint of snapPoints) {
      const distance = worldPos.distanceTo(snapPoint.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = snapPoint;
      }
    }

    const snappedPosition = closestPoint ? closestPoint.position.clone() : worldPos;

    // Update visual state
    this.visualState = {
      isVisible: closestPoint !== null,
      snapPosition: closestPoint ? closestPoint.position.clone() : null,
      snapType: closestPoint?.type || null
    };

    return {
      snappedPosition,
      snapPoint: closestPoint,
      distance: minDistance
    };
  }

  /**
   * Check if a position is snapped to any geometry
   * @param worldPos - The world position to check
   * @param excludeShapeId - Optional shape ID to exclude
   * @returns true if the position is within snap threshold of a snap point
   */
  isSnapped(worldPos: THREE.Vector3, excludeShapeId?: string): boolean {
    const result = this.findSnapPoint(worldPos, excludeShapeId);
    return result.snapPoint !== null;
  }

  /**
   * Get the current visual state for snap feedback
   */
  getVisualState(): SnapVisualState {
    return this.visualState;
  }

  /**
   * Reset the visual state (call when tool deactivates)
   */
  resetVisualState(): void {
    this.visualState = {
      isVisible: false,
      snapPosition: null,
      snapType: null
    };
  }

  /**
   * Collect all snappable points from existing geometry
   * @param excludeShapeId - Optional shape ID to exclude
   * @returns Array of all available snap points
   */
  private collectAllSnapPoints(excludeShapeId?: string): SnapPoint[] {
    const snapPoints: SnapPoint[] = [];

    for (const shape of geometryStore.shapes) {
      if (shape.id === excludeShapeId) continue;

      if (shape.type === 'lineSegment') {
        const lineSnapPoints = this.collectLineSegmentSnapPoints(shape as LineSegment);
        snapPoints.push(...lineSnapPoints);
      } else if (shape.type === 'circularArc') {
        const arcSnapPoints = this.collectArcSnapPoints(shape as CircularArc);
        snapPoints.push(...arcSnapPoints);
      }
    }

    return snapPoints;
  }

  /**
   * Collect snap points from a line segment
   */
  private collectLineSegmentSnapPoints(line: LineSegment): SnapPoint[] {
    const points: SnapPoint[] = [];

    const startVertex = geometryStore.getVertexById(line.startVertexId);
    const endVertex = geometryStore.getVertexById(line.endVertexId);

    if (startVertex && endVertex) {
      const startPos = new THREE.Vector3(
        startVertex.position.x,
        startVertex.position.y,
        startVertex.position.z
      );
      const endPos = new THREE.Vector3(
        endVertex.position.x,
        endVertex.position.y,
        endVertex.position.z
      );

      // Add endpoints
      points.push({
        position: startPos,
        type: SnapType.ENDPOINT,
        sourceShapeId: line.id,
        description: 'Line Endpoint'
      });

      points.push({
        position: endPos,
        type: SnapType.ENDPOINT,
        sourceShapeId: line.id,
        description: 'Line Endpoint'
      });

      // Add midpoint
      const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
      points.push({
        position: midpoint,
        type: SnapType.MIDPOINT,
        sourceShapeId: line.id,
        description: 'Line Midpoint'
      });
    }

    return points;
  }

  /**
   * Collect snap points from a circular arc
   */
  private collectArcSnapPoints(arc: CircularArc): SnapPoint[] {
    const points: SnapPoint[] = [];

    const centerVertex = geometryStore.getVertexById(arc.centerVertexId);
    const startVertex = geometryStore.getVertexById(arc.startVertexId);
    const endVertex = geometryStore.getVertexById(arc.endVertexId);

    if (centerVertex && startVertex && endVertex) {
      const centerPos = new THREE.Vector3(
        centerVertex.position.x,
        centerVertex.position.y,
        centerVertex.position.z
      );
      const startPos = new THREE.Vector3(
        startVertex.position.x,
        startVertex.position.y,
        startVertex.position.z
      );
      const endPos = new THREE.Vector3(
        endVertex.position.x,
        endVertex.position.y,
        endVertex.position.z
      );

      // Add center point
      points.push({
        position: centerPos,
        type: SnapType.ARC_CENTER,
        sourceShapeId: arc.id,
        description: 'Arc Center'
      });

      // Add endpoints
      points.push({
        position: startPos,
        type: SnapType.ENDPOINT,
        sourceShapeId: arc.id,
        description: 'Arc Endpoint'
      });

      points.push({
        position: endPos,
        type: SnapType.ENDPOINT,
        sourceShapeId: arc.id,
        description: 'Arc Endpoint'
      });

      // Add midpoint
      const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
      points.push({
        position: midpoint,
        type: SnapType.MIDPOINT,
        sourceShapeId: arc.id,
        description: 'Arc Midpoint'
      });
    }

    return points;
  }

  /**
   * Create a visual marker for snap indication
   * @returns A THREE.Group containing the snap marker
   */
  createSnapMarker(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false; // Initially hidden

    // Create a cross marker for snap indication
    const crossSize = 0.3;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2,
      depthTest: false
    });

    // Horizontal line
    const hGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-crossSize / 2, 0, 0),
      new THREE.Vector3(crossSize / 2, 0, 0)
    ]);
    const hLine = new THREE.Line(hGeometry, lineMaterial);
    group.add(hLine);

    // Vertical line
    const vGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -crossSize / 2, 0),
      new THREE.Vector3(0, crossSize / 2, 0)
    ]);
    const vLine = new THREE.Line(vGeometry, lineMaterial);
    group.add(vLine);

    // Add a circle for arc center snap indication
    const circleGeometry = new THREE.RingGeometry(0.15, 0.2, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.8
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.visible = false; // Only visible for arc center snaps
    circle.name = 'centerCircle';
    group.add(circle);

    // Add a square for endpoint snap indication
    const squareGeometry = new THREE.RingGeometry(0.1, 0.15, 4);
    const squareMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.8
    });
    const square = new THREE.Mesh(squareGeometry, squareMaterial);
    square.visible = false; // Only visible for endpoint snaps
    square.name = 'endpointSquare';
    group.add(square);

    // Add a diamond for midpoint snap indication
    const diamondGeometry = new THREE.RingGeometry(0.08, 0.12, 4);
    const diamondMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.8
    });
    const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
    diamond.rotation.z = Math.PI / 4;
    diamond.visible = false; // Only visible for midpoint snaps
    diamond.name = 'midpointDiamond';
    group.add(diamond);

    group.renderOrder = 999; // Render on top of everything
    return group;
  }

  /**
   * Update the snap marker's position and appearance based on snap type
   * @param marker - The snap marker group to update
   */
  updateSnapMarker(marker: THREE.Group): void {
    if (!this.visualState.isVisible || !this.visualState.snapPosition) {
      marker.visible = false;
      return;
    }

    marker.visible = true;
    marker.position.copy(this.visualState.snapPosition);
    marker.updateMatrix();
    marker.updateMatrixWorld(true);

    // Update visibility of different marker parts based on snap type
    const centerCircle = marker.getObjectByName('centerCircle') as THREE.Mesh;
    const endpointSquare = marker.getObjectByName('endpointSquare') as THREE.Mesh;
    const midpointDiamond = marker.getObjectByName('midpointDiamond') as THREE.Mesh;

    if (centerCircle) centerCircle.visible = this.visualState.snapType === SnapType.ARC_CENTER;
    if (endpointSquare) endpointSquare.visible = this.visualState.snapType === SnapType.ENDPOINT;
    if (midpointDiamond) midpointDiamond.visible = this.visualState.snapType === SnapType.MIDPOINT;
  }
}
