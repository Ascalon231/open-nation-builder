export enum BiomeType {
    ABYSS, OCEAN, SHALLOW, 
    ICE, TUNDRA, TAIGA, 
    GRASSLAND, SHRUBLAND, TEMPERATE_FOREST, TEMPERATE_RAINFOREST,
    DESERT, SAVANNA, TROPICAL_RAINFOREST, TROPICAL_SEASONAL_FOREST,
    MARSH
}

export class BiomeEngine {
    /**
     * Get Biome based on Whittaker diagram (Temp vs Moisture)
     * t: 0 (cold) to 1 (hot)
     * m: 0 (dry) to 1 (wet)
     * h: elevation
     */
    public static getBiome(h: number, t: number, m: number): BiomeType {
        if (h <= 0.15) return BiomeType.ABYSS;
        if (h <= 0.45) return BiomeType.OCEAN;
        if (h <= 0.5) return BiomeType.SHALLOW;

        // Ice/Glacier at extreme cold
        if (t < 0.15) return BiomeType.ICE;

        // Marsh logic: Lowland + Very Wet
        if (h < 0.6 && m > 0.8) return BiomeType.MARSH;

        // Whittaker Matrix
        if (t < 0.3) {
            if (m < 0.33) return BiomeType.TUNDRA;
            return BiomeType.TAIGA;
        } 
        
        if (t < 0.7) {
            if (m < 0.16) return BiomeType.DESERT; // Cold desert
            if (m < 0.33) return BiomeType.GRASSLAND;
            if (m < 0.66) return BiomeType.TEMPERATE_FOREST;
            return BiomeType.TEMPERATE_RAINFOREST;
        }

        // Hot Zones
        if (m < 0.16) return BiomeType.DESERT; // Hot desert
        if (m < 0.33) return BiomeType.SAVANNA;
        if (m < 0.66) return BiomeType.TROPICAL_SEASONAL_FOREST;
        return BiomeType.TROPICAL_RAINFOREST;
    }

    public static getBiomeColor(type: BiomeType): string {
        switch (type) {
            case BiomeType.ABYSS: return "#000033";
            case BiomeType.OCEAN: return "#1a3399";
            case BiomeType.SHALLOW: return "#2244aa";
            case BiomeType.ICE: return "#ffffff";
            case BiomeType.TUNDRA: return "#999999";
            case BiomeType.TAIGA: return "#556644";
            case BiomeType.GRASSLAND: return "#889977";
            case BiomeType.SHRUBLAND: return "#a9ba9d";
            case BiomeType.TEMPERATE_FOREST: return "#448844";
            case BiomeType.TEMPERATE_RAINFOREST: return "#225522";
            case BiomeType.DESERT: return "#d2b48c";
            case BiomeType.SAVANNA: return "#c2b280";
            case BiomeType.TROPICAL_SEASONAL_FOREST: return "#337733";
            case BiomeType.TROPICAL_RAINFOREST: return "#004400";
            case BiomeType.MARSH: return "#2f4f4f";
            default: return "#333333";
        }
    }

    public static getBiomeName(type: BiomeType): string {
        return BiomeType[type].replace("_", " ");
    }
}
