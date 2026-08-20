import { MeshEngine } from "./engine/MeshEngine";
import { NationEngine } from "./engine/NationEngine";
import type { City } from "./engine/NationEngine";
import { CanvasRenderer } from "./ui/CanvasRenderer";
import { ClimateEngine } from "./engine/ClimateEngine";
import { ErosionEngine } from "./engine/ErosionEngine";
import { BiomeEngine } from "./engine/BiomeEngine";
import { NoiseGenerator } from "./utils/Noise";

const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const inputMap = document.getElementById("input-map") as HTMLInputElement;

// State Variables
let mesh: MeshEngine;
let elevations: Float32Array;
let temperatures: Float32Array;
let moistures: Float32Array;
let waterFlux: Float32Array;
let cellNations: Int16Array;
let cellProvinces: Int16Array;
let cities: City[] = [];
let markers: { x: number, y: number }[] = [];
let customLabels: { text: string, x: number, y: number }[] = [];
let windX: Float32Array;
let windY: Float32Array;

// Data Maps & Custom Properties
let nationNames: Map<number, string> = new Map();
let nationColors: Map<number, string> = new Map();
let provinceNames: Map<number, string> = new Map();

let currentView = "biome";
let currentMode = "inspect";
let panX = 0;
let panY = 0;
let isPanning = false;
let isDrawing = false;
let lastMouseX = 0;
let lastMouseY = 0;
let brushSize = 45;
let activeID = 0;
let politicalOpacity = 0.50;
let isDataReady = false;
let selectedCellIdx: number | null = null;

const renderer = new CanvasRenderer(canvas);

// Default Palette Generator
function getDefaultColor(id: number): string {
    if (nationColors.has(id)) return nationColors.get(id)!;
    const hue = (id * 137.5) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

// Generate New Procedural World
export function generateNewWorld(preset: string = "continents", seed: string = Math.random().toString(), numPoints: number = 800) {
    const width = window.innerWidth || 1200;
    const height = window.innerHeight || 800;
    mesh = new MeshEngine(width, height, numPoints, seed);
    mesh.relax(2);

    const noise = new NoiseGenerator(seed);
    elevations = new Float32Array(numPoints);
    const mw = mesh.width;
    const mh = mesh.height;

    for (let i = 0; i < numPoints; i++) {
        const x = mesh.points[i * 2];
        const y = mesh.points[i * 2 + 1];
        const n = noise.periodicFractal(x, y / 600, mw, 5, 0.5);
        let h = 0.3;

        if (preset === "pangea") {
            const dx = (x - mw / 2) / (mw / 2);
            const dy = (y - mh / 2) / (mh / 2);
            const dist = Math.hypot(dx, dy);
            h = Math.max(0.1, 0.85 - dist * 1.2) + (n - 0.5) * 0.4;
        } else if (preset === "archipelago") {
            h = n > 0.55 ? 0.35 + n * 0.45 : 0.2;
        } else if (preset === "twin") {
            const d1 = Math.hypot((x - mw * 0.3) / mw, (y - mh * 0.5) / mh);
            const d2 = Math.hypot((x - mw * 0.7) / mw, (y - mh * 0.5) / mh);
            h = Math.max(0.1, 0.75 - Math.min(d1, d2) * 2.8) + (n - 0.5) * 0.4;
        } else {
            // Standard / Continents
            const lat = Math.abs((y / mh) - 0.5);
            h = n + (0.1 - lat * 0.2);
        }

        elevations[i] = Math.max(0, Math.min(1, h));
    }

    // Thermal erosion & simulation
    const neighbors = (idx: number) => mesh.getNeighbors(idx);
    for (let i = 0; i < 2; i++) {
        elevations = ErosionEngine.thermalErosion(elevations, neighbors);
    }
    elevations = ErosionEngine.fillSinks(elevations, neighbors, 0.5);

    syncClimate();

    // Auto generate initial geopolitics
    cellNations = NationEngine.generateNations(mesh, elevations, 6);
    cellProvinces = NationEngine.generateNations(mesh, elevations, 24);
    cities = NationEngine.autoPlaceCities(mesh, elevations, waterFlux, cellNations, 12);

    // Populate Initial Names
    nationNames.clear();
    nationColors.clear();
    provinceNames.clear();

    const uniqueNations = new Set(Array.from(cellNations).filter(n => n >= 0));
    uniqueNations.forEach(nID => {
        nationNames.set(nID, NationEngine.generateName("nation"));
        nationColors.set(nID, getDefaultColor(nID));
    });

    const uniqueProvinces = new Set(Array.from(cellProvinces).filter(p => p >= 0));
    uniqueProvinces.forEach(pID => {
        provinceNames.set(pID, NationEngine.generateName("province"));
    });

    isDataReady = true;
    updateLegendUI();
    render();
}

function syncClimate() {
    if (!mesh || !elevations) return;
    const baseT = new Float32Array(elevations.length);
    for (let i = 0; i < elevations.length; i++) {
        baseT[i] = 1 - Math.abs((mesh.points[i * 2 + 1] / mesh.height) - 0.5) * 2;
    }
    const res = ClimateEngine.simulateInterdependentClimate(mesh, elevations, baseT, 0.5);
    moistures = res.moistures;
    temperatures = res.finalTemperatures;
    windX = res.windX;
    windY = res.windY;
    waterFlux = ErosionEngine.calculateWaterFlux(elevations, (idx) => mesh.getNeighbors(idx), moistures);
}

// File Import Handler
inputMap.addEventListener("change", (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
        try {
            const data = JSON.parse(event.target.result);
            elevations = new Float32Array(data.elevations);
            mesh = new MeshEngine(data.width || window.innerWidth, data.height || window.innerHeight, new Float64Array(data.points));
            
            cellNations = data.cellNations ? new Int16Array(data.cellNations) : new Int16Array(elevations.length).fill(-1);
            cellProvinces = data.cellProvinces ? new Int16Array(data.cellProvinces) : new Int16Array(elevations.length).fill(-1);
            cities = data.cities || [];
            markers = data.markers || [];
            customLabels = data.customLabels || [];
            
            nationNames = new Map(data.nationNames || []);
            nationColors = new Map(data.nationColors || []);
            provinceNames = new Map(data.provinceNames || []);
            
            syncClimate();
            isDataReady = true;
            updateLegendUI();
            render();
        } catch (err) {
            alert("Gagal membaca file proyek: " + err);
        }
    };
    reader.readAsText(file);
});

