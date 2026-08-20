import { MeshEngine } from "../engine/MeshEngine";
import { BiomeEngine } from "../engine/BiomeEngine";

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext("2d")!;
    }

    public render(
        mesh: MeshEngine,
        elevations: Float32Array,
        riverPaths: number[][] = [],
        viewMode: string = "biome",
        temperatures?: Float32Array,
        moistures?: Float32Array,
        waterFlux?: Float32Array,
        tectonic?: any,
        lakes?: Uint8Array,
        offsetX: number = 0,
        offsetY: number = 0,
        zoom: number = 1.0,
        smooth: boolean = true,
        windX?: Float32Array,
        windY?: Float32Array,
        markers: { x: number, y: number }[] = [],
        customLabels: { text: string, x: number, y: number }[] = []
    ) {
        if (!this.ctx || !mesh || !elevations) return;
        const cw = this.ctx.canvas.width;
        const ch = this.ctx.canvas.height;
        const mw = mesh.width;
        const mh = mesh.height;

        this.ctx.clearRect(0, 0, cw, ch);

        // Base background based on theme
        if (viewMode === "antique") {
            this.ctx.fillStyle = "#e8d8b8";
        } else if (viewMode === "cyberpunk") {
            this.ctx.fillStyle = "#0a0a14";
        } else if (viewMode === "monochrome") {
            this.ctx.fillStyle = "#1e2430";
        } else if (viewMode === "political" || viewMode === "provinces") {
            this.ctx.fillStyle = "#1b2838";
        } else {
            this.ctx.fillStyle = "#000044";
        }
        this.ctx.fillRect(0, 0, cw, ch);

        // Calculate visible repeat range along X axis
        const scaledWidth = mw * zoom;
        const startRepeat = Math.floor((-offsetX - scaledWidth) / scaledWidth) - 1;
        const endRepeat = Math.ceil((cw - offsetX + scaledWidth) / scaledWidth) + 1;

        for (let r = startRepeat; r <= endRepeat; r++) {
            const xShift = r * mw;
            this.ctx.save();
            this.ctx.translate(offsetX + xShift * zoom, offsetY);
            this.ctx.scale(zoom, zoom);

            this.drawMesh(mesh, elevations, viewMode, temperatures, moistures, waterFlux, lakes, windX, windY);
            this.drawMarkersAndLabels(markers, customLabels, viewMode);
            this.ctx.restore();
        }

        // Post-processing texture overlay for antique theme
        if (viewMode === "antique") {
            this.ctx.fillStyle = "rgba(139, 69, 19, 0.04)";
            this.ctx.fillRect(0, 0, cw, ch);
        }
    }

    private drawMesh(
        mesh: MeshEngine,
        elevations: Float32Array,
        viewMode: string = "biome",
        temperatures?: Float32Array,
        moistures?: Float32Array,
        waterFlux?: Float32Array,
        lakes?: Uint8Array,
        windX?: Float32Array,
        windY?: Float32Array
    ) {
        const lightX = -1;
        const lightY = -1;
        const numPoints = mesh.points.length / 2;

        for (let i = 0; i < numPoints; i++) {
            const polygon = mesh.voronoi.cellPolygon(i);
            if (!polygon || polygon.length === 0) continue;

            const h = elevations[i];
            const x = mesh.points[i * 2];
            const y = mesh.points[i * 2 + 1];
            let baseColor = "#333333";

            try {
                if (viewMode === "elevation") {
                    if (h <= 0.15) baseColor = "#000044";
                    else if (h <= 0.3) baseColor = "#000088";
                    else if (h <= 0.45) baseColor = "#2244aa";
                    else if (h <= 0.5) baseColor = "#e0c9a0";
                    else if (h <= 0.55) baseColor = "#90ee90";
                    else if (h <= 0.65) baseColor = "#228b22";
                    else if (h <= 0.75) baseColor = "#556b2f";
                    else if (h <= 0.85) baseColor = "#a52a2a";
                    else if (h <= 0.95) baseColor = "#664422";
                    else baseColor = "#ffffff";
                } else if (viewMode === "antique") {
                    if (h <= 0.5) baseColor = "#d8c7a5";
                    else if (h <= 0.6) baseColor = "#eedfc0";
                    else if (h <= 0.8) baseColor = "#dfc8a2";
                    else baseColor = "#c8ab7e";
                } else if (viewMode === "political" || viewMode === "provinces") {
                    if (h <= 0.5) baseColor = "#1a2436";
                    else baseColor = "#2c3e50";
                } else if (viewMode === "cyberpunk") {
                    if (h <= 0.5) baseColor = "#050814";
                    else if (h <= 0.7) baseColor = "#121b2d";
                    else baseColor = "#1f293d";
                } else if (viewMode === "monochrome") {
                    if (h <= 0.5) baseColor = "#151b23";
                    else baseColor = "#30363d";
                } else if (viewMode === "temperature" && temperatures) {
                    const t = temperatures[i];
                    if (t <= 0.2) baseColor = "#0000ff";
                    else if (t <= 0.4) baseColor = "#00ffff";
                    else if (t <= 0.6) baseColor = "#00ff00";
                    else if (t <= 0.8) baseColor = "#ffff00";
                    else baseColor = "#ff0000";
                } else if (viewMode === "moisture" && moistures) {
                    const m = moistures[i];
                    if (m <= 0.2) baseColor = "#e65100";
                    else if (m <= 0.4) baseColor = "#fbc02d";
                    else if (m <= 0.6) baseColor = "#43a047";
                    else if (m <= 0.8) baseColor = "#00acc1";
                    else baseColor = "#1e88e5";
                } else if (viewMode === "biome" && temperatures && moistures) {
                    baseColor = BiomeEngine.getBiomeColor(BiomeEngine.getBiome(h, temperatures[i], moistures[i]));
                } else if (viewMode === "wind") {
                    baseColor = "#111111";
                } else {
                    baseColor = h <= 0.5 ? "#000044" : "#228b22";
                }

                if (lakes && lakes[i] === 1 && viewMode !== "wind") {
                    baseColor = viewMode === "antique" ? "#c4b18b" : "#3399ff";
                }

                let shadow = 0;
                if (h > 0.5 && !isNaN(h) && viewMode !== "wind") {
                    const neighbors = mesh.getNeighbors(i);
                    let dx = 0, dy = 0;
                    neighbors.forEach((ni: number) => {
                        const nh = elevations[ni];
                        let dnx = mesh.points[ni * 2] - x;
                        const dny = mesh.points[ni * 2 + 1] - y;
                        if (dnx > mesh.width * 0.5) dnx -= mesh.width;
                        else if (dnx < -mesh.width * 0.5) dnx += mesh.width;
                        const dist = Math.hypot(dnx, dny);
                        if (dist > 0.01) {
                            const slope = (nh - h) / dist;
                            dx += slope * (dnx / dist);
                            dy += slope * (dny / dist);
                        }
                    });
                    shadow = Math.max(-40, Math.min(40, (dx * lightX + dy * lightY) * 50));
                }

                const finalColor = this.adjustBrightness(baseColor, shadow);
                this.ctx.fillStyle = finalColor;
                this.ctx.strokeStyle = finalColor;
                this.ctx.lineWidth = 1.0;

                this.ctx.beginPath();
                const start = polygon[0];
                this.ctx.moveTo(start[0], start[1]);
                for (let j = 1; j < polygon.length; j++) {
                    this.ctx.lineTo(polygon[j][0], polygon[j][1]);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                // Cyberpunk / Blueprint Grid Lines
                if (viewMode === "cyberpunk" || viewMode === "monochrome") {
                    this.ctx.strokeStyle = viewMode === "cyberpunk" ? "rgba(0, 255, 234, 0.08)" : "rgba(255, 255, 255, 0.06)";
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }

                // Wind Direction Vectors
                if (viewMode === "wind" && windX && windY && i % 4 === 0) {
                    this.ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
                    this.ctx.lineWidth = 1.2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + windX[i] * 15, y + windY[i] * 15);
                    this.ctx.stroke();
                }

                // Coastline Highlight
                if (h > 0.5) {
                    const neighbors = mesh.getNeighbors(i);
                    if (neighbors.some(ni => elevations[ni] <= 0.5)) {
                        if (viewMode === "antique") {
                            this.ctx.strokeStyle = "rgba(80, 50, 20, 0.4)";
                            this.ctx.lineWidth = 1.5;
                        } else if (viewMode === "cyberpunk") {
                            this.ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
                            this.ctx.lineWidth = 1.8;
                        } else if (viewMode === "monochrome") {
                            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
                            this.ctx.lineWidth = 1.2;
                        } else {
                            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
                            this.ctx.lineWidth = 1.2;
                        }

                        this.ctx.beginPath();
                        for (let j = 0; j < polygon.length; j++) {
                            const p1 = polygon[j];
                            const p2 = polygon[(j + 1) % polygon.length];
                            const onBoundary = (p1[0] <= 0.1 && p2[0] <= 0.1) ||
                                (p1[0] >= mesh.width - 0.1 && p2[0] >= mesh.width - 0.1);
                            if (!onBoundary) {
                                this.ctx.moveTo(p1[0], p1[1]);
                                this.ctx.lineTo(p2[0], p2[1]);
                            }
                        }
                        this.ctx.stroke();
                    }
                }
            } catch (e) {}
        }

        // River rendering
        if (waterFlux && viewMode !== "wind") {
            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";
            for (let i = 0; i < elevations.length; i++) {
                if (elevations[i] > 0.5 && waterFlux[i] > 12) {
                    const neighbors = mesh.getNeighbors(i);
                    let lowestIdx = -1;
                    let lowestH = elevations[i];
                    neighbors.forEach(ni => {
                        if (elevations[ni] < lowestH) {
                            lowestH = elevations[ni];
                            lowestIdx = ni;
                        }
                    });
                    if (lowestIdx !== -1) {
                        const p2x = mesh.points[lowestIdx * 2];
                        const p2y = mesh.points[lowestIdx * 2 + 1];
                        const midX = (mesh.points[i * 2] + p2x) / 2 + (Math.sin(mesh.points[i * 2 + 1] * 0.1) * 3);
                        const midY = (mesh.points[i * 2 + 1] + p2y) / 2 + (Math.cos(mesh.points[i * 2] * 0.1) * 3);

                        if (viewMode === "antique") {
                            this.ctx.strokeStyle = "#4a3c2c";
                        } else if (viewMode === "cyberpunk") {
                            this.ctx.strokeStyle = "#00f0ff";
                        } else if (viewMode === "monochrome") {
                            this.ctx.strokeStyle = "#58a6ff";
                        } else {
                            this.ctx.strokeStyle = "#4477ff";
                        }

                        this.ctx.lineWidth = Math.min(6, Math.sqrt(waterFlux[i]) / 1.6);
                        this.ctx.beginPath();
                        this.ctx.moveTo(mesh.points[i * 2], mesh.points[i * 2 + 1]);
                        this.ctx.quadraticCurveTo(midX, midY, p2x, p2y);
                        this.ctx.stroke();
                    }
                }
            }
        }
    }

    private drawMarkersAndLabels(markers: any[], labels: any[], viewMode: string) {
        markers.forEach(m => {
            this.ctx.fillStyle = viewMode === "cyberpunk" ? "#ff007f" : "#ff3333";
            this.ctx.beginPath();
            this.ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        });

        labels.forEach(l => {
            this.ctx.save();
            this.ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            if (viewMode === "antique") {
                this.ctx.fillStyle = "#3e2723";
                this.ctx.shadowColor = "rgba(255,255,255,0.7)";
                this.ctx.shadowBlur = 4;
            } else if (viewMode === "cyberpunk") {
                this.ctx.fillStyle = "#00ffea";
                this.ctx.shadowColor = "rgba(0, 255, 234, 0.8)";
                this.ctx.shadowBlur = 8;
            } else {
                this.ctx.fillStyle = "#ffffff";
                this.ctx.shadowColor = "#000000";
                this.ctx.shadowBlur = 5;
            }

            this.ctx.fillText(l.text, l.x, l.y - 8);
            this.ctx.restore();
        });
    }

    private adjustBrightness(hex: string, percent: number): string {
        if (!hex || hex === "" || hex.startsWith('rgb') || hex.startsWith('hsl')) return hex || "#333333";
        if (isNaN(percent)) percent = 0;
        try {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            if (isNaN(r) || isNaN(g) || isNaN(b)) return "#333333";
            return `rgb(${Math.floor(Math.max(0, Math.min(255, r + percent)))}, ${Math.floor(Math.max(0, Math.min(255, g + percent)))}, ${Math.floor(Math.max(0, Math.min(255, b + percent)))})`;
        } catch (e) {
            return "#333333";
        }
    }
}
