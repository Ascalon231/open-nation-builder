import { Delaunay } from "d3-delaunay";
import seedrandom from 'seedrandom';

export class MeshEngine {
    public points: Float64Array;
    public voronoi: any;
    public delaunay!: Delaunay<Float64Array>;
    public width: number;
    public height: number;

    constructor(width: number, height: number, numPoints: number | Float64Array, seed: string = "123") {
        this.width = width;
        this.height = height;
        
        if (numPoints instanceof Float64Array) {
            this.points = numPoints;
        } else {
            const rng = seedrandom(seed);
            this.points = new Float64Array(numPoints * 2);
            for (let i = 0; i < numPoints * 2; i++) {
                this.points[i] = rng() * (i % 2 === 0 ? width : height);
            }
        }
        this.updateVoronoi();
    }

    public updateVoronoi() {
        this.delaunay = new Delaunay(this.points);
        this.voronoi = this.delaunay.voronoi([0, 0, this.width, this.height]);
    }

    public getNeighbors(i: number): number[] {
        if (i < 0 || i >= this.points.length / 2) return [];
        const neighbors = Array.from(this.voronoi.neighbors(i)) as number[];
        
        const x = this.points[i * 2];
        const threshold = this.width * 0.1;
        const numTotalPoints = this.points.length / 2;

        if (x < threshold) {
            for (let j = 0; j < numTotalPoints; j++) {
                if (i === j) continue;
                const jx = this.points[j * 2];
                if (jx > this.width - threshold) {
                    const dist = Math.hypot(x - (jx - this.width), this.points[i * 2 + 1] - this.points[j * 2 + 1]);
                    if (dist < threshold && !neighbors.includes(j)) neighbors.push(j);
                }
            }
        } else if (x > this.width - threshold) {
            for (let j = 0; j < numTotalPoints; j++) {
                if (i === j) continue;
                const jx = this.points[j * 2];
                if (jx < threshold) {
                    const dist = Math.hypot(x - (jx + this.width), this.points[i * 2 + 1] - this.points[j * 2 + 1]);
                    if (dist < threshold && !neighbors.includes(j)) neighbors.push(j);
                }
            }
        }
        return neighbors;
    }

    public findClosestPoint(x: number, y: number): number {
        return this.delaunay.find(x, y);
    }

    public updatePoint(index: number, x: number, y: number) {
        if (index < 0 || index >= this.points.length / 2) return;
        this.points[index * 2] = x;
        this.points[index * 2 + 1] = y;
        this.updateVoronoi();
    }

    public relax(iterations: number = 2) {
        for (let iter = 0; iter < iterations; iter++) {
            const newPoints = new Float64Array(this.points.length);
            for (let i = 0; i < this.points.length / 2; i++) {
                let polygon = this.voronoi.cellPolygon(i);
                if (!polygon || polygon.length === 0) {
                    newPoints[i * 2] = this.points[i * 2];
                    newPoints[i * 2 + 1] = this.points[i * 2 + 1];
                    continue;
                }
                
                let cx = 0, cy = 0;
                for (const [px, py] of polygon) {
                    cx += px;
                    cy += py;
                }
                let targetX = cx / polygon.length;
                let targetY = cy / polygon.length;

                // Horizontal wrap for points drifting out (safer than while)
                targetX = ((targetX % this.width) + this.width) % this.width;
                
                // Vertical clamping
                targetY = Math.max(0, Math.min(this.height, targetY));
                
                newPoints[i * 2] = targetX;
                newPoints[i * 2 + 1] = targetY;
            }
            this.points.set(newPoints);
            this.updateVoronoi();
        }
    }
}
