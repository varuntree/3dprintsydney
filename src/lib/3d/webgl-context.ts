import * as THREE from "three";

export function handleContextLoss(
  renderer: THREE.WebGLRenderer,
  onLoss: () => void,
  onRestore: () => void,
): () => void {
  const canvas = renderer.domElement;

  const handleLoss = (event: Event) => {
    event.preventDefault();
    onLoss();
  };

  const handleRestore = () => {
    onRestore();
  };

  canvas.addEventListener("webglcontextlost", handleLoss);
  canvas.addEventListener("webglcontextrestored", handleRestore);

  return () => {
    canvas.removeEventListener("webglcontextlost", handleLoss);
    canvas.removeEventListener("webglcontextrestored", handleRestore);
  };
}
