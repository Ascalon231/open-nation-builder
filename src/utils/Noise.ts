import { createNoise2D } from 'simplex-noise';
import seedrandom from 'seedrandom';

export class NoiseGenerator {
    private noise2D: (x: number, y: number) => number;

    constructor(seed: string = Math.random().toString()) {
        const rng = seedrandom(seed);
        this.noise2D = createNoise2D(rng);
    }

    /**
     * Fractal Brown Motion (fBm) noise
     */
    public fractal(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        // Normalize to 0-1
        return (total / maxValue + 1) / 2;
    }

    /**
     * Periodic Fractal noise for horizontal wrapping
     */
    public periodicFractal(x: number, y: number, width: number, octaves: number = 4, persistence: number = 0.5): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        // Horizontal wrap using circle sampling (cylinder)
        const angle = (x / width) * Math.PI * 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        
        for (let i = 0; i < octaves; i++) {
            // We use 3D noise principle but here we can just use 2D noise with x,y as circle coordinates
            // To keep it 2D, we can use 2 different noise samples or just use a trick
            const sampleX = nx * frequency;
            const sampleY = ny * frequency;
            const sampleZ = y * frequency;
            
            // Simplex noise 2D isn't enough for perfect 3D cylinder, but we can combine 
            // two 2D noise samples to approximate it or just use 2D mapping if y is constant.
            // For true 3D noise we would need createNoise3D, but since we have 2D:
            total += (this.noise2D(sampleX, sampleZ) + this.noise2D(sampleY, sampleZ)) * 0.5 * amplitude;
            
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return (total / maxValue + 1) / 2;
    }
}
