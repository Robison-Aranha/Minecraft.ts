import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { ChunkBlockGenData, ChunkLayer } from "../interfaces/ChunkGenData";
import skyTextureImg from "../../../assets/sky.jpg";
import moonTextureImg from "../../../assets/moon.png";

import {
  getAroundChunksKeys,
  getChunksKeysToRender,
  getNearChunksKeysGen,
  hashUint8Array,
  remapMeshIndex,
} from "../utils/Utils";

import { ChunkUserData } from "../interfaces/ChunkUserData";
import { createWorker } from "../workers/WorkerFac";
import { WorkerPaths } from "../workers/WorkerFac";
import { ChunkMsgTypes } from "../enums/ChunkMsgTypes.ts";
import { ChunkMan } from "./ChunkMan.ts";
import { Player } from "../player/Player.ts";
import { Vector3 } from "three";
import { CHUNK_SIZE, CHUNK_TOTAL_HEIGHT } from "../const/Const.ts";
import { WorkerPool } from "../workers/WorkerPool.ts";
import { CloudSystem } from "./CloudSystem.ts";

export class World extends THREE.Group {
  private chunkQt: number | null;
  private material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial({
    color: "gray",
  });
  private seed: number | undefined;
  private chunkMan = new ChunkMan();
  private player: Player | undefined;
  private workerPool: WorkerPool;
  private worldSize: number;
  private moon!: THREE.Sprite;
  private clouds: CloudSystem | undefined;
  private skyMaterial!: THREE.ShaderMaterial;
  private fogWall!: THREE.Mesh;
  private fog: THREE.Fog;
  private gameScene: THREE.Scene;
  private backGroundColor = 0x070b19;

  constructor(chunkQt: number, scene: THREE.Scene) {
    super();

    this.chunkQt = chunkQt;
    this.worldSize = chunkQt * CHUNK_SIZE;
    this.gameScene = scene;

    const fogStart = this.worldSize * 0.5;
    const fogEnd = this.worldSize * 0.7;

    this.fog = new THREE.Fog(this.backGroundColor, fogStart, fogEnd);
    this.gameScene.fog = this.fog;

    const cores = navigator.hardwareConcurrency
      ? Math.max(2, navigator.hardwareConcurrency - 1)
      : 4;

    this.workerPool = new WorkerPool(
      () => createWorker(WorkerPaths.CHUNK_GENERATION),
      cores,
    );
  }

  setPlayer(player: Player | undefined) {
    this.player = player;
  }

  getPlayer() {
    return this.player;
  }

  setSeed(seed: number) {
    this.seed = seed;
  }

  getSeed() {
    return this.seed;
  }

  getChunkMan() {
    return this.chunkMan;
  }

  getSkyMaterial() {
    return this.skyMaterial;
  }

  getClouds() {
    return this.clouds;
  }

  setSkyMaterialUtime(clock: THREE.Clock) {
    this.skyMaterial.uniforms.uTime.value = clock.elapsedTime;
  }

