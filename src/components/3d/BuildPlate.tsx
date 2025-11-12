import { memo, useMemo } from "react";
import { Text } from "@react-three/drei";
import { BUILD_HEIGHT_MM, BUILD_PLATE_SIZE_MM } from "@/lib/3d/build-volume";

const PLATE_SIZE = BUILD_PLATE_SIZE_MM;
const GRID_DIVISIONS = 24;
const AXIS_LENGTH = PLATE_SIZE / 2;
const BUILD_HEIGHT = BUILD_HEIGHT_MM;

const labelPositions: [number, number, number][] = [
  [PLATE_SIZE / 2 + 6, 0.1, PLATE_SIZE / 2 + 6],
  [-PLATE_SIZE / 2 - 6, 0.1, PLATE_SIZE / 2 + 6],
  [PLATE_SIZE / 2 + 6, 0.1, -PLATE_SIZE / 2 - 6],
  [-PLATE_SIZE / 2 - 6, 0.1, -PLATE_SIZE / 2 - 6],
];

function BuildPlateComponent() {
  const textMaterialProps = useMemo(
    () => ({ color: "#cbd5f5", fontSize: 8, anchorX: "center" as const, anchorY: "middle" as const }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      <gridHelper args={[PLATE_SIZE, GRID_DIVISIONS, "#94a3b8", "#64748b"]} position={[0, 0, 0]} />
      <axesHelper args={[AXIS_LENGTH]} position={[0, 0, 0]} />

      <mesh position={[0, BUILD_HEIGHT / 2, 0]}
        frustumCulled={false}
      >
        <boxGeometry args={[PLATE_SIZE, BUILD_HEIGHT, PLATE_SIZE]} />
        <meshBasicMaterial color="#0ea5e9" opacity={0.08} transparent />
      </mesh>

      {labelPositions.map((pos, idx) => (
        <Text key={`plate-label-${idx}`} position={pos} {...textMaterialProps}>
          {`${PLATE_SIZE}mm × ${PLATE_SIZE}mm`}
        </Text>
      ))}
    </group>
  );
}

const BuildPlate = memo(BuildPlateComponent);
export default BuildPlate;
