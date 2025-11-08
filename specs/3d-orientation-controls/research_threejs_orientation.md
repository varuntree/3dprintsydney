# Three.js/React Three Fiber Orientation Controls Research

## Problem Statement

User reports: When rotating model with mouse, base plate (grid/axes) rotates WITH model. Expected: grid/axes stay fixed in world space, model rotates on its own axis.

Current implementation uses OrbitControls which orbits camera around scene, but grid/axes are positioned relative to model, causing them to rotate with view.

## 1. Fixed Build Plate Pattern

### Root Cause Analysis

In current code (`ModelViewer.tsx` lines 353-363):
```tsx
{helpersVisible && objectRef.current ? (
  (() => {
    const minY = getGroupMinY(objectRef.current! as THREE.Group);
    return (
      <>
        <gridHelper args={[400, 40, "#94a3b8", "#64748b"]} position={[0, minY - 0.5, 0]} />
        <axesHelper args={[120]} position={[0, minY, 0]} />
      </>
    );
  })()
) : null}
```

Grid/axes are positioned at model's minY, but they're rendered inside the scene hierarchy alongside the model. When camera orbits, perspective makes them appear to rotate.

### Solution: Separate World Space Hierarchy

**Pattern 1: Keep helpers at scene root (not as children of model group)**

Grid/axes should be:
- Direct children of scene root
- Positioned at world origin (0, 0, 0) or fixed Y position
- Never parented to the model group

```tsx
{/* Outside model group - fixed in world space */}
<gridHelper args={[400, 40, "#94a3b8", "#64748b"]} position={[0, 0, 0]} />
<axesHelper args={[120]} position={[0, 0, 0]} />

{/* Model group - can rotate independently */}
<group ref={objectRef}>
  {/* STL/3MF model here */}
</group>
```

**Pattern 2: Position grid at model's base, but keep separate**

If grid should align with model's bottom surface:
```tsx
const minY = sceneObject ? getGroupMinY(sceneObject as THREE.Group) : 0;

{/* Grid fixed in world space at model's base */}
<gridHelper args={[400, 40, "#94a3b8", "#64748b"]} position={[0, minY, 0]} />
<axesHelper args={[120]} position={[0, minY, 0]} />
```

Calculate minY once when model loads, not on every frame.

### Standard Three.js Pattern

```js
// Scene hierarchy
scene
├── camera (controlled by OrbitControls)
├── lights
├── gridHelper (fixed world space)
├── axesHelper (fixed world space)
└── modelGroup (user can rotate this)
    └── mesh
```

OrbitControls moves camera around scene center. Grid stays at world origin. Model rotates on its own axis.

## 2. OrbitControls Best Practices

### Current Configuration (lines 386-397)

```tsx
<OrbitControls
  ref={controlsRef}
  enablePan
  enableDamping
  dampingFactor={0.08}
  minPolarAngle={0.001}
  maxPolarAngle={Math.PI - 0.001}
  maxDistance={800}
  minDistance={10}
  makeDefault
/>
```

This is correct for camera orbiting. Issues:

### Camera Up Vector (Critical)

Current code (line 580):
```tsx
camera.up.set(0, 1, 0);
```

This is correct for Y-up coordinate system. For Z-up (common in CAD/3D printing):
```tsx
camera.up.set(0, 0, 1);
```

**Y-up vs Z-up:**
- **Y-up**: Standard Three.js (Y is vertical, XZ is ground plane)
- **Z-up**: CAD/3D printing convention (Z is vertical, XY is ground plane)

Current code uses Y-up which is fine, just ensure consistency.

### OrbitControls Target

Controls orbit around `controls.target` (default: world origin). Current code correctly sets target to (0, 0, 0):

```tsx
if (controls?.target) {
  controls.target.set(0, 0, 0);
  controls.update();
}
```

**Key principle:** Camera orbits. Model doesn't move. Grid doesn't move. Only camera position changes.

### Preventing Camera Flip

Current implementation prevents flipping under ground:
```tsx
minPolarAngle={0.001}
maxPolarAngle={Math.PI - 0.001}
```

This is correct. Keeps camera above XZ plane.

### MapControls Alternative

For ground-plane navigation (like Google Earth), use `MapControls` instead of `OrbitControls`:

```tsx
import { MapControls } from '@react-three/drei';

<MapControls
  enableDamping
  dampingFactor={0.08}
  minPolarAngle={0}
  maxPolarAngle={Math.PI / 2} // Prevent going below ground
/>
```

MapControls: pan parallel to ground, more intuitive for build plate viewing.

## 3. Orient-to-Face Feature

