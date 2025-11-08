# 3D Printing Support Generation Research

## Executive Summary

This document synthesizes research on web-based 3D printing support generation techniques, libraries, algorithms, and pricing considerations for integration into a client-facing 3D printing service.

**Current Implementation**: Server-side CLI slicer (PrusaSlicer) with support parameters passed via command-line flags.

**Key Finding**: No mature standalone JS library for support generation exists. Primary options are:
1. CuraEngine WASM port (client-side slicing)
2. Enhanced CLI slicer integration (current approach)
3. Custom overhang detection + external slicer for support generation

---

## 1. JavaScript Support Generation Libraries

### 1.1 CuraEngine WASM - cura-wasm

**Repository**: `Cloud-CNC/cura-wasm`
**NPM Package**: `cura-wasm`
**Status**: Active, maintained

**Features**:
- Full CuraEngine compiled to WebAssembly using Emscripten
- Supports 3MF, AMF, PLY, OBJ, STL formats
- Written in modern TypeScript
- Works in browsers and Node.js
- Virtual filesystem for loading STL files and printer definitions

**Limitations**:
- No OpenMP multithreading support (Emscripten limitation)
- Performance "decent but not great"
- Recommend native CuraEngine for Node.js if isolation not required
- Previous projects (gyf304/cura-emscripten, nelsonsilva/CuraEngine-em, Skeen/CuraJS-Engine) all unmaintained

**Use Case**: Full client-side slicing with support generation included

**Integration Approach**:
```typescript
import { slice } from 'cura-wasm';

const result = await slice({
  definition: printerProfile,
  overrides: {
    layer_height: 0.2,
    infill_sparse_density: 20,
    support_enable: true,
    support_angle: 45,
    support_type: 'buildplate', // or 'everywhere'
    support_structure: 'tree', // or 'normal'
  },
  stlData: fileBuffer,
});
```

### 1.2 Standalone Support Generation Libraries

**Search Results**: None found

No dedicated JavaScript/WebAssembly libraries specifically for generating support structures exist. Support generation typically embedded in full slicing engines.

### 1.3 Three.js STL Mesh Processing Libraries

**Available NPM Packages**:
- `three-stl-loader` - Load STL files into Three.js scenes
- `threejs-export-stl` - Export Three.js meshes to STL (binary/ASCII)
- `manifold-3d` - Manifold triangle mesh operations, interfaces with Three.js
- `basic-stl-generator` - Generate ASCII STL strings

**Capability**: Mesh loading, visualization, export, geometric operations
**Gap**: No support structure generation algorithms

---

## 2. Support Generation Algorithms

### 2.1 Overhang Detection

**Core Principle**: Detect faces requiring support based on angle relative to build plate

**Algorithm - Normal Vector Method**:
```python
# For each triangle face in mesh
theta = arccos(clip(dot(build_direction, face_normal), -1.0, 1.0))

# Overhang threshold (typically 45° from vertical = 45° from horizontal)
if theta > overhang_threshold:
    face_needs_support = True
```

**Implementation Details**:
- Build direction typically `[0, 0, 1]` (vertical Z-axis)
- Face normal from cross product: `normalize(cross(B-A, C-A))` for triangle ABC
- 45° rule: Overhangs >45° from vertical typically require support
- Dot product approach efficient for GPU rasterization

**Advanced Technique - Connectivity-Based Smoothing**:
```python
# Smooth overhang angle using facial connectivity
for face in mesh.faces:
    adjacent_faces = mesh.adjacency[face.id]
    avg_angle = mean([face.angle for face in adjacent_faces])
```

**Projected Overhang Regions**:
- Use Marching Squares algorithm
- Project overhang regions to build plate
- Isolevel chosen based on overhang angle and resolution
- Identifies where support columns must be placed

**Reference Implementation**: PySLM library (Python)
- Source: lukeparry.uk/finding-overhangs-3dprinting-pyslm/
- Uses facial connectivity and adjacency lists
- GPU-accelerated z-buffer rasterization

