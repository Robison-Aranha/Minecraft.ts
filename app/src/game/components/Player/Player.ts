import * as THREE from "three";
import { World } from "../world/World";
import { MeshBVH } from "three-mesh-bvh";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "../enums/Enums";
import { remapMeshIndex } from "../utils/Utils";
import { ChunckData } from "../interfaces/ChunckData";

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

  private worker = new Worker(new URL("../world/ChunckWorker.ts", import.meta.url), {
    type: "module",
  });

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
    this.worker.onmessage = this.onWorkerMessage.bind(this);
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

    this.camera.position.set(0, 500, 100);
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

  removeBlock(faceIndex: number | null | undefined, chunkMesh: THREE.Mesh) {
    if (faceIndex == null || !chunkMesh) return;

    const faceIndexOriginal = chunkMesh.userData["remapFaceIndex"].get(faceIndex);
    const faceKey = chunkMesh.userData["faceToKey"].get(faceIndexOriginal);
    const removedBlocks = chunkMesh.userData["removedBlocks"];
    removedBlocks.add(faceKey);
    const traceX = chunkMesh.userData["traceX"];
    const traceY = chunkMesh.userData["traceY"];

    this.changeMeshStructure(traceX, traceY, removedBlocks, chunkMesh)
  }


  changeMeshStructure(traceX: number, traceY: number, removedBlocks: Set<string>, mesh: THREE.Mesh) {
    const meshId = mesh.userData["id"];

    this.worker.postMessage({
      width: CHUNK_SIZE,
      height: CHUNK_HEIGHT,
      traceX: traceX,
      traceY: traceY,
      removedBlocks: removedBlocks,
      meshId: meshId
    });
  }

  onWorkerMessage(e: { data: ChunckData }) {
    const {
      positions,
      normals,
      indices,
      faceToKey,
      keyToFace,
      meshId
    } = e.data;
    if (
      !positions ||
      !normals ||
      !indices ||
      !faceToKey ||
      !keyToFace ||
      !meshId
    )
      return null;

    const mesh = this.world.children?.find((c: any) => c.userData && c.userData.id === meshId) as THREE.Mesh | undefined;
    if (!mesh) return;

    const pos = JSON.parse(positions);
    const nor = JSON.parse(normals);
    const ind = JSON.parse(indices);
    const faceToKeyArray = JSON.parse(faceToKey);

    const newGeometry = new THREE.BufferGeometry();
    const positionNumComponents = 3;
    const normalNumComponents = 3;
    newGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(pos),
        positionNumComponents
      )
    );
    newGeometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(nor), normalNumComponents)
    );
    const newInd = new Uint32Array(ind);
    newGeometry.setIndex(new THREE.BufferAttribute(newInd, 1));

    mesh.geometry = newGeometry;
    mesh.userData["faceToKey"] = new Map(faceToKeyArray);

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

    mesh.userData["remapFaceIndex"] = remapMeshIndex(originalIndexMap, reorderedIndexMap);

    let newCollider = this.world.getCollider().filter(c => c.uuid != meshId)
    newCollider.push({ uuid: meshId, bhv: bvh, matrix: mesh.matrixWorld })

    this.world.setCollider(newCollider);
  }

  updatePlayerGround(delta: number) {
    const playerPos = this.camera.position.clone();
    this.raycasterHeight.set(playerPos, new THREE.Vector3(0, -1, 0));
    const intersectsDown = this.raycasterHeight.intersectObject(
      this.world,
      true
    );

    if (intersectsDown.length > 0) {
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
      (this.controls.shift ? this.speedValue * 2 : this.speedValue) * delta;
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

  private checkCollision(position: THREE.Vector3): boolean {
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

    return this.world.getCollider().some((element) => {
      if (!element.bhv) return false;

      return (element.bhv as MeshBVH).intersectsBox(playerBox, element.matrix);
    });
  }
}