### Raycasting for Face Selection

**Standard pattern:**

```tsx
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';

function useRaycast() {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const mouse = useMemo(() => new Vector2(), []);

  const handleClick = useCallback((event: MouseEvent) => {
    // Normalize mouse coordinates
    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Cast ray
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      // hit.face - THREE.Face3 with normal
      // hit.faceIndex - index in geometry
      // hit.point - intersection point
      // hit.object - mesh that was hit
      return hit;
    }
  }, [camera, scene, raycaster, mouse]);

  return handleClick;
}
```

### Calculating Rotation to Align Face to XY Plane

Given a face normal from raycasting:

```tsx
function alignFaceToPlane(
  mesh: THREE.Mesh,
  faceNormal: THREE.Vector3,
  targetNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0) // Y-up
): THREE.Quaternion {
  // Normalize normals
  const sourceNormal = faceNormal.clone().normalize();
  targetNormal.normalize();

  // Calculate quaternion that rotates source to target
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(sourceNormal, targetNormal);

  return quaternion;
}

// Usage
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObject(mesh);

if (intersects[0] && intersects[0].face) {
  const face = intersects[0].face;
  const faceNormal = face.normal.clone();

  // Transform normal from local to world space
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  faceNormal.applyMatrix3(normalMatrix).normalize();

  // Calculate rotation
  const targetQuat = alignFaceToPlane(mesh, faceNormal);

  // Apply to mesh
  mesh.quaternion.copy(targetQuat);
  mesh.updateMatrixWorld(true);
}
```

### Face Selection UI Pattern

**PrusaSlicer approach:**
1. Click mesh to enter "Place on face" mode
2. Hover shows face highlight (change material/color)
3. Click face to rotate model so face is on build plate
4. Smooth animation to new orientation

**Implementation with React Three Fiber:**

```tsx
function FaceSelector({ mesh }: { mesh: THREE.Mesh }) {
  const [hoveredFace, setHoveredFace] = useState<number | null>(null);

  return (
    <mesh
      geometry={mesh.geometry}
      material={mesh.material}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (e.faceIndex !== undefined) {
          setHoveredFace(e.faceIndex);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.face) {
          const quat = alignFaceToPlane(mesh, e.face.normal);
          // Animate to quaternion (see section 3.3)
        }
      }}
    />
  );
}
```

### Smooth Transitions with Quaternion Slerp

**Using TWEEN.js:**

```tsx
import TWEEN from '@tweenjs/tween.js';

function animateRotation(
  object: THREE.Object3D,
  targetQuaternion: THREE.Quaternion,
  duration: number = 500
) {
  const startQuaternion = object.quaternion.clone();
  const tempQuaternion = new THREE.Quaternion();

  const tween = new TWEEN.Tween({ t: 0 })
    .to({ t: 1 }, duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(({ t }) => {
      THREE.Quaternion.slerp(
        startQuaternion,
        targetQuaternion,
        tempQuaternion,
        t
      );
      object.quaternion.copy(tempQuaternion);
      object.updateMatrixWorld(true);
    })
    .start();

  return tween;
}
```

**Using react-spring (React Three Fiber way):**

```tsx
import { useSpring, animated } from '@react-spring/three';

function RotatingMesh({ quaternion }: { quaternion: THREE.Quaternion }) {
  const spring = useSpring({
    rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    config: { tension: 170, friction: 26 }
  });

  return (
    <animated.mesh
      quaternion={spring.rotation as any}
    >
      {/* geometry & material */}
    </animated.mesh>
  );
}
```

**Manual RAF approach (most control):**

```tsx
function smoothRotate(
  object: THREE.Object3D,
  targetQuat: THREE.Quaternion,
  duration: number = 500
): Promise<void> {
  return new Promise((resolve) => {
    const startQuat = object.quaternion.clone();
    const tempQuat = new THREE.Quaternion();
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Ease in-out
      const eased = t < 0.5
        ? 2 * t * t
        : -1 + (4 - 2 * t) * t;

      THREE.Quaternion.slerp(startQuat, targetQuat, tempQuat, eased);
      object.quaternion.copy(tempQuat);
      object.updateMatrixWorld(true);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    animate();
  });
}
```

## 4. Transform Persistence

### Three Approaches

#### A. Store Quaternion + Position (Recommended)

**Pros:** Clean, reversible, preserves original geometry
**Cons:** Must reapply on every load

