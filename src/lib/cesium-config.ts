import { Ion } from 'cesium';

export function initCesium() {
  Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
}

// Cesium World Bathymetry (2426648) with fallback to Cesium World Terrain (1)
export const BATHYMETRY_TERRAIN_ASSET_ID = 2426648;
export const FALLBACK_TERRAIN_ASSET_ID = 1;