### 2.2 Support Structure Types

#### Linear (Standard) Supports

**Structure**: Vertical grid-like structures below overhangs

**Pros**:
- Simple algorithm
- Better strength for flat shapes
- Predictable material usage

**Cons**:
- High material consumption
- Long print times
- Difficult removal (touches entire overhang surface)
- Can damage surface finish

**Algorithm**:
1. Project overhang regions to build plate
2. Generate vertical pillars from plate to overhang
3. Add lattice/grid infill between pillars

**Material Usage**: 15-30% infill density typical for supports

#### Tree Supports

**Structure**: Branch-like structures growing from build plate to specific contact points

**Pros**:
- 90% less material vs linear supports (with dense interface layers)
- Faster print times
- Easier removal (minimal contact points)
- Better surface finish
- Ideal for intricate models, miniatures, steep overhangs

**Cons**:
- More complex algorithm (slower to generate in slicer)
- Less strength than linear supports
- May not suit all geometries

**Algorithm** (from Cura implementation):
1. Identify minimal contact points on overhang surfaces
2. Calculate load distribution from contact points
3. Generate branching structure respecting:
   - Self-supporting angles (branches must be printable)
   - Minimal contact with model
   - Structural integrity under load
4. Optimize path from build plate to contact points

**Academic Reference**: "Local Barycenter Based Efficient Tree-Support Generation for 3D Printing" (ScienceDirect)

**Alternative Approaches**:
- Arc overhangs (post-processing script in PrusaSlicer)
- Replaces regular overhangs with printable arcs
- Reduces/eliminates support needs for certain geometries

### 2.3 Support Interface Layers

**Purpose**: Layer between support and model for easy removal

**Dense Interface Strategy**:
- Print only interface layers (top few layers of support) in soluble material
- Remainder in standard filament
- Achieves 90%+ material savings vs full soluble supports
- Maintains excellent surface finish

---

## 3. Integration with Existing Slicer

### 3.1 Current Implementation Analysis

**Location**: `/Users/varunprasad/code/prjs/3dprintsydney/src/server/slicer/runner.ts`

**Slicer**: PrusaSlicer (CLI) or Slic3r
- Configured via `process.env.SLICER_BIN`

**Support Parameters Currently Passed**:
```typescript
if (opts.supports?.enabled) {
  args.push("--support-material");

  // Overhang angle (1-89°, default 45°)
  const angle = clamp(opts.supports.angle ?? 45, 1, 89);
  args.push("--support-material-angle", String(angle));

  // Tree vs normal supports
  if (opts.supports.pattern === "tree") {
    args.push("--support-material-style", "organic"); // PrusaSlicer 2.5+
  }
}
```

**Additional CLI Options Available** (not currently used):
```bash
--support-material-threshold <area>     # Min area requiring support
--support-material-pattern <pattern>    # rectilinear, rectilinear-grid, honeycomb
--support-material-spacing <mm>         # Spacing between support lines
--support-material-contact-distance <mm> # Gap between support and object
--support-material-interface-layers <n>  # Dense interface layers count
--support-material-interface-pattern     # Interface layer pattern
--support-material-with-sheath           # Add perimeter around supports
--support-material-xy-spacing <mm>       # XY gap from object
--dont-support-bridges                   # Skip supporting bridges
```

### 3.2 Enhanced CLI Integration Options

**Expose Additional Parameters**:
```typescript
export type SliceOptions = {
  layerHeight: number;
  infill: number;
  supports: {
    enabled: boolean;
    angle?: number;              // Existing
    pattern?: "normal" | "tree"; // Existing

    // Proposed additions:
    spacing?: number;            // Support line spacing
    contactDistance?: number;    // Gap from object
    interfaceLayers?: number;    // Dense interface layer count
    xySpacing?: number;          // XY gap from object
    threshold?: number;          // Min area requiring support
  };
};
```

**Benefits**:
- Minimal implementation effort
- Leverage mature PrusaSlicer algorithms
- Server-side processing (no client resource constraints)
- Full parameter control