  generateChunk(
    traceX: number,
    traceY: number,
    type: ChunkMsgTypes,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let neighbourChunks: (Uint8Array[] | undefined)[] = [];
      let currentChunk: Uint8Array[] = [];

      if (type == ChunkMsgTypes.GEN_MESH) {
        neighbourChunks = this.getNeighbourChunks(traceX, traceY);

        currentChunk =
          this.chunkMan.getChunkBlocksMap().get(`${traceX}:${traceY}`) ?? [];
      }

      try {
        const event = await this.workerPool.execute({
          traceX,
          traceY,
          seed: this.seed,
          type,
          blockData: currentChunk.map((layer) => layer.buffer),
          neighbourChunks: neighbourChunks.map((n) =>
            n ? n.map((c) => c.buffer) : [],
          ),
        });

        if (type === ChunkMsgTypes.GEN_BLOCK) {
          this.callBackChunkBlock(event, traceX, traceY);
        } else {
          this.callBackChunkMesh(event, traceX, traceY);
        }

        resolve();
      } catch (err) {
        console.error("Worker error in chunk generation:", err);
        reject(err);
      }
    });
  }

  getNeighbourChunks(
    traceX: number,
    traceY: number,
  ): (Uint8Array[] | undefined)[] {
    const chunkNeighbours = getNearChunksKeysGen(traceX, traceY);

    return chunkNeighbours.map((c) => this.chunkMan.getChunkBlocksMap().get(c));
  }

  callBackChunkMesh(e: { data: any }, traceX: number, traceY: number): void {
    const { faceToKey, keyToFace, layers } = e.data;

    if (!layers || !faceToKey || !keyToFace) return;

    const typedKeyToFace = keyToFace.map(
      (arr: number[]) => new Int32Array(arr),
    );

    const typedFaceToKey = faceToKey.map(
      (arr: number[]) => new Int32Array(arr),
    );

    this.createChunk(traceX, traceY, typedFaceToKey, typedKeyToFace, layers);
  }

  callBackChunkBlock(
    e: { data: ChunkBlockGenData },
    traceX: number,
    traceY: number,
  ): void {
    const { blocks } = e.data;

    const key = `${traceX}:${traceY}`;

    if (!blocks || !key) return;

    const blockArrays = blocks.map((a: number[]) => new Uint8Array(a));

    this.chunkMan.setValueBlocksMap(key, blockArrays);
  }

  createChunk(
    traceX: number,
    traceY: number,
    faceToKey: Int32Array[],
    keyToFace: Int32Array[],
    layers: ChunkLayer[],
  ) {
    const positionNumComponents = 3;
    const normalNumComponents = 3;

    const key = `${traceX}:${traceY}`;

    const layerMeshs = [];
    const bvhs = [];

    const meshsMemorys = this.chunkMan.getChunkMeshMap().get(key);

    const isMeshsInMemory = meshsMemorys && meshsMemorys.length > 0;

    if (isMeshsInMemory && meshsMemorys[0].visible === false) {
      meshsMemorys.forEach((mesh) => {
        mesh.visible = true;
      });

      return;
    }

    const blockData = this.chunkMan.getChunkBlocksMap().get(key);

    if (!blockData) {
      return;
    }

    for (let c = 0; c < layers.length; c++) {
      const layer = layers[c];

      const layerBlockData = blockData[c];

      const positions = layer.positions;
      const normals = layer.normals;
      const indices = layer.indices;
      const bvhSerialized = layer.serializedBVH;

      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(positions),
          positionNumComponents,
        ),
      );

      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(
          new Float32Array(normals),
          normalNumComponents,
        ),
      );

      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

      const indexAttr = geometry.getIndex()!;

      const originalIndexMap: number[][] = [];

      for (let i = 0; i < indexAttr.count; i += 3) {
        originalIndexMap.push([
          indexAttr.getX(i),
          indexAttr.getX(i + 1),
          indexAttr.getX(i + 2),
        ]);
      }

      const bvh = MeshBVH.deserialize(bvhSerialized, geometry);

      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      const newIndexAttr = geometry.getIndex()!;

      const reorderedIndexMap: number[][] = [];

      for (let i = 0; i < newIndexAttr.count; i += 3) {
        reorderedIndexMap.push([
          newIndexAttr.getX(i),
          newIndexAttr.getX(i + 1),
          newIndexAttr.getX(i + 2),
        ]);
      }

      const remap = remapMeshIndex(originalIndexMap, reorderedIndexMap);

      const userData: ChunkUserData = {
        key: key,
        layerLevel: c,
        traceX: traceX,
        traceY: traceY,
        faceToKey: faceToKey[c],
        keyToFace: keyToFace[c],
        remapFaceIndex: remap,
        layers: layers,
      };

      let mesh: THREE.Mesh;

      if (isMeshsInMemory) {
        mesh = meshsMemorys[c];

        mesh.geometry.dispose();
        mesh.geometry = geometry;
        mesh.userData = { ...mesh.userData, ...userData };
      } else {
        const material = this.material.clone();

        mesh = new THREE.Mesh(geometry, material);

        mesh.userData = userData;
        mesh.userData.hash = hashUint8Array(layerBlockData);
      }

      bvhs.push({
        bhv: bvh,
        matrix: mesh.matrixWorld,
      });

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      layerMeshs.push(mesh);
    }

    this.chunkMan.setValueMeshMap(key, layerMeshs);
    this.chunkMan.setValueColliderMap(key, bvhs);

    if (!isMeshsInMemory) {
      layerMeshs.forEach((l) => this.add(l));
    }
  }

  async generateChunks(type: ChunkMsgTypes, chunksToRender: string[]) {
    if (!this.chunkQt) return;

    const promises: Promise<void>[] = [];

    chunksToRender.forEach((key) => {
      promises.push(this.generatePromise(key, type));
    });

    await Promise.all(promises);
  }

  generatePromise(key: string, type: ChunkMsgTypes) {
    const [x, y] = key.split(":");

    return this.generateChunk(Number(x), Number(y), type);
  }

  getChunksToRender(playerPosition: Vector3): {
    all: string[];
    generateBlockAndMesh: string[];
    generateOnlyMesh: string[];
  } | null {
    const chuncks = this.getChunksToGenerate(playerPosition);

    if (chuncks?.innerKeys == null || chuncks?.borderKeys == null) {
      return null;
    }

    const keys = [...chuncks.innerKeys, ...chuncks.borderKeys];

    const filtereds = keys.filter(
      (key) => !this.chunkMan.getChunkMeshMap().has(key),
    );

    const generateOnlyMesh = keys.filter((key) => {
      const meshs = this.chunkMan.getChunkMeshMap().get(key);

      if (meshs && meshs[0].visible == false) {
        return true;
      }

      return false;
    });

    return {
      all: keys,
      generateBlockAndMesh: filtereds.filter(
        (c) => !generateOnlyMesh.includes(c),
      ),
      generateOnlyMesh: generateOnlyMesh,
    };
  }

  getChunksToRemove(meshsToGenerate: string[]) {
    return Array.from(this.chunkMan.getChunkMeshMap().keys()).filter(
      (key) => !meshsToGenerate.includes(key),
    );
  }

  getPlayerChunkPosition(playerLocation: Vector3) {
    const chunkX = Math.floor(playerLocation.x / CHUNK_SIZE) * CHUNK_SIZE;

    const chunkY = Math.floor(playerLocation.z / CHUNK_SIZE) * CHUNK_SIZE;

    return {
      chunkX,
      chunkY,
    };
  }

  dropChuncks(chuncksToRemove: string[]) {
    for (const chunkKey of chuncksToRemove) {
      const layers = this.chunkMan.getChunkMeshMap().get(chunkKey);
      const blockData = this.chunkMan.getChunkBlocksMap().get(chunkKey);

      if (!blockData || !layers) {
        continue;
      }

      let isChunckIntact = true;

      for (let i = 0; i < layers.length; i++) {
        const currentHash = hashUint8Array(blockData[i]);
        const currentLayer = layers[i];

        if (currentHash !== currentLayer.userData.hash) {
          isChunckIntact = false;
          break;
        }
      }

      for (const mesh of layers) {
        mesh.visible = false;

        if (isChunckIntact) {
          mesh.removeFromParent();
          mesh.geometry.dispose();
        }
      }

      if (isChunckIntact) {
        this.chunkMan.deleteValueChunkMan(chunkKey);
      }
    }
  }

  getChunksToGenerate(playerLocation: Vector3) {
    if (this.player == null || this.chunkQt == null) {
      return;
    }

    const { chunkX, chunkY } = this.getPlayerChunkPosition(playerLocation);

    if (
      this.player.currentChunkKey?.traceX === chunkX &&
      this.player.currentChunkKey?.traceY === chunkY
    ) {
      return;
    }

    return getChunksKeysToRender(chunkX, chunkY, this.chunkQt);
  }

  async generateWorld(playerPosition: Vector3) {
    const chunksToRender = this.getChunksToRender(playerPosition);

    if (chunksToRender === null) {
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
          if (this.getChunkMan().getChunkBlocksMap().has(neighborKey)) {
            meshesToGenerate.add(neighborKey);
          } else {
            blocksToGenerate.add(neighborKey);
          }
        }
      }

      const chunksToGenerate = Array.from(
        new Set([...blocksToGenerate, meshesToGenerate]),
      );

      const chunksToRemove = this.getChunksToRemove(
        all.filter((c) => !chunksToGenerate.includes(c)),
      );

      this.dropChuncks(chunksToRemove);

      const blocksArray = Array.from(blocksToGenerate);

      if (blocksArray.length > 0) {
        await this.generateChunks(ChunkMsgTypes.GEN_BLOCK, blocksArray);
      }

      for (const chunkKey of meshesToGenerate) {
        await this.generateChunks(ChunkMsgTypes.GEN_MESH, [chunkKey]);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
  }

  setUpWorldSky() {
    const geometry = new THREE.SphereGeometry(5000, 64, 32);

    const textureLoader = new THREE.TextureLoader();

    const texture = textureLoader.load(skyTextureImg, (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.generateMipmaps = true;
      loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
    });

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSkyTexture: {
          value: texture,
        },
        uTime: {
          value: 0,
        },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
        }
      `,

      fragmentShader: `
      uniform sampler2D uSkyTexture;
      uniform float uTime;

      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.7);
        return fract(sin(p.x * p.y) * 43758.5453);
      }

      void main() {
        vec4 texel = texture2D(uSkyTexture, vUv);

        float brightness =
          max(texel.r, max(texel.g, texel.b));

        float starMask =
          smoothstep(0.03, 0.30, brightness);

        vec2 grid =
          floor(vUv * 180.0);

        float randomValue =
          hash(grid);

        float speed =
          1.0 + randomValue * 3.0;

        float phase =
          randomValue * 6.283185;

        float wave =
          sin(uTime * speed + phase);

        wave =
          wave * 0.5 + 0.5;

        float pulse =
          smoothstep(0.2, 0.8, wave);

        float twinkle =
          mix(0.45, 2.0, pulse);

        float starBrightness =
          mix(
            1.0,
            twinkle,
            starMask
          );

        vec3 color =
          texel.rgb * starBrightness;

        float glow =
          starMask *
          pulse *
          0.35;

        color +=
          vec3(1.0) *
          glow;

        gl_FragColor =
          vec4(color, texel.a);
      }
    `,

      side: THREE.BackSide,
      fog: false,
    });

    const skyMesh = new THREE.Mesh(geometry, this.skyMaterial);

    this.gameScene.add(skyMesh);

    const canvas = document.createElement("canvas");

    canvas.width = 1;
    canvas.height = 256;

    const fogCtx = canvas.getContext("2d")!;

    const fogGradient = fogCtx.createLinearGradient(0, 256, 0, 0);

    fogGradient.addColorStop(0.0, "rgb(255, 255, 255)");
    fogGradient.addColorStop(0.9, "rgb(255, 255, 255)");
    fogGradient.addColorStop(0.95, "rgb(180, 180, 180)");
    fogGradient.addColorStop(1.0, "rgb(0, 0, 0)");

    fogCtx.fillStyle = fogGradient;
    fogCtx.fillRect(0, 0, 1, 256);

    const alphaTexture = new THREE.CanvasTexture(canvas);

    const fogWallRadius = this.worldSize * 0.8;

    const fogWallGeometry = new THREE.CylinderGeometry(
      fogWallRadius,
      fogWallRadius,
      300,
      64,
      1,
      true,
    );

    const fogWallMaterial = new THREE.MeshBasicMaterial({
      color: this.backGroundColor,
      alphaMap: alphaTexture,
      transparent: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });

    this.fogWall = new THREE.Mesh(fogWallGeometry, fogWallMaterial);

    this.gameScene.add(this.fogWall);

    const groundCoverGeometry = new THREE.CircleGeometry(5000, 64);

    const groundCoverMaterial = new THREE.MeshBasicMaterial({
      color: this.backGroundColor,
      side: THREE.DoubleSide,
      fog: false,
    });

    const groundCover = new THREE.Mesh(
      groundCoverGeometry,
      groundCoverMaterial,
    );

    groundCover.rotation.x = -Math.PI / 2;

    groundCover.position.y = -100;

    this.gameScene.add(groundCover);

    const moonTexture = new THREE.TextureLoader().load(moonTextureImg);

    moonTexture.colorSpace = THREE.SRGBColorSpace;

    const moonMaterial = new THREE.SpriteMaterial({
      map: moonTexture,
      transparent: true,
      depthWrite: false,
      fog: false,
    });

    this.moon = new THREE.Sprite(moonMaterial);

    this.moon.scale.set(220, 220, 1);

    this.moon.position.set(0, 1200, -2000);

    this.gameScene.add(this.moon);

    const glowCanvas = document.createElement("canvas");

    glowCanvas.width = 256;
    glowCanvas.height = 256;

    const moonCtx = glowCanvas.getContext("2d")!;

    const moonGradient = moonCtx.createRadialGradient(
      128,
      128,
      10,
      128,
      128,
      128,
    );

    moonGradient.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    moonGradient.addColorStop(0.25, "rgba(210, 220, 255, 0.25)");
    moonGradient.addColorStop(0.6, "rgba(160, 180, 255, 0.08)");
    moonGradient.addColorStop(1, "rgba(100, 120, 255, 0)");
    moonCtx.fillStyle = moonGradient;
    moonCtx.fillRect(0, 0, 256, 256);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    glowTexture.colorSpace = THREE.SRGBColorSpace;

    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    const moonGlow = new THREE.Sprite(glowMaterial);
    moonGlow.scale.set(500, 500, 1);
    moonGlow.position.copy(this.moon.position);

    this.gameScene.add(moonGlow);

    const moonLight = new THREE.DirectionalLight(0xb8c7ff, 0.35);

    moonLight.position.copy(this.moon.position);
    moonLight.target.position.set(0, 0, 0);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 5000;
    moonLight.shadow.camera.left = -1000;
    moonLight.shadow.camera.right = 1000;
    moonLight.shadow.camera.top = 1000;
    moonLight.shadow.camera.bottom = -1000;
    moonLight.shadow.bias = -0.0005;
    moonLight.shadow.normalBias = 0.02;

    const moonAmbient = new THREE.AmbientLight(0x7180a8, 0.25);

    this.gameScene.add(moonAmbient);

    this.gameScene.add(moonLight);
    this.gameScene.add(moonLight.target);
  }

  setUpClouds() {
    this.clouds = new CloudSystem({
      size: 12000,
      height: CHUNK_TOTAL_HEIGHT * 2,
      windSpeed: 0.5,
      opacity: 0.85,
      color: 0x9aa4bd,
      seed: this.seed,
      cloudCount: 100,
    });

    this.gameScene.add(this.clouds);
  }

  updateFogWall() {
    const playerPosition = this.player?.getCamera().position;

    if (!playerPosition) return;

    this.fogWall.position.x = playerPosition.x;
    this.fogWall.position.y = playerPosition.y - 120;
    this.fogWall.position.z = playerPosition.z;
  }
}
