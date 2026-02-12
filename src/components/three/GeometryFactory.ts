import * as THREE from 'three';
import { geometryStore } from '../../stores/GeometryStore';
import { GeometryShape, LineSegment, Rectangle, Circle, Triangle, Polygon, CircularArc } from '../../types/GeometryTypes';

// Create default arc geometry
function createDefaultArcGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const radius = 1;
  const startAngle = 0;
  const endAngle = Math.PI;
  const numPoints = 32;

  for (let i = 0; i <= numPoints; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    points.push(new THREE.Vector3(x, y, 0));
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

// Create arc geometry from center, start, end points
export function createArcGeometry(
  center: { x: number; y: number; z: number },
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  clockwise: boolean
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const numPoints = 32;

  const radius = Math.sqrt(
    Math.pow(start.x - center.x, 2) + Math.pow(start.y - center.y, 2)
  );
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const endAngle = Math.atan2(end.y - center.y, end.x - center.x);

  let angleDiff = endAngle - startAngle;
  if (clockwise) {
    if (angleDiff > 0) angleDiff -= 2 * Math.PI;
  } else {
    if (angleDiff < 0) angleDiff += 2 * Math.PI;
  }
  const angleStep = angleDiff / numPoints;

  for (let i = 0; i <= numPoints; i++) {
    const angle = startAngle + angleStep * i;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    points.push(new THREE.Vector3(x, y, 0));
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

// Create geometry for a shape
export function createGeometry(shape: GeometryShape): THREE.BufferGeometry {
  switch (shape.type) {
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
    
    case 'lineSegment': {
      const lineShape = shape as LineSegment;
      const startVertex = geometryStore.getVertexById(lineShape.startVertexId);
      const endVertex = geometryStore.getVertexById(lineShape.endVertexId);
      
      if (!startVertex || !endVertex) {
        console.warn('Line segment vertices not found, using default positions');
        const lineGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array([0, 0, 0, 1, 0, 0]);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return lineGeometry;
      }
      
      const lineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        startVertex.position.x, startVertex.position.y, startVertex.position.z,
        endVertex.position.x, endVertex.position.y, endVertex.position.z
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return lineGeometry;
    }
    
    case 'rectangle': {
      const rectShape = shape as Rectangle;
      const vertices = rectShape.vertexIds.map(id => geometryStore.getVertexById(id)).filter(Boolean);
      
      if (vertices.length !== 4) {
        console.warn('Rectangle vertices not found or incorrect count, using default rectangle');
        return new THREE.PlaneGeometry(1, 1);
      }
      
      const rectGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        vertices[0]!.position.x, vertices[0]!.position.y, vertices[0]!.position.z,
        vertices[1]!.position.x, vertices[1]!.position.y, vertices[1]!.position.z,
        vertices[2]!.position.x, vertices[2]!.position.y, vertices[2]!.position.z,
        vertices[0]!.position.x, vertices[0]!.position.y, vertices[0]!.position.z,
        vertices[2]!.position.x, vertices[2]!.position.y, vertices[2]!.position.z,
        vertices[3]!.position.x, vertices[3]!.position.y, vertices[3]!.position.z
      ]);
      rectGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return rectGeometry;
    }
    
    case 'circle': {
      const circleShape = shape as Circle;
      const curve = geometryStore.getCurveById(circleShape.curveId);
      
      if (!curve) {
        console.warn('Circle curve not found, using default radius');
        return new THREE.CircleGeometry(1, 32);
      }
      
      return new THREE.CircleGeometry(curve.radius, 32);
    }
    
    case 'triangle': {
      const triangleShape = shape as Triangle;
      const vertices = triangleShape.vertexIds.map(id => geometryStore.getVertexById(id)).filter(Boolean);
      
      if (vertices.length !== 3) {
        console.warn('Triangle vertices not found or incorrect count, using default triangle');
        const triangleGeometry = new THREE.BufferGeometry();
        const trianglePositions = new Float32Array([
          0, 0.5, 0,
          -0.5, -0.5, 0,
          0.5, -0.5, 0
        ]);
        triangleGeometry.setAttribute('position', new THREE.BufferAttribute(trianglePositions, 3));
        return triangleGeometry;
      }
      
      const triangleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        vertices[0]!.position.x, vertices[0]!.position.y, vertices[0]!.position.z,
        vertices[1]!.position.x, vertices[1]!.position.y, vertices[1]!.position.z,
        vertices[2]!.position.x, vertices[2]!.position.y, vertices[2]!.position.z
      ]);
      triangleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return triangleGeometry;
    }
    
    case 'polygon': {
      const polygonShape = shape as Polygon;
      const vertices = polygonShape.vertexIds.map(id => geometryStore.getVertexById(id)).filter(Boolean);
      
      if (vertices.length < 3) {
        console.warn('Polygon vertices insufficient, using default hexagon');
        return new THREE.CircleGeometry(1, 6);
      }
      
      const polygonGeometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      
      // Calculate center
      const center = { x: 0, y: 0, z: 0 };
      vertices.forEach(vertex => {
        center.x += vertex!.position.x;
        center.y += vertex!.position.y;
        center.z += vertex!.position.z;
      });
      center.x /= vertices.length;
      center.y /= vertices.length;
      center.z /= vertices.length;
      
      // Create triangle fan
      for (let i = 0; i < vertices.length; i++) {
        const current = vertices[i]!;
        const next = vertices[(i + 1) % vertices.length]!;
        
        positions.push(
          center.x, center.y, center.z,
          current.position.x, current.position.y, current.position.z,
          next.position.x, next.position.y, next.position.z
        );
      }
      
      polygonGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      return polygonGeometry;
    }
    
    case 'circularArc': {
      const arcShape = shape as CircularArc;
      const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);
      const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
      const endVertex = geometryStore.getVertexById(arcShape.endVertexId);

      if (!centerVertex || !startVertex || !endVertex) {
        console.warn('Arc vertices not found, using default arc');
        return createDefaultArcGeometry();
      }

      return createArcGeometry(centerVertex.position, startVertex.position, endVertex.position, arcShape.clockwise);
    }
    
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

// Check if vertices have changed
export function hasVerticesChanged(shape: GeometryShape): boolean {
  switch (shape.type) {
    case 'lineSegment': {
      const lineShape = shape as LineSegment;
      const startVertex = geometryStore.getVertexById(lineShape.startVertexId);
      const endVertex = geometryStore.getVertexById(lineShape.endVertexId);
      return startVertex?.hasChanged || endVertex?.hasChanged || false;
    }
    
    case 'rectangle':
    case 'triangle':
    case 'polygon': {
      const polygonShape = shape as Rectangle | Triangle | Polygon;
      return polygonShape.vertexIds.some(id => {
        const vertex = geometryStore.getVertexById(id);
        return vertex?.hasChanged || false;
      });
    }
    
    case 'circle': {
      const circleShape = shape as Circle;
      const centerVertex = geometryStore.getVertexById(circleShape.centerVertexId);
      const curve = geometryStore.getCurveById(circleShape.curveId);
      return centerVertex?.hasChanged || curve?.hasChanged || false;
    }
    
    case 'circularArc': {
      const arcShape = shape as CircularArc;
      const centerVertex = geometryStore.getVertexById(arcShape.centerVertexId);
      const startVertex = geometryStore.getVertexById(arcShape.startVertexId);
      const endVertex = geometryStore.getVertexById(arcShape.endVertexId);
      return centerVertex?.hasChanged || startVertex?.hasChanged || endVertex?.hasChanged || false;
    }
    
    default:
      return false;
  }
}