**Drawbacks**:
- No client-side preview of supports before slicing
- Requires server round-trip
- No real-time support visualization in 3D viewer

### 3.3 Support Preview Before Slicing

**Challenge**: CLI slicers don't provide support-only preview without full G-code generation

**Potential Solutions**:

1. **Generate G-code, Parse for Support Geometry**
   - Slice file normally with supports enabled
   - Parse G-code to extract support structure paths
   - Render support paths in Three.js viewer
   - **Downside**: Full slicing overhead

2. **Custom Overhang Detection + Visual Overlay**
   - Implement overhang detection in browser (Three.js)
   - Highlight overhang faces requiring support
   - Show estimated support volume/cost
   - Actual supports generated by slicer at slice time
   - **Benefit**: Fast client-side preview

3. **CuraEngine WASM for Preview Only**
   - Use cura-wasm client-side for quick preview
   - Show support structures before confirming
   - Use server-side PrusaSlicer for final slicing
   - **Downside**: Supports may differ between preview/final

**Recommended Approach**: Custom overhang detection
```typescript
// Three.js overhang detection
function detectOverhangs(geometry: THREE.BufferGeometry, threshold = 45) {
  const position = geometry.attributes.position;
  const buildDir = new THREE.Vector3(0, 0, 1);
  const overhangFaces = [];

  for (let i = 0; i < position.count; i += 3) {
    const v0 = new THREE.Vector3().fromBufferAttribute(position, i);
    const v1 = new THREE.Vector3().fromBufferAttribute(position, i+1);
    const v2 = new THREE.Vector3().fromBufferAttribute(position, i+2);

    const normal = new THREE.Vector3()
      .crossVectors(v1.clone().sub(v0), v2.clone().sub(v0))
      .normalize();

    const angle = Math.acos(normal.dot(buildDir)) * (180 / Math.PI);

    if (angle > threshold) {
      overhangFaces.push({ vertices: [v0, v1, v2], angle });
    }
  }

  return overhangFaces;
}
```

---

## 4. Pricing Considerations

### 4.1 Support Material Weight Estimation

**From G-code Metadata** (Current Approach):
```typescript
// Parse slicer output comments
// Example: "; filament used [g] = 45.2"
const grams = parseFloat(gcodeComment.match(/filament used.*?(\d+\.\d+)/i)[1]);
```

**Separate Model vs Support Weight**:
- PrusaSlicer G-code comments include total filament weight
- Some slicers provide separate material breakdown:
  ```gcode
  ; filament used [g] = 45.2
  ; filament used (model) [g] = 32.1
  ; filament used (support) [g] = 13.1
  ```
- If not available, estimate from support volume ratio

**Manual Estimation Formula**:
```
support_weight = model_weight × support_volume_ratio × material_density
```

**Support Volume Ratio Approximations**:
- Linear supports (20% infill): 15-30% of model volume
- Tree supports (20% infill): 5-15% of model volume
- Dense interface only: 1-5% additional

### 4.2 Time Impact of Supports

**Print Duration Factors**:
1. **Support Structure Time**: 20-40% increase for linear, 10-25% for tree
2. **Travel Moves**: Nozzle moves between model and supports
3. **Retraction**: Additional retractions at support transitions
4. **Layer Complexity**: More features per layer

**Current Implementation**: Parse from G-code
```typescript
// Example: "; estimated printing time = 2h 15m 30s"
const timeSec = parseTimeToSeconds(gcodeComment);
```

Slicer includes support time in total estimate.

### 4.3 Soluble vs Standard Support Material

**Material Cost Comparison**:
- PLA/ABS (standard): $20-30/kg (baseline)
- HIPS (soluble): $30-45/kg (1.5× cost)
- PVA (soluble): $80-120/kg (4× cost)
- BVOH: $70-100/kg (3.5× cost)

**Cost Optimization**:
- Interface-only soluble: 90% material savings vs full soluble
- Hybrid approach: PLA supports + PVA interface layers

