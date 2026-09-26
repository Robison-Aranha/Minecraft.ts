import * as THREE from "three";
import { Player } from "./player/Player";
import { World } from "./world/World";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { ChunkMsgTypes } from "./enums/ChunkMsgTypes.ts";
import { getAroundChunksKeys } from "./utils/Utils.ts";
import { CHUNK_SIZE } from "./const/Const.ts";
import skyTextureImg from "../../assets/sky.jpg";
import moonTextureImg from "../../assets/moon.png";

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
  private backGroundColor = 0x070b19;
  private fogWall!: THREE.Mesh;
  private worldSize: number;
  private moon!: THREE.Sprite;
  private skyMaterial!: THREE.ShaderMaterial;

  constructor(chunkQt: number, ref: React.RefObject<HTMLDivElement | null>) {
    this.ref = ref;

    this.world = new World(chunkQt);
    this.player = new Player(this.world);
    this.world.setPlayer(this.player);

    this.worldSize = chunkQt * CHUNK_SIZE;

    const fogStart = this.worldSize * 0.5;
    const fogEnd = this.worldSize * 0.7;

    this.fog = new THREE.Fog(this.backGroundColor, fogStart, fogEnd);
  }

  setSeed(seed: number) {
    this.seed = seed;
  }

  async setupWorld() {
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(this.backGroundColor);
    this.ref.current?.appendChild(this.renderer.domElement);
  }

  setUpSky() {
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

    this.scene.add(skyMesh);

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

    this.scene.add(this.fogWall);

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

    this.scene.add(groundCover);

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

    this.scene.add(this.moon);

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

    this.scene.add(moonGlow);

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

    this.scene.add(moonLight);
    this.scene.add(moonLight.target);
  }

  render() {
    if (this.renderer) {
      requestAnimationFrame(this.render.bind(this));

      const delta = this.clock.getDelta() * 60;
      this.player.updatePlayerGround(delta);
      this.player.update(delta);
      this.updateFogWall();

      if (this.skyMaterial) {
        this.skyMaterial.uniforms.uTime.value = this.clock.elapsedTime;
      }

      this.renderer.render(this.scene, this.player.getCamera());
      this.stats?.update();

      if (!this.generating) {
        this.updateChunks();
      }
    }
  }

  updateFogWall() {
    const camera = this.player.getCamera();

    this.fogWall.position.x = camera.position.x;
    this.fogWall.position.y = camera.position.y - 120;
    this.fogWall.position.z = camera.position.z;
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

      this.world.dropChuncks(chunksToRemove);

      console.log(chunksToRemove)

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
