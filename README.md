# 🗺️ OpenNation Builder

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![HTML5 Canvas](https://img.shields.io/badge/HTML5_Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**An open-source, editable procedural fantasy map & geopolitical nation builder toolkit for writers, game developers, TTRPG dungeon masters, and cartographers.**

[✨ Features](#-key-features) • [🚀 Quickstart](#-quickstart) • [🎨 Themes](#-visual-themes) • [🏛️ Architecture](#%EF%B8%8F-project-architecture) • [📄 License](#-license)

</div>

---

## 🌟 Overview

**OpenNation Builder** is a modern, lightweight web application designed to generate, simulate, and manually edit fantasy worlds, sovereign nations, provinces, and settlements.

Built using Voronoi Delaunay tessellation with horizontal cylindrical wrap-around, it combines physically-inspired climate and erosion models with intuitive painting, live inspection, and customizable themes.

---

## ✨ Key Features

### 1. 🎨 Dual-Mode: Procedural Generation & Manual Editing
- **Procedural Generation**: Instantly generate realistic worlds with continents, archipelagos, or supercontinents using periodic simplex noise and Whittaker biome diagrams.
- **Manual Terrain Sculpting**:
  - ⛰️ **Raise Land**: Form mountains, hills, or emergent islands.
  - 🌊 **Lower Land**: Carve seas, gulfs, and lakes.
  - 〰️ **Smooth**: Soften elevation gradients.

### 2. 🏛️ Geopolitical & Nation Management
- **Autonomous Expansion (BFS Flood-Fill)**: Procedurally partitions continents into nations and provinces based on seed distribution.
- **Paint Borders**: Custom paint brush to allocate cells to specific Nation or Province IDs.
- **Intelligent City Placement**: Algorithms score optimal settlement locations based on river confluence (*water flux*), coastal proximity, and terrain slope.
- **Capital & Settlement Customization**: Distinguishes kingdoms' capitals (👑) from standard cities (🏙️) with procedural name generation.

### 3. ⚡ Live Inspector & Worldbuilding Layer
- Click any polygon cell on the map to inspect and edit in real-time:
  - Custom **Nation Name & Color Picker**
  - **Province Name**
  - **City Name & Capital Status**
  - Simulated **Elevation (m), Biome Type, Temperature (°C), and Moisture (%)**

### 4. 🌐 Seamless Horizontal Cylindrical Wrapping
- Full spherical wrap-around on the X-axis: pan endlessly without edge seams or boundary clipping.

### 5. 💾 Multi-Format Export & Import
- **Save Project (JSON)**: Preserves complete world mesh, heights, geopolitics, names, and custom labels.
- **Export Snapshot (PNG)**: High-resolution raster export of the active view.
- **Import World Files**: Open and edit previously saved map projects.

---

## 🎨 Visual Themes

Switch visual styles instantly to match your worldbuilding aesthetic:

| Theme | Description |
| :--- | :--- |
| **🌿 Natural Biomes** | Whittaker ecosystem classification (Ice, Tundra, Taiga, Forest, Rainforest, Desert, Savanna, Marsh). |
| **📜 Fantasy Parchment** | Classic antique cartography style with sepia tones and pen-and-ink contours. |
| **🏔️ Topographic Elevation** | Hypsometric color tinting from deep trenches to alpine peaks with hillshading relief. |
| **🌐 Modern Political Atlas** | High-contrast geopolitics with crisp territory boundaries. |
| **🕶️ Cyberpunk Neon Grid** | Dark aesthetic with neon-cyan coastlines and holographic grids. |
| **🖨️ Architecture Blueprint** | Clean monochrome blueprint styling. |
| **🔥 Temperature & 💧 Moisture** | Geophysical distribution overlays for realistic climate planning. |
| **💨 Wind Circulation** | Global atmospheric circulation vector field. |

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation & Run

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/open-nation-builder.git
cd open-nation-builder

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Build for production
npm run build
```

Once started, open your browser at the local URL (usually `http://localhost:5173`).

---

## 🏛️ Project Architecture

```text
src/
├── engine/
│   ├── MeshEngine.ts      # Delaunay triangulation, Voronoi diagram & Lloyd relaxation
│   ├── NationEngine.ts    # Geopolitical BFS flood-fill, city placement & name generator
│   ├── BiomeEngine.ts     # Whittaker 15-biome matrix & color palette
│   ├── ClimateEngine.ts   # Hadley cells, wind belts, temperature & rain shadow simulation
│   └── ErosionEngine.ts   # Water flux accumulation, thermal & hydraulic erosion
├── ui/
│   └── CanvasRenderer.ts  # Multi-theme HTML5 canvas rendering & hillshading
├── utils/
│   └── Noise.ts           # Periodic Simplex & fBm noise generator
├── main.ts                # Application state, mouse interactions & UI bindings
└── index.html             # Application markup and styling
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Please check [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to use it in your personal, educational, or commercial worldbuilding projects!