**Implementation Consideration**:
```typescript
export type SupportMaterial = 'same' | 'pva' | 'hips' | 'bvoh';

export type SliceOptions = {
  // ...
  supports: {
    enabled: boolean;
    material?: SupportMaterial;
    interfaceOnly?: boolean; // Use soluble only for interface
  };
};
```

**Pricing Formula**:
```typescript
function calculateSupportCost(
  supportGrams: number,
  material: SupportMaterial,
  interfaceOnly: boolean
) {
  const baseCost = 25; // $/kg PLA
  const multipliers = { same: 1, hips: 1.5, pva: 4, bvoh: 3.5 };

  if (interfaceOnly && material !== 'same') {
    // 10% soluble, 90% standard
    const solubleGrams = supportGrams * 0.1;
    const standardGrams = supportGrams * 0.9;
    return (solubleGrams * baseCost * multipliers[material] / 1000) +
           (standardGrams * baseCost / 1000);
  }

  return supportGrams * baseCost * multipliers[material] / 1000;
}
```

### 4.4 Complete Pricing Calculator

**Components**:
1. **Material Cost**: (model_grams + support_grams) × material_price_per_kg / 1000
2. **Labor Cost**: base_rate + (print_time_hours × hourly_rate)
3. **Electricity**: printer_power_kw × print_time_hours × electricity_rate
4. **Machine Wear**: print_time_hours × depreciation_rate
5. **Failure Insurance**: 10-20% markup
6. **Profit Margin**: 30-50% markup

**Formula**:
```typescript
const materialCost =
  (modelGrams * materialPrice / 1000) +
  calculateSupportCost(supportGrams, supportMaterial, interfaceOnly);

const electricityCost =
  (printerPowerKW * printTimeHours * electricityRate);

const laborCost =
  prepTime + (printTimeHours * attendanceRate);

const machineCost =
  printTimeHours * (maintenanceRate + depreciationRate);

const baseCost =
  materialCost + electricityCost + laborCost + machineCost;

const finalPrice =
  baseCost * (1 + failureRate) * (1 + profitMargin);
```

**Reference Calculators**:
- Prusa 3D Printing Price Calculator (blog.prusa3d.com)
- MakerShop 3D Print Cost Calculator
- Omnicalculator 3D Printing Cost Calculator

---

## 5. Web Slicer Examples

### 5.1 Prusa EasyPrint

**Type**: Official cloud-based slicer by Prusa Research

**How It Works**:
- Browser-based interface (phone, tablet, laptop)
- Upload STL to cloud
- Slicing runs on Prusa servers (powerful hardware)
- G-code sent to printer via PrusaConnect

**Features**:
- Printables.com integration
- Auto-detect connected printers
- Full PrusaSlicer engine on server
- Mobile-optimized UI

**Relevance**: Server-side slicing with browser UI (similar to current architecture)

### 5.2 SimplyPrint Cloud Slicer

**Slicers Available**:
- PrusaSlicer 2.9.3 (as of Dec 2024)
- OrcaSlicer
- BambuStudio

**Platform**: Works on any device via browser

**Architecture**: Cloud-based slicing + browser client

### 5.3 3DPrinterOS

**Features**:
- Cloud-based Prusa Slicer integration
- Advanced algorithms
- Tailored slicing profiles
- Multi-printer management

### 5.4 OctoPrint Slicer Plugins

**CuraEngine Legacy Plugin**:
- Slice STL files in OctoPrint interface
- Compatible with CuraEngine up to 15.04.x
- Later versions have incompatible CLI parameters

**PBCuraEngine**:
- Port of newer CuraEngine to OctoPrint
- Configurable printer profiles
- Location of CuraEngine executable

**Status**: Most OctoPrint slicer plugins discontinued
- Trend: External slicing preferred over embedded

### 5.5 Commercial Pricing Calculators