```tsx
interface ModelTransform {
  position: [number, number, number];
  quaternion: [number, number, number, number]; // x, y, z, w
  scale: [number, number, number];
}

// Save
function saveTransform(object: THREE.Object3D): ModelTransform {
  return {
    position: object.position.toArray(),
    quaternion: object.quaternion.toArray() as [number, number, number, number],
    scale: object.scale.toArray()
  };
}

// Restore
function restoreTransform(object: THREE.Object3D, transform: ModelTransform) {
  object.position.fromArray(transform.position);
  object.quaternion.fromArray(transform.quaternion);
  object.scale.fromArray(transform.scale);
  object.updateMatrixWorld(true);
}
```

Store as JSON in database:
```json
{
  "transform": {
    "position": [0, 0, 0],
    "quaternion": [0, 0, 0, 1],
    "scale": [1, 1, 1]
  }
}
```

#### B. Store Matrix4

**Pros:** Single object, encapsulates all transforms
**Cons:** Less human-readable, harder to edit individual components

```tsx
function saveMatrix(object: THREE.Object3D): number[] {
  return object.matrix.toArray(); // 16 numbers
}

function restoreMatrix(object: THREE.Object3D, matrixArray: number[]) {
  object.matrix.fromArray(matrixArray);
  object.matrix.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrixWorld(true);
}
```

#### C. Bake into Geometry Vertices (Not Recommended)

**Pros:** Transform becomes permanent, no need to reapply
**Cons:** Destroys original geometry, can't undo, file size increases if saving modified STL

```tsx
function bakeTransformIntoGeometry(mesh: THREE.Mesh) {
  mesh.updateMatrix();
  mesh.geometry.applyMatrix4(mesh.matrix);
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  mesh.updateMatrix();
}
```

**When to use:** Only if exporting final oriented STL for printing. Not for editable orientation.

### Recommended Approach for 3D Print Orientation

```tsx
// Database schema
interface PrintJob {
  id: string;
  modelUrl: string;
  orientation: {
    quaternion: [number, number, number, number];
    position: [number, number, number];
    autoOriented: boolean; // track if auto-orient was used
  };
  // ... other fields
}

// On model load
function loadModel(job: PrintJob) {
  const geometry = await loadSTL(job.modelUrl);
  const mesh = new THREE.Mesh(geometry, material);

  if (job.orientation) {
    mesh.quaternion.fromArray(job.orientation.quaternion);
    mesh.position.fromArray(job.orientation.position);
  } else {
    // First load - auto-orient
    const quat = computeAutoOrientQuaternion(geometry);
    mesh.quaternion.copy(quat);
  }

  centerGroupToOrigin(mesh);
  mesh.updateMatrixWorld(true);
}

// On user rotation
function handleUserRotation(mesh: THREE.Mesh) {
  const transform = {
    quaternion: mesh.quaternion.toArray(),
    position: mesh.position.toArray(),
    autoOriented: false
  };

  saveToDatabase(transform);
}
```

## 5. Manual Rotation UI Patterns

### Industry Standard Controls

#### Pattern 1: Axis-Locked Rotation with Numeric Input

PrusaSlicer style:
```
[X] [↻] [Input: 0°] [Reset]
[Y] [↻] [Input: 0°] [Reset]
[Z] [↻] [Input: 0°] [Reset]
```

Implementation:
```tsx
function RotationControls({ mesh }: { mesh: THREE.Mesh }) {
  const [rotations, setRotations] = useState({ x: 0, y: 0, z: 0 });

  const rotate = (axis: 'x' | 'y' | 'z', degrees: number) => {
    const radians = THREE.MathUtils.degToRad(degrees);
    const currentEuler = new THREE.Euler().setFromQuaternion(mesh.quaternion);

    currentEuler[axis] += radians;
    mesh.quaternion.setFromEuler(currentEuler);
    mesh.updateMatrixWorld(true);

    setRotations(prev => ({
      ...prev,
      [axis]: (prev[axis] + degrees) % 360
    }));
  };

  return (
    <div>
      {['x', 'y', 'z'].map(axis => (
        <div key={axis}>
          <button onClick={() => rotate(axis as any, -90)}>↶</button>
          <input
            type="number"
            value={rotations[axis as keyof typeof rotations]}
            onChange={(e) => {
              const newDeg = parseFloat(e.target.value) || 0;
              const deltaDeg = newDeg - rotations[axis as keyof typeof rotations];
              rotate(axis as any, deltaDeg);
            }}
          />
          <button onClick={() => rotate(axis as any, 90)}>↷</button>
        </div>
      ))}
    </div>
  );
}
```

#### Pattern 2: TransformControls (Gizmo)

Three.js built-in gizmo for visual manipulation:

