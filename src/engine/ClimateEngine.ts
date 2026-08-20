import { MeshEngine } from "./MeshEngine";

export class ClimateEngine {
    public static simulateInterdependentClimate(
        mesh: MeshEngine, 
        elevations: Float32Array, 
        baseTemperatures: Float32Array,
        seaLevel: number = 0.5
    ): { moistures: Float32Array, finalTemperatures: Float32Array, windX: Float32Array, windY: Float32Array } {
        const numPoints = elevations.length;
        const moistures = new Float32Array(numPoints);
        const finalTemperatures = new Float32Array(baseTemperatures);
        const windX = new Float32Array(numPoints);
        const windY = new Float32Array(numPoints);

        let maxY = 1;
        for (let i = 0; i < numPoints; i++) if (mesh.points[i*2+1] > maxY) maxY = mesh.points[i*2+1];

        // 1. Establish Earth-like Wind Bands & Temperature
        for (let i = 0; i < numPoints; i++) {
            const y = mesh.points[i * 2 + 1];
            const lat = y / maxY;
            const distFromEquator = Math.abs(lat - 0.5);
            const h = elevations[i];

            let temp = Math.cos(distFromEquator * Math.PI);
            if (distFromEquator > 0.43) temp *= 0.3;
            if (distFromEquator > 0.48) temp = 0;
            if (h > seaLevel) temp -= (h - seaLevel) * 1.2; 
            finalTemperatures[i] = Math.max(0, Math.min(1, temp));

            let wx = 1.0; let wy = 0.0;
            if (distFromEquator < 0.17) { wx = -1.0; wy = (0.5 - lat) * 0.5; } 
            else if (distFromEquator < 0.33) { wx = 1.0; wy = (lat - 0.5) * 0.5; } 
            else { wx = -0.5; wy = (0.5 - lat) * 0.5; }

            const len = Math.hypot(wx, wy);
            if (len > 0) { windX[i] = wx / len; windY[i] = wy / len; }

            if (h <= seaLevel) moistures[i] = 1.0;
            else {
                if (distFromEquator < 0.08) moistures[i] = 0.9 + Math.random() * 0.1;
                else if (distFromEquator >= 0.15 && distFromEquator < 0.25) moistures[i] = 0.05 + Math.random() * 0.1;
                else if (distFromEquator >= 0.3 && distFromEquator < 0.45) moistures[i] = 0.6 + Math.random() * 0.2;
                else moistures[i] = 0.1 + Math.random() * 0.2;
            }
        }

        // 2. Propagate Moisture with Wrap-Aware Neighbors
        const iterations = 35; 
        for (let it = 0; it < iterations; it++) {
            const newMoisture = new Float32Array(moistures);
            for (let i = 0; i < numPoints; i++) {
                if (elevations[i] <= seaLevel) continue; 
                const neighbors = mesh.getNeighbors(i);
                const x = mesh.points[i * 2];
                const y = mesh.points[i * 2 + 1];
                const wx = windX[i];
                const wy = windY[i];

                let incoming = 0; let weightSum = 0;
                neighbors.forEach(ni => {
                    let nx = mesh.points[ni * 2] - x;
                    const ny = mesh.points[ni * 2 + 1] - y;
                    // Horizontal wrap coordinate diff
                    if (nx > mesh.width * 0.5) nx -= mesh.width;
                    else if (nx < -mesh.width * 0.5) nx += mesh.width;

                    const dist = Math.hypot(nx, ny);
                    if (dist > 0.001) {
                        const dot = (nx / dist) * wx + (ny / dist) * wy;
                        if (dot < -0.1) {
                            let m = moistures[ni];
                            if (elevations[i] > elevations[ni]) m *= Math.max(0, 1.0 - (elevations[i] - elevations[ni]) * 10.0);
                            const weight = Math.abs(dot);
                            incoming += m * weight; weightSum += weight;
                        }
                    }
                });
                if (weightSum > 0) {
                    let avg = incoming / weightSum;
                    avg *= 0.96;
                    newMoisture[i] = Math.max(moistures[i], moistures[i] * 0.2 + avg * 0.8);
                }
            }
            moistures.set(newMoisture);
        }

        // 3. Smooth & Normalize
        const blurredMoisture = new Float32Array(moistures);
        for (let i = 0; i < numPoints; i++) {
            if (elevations[i] <= seaLevel) continue;
            const neighbors = mesh.getNeighbors(i);
            let sum = moistures[i]; let count = 1;
            neighbors.forEach(ni => { if (elevations[ni] > seaLevel) { sum += moistures[ni]; count++; } });
            blurredMoisture[i] = sum / count;
        }
        moistures.set(blurredMoisture);

        let maxMoisture = 0.01;
        for (let i = 0; i < numPoints; i++) if (elevations[i] > seaLevel && moistures[i] > maxMoisture) maxMoisture = moistures[i];
        for (let i = 0; i < numPoints; i++) if (elevations[i] > seaLevel) {
            moistures[i] = Math.min(1.0, moistures[i] / maxMoisture);
            finalTemperatures[i] = Math.max(0, finalTemperatures[i] - moistures[i] * 0.15);
        }

        return { moistures, finalTemperatures, windX, windY };
    }
}
