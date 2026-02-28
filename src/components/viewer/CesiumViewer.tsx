import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Math as CesiumMath,
  Color,
  CesiumTerrainProvider,
} from 'cesium';
import { BATHYMETRY_TERRAIN_ASSET_ID, FALLBACK_TERRAIN_ASSET_ID } from '../../lib/cesium-config';

interface CesiumViewerProps {
  onReady?: (viewer: Viewer) => void;
}

export default function CesiumViewer({ onReady }: CesiumViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      scene3DOnly: true,
      skyBox: false,
      orderIndependentTranslucency: true,
    });

    // Dark background matching our UI
    const bgColor = Color.fromCssColorString('#080c14');
    viewer.scene.backgroundColor = bgColor;
    viewer.scene.globe.baseColor = bgColor;

    // Disable sky atmosphere for clean dark look
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = false;
    }

    // Disable depth testing so subsurface features (earthquakes at depth,
    // slab contours) are visible through the terrain
    viewer.scene.globe.depthTestAgainstTerrain = false;

    // Load terrain: try Bathymetry first, fall back to World Terrain
    CesiumTerrainProvider.fromIonAssetId(BATHYMETRY_TERRAIN_ASSET_ID)
      .catch(() => CesiumTerrainProvider.fromIonAssetId(FALLBACK_TERRAIN_ASSET_ID))
      .then((terrainProvider) => {
        if (!viewer.isDestroyed()) {
          viewer.terrainProvider = terrainProvider;
        }
      });

    // Set initial camera: centered on Cascadia coastline, framing
    // the Juan de Fuca plate (offshore) and volcanic arc (onshore)
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(-126.1, 31.7, 1850000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-55),
        roll: 0,
      },
      duration: 0, // Instant on load
    });

    viewerRef.current = viewer;

    // Wait for terrain tiles to load before signaling ready,
    // so the globe looks good when the loading screen fades.
    let readyFired = false;
    const fireReady = () => {
      if (readyFired || viewer.isDestroyed()) return;
      readyFired = true;
      onReady?.(viewer);
    };

    const removeListener = viewer.scene.globe.tileLoadProgressEvent.addEventListener(
      (remaining: number) => {
        if (remaining === 0) {
          fireReady();
          removeListener();
        }
      },
    );

    // Fallback: fire ready after 4s even if tiles aren't done (slow connections)
    const fallbackTimer = setTimeout(fireReady, 4000);

    return () => {
      clearTimeout(fallbackTimer);
      if (!readyFired) removeListener();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [onReady]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}
