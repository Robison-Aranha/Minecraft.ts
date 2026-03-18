import * as THREE from "three";
import { World } from "../world/World";
import { MeshBVH } from "three-mesh-bvh";
import { remapMeshIndex } from "../utils/Utils";
import { createWorker, WorkerPaths } from "../workers/WorkerFac";
import { BlockType } from "../enums/BlockType";
import { ChunckMsgTypes } from "../enums/ChunckMsgTypes";
import { Collider } from "../interfaces/ChunckMan";

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
  private currentChunckKey: { traceX: number, traceY: number } | null = null;

  private raycasterHeight: THREE.Raycaster = new THREE.Raycaster();
  private raycasterAction: THREE.Raycaster = new THREE.Raycaster();
  private world: World;

  constructor(world: World) {
    this.world = world;
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
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
          Math.min(maxPitch, this.camera.rotation.x)
        );
      }
    });

    window.addEventListener("click", () => {
      document.body.requestPointerLock();
    });

    this.camera.position.set(0, 300, 0);
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
      const mesh = hit.object as THREE.Mesh;

      switch (event.button) {
        case 0:
          this.removeBlock(hit.faceIndex, mesh);
          break;
        case 2:
          break;
      }
    });
  }

  async removeBlock(faceIndex: number | null | undefined, chunkMesh: THREE.Mesh) {
    if (faceIndex == null || !chunkMesh) return;

    const traceX = chunkMesh.userData.traceX;
    const traceY = chunkMesh.userData.traceY;
    const chunckKey = `${traceX}:${traceY}`;
    const layer = chunkMesh.userData.layerLevel;

    const nearChuncks = this.world.getNeighbourChuncks(traceX, traceY);

    const faceIndexOriginal = chunkMesh.userData.remapFaceIndex.get(faceIndex);
    const faceKey = chunkMesh.userData.faceToKey.get(faceIndexOriginal);

    this.world.getChunckMan().setBlockValueInChunckBlocksMap(chunckKey, layer, faceKey, BlockType.AIR)

    const chunckBlockData = this.world.getChunckMan().getChunckBlocksMap().get(chunckKey) ?? [];

    const worker = createWorker(WorkerPaths.CHUNCK_GENERATION);
    worker.onmessage = (e: any) => {
      this.onWorkerMessage({ ...e.data, key: `${traceX}:${traceY}` })
    }

    worker.postMessage({
      traceX: traceX,
      traceY: traceY,
      seed: this.world.getSeed(),
      type: ChunckMsgTypes.REM_BLOCK,
      blockData: JSON.stringify(chunckBlockData.map(n => n && JSON.stringify([...n]))),
      neigbourChuncks: JSON.stringify(nearChuncks.map(n => n?.map(c => JSON.stringify([...c])))),
      layer: layer,
    });
  }

  async onWorkerMessage(e: any) {
    const {
      faceToKey,
      keyToFace,
      layer,
      layers,
      key
    } = e;
    if (
      !faceToKey ||
      !keyToFace ||
      !layer ||
      !layers ||
      !key
    )
      return null;

    const meshs = this.world.getChunckMan().getChunckMeshMap().get(key) as THREE.Mesh[] | undefined;
    const colliders = this.world.getChunckMan().getChunckColliderMap().get(key) as Collider[] | undefined;
    if (!meshs || !colliders) return;

    const mesh = meshs[layer]

    const layersParsed = JSON.parse(layers)
    const faceToKeyArray = JSON.parse(faceToKey);
    const keyToFaceArray = JSON.parse(keyToFace);

    const newGeometry = new THREE.BufferGeometry();
    const positionNumComponents = 3;
    const normalNumComponents = 3;
    newGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(layersParsed.positions),
        positionNumComponents
      )
    );
    newGeometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(layersParsed.normals), normalNumComponents)
    );
    const newInd = new Uint32Array(layersParsed.indices);
    newGeometry.setIndex(new THREE.BufferAttribute(newInd, 1));

    mesh.geometry = newGeometry;

    const indexAttr = newGeometry.getIndex()!;
    const originalIndexMap: number[][] = [];

    for (let i = 0; i < indexAttr.count; i += 3) {
      originalIndexMap.push([
        indexAttr.getX(i),
        indexAttr.getX(i + 1),
        indexAttr.getX(i + 2)
      ]);
    }

    const bvh = new MeshBVH(newGeometry);

    const newIndexAttr = newGeometry.getIndex()!;
    const reorderedIndexMap: number[][] = [];

    for (let i = 0; i < newIndexAttr.count; i += 3) {
      reorderedIndexMap.push([
        newIndexAttr.getX(i),
        newIndexAttr.getX(i + 1),
        newIndexAttr.getX(i + 2)
      ]);
    }

    mesh.userData.faceToKey = new Map(faceToKeyArray);
    mesh.userData.remapFaceIndex =  remapMeshIndex(originalIndexMap, reorderedIndexMap);
    mesh.userData.keyToFace = new Map(keyToFaceArray);

    colliders[layer] = { bhv: bvh, matrix: mesh.matrixWorld };
    meshs[layer] = mesh;

    this.world.getChunckMan().setValueMeshMap(key, meshs)
    this.world.getChunckMan().setValueColliderMap(key, colliders)
  }

  updatePlayerGround(delta: number) {
    const playerPos = this.camera.position.clone();
    this.raycasterHeight.set(playerPos, new THREE.Vector3(0, -1, 0));
    const intersectsDown = this.raycasterHeight.intersectObject(
      this.world,
      true
    );

    if (intersectsDown.length > 0) {
      const mesh = intersectsDown[0].object as THREE.Mesh;
      this.currentChunckKey = { traceX: mesh.userData.traceX, traceY: mesh.userData.traceY };

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
    if (this.currentChunckKey) {
      const min = new THREE.Vector3(
        position.x - this.playerRadius,
        position.y - this.playerHeight,
        position.z - this.playerRadius
      );

      const max = new THREE.Vector3(
        position.x + this.playerRadius,
        position.y + 0.1,
        position.z + this.playerRadius
      );

      const playerBox = new THREE.Box3(min, max);
   
      const nearChuncks = this.world.getNearChuncksKeysCollider(this.currentChunckKey.traceX, this.currentChunckKey.traceY);

      const colliders = nearChuncks.map(k => this.world.getChunckMan().getChunckColliderMap().get(k)).filter(v => v != undefined);
      
      return colliders?.some((a) => a.some(element => {
        if (!element.bhv) return false;

        return (element.bhv as MeshBVH).intersectsBox(playerBox, element.matrix);
      }));
    }
  }
}