// Canvas Interaction Handler
function handleInteraction(x: number, y: number, isMove: boolean) {
    if (!isDataReady || !mesh) return;
    const mw = mesh.width;
    const lx = ((x - panX) % mw + mw) % mw;
    const ly = y - panY;
    const idx = mesh.findClosestPoint(lx, ly);

    if (currentMode === "inspect") {
        if (!isMove) {
            selectedCellIdx = idx;
            showInspector(idx);
        }
    } else if (currentMode === "paint-nation" || currentMode === "paint-province") {
        for (let i = 0; i < elevations.length; i++) {
            let dx = mesh.points[i * 2] - lx;
            if (dx > mw * 0.5) dx -= mw;
            else if (dx < -mw * 0.5) dx += mw;
            if (Math.hypot(dx, mesh.points[i * 2 + 1] - ly) < brushSize) {
                if (currentMode === "paint-nation") {
                    cellNations[i] = activeID;
                    if (!nationNames.has(activeID)) {
                        nationNames.set(activeID, NationEngine.generateName("nation"));
                        nationColors.set(activeID, getDefaultColor(activeID));
                    }
                } else {
                    cellProvinces[i] = activeID;
                    if (!provinceNames.has(activeID)) {
                        provinceNames.set(activeID, NationEngine.generateName("province"));
                    }
                }
            }
        }
        render();
    } else if (currentMode === "sculpt-raise" || currentMode === "sculpt-lower" || currentMode === "sculpt-smooth") {
        const delta = currentMode === "sculpt-raise" ? 0.04 : currentMode === "sculpt-lower" ? -0.04 : 0;
        for (let i = 0; i < elevations.length; i++) {
            let dx = mesh.points[i * 2] - lx;
            if (dx > mw * 0.5) dx -= mw;
            else if (dx < -mw * 0.5) dx += mw;
            const dist = Math.hypot(dx, mesh.points[i * 2 + 1] - ly);
            if (dist < brushSize) {
                const factor = 1 - (dist / brushSize);
                if (currentMode === "sculpt-smooth") {
                    const neighbors = mesh.getNeighbors(i);
                    const avg = neighbors.reduce((acc, ni) => acc + elevations[ni], elevations[i]) / (neighbors.length + 1);
                    elevations[i] += (avg - elevations[i]) * 0.2 * factor;
                } else {
                    elevations[i] = Math.max(0, Math.min(1, elevations[i] + delta * factor));
                }
            }
        }
        syncClimate();
        render();
    } else if (!isMove && currentMode === "place-city") {
        if (elevations[idx] > 0.5) {
            cities.push({
                cellIndex: idx,
                name: NationEngine.generateName("city"),
                isCapital: false,
                nationID: cellNations[idx],
                population: Math.floor(5000 + Math.random() * 50000)
            });
            render();
        }
    } else if (!isMove && currentMode === "place-capital") {
        if (elevations[idx] > 0.5) {
            cities.push({
                cellIndex: idx,
                name: NationEngine.generateName("capital"),
                isCapital: true,
                nationID: cellNations[idx],
                population: Math.floor(60000 + Math.random() * 300000)
            });
            render();
        }
    } else if (!isMove && currentMode === "add-label") {
        const text = prompt("Masukkan teks label:", "Wilayah Baru");
        if (text) {
            customLabels.push({ text, x: lx, y: ly });
            render();
        }
    } else if (!isMove && currentMode === "erase") {
        // Erase city or clear nation claims
        const cityIdx = cities.findIndex(c => c.cellIndex === idx);
        if (cityIdx !== -1) {
            cities.splice(cityIdx, 1);
        } else {
            cellNations[idx] = -1;
            cellProvinces[idx] = -1;
        }
        render();
    }
}