**Shapeways**:
- API available (free with 5% transaction fee)
- Complex pricing beyond material volume
- Accounts for post-processing, minimum pricing per part
- Calculation time: ~15 seconds

**i.materialise Pricing API**:
- Request prices without uploading models
- Based on dimensions, volume, surface area
- Multiple material/finish combinations
- RESTful API integration

---

## 6. Implementation Recommendations

### 6.1 Short-Term (Minimal Effort)

**Approach**: Enhance current CLI slicer integration

**Actions**:
1. Add `support-material-interface-layers` parameter (dense interface)
2. Add `support-material-spacing` control
3. Add `support-material-contact-distance` for easier removal
4. Expose `--dont-support-bridges` option (save material)

**Client-Side Preview**:
1. Implement Three.js overhang detection
2. Highlight overhang faces in viewer (color-coded by angle)
3. Show estimated support volume percentage
4. Display warning if model has severe overhangs (>60°)

**Pricing**:
1. Parse G-code for separate model/support weights (if available)
2. Estimate support weight as 20% of model weight for linear, 10% for tree
3. Add 20-30% time multiplier for prints with supports

**Effort**: 1-2 weeks

### 6.2 Medium-Term (Enhanced Experience)

**Approach**: CuraEngine WASM for client-side preview

**Implementation**:
1. Install `cura-wasm` npm package
2. Client-side: Quick preview slice (low quality, fast)
3. Show support structures in 3D viewer
4. Allow user to adjust support parameters interactively
5. Server-side: Final high-quality slice with PrusaSlicer
6. Parse final G-code for accurate pricing

**Benefits**:
- Real-time support preview (<10 seconds)
- Interactive parameter tuning
- Maintains server-side quality for final slice

**Challenges**:
- Support structures may differ between preview/final
- Bundle size increase (~5-10 MB for WASM)
- Client-side memory constraints on mobile

**Effort**: 3-4 weeks

### 6.3 Long-Term (Advanced Features)

**Auto-Orientation Optimization**:
1. Test multiple orientations
2. Calculate support volume for each
3. Recommend orientation with minimal supports
4. Reference: "Orientation Analysis of 3D Objects Toward Minimal Support Volume" (Massarwi et al., 2015)

**Algorithm**:
```python
def find_optimal_orientation(mesh):
    orientations = generate_test_orientations(step=15)  # Every 15°
    results = []

    for rotation in orientations:
        rotated_mesh = mesh.rotate(rotation)
        overhang_volume = calculate_support_volume(rotated_mesh)
        results.append((rotation, overhang_volume))

    return min(results, key=lambda x: x[1])
```

**GPU Acceleration**:
- Use z-buffer rasterization for overhang detection
- Orthographic camera projection to build plate
- Fast evaluation of many orientations

**Custom Support Editing**:
- Manual support placement/removal
- Paint support regions on model
- Adjust support density per region

**Effort**: 2-3 months

---

## 7. Unresolved Questions

1. **Soluble Support Hardware**:
   - Does print hardware support dual extrusion?
   - If yes, which soluble materials compatible?
   - Cost-benefit vs manual support removal?

2. **Support Removal Labor**:
   - Current labor time for manual support removal?
   - Include in pricing or separate line item?
   - Client self-removal option at lower cost?

3. **Support Preview Fidelity**:
   - Acceptable for preview supports to differ from final?
   - Or must preview match exactly (slower generation)?

4. **G-code Support Metadata**:
   - Does current slicer version output separate model/support weights?
   - Test with: `prusaslicer --version` and slice sample with supports

5. **Client-Side Performance Budget**:
   - Target devices: Desktop only or mobile too?
   - Acceptable WASM bundle size increase?
   - WebGL 1.0 or 2.0 baseline?

6. **Support Material Inventory**:
   - Currently stock soluble materials?
   - Plan to offer as premium option?
   - Price premium for soluble supports?

---

## 8. References

### Libraries & Tools
- **cura-wasm**: github.com/Cloud-CNC/cura-wasm
- **cura-wasm npm**: npmjs.com/package/cura-wasm
- **manifold-3d**: npmjs.com/package/manifold-3d
- **three-stl-loader**: npmjs.com/package/three-stl-loader

