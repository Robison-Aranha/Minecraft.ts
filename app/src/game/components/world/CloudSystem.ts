import * as THREE from "three";

export interface CloudOptions {
  size?: number;
  height?: number;
  windSpeed?: number;
  opacity?: number;
  color?: THREE.ColorRepresentation;
  seed?: number;
  cloudCount?: number;
}

export class CloudSystem extends THREE.Group {
  private readonly material: THREE.MeshLambertMaterial;
  private readonly size: number;
  private readonly windSpeed: number;
  private readonly cloudHeight: number;
  private readonly cloudMeshes: THREE.Mesh[] = [];

  constructor(options: CloudOptions = {}) {
    super();

    const {
      size = 6000,
      height = 180,
      windSpeed = 2,
      opacity = 1,
      color = 0x9aa4bd,
      seed = 12345,
      cloudCount = 70,
    } = options;

    this.size = size;
    this.windSpeed = windSpeed;
    this.cloudHeight = height;

    this.material = new THREE.MeshLambertMaterial({
      color,
      transparent: false,
      opacity,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      fog: false,
    });

    const geometry = this.createCloudGeometry(cloudCount, seed);

    const segmentCount = 3;

    for (let i = 0; i < segmentCount; i++) {
      const mesh = new THREE.Mesh(geometry, this.material);

      mesh.position.x = i * this.size - this.size * 1.5;

      mesh.frustumCulled = false;

      this.add(mesh);
      this.cloudMeshes.push(mesh);
    }
  }

  private random(seed: number): number {
    const x = Math.sin(seed) * 43758.5453123;

    return x - Math.floor(x);
  }

  private createCloudGeometry(
    cloudCount: number,
    seed: number,
  ): THREE.BufferGeometry {
    const blockSize = 80;
    const blockHeight = blockSize * 0.45;

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    let vertexOffset = 0;

    const addFace = (vertices: number[], normal: number[]) => {
      positions.push(...vertices);

      for (let i = 0; i < 4; i++) {
        normals.push(...normal);
      }

      indices.push(
        vertexOffset,
        vertexOffset + 1,
        vertexOffset + 2,
        vertexOffset,
        vertexOffset + 2,
        vertexOffset + 3,
      );

      vertexOffset += 4;
    };

    const patterns = [
      [
        "   XXX   ",
        " XXXXXXX ",
        "XXXXXXXXX",
        "XXXXXXXXX",
        " XXXXXXX ",
        "   XXX   ",
      ],
      [
        "    XX   ",
        "  XXXXXXX",
        " XXXXXXXXX",
        "XXXXXXXXX",
        " XXXXXXX ",
        "   XXX   ",
      ],
      [
        "   XXXX  ",
        " XXXXXXXX",
        "XXXXXXXXX",
        "XXXXXXXXX",
        " XXXXXXX ",
        "   XXXX  ",
      ],
      [
        "    XXX  ",
        "  XXXXXXX",
        " XXXXXXXX",
        "XXXXXXXXX",
        " XXXXXXX ",
        "   XXX   ",
      ],
    ];

    for (let i = 0; i < cloudCount; i++) {
      const cloudSeed = seed + i * 1000;

      const pattern =
        patterns[Math.floor(this.random(cloudSeed + 500) * patterns.length)];

      const depth = pattern.length;
      const width = pattern[0].length;

      const offsetX =
        this.random(cloudSeed + 100) * (this.size - width * blockSize);

      const offsetZ = (this.random(cloudSeed + 200) - 0.5) * this.size;

      const blocks = new Set<string>();

      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          if (pattern[z][x] === "X") {
            blocks.add(`${x},${z}`);
          }
        }
      }

      for (const block of blocks) {
        const [x, z] = block.split(",").map(Number);

        const centerX = offsetX + x * blockSize;

        const centerY = this.cloudHeight;

        const centerZ = offsetZ + z * blockSize;

        const hx = blockSize * 0.5;

        const hy = blockHeight * 0.5;

        const hz = blockSize * 0.5;

        const hasLeft = blocks.has(`${x - 1},${z}`);

        const hasRight = blocks.has(`${x + 1},${z}`);

        const hasFront = blocks.has(`${x},${z + 1}`);

        const hasBack = blocks.has(`${x},${z - 1}`);

        if (!hasFront) {
          addFace(
            [
              centerX - hx,
              centerY - hy,
              centerZ + hz,

              centerX + hx,
              centerY - hy,
              centerZ + hz,

              centerX + hx,
              centerY + hy,
              centerZ + hz,

              centerX - hx,
              centerY + hy,
              centerZ + hz,
            ],
            [0, 0, 1],
          );
        }

        if (!hasBack) {
          addFace(
            [
              centerX + hx,
              centerY - hy,
              centerZ - hz,

              centerX - hx,
              centerY - hy,
              centerZ - hz,

              centerX - hx,
              centerY + hy,
              centerZ - hz,

              centerX + hx,
              centerY + hy,
              centerZ - hz,
            ],
            [0, 0, -1],
          );
        }

        addFace(
          [
            centerX - hx,
            centerY + hy,
            centerZ + hz,

            centerX + hx,
            centerY + hy,
            centerZ + hz,

            centerX + hx,
            centerY + hy,
            centerZ - hz,

            centerX - hx,
            centerY + hy,
            centerZ - hz,
          ],
          [0, 1, 0],
        );

        addFace(
          [
            centerX - hx,
            centerY - hy,
            centerZ - hz,

            centerX + hx,
            centerY - hy,
            centerZ - hz,

            centerX + hx,
            centerY - hy,
            centerZ + hz,

            centerX - hx,
            centerY - hy,
            centerZ + hz,
          ],
          [0, -1, 0],
        );

        if (!hasRight) {
          addFace(
            [
              centerX + hx,
              centerY - hy,
              centerZ + hz,

              centerX + hx,
              centerY - hy,
              centerZ - hz,

              centerX + hx,
              centerY + hy,
              centerZ - hz,

              centerX + hx,
              centerY + hy,
              centerZ + hz,
            ],
            [1, 0, 0],
          );
        }

        if (!hasLeft) {
          addFace(
            [
              centerX - hx,
              centerY - hy,
              centerZ - hz,

              centerX - hx,
              centerY - hy,
              centerZ + hz,

              centerX - hx,
              centerY + hy,
              centerZ + hz,

              centerX - hx,
              centerY + hy,
              centerZ - hz,
            ],
            [-1, 0, 0],
          );
        }
      }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );

    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );

    geometry.setIndex(indices);

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }

  update(delta: number) {
    const movement = delta * this.windSpeed;

    for (const mesh of this.cloudMeshes) {
      mesh.position.x -= movement;
    }

    for (const mesh of this.cloudMeshes) {
      if (mesh.position.x <= -this.size * 1.5) {
        mesh.position.x += this.size * this.cloudMeshes.length;
      }
    }
  }

  setColor(color: THREE.ColorRepresentation) {
    this.material.color.set(color);
  }

  setOpacity(opacity: number) {
    this.material.opacity = opacity;
  }

  dispose() {
    const geometry = this.cloudMeshes[0]?.geometry;

    geometry?.dispose();

    this.material.dispose();
  }
}
