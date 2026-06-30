import * as THREE from "three";
import { World } from "../world/World";
import { MeshBVH } from "three-mesh-bvh";
import {
  chunksAfecteds,
  getCoordsFromIndex,
  getIndex,
  getNearChunksKeysCollider,
  remapMeshIndex,
  getNearChunksKeysGen,
  getLayerIndex,
} from "../utils/Utils";
import { createWorker, WorkerPaths } from "../workers/WorkerFac";
import { BlockType } from "../enums/BlockType";
import { ChunkMsgTypes } from "../enums/ChunkMsgTypes.ts";
import { Collider } from "../interfaces/ChunkMan";
import { ChunkMeshGenDataWorker } from "../interfaces/ChunkWorker";
import {
  CHUNK_LAYER_HEIGHT,
  CHUNK_SIZE,
  CHUNK_TOTAL_HEIGHT,
} from "../const/Const";

interface Controls {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  shift: boolean;
}

export class Player {
  private camera: THREE.PerspectiveCamera;
  private direction: THREE.Vector3 = new THREE.Vector3();
  private controls: Controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    shift: false,
  };

  private playerHeight = 1.8;
  private playerRadius = 0.2;
  private speedValue = 0.07;
  private speed = 0;
  private mouseSensitivity = 0.002;
  private isJumping = false;
  private isOnGround = false;
  private jumpForce = 1.5;
  private jumpMultPlayer = 0.05;
  private fallingMultPlayer = 0;
  private actualJumpForce = this.jumpForce;
  private desaceleration = 0.2;
  private currentChunkKey: { traceX: number; traceY: number } | null = null;

  private raycasterHeight: THREE.Raycaster = new THREE.Raycaster();
  private raycasterAction: THREE.Raycaster = new THREE.Raycaster();
  private world: World;

  constructor(world: World) {
    this.world = world;
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
  }

  setupCamera() {
    this.camera.rotation.order = "YXZ";

    window.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement) {
        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;

        this.camera.rotation.y -= deltaX * this.mouseSensitivity;
        this.camera.rotation.x -= deltaY * this.mouseSensitivity;

        const maxPitch = Math.PI / 2 - 0.1;
        this.camera.rotation.x = Math.max(
          -maxPitch,
          Math.min(maxPitch, this.camera.rotation.x),
        );
      }
    });

    window.addEventListener("click", () => {
      document.body.requestPointerLock();
    });

    this.camera.position.set(0, 300, 100);
  }

  setupControls() {
    window.addEventListener("keydown", (e) => {
      switch (e.code) {
        case "KeyW":
          this.controls.moveForward = true;
          break;
        case "KeyS":
          this.controls.moveBackward = true;
          break;
        case "KeyA":
          this.controls.moveLeft = true;
          break;
        case "KeyD":
          this.controls.moveRight = true;
          break;
        case "ShiftLeft":
          this.controls.shift = true;
          break;
        case "Space":
          if (this.isOnGround) {
            this.isJumping = true;
            this.isOnGround = false;
          }
          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "KeyW":
          this.controls.moveForward = false;
          break;
        case "KeyS":
          this.controls.moveBackward = false;
          break;
        case "KeyA":
          this.controls.moveLeft = false;
          break;
        case "KeyD":
          this.controls.moveRight = false;
          break;
        case "ShiftLeft":
          this.controls.shift = false;
          break;
      }
    });

    window.addEventListener("mousedown", (event) => {
      if (!document.pointerLockElement) return;

      const mouse = new THREE.Vector2(0, 0);
      this.raycasterAction.setFromCamera(mouse, this.camera);
      const intersects = this.raycasterAction.intersectObject(this.world);
      const hit = intersects[0];

      if (hit && hit.object) {
        switch (event.button) {
          case 0:
            this.removeBlock(hit);
            break;
          case 2:
            this.addBlock(hit);
            break;
        }
      }
    });
  }

  async addBlock(hit: THREE.Intersection) {
    if (!hit.face || hit.faceIndex == null || !hit.object) return;

    const chunkMesh = hit.object as THREE.Mesh;
    const traceX = chunkMesh.userData.traceX;
    const traceY = chunkMesh.userData.traceY;
    const layer = chunkMesh.userData.layerLevel;
    const faceIndexOriginal = chunkMesh.userData.remapFaceIndex.get(hit.faceIndex);
    const faceKey = chunkMesh.userData.faceToKey[faceIndexOriginal];

    const { localX, localY, localZ } = getCoordsFromIndex(faceKey, CHUNK_SIZE);

    const normal = hit.face.normal;
    const dx = Math.round(normal.x);
    const dy = Math.round(normal.z);
    const dz = Math.round(normal.y);

    let newLocalX = localX + dx;
    let newLocalY = localY + dy;
    let newLocalZ = localZ + dz;

    let newTraceX = traceX;
    let newTraceY = traceY;
    let newLayer = layer;

    if (newLocalX < 0) {
      newLocalX += CHUNK_SIZE;
      newTraceX -= CHUNK_SIZE;
    } else if (newLocalX >= CHUNK_SIZE) {
      newLocalX -= CHUNK_SIZE;
      newTraceX += CHUNK_SIZE;
    }

    if (newLocalY < 0) {
      newLocalY += CHUNK_SIZE;
      newTraceY -= CHUNK_SIZE;
    } else if (newLocalY >= CHUNK_SIZE) {
      newLocalY -= CHUNK_SIZE;
      newTraceY += CHUNK_SIZE;
    }

    if (newLocalZ < 0) {
      newLocalZ += CHUNK_LAYER_HEIGHT;
      newLayer -= 1;
    } else if (newLocalZ >= CHUNK_LAYER_HEIGHT) {
      newLocalZ -= CHUNK_LAYER_HEIGHT;
      newLayer += 1;
    }

    if (newLayer < 0 || newLayer * CHUNK_LAYER_HEIGHT >= CHUNK_TOTAL_HEIGHT) {
      return;
    }

    const newChunkKey = `${newTraceX}:${newTraceY}`;
    const newFaceKey = getIndex(newLocalX, newLocalY, newLocalZ, CHUNK_SIZE);

    this.world
        .getChunkMan()
        .setBlockValueInChunkBlocksMap(newChunkKey, newLayer, newFaceKey, BlockType.STONE);

    await this.updateChunksAndGenerateMeshes(newLocalX, newLocalY, newLocalZ, newTraceX, newTraceY, newLayer, newChunkKey);
  }

  async removeBlock(hit: THREE.Intersection) {
    if (!hit.face || hit.faceIndex == null || !hit.object) return;

    const chunkMesh = hit.object as THREE.Mesh;
    const chunkKey = chunkMesh.userData.key;
    const traceX = chunkMesh.userData.traceX;
    const traceY = chunkMesh.userData.traceY;
    const layer = chunkMesh.userData.layerLevel;
    const faceIndexOriginal = chunkMesh.userData.remapFaceIndex.get(hit.faceIndex);
    const faceKey = chunkMesh.userData.faceToKey[faceIndexOriginal];

    const { localX, localY, localZ } = getCoordsFromIndex(faceKey, CHUNK_SIZE);

    this.world
        .getChunkMan()
        .setBlockValueInChunkBlocksMap(chunkKey, layer, faceKey, BlockType.AIR);

    await this.updateChunksAndGenerateMeshes(localX, localY, localZ, traceX, traceY, layer, chunkKey);
  }

  private async updateChunksAndGenerateMeshes(
      localX: number,
      localY: number,
      localZ: number,
      traceX: number,
      traceY: number,
      layer: number,
      chunkKey: string
  ) {
    const directions = [
      [-1, 0, 0],
      [1, 0, 0],
      [0, -1, 0],
      [0, 1, 0],
      [0, 0, -1],
      [0, 0, 1],
    ];

    const limitX = traceX >= 0 ? CHUNK_SIZE + traceX : traceX + CHUNK_SIZE;
    const limitY = traceY >= 0 ? CHUNK_SIZE + traceY : traceY + CHUNK_SIZE;
    const neighborChunkMap = getNearChunksKeysGen(traceX, traceY);

    const updates = new Map<string, Set<number>>();
    updates.set(chunkKey, new Set([layer]));

    for (const [dirX, dirY, dirZ] of directions) {
      const nx = localX + dirX + traceX;
      const ny = localY + dirY + traceY;
      const nz = localZ + dirZ + layer * CHUNK_LAYER_HEIGHT;

      const neighborLayer = getLayerIndex(nz);

      const affected = chunksAfecteds(nx, ny, traceX, traceY, limitX, limitY);

      const affectedChunk =
          affected?.chunk != null ? neighborChunkMap[affected.chunk] : chunkKey;

      if (!updates.has(affectedChunk)) {
        updates.set(affectedChunk, new Set());
      }

      updates.get(affectedChunk)!.add(neighborLayer);
    }

    const tasks: Promise<ChunkMeshGenDataWorker>[] = [];

    for (const [key, layers] of updates) {
      const [chunkTraceX, chunkTraceY] = key.split(":").map(Number);
      const nearChunks = this.world.getNeighbourChunks(chunkTraceX, chunkTraceY);
      const chunkBlockData = this.world.getChunkMan().getChunkBlocksMap().get(key) ?? [];

      for (const currentLayer of layers) {
        tasks.push(
            new Promise((resolve) => {
              const worker = createWorker(WorkerPaths.CHUNK_GENERATION);

              worker.onmessage = (e: { data: ChunkMeshGenDataWorker }) => {
                worker.terminate();
                resolve(e.data);
              };

              worker.postMessage({
                traceX: chunkTraceX,
                traceY: chunkTraceY,
                seed: this.world.getSeed(),
                type: ChunkMsgTypes.CHANGE_CHUNK,
                blockData: JSON.stringify(
                    chunkBlockData.map((layerData) => Array.from(layerData))
                ),
                neighbourChunks: JSON.stringify(
                    nearChunks.map((n) => (n ? n.map((c) => Array.from(c)) : []))
                ),
                layer: currentLayer,
              });
            })
        );
      }
    }

    const generatedMeshesData = await Promise.all(tasks);

    for (const meshData of generatedMeshesData) {
      if (meshData) {
        this.applyMeshUpdate(meshData);
      }
    }
  }

  applyMeshUpdate(e: ChunkMeshGenDataWorker) {
    const { faceToKey, keyToFace, layer, layers, key } = e;
    if (!faceToKey || !keyToFace || !layer || !layers || !key) return;

    const meshs = this.world.getChunkMan().getChunkMeshMap().get(key) as
      | THREE.Mesh[]
      | undefined;
    const colliders = this.world
      .getChunkMan()
      .getChunkColliderMap()
      .get(key) as Collider[] | undefined;

    if (!meshs || !colliders) return;

    const mesh = meshs[layer];

    const layersParsed = JSON.parse(layers);
    const faceToKeyArray = JSON.parse(faceToKey);
    const keyToFaceArray = JSON.parse(keyToFace);

    const newGeometry = new THREE.BufferGeometry();
    const positionNumComponents = 3;
    const normalNumComponents = 3;

    newGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(layersParsed.positions),
        positionNumComponents,
      ),
    );
    newGeometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(
        new Float32Array(layersParsed.normals),
        normalNumComponents,
      ),
    );

    const newInd = new Uint32Array(layersParsed.indices);
    newGeometry.setIndex(new THREE.BufferAttribute(newInd, 1));

    if (mesh.geometry) mesh.geometry.dispose();
    mesh.geometry = newGeometry;

    const indexAttr = newGeometry.getIndex()!;
    const originalIndexMap: number[][] = [];

    for (let i = 0; i < indexAttr.count; i += 3) {
      originalIndexMap.push([
        indexAttr.getX(i),
        indexAttr.getX(i + 1),
        indexAttr.getX(i + 2),
      ]);
    }

    const bvh = new MeshBVH(newGeometry);

    const newIndexAttr = newGeometry.getIndex()!;
    const reorderedIndexMap: number[][] = [];

    for (let i = 0; i < newIndexAttr.count; i += 3) {
      reorderedIndexMap.push([
        newIndexAttr.getX(i),
        newIndexAttr.getX(i + 1),
        newIndexAttr.getX(i + 2),
      ]);
    }

    mesh.userData.faceToKey = faceToKeyArray;
    mesh.userData.remapFaceIndex = remapMeshIndex(
      originalIndexMap,
      reorderedIndexMap,
    );
    mesh.userData.keyToFace = keyToFaceArray;

    colliders[layer] = { bhv: bvh, matrix: mesh.matrixWorld };
    meshs[layer] = mesh;

    this.world.getChunkMan().setValueMeshMap(key, meshs);
    this.world.getChunkMan().setValueColliderMap(key, colliders);
  }

  updatePlayerGround(delta: number) {
    const playerPos = this.camera.position.clone();
    this.raycasterHeight.set(playerPos, new THREE.Vector3(0, -1, 0));
    const intersectsDown = this.raycasterHeight.intersectObject(
      this.world,
      true,
    );

    if (intersectsDown.length > 0) {
      const mesh = intersectsDown[0].object as THREE.Mesh;
      this.currentChunkKey = {
        traceX: mesh.userData.traceX,
        traceY: mesh.userData.traceY,
      };

      const obj = intersectsDown[0].point;
      if (!this.isJumping) {
        const targetY = obj.y + this.playerHeight;
        const testPosition = this.camera.position.clone();
        this.fallingMultPlayer += 0.2 * delta;
        testPosition.y -= 0.02 * this.fallingMultPlayer * delta;
        if (testPosition.y <= targetY) {
          testPosition.y = targetY;
        }

        if (!this.checkCollision(testPosition)) {
          this.camera.position.y = testPosition.y;
        } else {
          this.isOnGround = true;
          this.fallingMultPlayer = 0;
          return;
        }

        this.isOnGround = Math.abs(playerPos.y - targetY) < 0.05;
        if (this.isOnGround) {
          this.fallingMultPlayer = 0;
        }
      } else {
        if (this.actualJumpForce >= 0) {
          const testPosition = this.camera.position.clone();
          testPosition.y += this.jumpMultPlayer * delta;
          if (!this.checkCollision(testPosition)) {
            this.camera.position.y = testPosition.y;
            this.actualJumpForce -= this.desaceleration * delta;
            this.jumpMultPlayer += 0.05 * delta;
          } else {
            this.resetJumpVariables();
          }
        } else {
          this.resetJumpVariables();
        }
      }
    } else {
      this.isOnGround = false;
    }
  }

  resetJumpVariables() {
    this.isJumping = false;
    this.actualJumpForce = this.jumpForce;
    this.jumpMultPlayer = 0.05;
  }

  update(delta: number) {
    this.direction.set(0, 0, 0);

    const front = new THREE.Vector3();
    this.camera.getWorldDirection(front);
    front.y = 0;
    front.normalize();

    const right = new THREE.Vector3()
      .crossVectors(front, new THREE.Vector3(0, 1, 0))
      .normalize();

    if (this.controls.moveForward) this.direction.add(front);
    if (this.controls.moveBackward) this.direction.sub(front);
    if (this.controls.moveRight) this.direction.add(right);
    if (this.controls.moveLeft) this.direction.sub(right);
    this.speed =
      (this.controls.shift ? this.speedValue * 1.5 : this.speedValue) * delta;
    this.direction.normalize().multiplyScalar(this.speed);

    const tempX = this.camera.position
      .clone()
      .add(new THREE.Vector3(this.direction.x, 0, 0));
    if (!this.checkCollision(tempX)) {
      this.camera.position.x = tempX.x;
    }

    const tempZ = this.camera.position
      .clone()
      .add(new THREE.Vector3(0, 0, this.direction.z));
    if (!this.checkCollision(tempZ)) {
      this.camera.position.z = tempZ.z;
    }
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  private checkCollision(position: THREE.Vector3): boolean | undefined {
    if (this.currentChunkKey) {
      const min = new THREE.Vector3(
        position.x - this.playerRadius,
        position.y - this.playerHeight,
        position.z - this.playerRadius,
      );

      const max = new THREE.Vector3(
        position.x + this.playerRadius,
        position.y + 0.1,
        position.z + this.playerRadius,
      );

      const playerBox = new THREE.Box3(min, max);

      const nearChunks = getNearChunksKeysCollider(
        this.currentChunkKey.traceX,
        this.currentChunkKey.traceY,
      );

      const colliders = nearChunks
        .map((k) => this.world.getChunkMan().getChunkColliderMap().get(k))
        .filter((v) => v != undefined);

      return colliders?.some((a) =>
        a.some((element) => {
          if (!element.bhv) return false;

          return (element.bhv as MeshBVH).intersectsBox(
            playerBox,
            element.matrix,
          );
        }),
      );
    }
  }
}
