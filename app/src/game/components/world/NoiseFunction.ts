import { simplex } from "./Noise";

type NoiseOptions = {
  octaves: number;
  persistence: number;
  lacunarity: number;
  scale: number;
};

export function createOctaveNoise2D(options: NoiseOptions) {
  return (x: number, y: number): number => {
    let amplitude = 1;
    let frequency = 0.5;
    let noise = 0;
    let maxValue = 0;

    for (let i = 0; i < options.octaves; i++) {
      noise +=
        simplex(
          (x * frequency) / options.scale,
          (y * frequency) / options.scale
        ) * amplitude;
      maxValue += amplitude;

      amplitude *= options.persistence;
      frequency *= options.lacunarity;
    }

    return noise;
  };
}