// Live Inspector UI
function showInspector(idx: number) {
    const nationID = cellNations[idx];
    const provID = cellProvinces[idx];
    const city = cities.find(c => c.cellIndex === idx);
    const biome = BiomeEngine.getBiome(elevations[idx], temperatures[idx], moistures[idx]);
    const biomeName = BiomeEngine.getBiomeName(biome);
    const content = document.getElementById("inspector-content");
    if (!content) return;

    const nationColor = nationID >= 0 ? (nationColors.get(nationID) || getDefaultColor(nationID)) : "#888888";

    content.innerHTML = `
        <div class="inspector-row">
            <span class="inspector-label">Negara ID ${nationID >= 0 ? nationID : 'Tak Bertuan'}</span>
            ${nationID >= 0 ? `
                <div style="display:flex; align-items:center; gap:4px;">
                    <input type="color" id="edit-nation-color" value="${nationColor.startsWith('#') ? nationColor : '#4fc3f7'}" style="width:26px; height:26px; padding:0; border:none; background:transparent; cursor:pointer;">
                    <input class="inspector-input" id="edit-nation-name" value="${nationNames.get(nationID) || 'Nation ' + nationID}">
                </div>
            ` : '<span style="color:#666; font-size:12px;">Tanpa Klaim</span>'}
        </div>
        <div class="inspector-row">
            <span class="inspector-label">Provinsi ID ${provID >= 0 ? provID : '-'}</span>
            ${provID >= 0 ? `
                <input class="inspector-input" id="edit-province-name" value="${provinceNames.get(provID) || 'Prov ' + provID}">
            ` : '<span style="color:#666; font-size:12px;">Tanpa Provinsi</span>'}
        </div>
        <div class="inspector-row">
            <span class="inspector-label">Bioma</span>
            <span class="inspector-val" style="font-size:12px; font-weight:bold; color:#a5d6a7;">${biomeName}</span>
        </div>
        ${city ? `
        <div class="inspector-row">
            <span class="inspector-label">Kota (${city.isCapital ? 'Ibu Kota 👑' : 'Kota 🏙️'})</span>
            <input class="inspector-input" id="edit-city-name" value="${city.name}">
        </div>
        <div class="inspector-row">
            <span class="inspector-label">Populasi</span>
            <span class="inspector-val">${city.population ? city.population.toLocaleString() + ' Jiwa' : '35,000 Jiwa'}</span>
        </div>
        ` : ''}
        <div class="inspector-row">
            <span class="inspector-label">Ketinggian</span>
            <span class="inspector-val">${(elevations[idx] * 1000).toFixed(0)}m (${elevations[idx] > 0.5 ? 'Daratan' : 'Lautan'})</span>
        </div>
        <div class="inspector-row">
            <span class="inspector-label">Suhu / Lembab</span>
            <span class="inspector-val">${(temperatures[idx] * 40 - 10).toFixed(1)}°C / ${(moistures[idx] * 100).toFixed(0)}%</span>
        </div>
    `;

    // Event Listeners for Live Editing
    document.getElementById("edit-nation-name")?.addEventListener("input", (e: any) => {
        if (nationID >= 0) {
            nationNames.set(nationID, e.target.value);
            render();
        }
    });
    document.getElementById("edit-nation-color")?.addEventListener("input", (e: any) => {
        if (nationID >= 0) {
            nationColors.set(nationID, e.target.value);
            render();
        }
    });
    document.getElementById("edit-province-name")?.addEventListener("input", (e: any) => {
        if (provID >= 0) {
            provinceNames.set(provID, e.target.value);
            render();
        }
    });
    if (city) {
        document.getElementById("edit-city-name")?.addEventListener("input", (e: any) => {
            city.name = e.target.value;
            render();
        });
    }
}