### Algorithms & Papers
- Massarwi et al. (2015): "Orientation Analysis of 3D Objects Toward Minimal Support Volume in 3D-Printing"
- "Local Barycenter Based Efficient Tree-Support Generation for 3D Printing" - ScienceDirect
- "Finding Overhangs in 3D Printing using PySLM" - lukeparry.uk
- "A new overhang constraint for topology optimization" - Springer

### Web Slicers
- **Prusa EasyPrint**: blog.prusa3d.com/prusa_easy_print_on_phone_tablet_110894
- **SimplyPrint**: simplyprint.io/features/slicer/prusaslicer
- **3DPrinterOS**: 3dprinteros.com/3d-printing-features/prusa-slicer

### Pricing Resources
- **Prusa Calculator**: blog.prusa3d.com/3d-printing-price-calculator_38905
- **JLC3DP Guide**: jlc3dp.com/blog/3d-printing-cost-calculator
- **Shapeways API**: developers.shapeways.com
- **i.materialise API**: i.materialise.com/api/docs/pricing-by-parameters-api

### Support Best Practices
- **All3DP Support Guide**: all3dp.com/1/3d-printing-support-structures
- **Wevolver Overhang Guide**: wevolver.com/article/3d-print-overhang
- **Simplify3D Support Tutorial**: simplify3d.com/how-to-use-supports
- **Prusa Knowledge Base**: help.prusa3d.com/article/support-material_1698

### Material Costs
- **3DJake PVA Filament**: 3djake.com/3d-printer-filaments/pva-support-filament
- **All3DP PVA Guide**: all3dp.com/2/pva-filament-explained-and-compared
- **BCN3D Soluble Materials**: support.bcn3d.com/knowledge/optimize-water-soluble-materials

---

## Appendix A: PrusaSlicer CLI Support Parameters

Complete list of support-related flags:

```bash
--support-material                       # Enable supports
--support-material-angle <degrees>       # Overhang threshold (0-90°)
--support-material-auto <0|1>            # Auto-generate supports
--support-material-buildplate-only       # Only from build plate
--support-material-contact-distance <mm> # Gap between support and object
--support-material-enforce-layers <n>    # Force supports for N bottom layers
--support-material-extruder <n>          # Extruder number for supports
--support-material-extrusion-width <mm>  # Support line width
--support-material-interface-contact-loops <n>
--support-material-interface-extruder <n>
--support-material-interface-layers <n>  # Dense interface layers
--support-material-interface-pattern <pattern>
--support-material-interface-spacing <mm>
--support-material-pattern <pattern>     # rectilinear, rectilinear-grid, honeycomb
--support-material-spacing <mm>          # Support line spacing
--support-material-speed <mm/s>          # Print speed for supports
--support-material-style <style>         # normal, grid, snug, organic (tree)
--support-material-synchronize-layers    # Sync with object layers
--support-material-threshold <area>      # Min area requiring support
--support-material-with-sheath           # Add perimeter around supports
--support-material-xy-spacing <mm>       # XY distance from object
--dont-support-bridges                   # Skip supporting bridges
```

**Version Note**: Organic (tree) supports require PrusaSlicer 2.5+

---

## Appendix B: Sample Implementation - Overhang Detector

