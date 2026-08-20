import { MeshEngine } from "./MeshEngine";

export interface City {
    cellIndex: number;
    name: string;
    isCapital: boolean;
    nationID: number;
    population?: number;
}

export interface NationInfo {
    id: number;
    name: string;
    color: string;
    government?: string;
    culture?: string;
}

export interface ProvinceInfo {
    id: number;
    name: string;
    nationId: number;
}

export class NationEngine {
    private static prefixes = [
        "Neo", "Val", "Aethel", "Kor", "Zen", "Eld", "Oakh", "Frost", "Sun", "Iron",
        "Silver", "Shadow", "River", "Storm", "Dawn", "Dragon", "High", "Dusk", "Amber", "Myth"
    ];
    private static suffixes = [
        "grad", "ia", "land", "polis", "shire", "wick", "burg", "thorp", "vale", "gate",
        "haven", "ford", "keep", "reach", "crest", "wood", "spire", "bay", "hold", "gard"
    ];
    private static nationNouns = [
        "Empire", "Kingdom", "Republic", "Dominion", "Realm", "Federation", "Principality",
        "Sultanate", "Commonwealth", "Dynasty", "Union", "Enclave", "Sanctuary"
    ];

    public static generateName(type: "city" | "capital" | "nation" | "province"): string {
        const p = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
        const s = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
        const base = p + s;
        if (type === "nation") {
            const noun = this.nationNouns[Math.floor(Math.random() * this.nationNouns.length)];
            return `${noun} of ${base}`;
        }
        if (type === "province") {
            return `${base} Province`;
        }
        return base;
    }

    public static generateNations(mesh: MeshEngine, elevations: Float32Array, count: number): Int16Array {
        const numCells = elevations.length;
        const nations = new Int16Array(numCells).fill(-1);
        const landCells: number[] = [];
        for (let i = 0; i < numCells; i++) {
            if (elevations[i] > 0.5) landCells.push(i);
        }
        if (landCells.length === 0) return nations;
        
        const seeds: number[] = [];
        const actualCount = Math.min(count, landCells.length);
        for (let i = 0; i < actualCount; i++) {
            const idx = Math.floor(Math.random() * landCells.length);
            const cellIdx = landCells.splice(idx, 1)[0];
            seeds.push(cellIdx);
            nations[cellIdx] = i;
        }

        const queue = [...seeds];
        while (queue.length > 0) {
            const current = queue.shift()!;
            const neighbors = mesh.getNeighbors(current);
            for (const n of neighbors) {
                if (elevations[n] > 0.5 && nations[n] === -1) {
                    nations[n] = nations[current];
                    queue.push(n);
                }
            }
        }
        return nations;
    }

    public static autoPlaceCities(
        mesh: MeshEngine, 
        elevations: Float32Array, 
        waterFlux: Float32Array, 
        nations: Int16Array, 
        count: number
    ): City[] {
        const cities: City[] = [];
        const scores = new Float32Array(elevations.length);

        for (let i = 0; i < elevations.length; i++) {
            if (elevations[i] <= 0.5) continue;
            
            // Score based on: Water Flux (Rivers), Coasts, and Flat land
            let score = (waterFlux[i] || 0) * 3;
            const neighbors = mesh.getNeighbors(i);
            const isCoast = neighbors.some(n => elevations[n] <= 0.5);
            if (isCoast) score += 60;

            // Prefer moderate elevation
            if (elevations[i] > 0.52 && elevations[i] < 0.75) {
                score += 30;
            }
            
            scores[i] = score;
        }

        // Identify unique active nations
        const activeNationSet = new Set<number>();
        for (let i = 0; i < nations.length; i++) {
            if (nations[i] >= 0) activeNationSet.add(nations[i]);
        }

        // 1. Place a capital for each active nation
        for (const nID of activeNationSet) {
            let bestCell = -1;
            let bestScore = -1;
            for (let i = 0; i < elevations.length; i++) {
                if (nations[i] === nID && elevations[i] > 0.5) {
                    if (scores[i] > bestScore) {
                        bestScore = scores[i];
                        bestCell = i;
                    }
                }
            }

            if (bestCell !== -1) {
                cities.push({
                    cellIndex: bestCell,
                    name: this.generateName("capital"),
                    isCapital: true,
                    nationID: nID,
                    population: Math.floor(50000 + Math.random() * 200000)
                });
            }
        }

        // 2. Place additional secondary cities
        const sortedIndices = Array.from({ length: elevations.length }, (_, i) => i)
            .sort((a, b) => scores[b] - scores[a]);

        let placedExtra = 0;
        const maxExtra = Math.max(0, count - cities.length);

        for (const idx of sortedIndices) {
            if (placedExtra >= maxExtra) break;
            if (scores[idx] < 5) break;
            
            const tooClose = cities.some(c => {
                let dx = mesh.points[idx * 2] - mesh.points[c.cellIndex * 2];
                if (dx > mesh.width * 0.5) dx -= mesh.width;
                else if (dx < -mesh.width * 0.5) dx += mesh.width;
                const dist = Math.hypot(dx, mesh.points[idx * 2 + 1] - mesh.points[c.cellIndex * 2 + 1]);
                return dist < 80;
            });
            
            if (!tooClose) {
                cities.push({
                    cellIndex: idx,
                    name: this.generateName("city"),
                    isCapital: false,
                    nationID: nations[idx],
                    population: Math.floor(5000 + Math.random() * 45000)
                });
                placedExtra++;
            }
        }

        return cities;
    }
}
