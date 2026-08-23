import * as THREE from "three";
import { Player } from "./player/Player";
import { World } from "./world/World";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { ChunkMsgTypes } from "./enums/ChunkMsgTypes.ts";
import { getAroundChunksKeys } from "./utils/Utils.ts";
import { CHUNK_SIZE, CHUNK_TOTAL_HEIGHT } from "./const/Const.ts";

export class Game {
  private stats?: Stats;
  private player: Player;
  private ref: React.RefObject<HTMLDivElement | null>;
  private world: World;
  private fog: THREE.Fog;
  private scene: THREE.Scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  private clock: THREE.Clock = new THREE.Clock();
  private seed: number | undefined;
  private generating = false;
  private backGroundColor = 0x80a0e0;
  private frustum = new THREE.Frustum();
  private frustumMatrix = new THREE.Matrix4();

  constructor(chunkQt: number, ref: React.RefObject<HTMLDivElement | null>) {
    this.ref = ref;
    this.world = new World(chunkQt);
    this.player = new Player(this.world);
    this.world.setPlayer(this.player);
    const fogStart = CHUNK_SIZE * (chunkQt - 2);
    const fogEnd = CHUNK_SIZE * chunkQt;
    this.fog = new THREE.Fog(this.backGroundColor, fogStart, fogEnd);
  }

  setSeed(seed: number) {
    this.seed = seed;
  }

  async setupWorld() {
    this.world.setupLights();
    if (this.seed) {
      this.world.setSeed(this.seed);
    }
    this.scene.add(this.world);
    this.scene.fog = this.fog;
  }

  setupPlayer() {
    this.player.setupCamera();
    this.player.setupControls();
  }

  setupGame() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(this.backGroundColor);
    this.ref.current?.appendChild(this.renderer.domElement);
  }

  render() {
    if (this.renderer) {
      requestAnimationFrame(this.render.bind(this));
      const delta = this.clock.getDelta() * 60;
      this.player.updatePlayerGround(delta);
      this.player.update(delta);
      this.renderer.render(this.scene, this.player.getCamera());
      this.stats?.update();
      this.world.updateChunkReveal();
      this.world.updateChunkFadeOut();
      if (!this.generating) {
        this.updateChunks();
      }
    }
  }

  updateFrustum(camera: THREE.Camera) {
    camera.updateMatrixWorld();

    this.frustumMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );

    this.frustum.setFromProjectionMatrix(this.frustumMatrix);
  }

  isChunkInView(traceX: number, traceY: number) {
    const minX = traceX * CHUNK_SIZE;
    const minZ = traceY * CHUNK_SIZE;

    const box = new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(
        minX + CHUNK_SIZE,
        CHUNK_TOTAL_HEIGHT,
        minZ + CHUNK_SIZE,
      ),
    );

    return this.frustum.intersectsBox(box);
  }

  async updateChunks() {
    this.generating = true;

    const playerPosition = this.player.getCamera().position.clone();
    const chunksToRender = this.world.getChunksToRender(playerPosition);

    if (chunksToRender === null) {
      this.generating = false;
      return;
    }

    const { all, generateBlockAndMesh, generateOnlyMesh } = chunksToRender;

    if (generateBlockAndMesh.length > 0) {
      const blocksToGenerate = new Set<string>(generateBlockAndMesh);
      const meshesToGenerate = new Set<string>([
        ...generateBlockAndMesh,
        ...generateOnlyMesh,
      ]);

      for (const chunk of generateBlockAndMesh) {
        const [x, y] = chunk.split(":").map(Number);
        const neighbours = getAroundChunksKeys(x, y);

        for (const neighborKey of neighbours) {
          if (this.world.getChunkMan().getChunkBlocksMap().has(neighborKey)) {
            meshesToGenerate.add(neighborKey);
          } else {
            blocksToGenerate.add(neighborKey);
          }
        }
      }

      const chunksToGenerate = Array.from(
        new Set([...blocksToGenerate, meshesToGenerate]),
      );

      const chunksToRemove = this.world.getChunksToRemove(
        all.filter((c) => !chunksToGenerate.includes(c)),
      );
      await this.world.dropChuncks(chunksToRemove);

      const blocksArray = Array.from(blocksToGenerate);

      if (blocksArray.length > 0) {
        await this.world.generateWorld(ChunkMsgTypes.GEN_BLOCK, blocksArray);
      }

      for (const chunkKey of meshesToGenerate) {
        await this.world.generateWorld(ChunkMsgTypes.GEN_MESH, [chunkKey]);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    this.generating = false;
  }

  setUpStats() {
    this.stats = new Stats();
    this.ref.current?.appendChild(this.stats.dom);
  }

  resizeService() {
    window.addEventListener("resize", () => {
      this.player.getCamera().aspect = window.innerWidth / window.innerHeight;
      this.player.getCamera().updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setPointingArrow() {
    if (this.ref.current) {
      this.ref.current.style.width = `${window.innerWidth}`;
      this.ref.current.style.height = `${window.innerHeight}`;
      this.ref.current.style.display = "flex";
      this.ref.current.style.justifyContent = "center";
      this.ref.current.style.alignItems = "center";
      this.ref.current.style.margin = "0";
      const arrow = document.createElement("p");
      arrow.textContent = "+";
      arrow.style.fontSize = "20px";
      arrow.style.position = "absolute";
      this.ref.current?.appendChild(arrow);
    }
  }
}