function updateLegendUI() {
    const leg = document.getElementById("legend");
    if (!leg) return;
    if (currentView === "elevation") {
        leg.innerHTML = `
            <div class="legend-item"><span style="background:#ffffff"></span> Alpine (>950m)</div>
            <div class="legend-item"><span style="background:#664422"></span> Pegunungan Tinggi</div>
            <div class="legend-item"><span style="background:#a52a2a"></span> Pegunungan</div>
            <div class="legend-item"><span style="background:#556b2f"></span> Dataran Tinggi</div>
            <div class="legend-item"><span style="background:#228b22"></span> Perbukitan</div>
            <div class="legend-item"><span style="background:#90ee90"></span> Dataran Rendah</div>
            <div class="legend-item"><span style="background:#e0c9a0"></span> Garis Pantai</div>
            <div class="legend-item"><span style="background:#000088"></span> Samudera</div>
        `;
    } else if (currentView === "biome") {
        leg.innerHTML = `
            <div class="legend-item"><span style="background:#ffffff"></span> Es Abadi</div>
            <div class="legend-item"><span style="background:#999999"></span> Tundra</div>
            <div class="legend-item"><span style="background:#448844"></span> Hutan Daun Jarum</div>
            <div class="legend-item"><span style="background:#004400"></span> Hutan Hujan Tropis</div>
            <div class="legend-item"><span style="background:#889977"></span> Padang Rumput</div>
            <div class="legend-item"><span style="background:#d2b48c"></span> Gurun Kering</div>
        `;
    } else if (currentView === "antique") {
        leg.innerHTML = `<div class="legend-item"><span style="background:#d8c7a5"></span> Gaya Kartografi Kuno</div>`;
    } else if (currentView === "cyberpunk") {
        leg.innerHTML = `<div class="legend-item"><span style="background:#00ffea"></span> Grid Neon Geopolitik</div>`;
    } else {
        leg.innerHTML = "";
    }
}

// Master Render Loop
function render() {
    if (!isDataReady) return;
    renderer.render(
        mesh, elevations, [], currentView,
        temperatures, moistures, waterFlux,
        undefined, undefined, panX, panY, true,
        windX, windY, markers, customLabels
    );
    drawPoliticalOverlay();
    drawCities();
}