```tsx
import { TransformControls } from '@react-three/drei';

function ModelWithGizmo({ mesh }: { mesh: THREE.Mesh }) {
  return (
    <>
      <primitive object={mesh} />
      <TransformControls
        object={mesh}
        mode="rotate" // or "translate" or "scale"
        onObjectChange={(e) => {
          // Transform changed
          saveTransform(mesh);
        }}
      />
    </>
  );
}
```

Keyboard shortcuts:
- `W` - translate mode
- `E` - rotate mode
- `R` - scale mode
- `+/-` - adjust gizmo size
- `X/Y/Z` - lock to axis

#### Pattern 3: PivotControls (Drei)

More modern, CAD-like controls:

```tsx
import { PivotControls } from '@react-three/drei';

<PivotControls
  anchor={[0, 0, 0]}
  onDrag={(local) => {
    // Extract transform from matrix
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    local.decompose(pos, quat, scale);

    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    mesh.scale.copy(scale);
  }}
  autoTransform={false} // manual control
>
  <primitive object={mesh} />
</PivotControls>
```

### Snap-to-Angle Feature

Common increments: 1°, 5°, 15°, 45°, 90°

```tsx
function snapAngle(angle: number, increment: number): number {
  return Math.round(angle / increment) * increment;
}

// Apply when dragging gizmo
function onRotate(axis: string, angle: number, snapIncrement: number = 5) {
  const snapped = snapAngle(angle, snapIncrement);
  // Apply snapped rotation
}

// UI toggle
<label>
  <input type="checkbox" checked={snapEnabled} onChange={...} />
  Snap to {snapIncrement}°
</label>
```

## 6. Code Examples & Patterns

### Complete Fixed Build Plate Implementation

```tsx
// ModelViewer.tsx refactor
function Scene({ url, onReady, ... }) {
  const objectRef = useRef<THREE.Group | null>(null);
  const [modelMinY, setModelMinY] = useState(0);

  const prepareGroup = useCallback((group: THREE.Group) => {
    // Auto-orient
    const merged = mergeObjectGeometries(group);
    if (merged) {
      const q = computeAutoOrientQuaternion(merged, "upright");
      group.quaternion.copy(q);
      group.updateMatrixWorld(true);
    }

    // Center
    centerGroupToOrigin(group);

    // Store minY for grid positioning (once)
    const minY = getGroupMinY(group);
    setModelMinY(minY);

    // Fit camera
    fitCameraToGroup(group, camera, controls);
    onReady(group);
  }, [onReady, camera, controls]);

  return (
    <>
      {/* FIXED WORLD SPACE HELPERS - always at origin */}
      {helpersVisible && (
        <>
          <gridHelper
            args={[400, 40, "#94a3b8", "#64748b"]}
            position={[0, 0, 0]}
          />
          <axesHelper
            args={[120]}
            position={[0, 0, 0]}
          />
        </>
      )}

      {/* MODEL GROUP - rotates independently */}
      <group ref={objectRef}>
        {/* STL/3MF loader */}
      </group>

      {/* OrbitControls - orbits camera around world origin */}
      <OrbitControls
        target={[0, 0, 0]} // orbit around world origin
        enableDamping
        minPolarAngle={0.001}
        maxPolarAngle={Math.PI - 0.001}
      />
    </>
  );
}
```

### Orient-to-Face Complete Flow

```tsx
function useOrientToFace(mesh: THREE.Mesh | null) {
  const { camera, scene } = useThree();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!mesh || !isSelecting) return;

    event.stopPropagation();

    if (event.face) {
      // Get face normal in world space
      const faceNormal = event.face.normal.clone();
      const normalMatrix = new THREE.Matrix3()
        .getNormalMatrix(event.object.matrixWorld);
      faceNormal.applyMatrix3(normalMatrix).normalize();

      // Target normal (Y-up means face should point up)
      const targetNormal = new THREE.Vector3(0, 1, 0);

      // Calculate rotation
      const targetQuat = new THREE.Quaternion();
      targetQuat.setFromUnitVectors(faceNormal, targetNormal);

      // Animate
      smoothRotate(mesh, targetQuat, 500).then(() => {
        setIsSelecting(false);
      });
    }
  }, [mesh, isSelecting]);

  return {
    isSelecting,
    startSelection: () => setIsSelecting(true),
    handleClick
  };
}

// Usage
function ModelViewer() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { isSelecting, startSelection, handleClick } = useOrientToFace(meshRef.current);

  return (
    <>
      <mesh ref={meshRef} onClick={handleClick}>
        <bufferGeometry {...geometryProps} />
        <meshStandardMaterial />
      </mesh>

      <button onClick={startSelection}>
        Orient to Face (F)
      </button>
    </>
  );
}
```

