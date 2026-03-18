import { MeshBVH } from "three-mesh-bvh";

interface Collider {
  matrix: THREE.Matrix4;
  bhv: MeshBVH;
}