```typescript
// File: src/lib/3d-utils/overhang-detector.ts

import * as THREE from 'three';

export interface OverhangFace {
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  angleDeg: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface OverhangAnalysis {
  faces: OverhangFace[];
  totalArea: number;
  estimatedSupportVolume: number;
  recommendations: string[];
}

/**
 * Detect overhang faces requiring support
 * @param geometry BufferGeometry of 3D model
 * @param thresholdDeg Overhang angle threshold (default 45°)
 * @param buildDirection Build plate normal (default [0, 0, 1])
 */
export function detectOverhangs(
  geometry: THREE.BufferGeometry,
  thresholdDeg = 45,
  buildDirection = new THREE.Vector3(0, 0, 1)
): OverhangAnalysis {
  const position = geometry.attributes.position;
  const faces: OverhangFace[] = [];
  let totalArea = 0;

  // Ensure geometry has face normals computed
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  // Iterate over triangles
  for (let i = 0; i < position.count; i += 3) {
    const v0 = new THREE.Vector3().fromBufferAttribute(position, i);
    const v1 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(position, i + 2);

    // Calculate face normal
    const edge1 = v1.clone().sub(v0);
    const edge2 = v2.clone().sub(v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Calculate angle between normal and build direction
    const dotProduct = normal.dot(buildDirection);
    const angleRad = Math.acos(THREE.MathUtils.clamp(dotProduct, -1, 1));
    const angleDeg = THREE.MathUtils.radToDeg(angleRad);

    // Check if overhang
    if (angleDeg > thresholdDeg) {
      // Calculate triangle area
      const area = edge1.cross(edge2).length() / 2;
      totalArea += area;

      // Classify severity
      let severity: OverhangFace['severity'];
      if (angleDeg > 75) severity = 'critical';
      else if (angleDeg > 60) severity = 'high';
      else if (angleDeg > 50) severity = 'medium';
      else severity = 'low';

      faces.push({
        vertices: [v0, v1, v2],
        normal,
        angleDeg,
        severity,
      });
    }
  }

  // Estimate support volume (rough approximation)
  // Assumes 15% of overhang area × average model height
  const bbox = new THREE.Box3().setFromBufferAttribute(position);
  const modelHeight = bbox.max.z - bbox.min.z;
  const estimatedSupportVolume = totalArea * modelHeight * 0.15;

  // Generate recommendations
  const recommendations: string[] = [];
  if (faces.length === 0) {
    recommendations.push('No supports required');
  } else {
    const criticalCount = faces.filter(f => f.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`${criticalCount} critical overhangs detected - supports strongly recommended`);
      recommendations.push('Consider reorienting model to reduce overhang angles');
    }

    const worstAngle = Math.max(...faces.map(f => f.angleDeg));
    if (worstAngle > 70) {
      recommendations.push('Severe overhangs detected - tree supports recommended for easier removal');
    } else {
      recommendations.push('Linear supports sufficient for detected overhangs');
    }
  }

  return {
    faces,
    totalArea,
    estimatedSupportVolume,
    recommendations,
  };
}

/**
 * Highlight overhang faces in scene
 */
export function highlightOverhangs(
  mesh: THREE.Mesh,
  analysis: OverhangAnalysis
): THREE.Mesh {
  const overhangGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];

  // Color mapping by severity
  const severityColors = {
    low: new THREE.Color(0xffff00),      // Yellow
    medium: new THREE.Color(0xffa500),   // Orange
    high: new THREE.Color(0xff4500),     // Red-orange
    critical: new THREE.Color(0xff0000), // Red
  };

  analysis.faces.forEach(face => {
    const color = severityColors[face.severity];
    face.vertices.forEach(v => {
      positions.push(v.x, v.y, v.z);
      colors.push(color.r, color.g, color.b);
    });
  });

  overhangGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  overhangGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  );

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });

  return new THREE.Mesh(overhangGeometry, material);
}
```

**Usage Example**:
```typescript
// In 3D viewer component
const stlGeometry = loadedMesh.geometry;
const analysis = detectOverhangs(stlGeometry, 45);

console.log('Overhang faces:', analysis.faces.length);
console.log('Recommendations:', analysis.recommendations);

// Visualize overhangs
const overhangMesh = highlightOverhangs(loadedMesh, analysis);
scene.add(overhangMesh);

// Update UI
setEstimatedSupportVolume(analysis.estimatedSupportVolume);
setWarnings(analysis.recommendations);
```

---

*Document Version: 1.0*
*Last Updated: 2025-11-08*
*Research Conducted By: Claude (Anthropic)*