## 7. Library Recommendations

### Required
- **three** - Core 3D library
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Helper components (OrbitControls, TransformControls, etc.)

### Optional (Animation)
- **@react-spring/three** - Spring-based animations for smooth transitions
- **@tweenjs/tween.js** - Traditional tween animations
- **gsap** - Professional animation library with Three.js plugin

### Optional (Advanced Controls)
- **camera-controls** - More advanced camera controls than OrbitControls
- **three-mesh-bvh** - Accelerated raycasting for complex meshes

### Utility
- **maath** - Math utilities for Three.js (easing, interpolation)
- **three-stdlib** - Extended Three.js examples/loaders

## 8. Key Takeaways

### Fix for Current Issue

**Problem:** Grid/axes rotate with model
**Root cause:** Helpers positioned relative to model's minY, creating visual illusion
**Solution:** Keep helpers at world origin (0, 0, 0), separate from model group

```tsx
// WRONG - helpers in model's coordinate space
<group ref={modelGroup}>
  <mesh />
  <gridHelper position={[0, modelMinY, 0]} />
</group>

// CORRECT - helpers in world space
<gridHelper position={[0, 0, 0]} />
<axesHelper position={[0, 0, 0]} />
<group ref={modelGroup}>
  <mesh />
</group>
```

### Best Practices Summary

1. **Coordinate systems:** Keep world-space objects (grid, axes) separate from model hierarchy
2. **OrbitControls:** Orbits camera, not model. Set `target` to world origin.
3. **Camera up vector:** Consistent throughout (Y-up: `[0,1,0]`, Z-up: `[0,0,1]`)
4. **Transform persistence:** Store quaternion + position, not baked geometry
5. **Orientation controls:** Use quaternions for rotation math, Euler for UI
6. **Smooth transitions:** Quaternion.slerp() for rotations, avoid gimbal lock

### Performance Tips

- Use `BufferGeometry` (already done in current code)
- Disable shadows if not needed (already done: `gl.shadowMap.enabled = false`)
- Use `AdaptiveDpr` for dynamic quality (already done)
- Throttle `onTransformChange` callbacks
- Merge geometries before raycasting (for large models)

## 9. References

### Official Documentation
- [Three.js OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls)
- [Three.js TransformControls](https://threejs.org/docs/#examples/en/controls/TransformControls)
- [Three.js Raycaster](https://threejs.org/docs/#api/en/core/Raycaster)
- [Three.js Object3D](https://threejs.org/docs/#api/en/core/Object3D)
- [Three.js Quaternion](https://threejs.org/docs/#api/en/math/Quaternion)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [Drei Helpers](https://drei.docs.pmnd.rs/)

### Examples
- [Three.js OrbitControls Example](https://threejs.org/examples/misc_controls_orbit.html)
- [Three.js TransformControls Example](https://threejs.org/examples/misc_controls_transform.html)
- [Three.js Raycasting Example](https://threejs.org/examples/webgl_interactive_raycasting.html)
- [React Three Fiber Examples](https://r3f.docs.pmnd.rs/getting-started/examples)

### Open Source 3D Print Viewers
- [gabotechs/react-stl-viewer](https://github.com/gabotechs/react-stl-viewer) - React STL viewer with orbit controls
- [garyhodgson/stlviewer](https://github.com/garyhodgson/stlviewer) - Browser-based STL viewer
- [cloudlakecho/STL-Viewer](https://github.com/cloudlakecho/STL-Viewer) - 3D viewer with zoom/pan/rotate

### Community Resources
- [Three.js Discourse](https://discourse.threejs.org/)
- [Poimandres Discord](https://discord.gg/poimandres) - React Three Fiber community
- [Stack Overflow - Three.js tag](https://stackoverflow.com/questions/tagged/three.js)

### Related Concepts
- [Quaternion vs Euler angles](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation)
- [Gimbal lock](https://en.wikipedia.org/wiki/Gimbal_lock)
- [Slerp interpolation](https://en.wikipedia.org/wiki/Slerp)
- [Transform matrices](https://en.wikipedia.org/wiki/Transformation_matrix)

---

## Next Steps

1. Refactor grid/axes rendering to world space (not relative to model)
2. Test orbit behavior - verify grid stays fixed when camera rotates
3. Implement "Place on Face" feature with raycasting
4. Add smooth quaternion animation for orientation changes
5. Update transform persistence to save quaternion instead of Euler angles
6. Add manual rotation UI with numeric input and snap-to-angle
7. Consider adding TransformControls/PivotControls for advanced users