function drawPoliticalOverlay() {
    if (politicalOpacity <= 0) return;
    const mw = mesh.width;
    const cw = canvas.width;
    const startX = Math.floor((-panX - mw) / mw) * mw;
    const endX = cw - panX;

    ctx.globalAlpha = politicalOpacity;

    for (let xOff = startX; xOff <= endX; xOff += mw) {
        ctx.save();
        ctx.translate(panX + xOff, panY);

        for (let i = 0; i < elevations.length; i++) {
            const nID = cellNations[i];
            const pID = cellProvinces[i];
            const displayID = (currentView === "provinces") ? pID : nID;
            
            if (displayID === -1 || elevations[i] <= 0.5) continue;
            const poly = mesh.voronoi.cellPolygon(i);
            if (!poly) continue;

            const color = currentView === "provinces" ? getDefaultColor(pID + 10) : (nationColors.get(nID) || getDefaultColor(nID));
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(poly[0][0], poly[0][1]);
            for (let j = 1; j < poly.length; j++) {
                ctx.lineTo(poly[j][0], poly[j][1]);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Draw Nation Borders
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < elevations.length; i++) {
            const nID = cellNations[i];
            if (nID === -1 || elevations[i] <= 0.5) continue;
            const poly = mesh.voronoi.cellPolygon(i);
            if (!poly) continue;

            const neighbors = mesh.getNeighbors(i);
            const isBorder = neighbors.some(ni => cellNations[ni] !== nID && elevations[ni] > 0.5);
            if (isBorder) {
                ctx.stroke();
            }
        }

        ctx.restore();
    }
    ctx.globalAlpha = 1.0;
}

function drawCities() {
    const mw = mesh.width;
    const cw = canvas.width;
    const startX = Math.floor((-panX - mw) / mw) * mw;
    const endX = cw - panX;

    for (let xOff = startX; xOff <= endX; xOff += mw) {
        ctx.save();
        ctx.translate(panX + xOff, panY);

        cities.forEach(c => {
            const x = mesh.points[c.cellIndex * 2];
            const y = mesh.points[c.cellIndex * 2 + 1];

            // City Icon
            ctx.font = c.isCapital ? "18px Arial" : "14px Arial";
            ctx.textAlign = "center";
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(0,0,0,0.9)";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(c.isCapital ? "👑" : "🏙️", x, y + 4);

            // City Name Label
            ctx.font = c.isCapital ? "bold 11px 'Segoe UI', sans-serif" : "600 10px 'Segoe UI', sans-serif";
            ctx.fillStyle = c.isCapital ? "#ffe082" : "#ffffff";
            ctx.fillText(c.name.toUpperCase(), x, y - 10);
            ctx.shadowBlur = 0;
        });

        ctx.restore();
    }
}

// UI Controls & Tool Selection
function setMode(m: string, btnId: string) {
    currentMode = m;
    document.querySelectorAll("#ui-overlay .btn-tool").forEach(b => b.classList.remove("tool-active"));
    document.getElementById(btnId)?.classList.add("tool-active");
}

document.getElementById("btn-mode-inspect")?.addEventListener("click", () => setMode("inspect", "btn-mode-inspect"));
document.getElementById("btn-mode-drag")?.addEventListener("click", () => setMode("drag", "btn-mode-drag"));
document.getElementById("btn-mode-paint-nation")?.addEventListener("click", () => setMode("paint-nation", "btn-mode-paint-nation"));
document.getElementById("btn-mode-paint-province")?.addEventListener("click", () => setMode("paint-province", "btn-mode-paint-province"));
document.getElementById("btn-mode-place-city")?.addEventListener("click", () => setMode("place-city", "btn-mode-place-city"));
document.getElementById("btn-mode-place-capital")?.addEventListener("click", () => setMode("place-capital", "btn-mode-place-capital"));
document.getElementById("btn-mode-raise")?.addEventListener("click", () => setMode("sculpt-raise", "btn-mode-raise"));
document.getElementById("btn-mode-lower")?.addEventListener("click", () => setMode("sculpt-lower", "btn-mode-lower"));
document.getElementById("btn-mode-smooth")?.addEventListener("click", () => setMode("sculpt-smooth", "btn-mode-smooth"));
document.getElementById("btn-mode-add-label")?.addEventListener("click", () => setMode("add-label", "btn-mode-add-label"));
document.getElementById("btn-mode-erase")?.addEventListener("click", () => setMode("erase", "btn-mode-erase"));

// Quick Auto Gen Actions
document.getElementById("btn-gen-all")?.addEventListener("click", () => {
    if (!mesh || !elevations) return;
    cellNations = NationEngine.generateNations(mesh, elevations, 8);
    cellProvinces = NationEngine.generateNations(mesh, elevations, 28);
    cities = NationEngine.autoPlaceCities(mesh, elevations, waterFlux, cellNations, 16);

    nationNames.clear();
    const uniqueNations = new Set(Array.from(cellNations).filter(n => n >= 0));
    uniqueNations.forEach(nID => {
        nationNames.set(nID, NationEngine.generateName("nation"));
        nationColors.set(nID, getDefaultColor(nID));
    });

    render();
});

// New Map Generator Modal / Quick Action
document.getElementById("btn-new-world")?.addEventListener("click", () => {
    const preset = (document.getElementById("select-preset") as HTMLSelectElement)?.value || "continents";
    generateNewWorld(preset, Math.random().toString(), 900);
});

// Export JSON
document.getElementById("btn-export-all")?.addEventListener("click", () => {
    if (!mesh) return;
    const data = {
        width: mesh.width,
        height: mesh.height,
        points: Array.from(mesh.points),
        elevations: Array.from(elevations),
        cellNations: Array.from(cellNations),
        cellProvinces: Array.from(cellProvinces),
        cities,
        markers,
        customLabels,
        nationNames: Array.from(nationNames.entries()),
        nationColors: Array.from(nationColors.entries()),
        provinceNames: Array.from(provinceNames.entries())
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "nation-builder-project.json";
    a.click();
});

// Export PNG Image
document.getElementById("btn-export-png")?.addEventListener("click", () => {
    render();
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "fantasy-map.png";
    a.click();
});

// Sliders and View selector
document.getElementById("input-opacity")?.addEventListener("input", (e: any) => {
    politicalOpacity = parseInt(e.target.value) / 100;
    document.getElementById("val-opacity")!.textContent = e.target.value;
    render();
});
document.getElementById("input-active-id")?.addEventListener("input", (e: any) => {
    activeID = parseInt(e.target.value);
    document.getElementById("val-active-id")!.textContent = activeID.toString();
});
document.getElementById("input-brush-size")?.addEventListener("input", (e: any) => {
    brushSize = parseInt(e.target.value);
    document.getElementById("val-brush-size")!.textContent = brushSize.toString();
});
document.getElementById("select-view")?.addEventListener("change", (e: any) => {
    currentView = e.target.value;
    updateLegendUI();
    render();
});
document.getElementById("btn-toggle-ui")?.addEventListener("click", () => {
    document.getElementById("ui-overlay")?.classList.toggle("hidden");
});

// Mouse & Pan Events
canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (currentMode === "drag") {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    } else {
        isDrawing = true;
        handleInteraction(e.clientX - rect.left, e.clientY - rect.top, false);
    }
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (isPanning) {
        panX = (panX + (e.clientX - lastMouseX));
        while (panX < 0) panX += canvas.width;
        panX %= canvas.width;
        panY = Math.max(-canvas.height * 0.5, Math.min(canvas.height * 0.5, panY + (e.clientY - lastMouseY)));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        render();
    } else if (isDrawing) {
        handleInteraction(e.clientX - rect.left, e.clientY - rect.top, true);
    }
});

canvas.addEventListener("mouseup", () => {
    isPanning = false;
    isDrawing = false;
});

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (mesh) {
        mesh.width = window.innerWidth;
        mesh.height = window.innerHeight;
    }
    render();
});

// Initial Setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
generateNewWorld("continents", "12345", 850);
