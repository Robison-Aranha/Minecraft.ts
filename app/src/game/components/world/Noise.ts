import { createNoise2D } from "simplex-noise";
import seedrandom from "seedrandom";

const seed = seedrandom("60000000000");

export const simplex = createNoise2D(seed);