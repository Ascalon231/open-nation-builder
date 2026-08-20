export class ErosionEngine {
    /**
     * Thermal Erosion: Soil slumps down if slope is too steep
     */
    public static thermalErosion(elevations: Float32Array, neighbors: (i: number) => number[], talus: number = 0.005): Float32Array {
        const newElevations = new Float32Array(elevations);
        const num = elevations.length;

        for (let i = 0; i < num; i++) {
            const h = elevations[i];
            if (h <= 0.5) continue; // Only erode land

            const nList = neighbors(i);
            let maxDiff = 0;
            let targetIdx = -1;

            nList.forEach(ni => {
                const diff = h - elevations[ni];
                if (diff > maxDiff) {
                    maxDiff = diff;
                    targetIdx = ni;
                }
            });

            if (targetIdx !== -1 && maxDiff > talus) {
                // Move a portion of the height difference to the lowest neighbor
                const shift = maxDiff * 0.3;
                newElevations[i] -= shift;
                newElevations[targetIdx] += shift;
            }
        }
        return newElevations;
    }


    /**
     * Hydraulic Erosion: Simplified water droplet simulation
     */
    public static hydraulicErosion(elevations: Float32Array, neighbors: (i: number) => number[], iterations: number = 100): Float32Array {
        const newElevations = new Float32Array(elevations);
        for (let it = 0; it < iterations; it++) {
            const i = Math.floor(Math.random() * elevations.length);
            if (isNaN(newElevations[i])) continue;
            const nList = neighbors(i);
            if (nList.length === 0) continue;
            let lowestIdx = -1;
            let lowestH = newElevations[i];
            nList.forEach(ni => {
                if (ni < 0 || ni >= elevations.length) return;
                if (newElevations[ni] < lowestH) {
                    lowestH = newElevations[ni];
                    lowestIdx = ni;
                }
            });
            if (lowestIdx !== -1) {
                const amount = (newElevations[i] - lowestH) * 0.05;
                newElevations[i] -= amount;
                newElevations[lowestIdx] += amount;
            }
        }
        return newElevations;
    }

    /**
     * Sink Filling (Azgaar-style): Removes pits so water can flow to ocean.
     */
    public static fillSinks(elevations: Float32Array, neighbors: (i: number) => number[], seaLevel: number = 0.5): Float32Array {
        const h = new Float32Array(elevations);
        const num = h.length;
        const infinity = 999;
        
        // Initialize: everything is infinity except borders and water
        const newH = new Float32Array(num).fill(infinity);
        for (let i = 0; i < num; i++) {
            if (h[i] <= seaLevel) newH[i] = h[i];
        }

        // Iteratively propagate the minimum height
        let changed = true;
        let iters = 0;
        while (changed && iters < 100) {
            changed = false;
            for (let i = 0; i < num; i++) {
                if (newH[i] === h[i]) continue;
                const nList = neighbors(i);
                let minN = infinity;
                nList.forEach(ni => { if (newH[ni] < minN) minN = newH[ni]; });
                
                const targetH = Math.max(h[i], minN + 0.001);
                if (newH[i] > targetH) {
                    newH[i] = targetH;
                    changed = true;
                }
            }
            iters++;
        }
        return newH;
    }

    /**
     * Water Flux (Azgaar-style): Calculates flow accumulation with wrapping support.
     */
    public static calculateWaterFlux(elevations: Float32Array, neighbors: (i: number) => number[], moisture: Float32Array): Float32Array {
        const num = elevations.length;
        const flux = new Float32Array(num).fill(1);
        for(let i=0; i<num; i++) flux[i] += moisture[i] * 5;

        const indices = Array.from({length: num}, (_, i) => i);
        indices.sort((a, b) => elevations[b] - elevations[a]); 

        indices.forEach(i => {
            const nList = neighbors(i);
            let lowestIdx = -1;
            let lowestH = elevations[i];
            nList.forEach(ni => {
                if (elevations[ni] < lowestH) {
                    lowestH = elevations[ni];
                    lowestIdx = ni;
                }
            });

            if (lowestIdx !== -1) {
                flux[lowestIdx] += flux[i];
            }
        });

        return flux;
    }
}
