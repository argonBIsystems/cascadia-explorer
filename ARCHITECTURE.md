# Cascadia Explorer — Technical Architecture

**Created**: 2026-02-27
**Status**: Planning

---

## 1. Technology Stack

### Frontend (Primary Application)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **3D Globe** | CesiumJS | Industry standard for geospatial 3D visualization. Free open-source (Apache 2.0). Used by CRESCENT CFM viewer. Handles terrain, 3D primitives, and geospatial coordinate systems natively. |
| **UI Framework** | React 19 | Familiar ecosystem, large component library availability, good CesiumJS integration via `resium` |
| **Build Tool** | Vite | Fast builds, good CesiumJS plugin (`vite-plugin-cesium`), modern ESM support |
| **Styling** | Tailwind CSS 4 | Utility-first, fast iteration, consistent with ArgonBI website stack |
| **State Management** | Zustand | Lightweight, minimal boilerplate, good for layer toggle state and UI controls |
| **Data Fetching** | TanStack Query (React Query) | Caching, background refetching, perfect for the 5-minute earthquake data refresh cycle |
| **Language** | TypeScript | Type safety for complex 3D coordinate math and API response handling |

### Data Preprocessing (Build Pipeline)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Slab2 Processing** | Python (numpy, scipy, netCDF4) | Standard geoscience data processing. Convert GMT grids to web-friendly formats. |
| **Mesh Generation** | Python (trimesh, pyvista) | Generate 3D triangle mesh from slab depth grid |
| **GeoJSON Processing** | Python (geopandas, shapely) | Process fault models, plate boundaries |
| **Terrain Tiles** | Cesium Ion (hosted) or ctb-quantized-mesh | Convert bathymetry GeoTIFF to quantized mesh terrain tiles |

### Hosting & Deployment

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Static Hosting** | Vercel (hobby) | Free tier, auto-deploy from GitHub, good for static sites. Same as ArgonBI website. |
| **Terrain Tiles** | Cesium Ion (free tier) | 500k tiles/month free. Handles global terrain + bathymetry out of the box. |
| **Static Data Assets** | GitHub LFS or CDN | Large preprocessed files (slab mesh, scenario data) |
| **Domain** | TBD | Subdomain of argonbi.com or standalone |

---

## 2. Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   UI Shell    │  │   Layer Panel    │  │   Info Panel     │  │
│  │  (React/TW)   │  │  (Toggle layers) │  │ (Click details)  │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                   │                      │             │
│  ┌──────┴───────────────────┴──────────────────────┴─────────┐  │
│  │                    Zustand Store                            │  │
│  │  - activeLayer[]  - timeRange  - selectedScenario          │  │
│  │  - viewState      - selectedEvent  - referenceFrame        │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────┴────────────────────────────────────┐  │
│  │                  CesiumJS Viewer                            │  │
│  │  ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │  │
│  │  │ Terrain    │ │ Slab     │ │ Quakes    │ │ GPS      │  │  │
│  │  │ Provider   │ │ Entity   │ │ DataSrc   │ │ Vectors  │  │  │
│  │  │ (Ion/GEBCO)│ │ (3D mesh)│ │ (GeoJSON) │ │ (arrows) │  │  │
│  │  └────────────┘ └──────────┘ └───────────┘ └──────────┘  │  │
│  │  ┌────────────┐ ┌──────────┐ ┌───────────┐               │  │
│  │  │ Faults     │ │ Scenario │ │ Tsunami   │               │  │
│  │  │ (GeoJSON)  │ │ Overlay  │ │ Animation │               │  │
│  │  └────────────┘ └──────────┘ └───────────┘               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                Data Layer (TanStack Query)                 │  │
│  │  - fetchEarthquakes()  → USGS API (5-min refresh)        │  │
│  │  - loadSlabMesh()      → Static asset (preprocessed)     │  │
│  │  - loadFaults()        → Static asset (CRESCENT GeoJSON) │  │
│  │  - loadGPSVelocities() → Static asset (preprocessed)     │  │
│  │  - loadScenario(id)    → Static asset (lazy-loaded)      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                   │
         ▼                    ▼                   ▼
  ┌──────────────┐  ┌──────────────┐   ┌──────────────────┐
  │ USGS Quake   │  │ Cesium Ion   │   │ Static Assets    │
  │ API (live)   │  │ Terrain Srv  │   │ (Vercel CDN)     │
  └──────────────┘  └──────────────┘   └──────────────────┘
```

---

## 3. Data Layer Architecture

### 3.1 Static Data (Preprocessed at Build Time)

These are generated by Python scripts in `/scripts/` and output to `/public/data/`:

```
public/data/
├── slab/
│   ├── cascadia-slab-mesh.glb        # 3D slab surface (glTF binary)
│   ├── cascadia-slab-contours.json   # Depth contour lines (GeoJSON)
│   └── cascadia-slab-metadata.json   # Grid bounds, resolution, stats
├── faults/
│   ├── megathrust-trace.json         # Cascadia megathrust surface trace
│   ├── plate-boundaries.json         # JdF, Gorda, Explorer boundaries
│   └── crustal-faults.json           # Major crustal faults (Seattle, etc.)
├── gps/
│   ├── velocity-vectors-nam14.json   # GPS velocities in NAM14 frame
│   └── velocity-vectors-itrf.json    # GPS velocities in ITRF frame
├── scenarios/
│   ├── index.json                    # Scenario metadata (names, descriptions)
│   ├── cszm9-01.json                # Individual scenario ShakeMap data
│   ├── cszm9-02.json
│   └── ...
├── annotations/
│   ├── pioneer-fragment.json         # Discovery annotation data
│   ├── slab-tears.json
│   └── fluid-pathways.json
└── timeline/
    └── events.json                   # Historical timeline event data
```

### 3.2 Live Data (Fetched at Runtime)

| Endpoint | Refresh | Cache Strategy |
|----------|---------|---------------|
| USGS Earthquake Feed | 5 min | staleTime: 5min, gcTime: 30min |
| Cesium Ion Terrain | On-demand (tile requests) | Browser cache + Cesium cache |

### 3.3 Preprocessing Scripts

```
scripts/
├── process_slab2.py          # Convert Slab2 .grd → mesh + contours
├── process_faults.py         # Process CRESCENT CFM → simplified GeoJSON
├── process_gps.py            # Process GAGE velocities → arrow vectors
├── process_scenarios.py      # Process CSZM9 ShakeMaps → overlay data
├── process_bathymetry.py     # (Optional) Process GEBCO for enhanced ocean floor
├── download_data.py          # Download all source datasets
└── requirements.txt          # Python dependencies
```

---

## 4. Component Architecture

### 4.1 React Component Tree

```
<App>
  <CesiumViewer>                    # Main 3D globe
    <TerrainProvider />             # Cesium World Terrain + bathymetry
    <SlabLayer />                   # 3D slab mesh + contours
    <EarthquakeLayer />             # Real-time earthquake points at depth
    <FaultLayer />                  # Plate boundaries + fault lines
    <GPSVectorLayer />              # Velocity arrows
    <ScenarioOverlay />             # ShakeMap scenario display
    <TsunamiOverlay />              # Tsunami propagation animation
    <AnnotationLayer />             # Discovery markers
    <CameraController />            # Manages view state
  </CesiumViewer>
  <ControlPanel>                    # Left sidebar
    <LayerToggles />                # Show/hide data layers
    <TimeRangeSelector />           # Earthquake time filter
    <ScenarioSelector />            # CSZM9 scenario picker
    <ReferenceFrameToggle />        # GPS absolute vs. relative
    <ViewModeToggle />              # Globe vs. 2D
  </ControlPanel>
  <InfoPanel>                       # Right panel / bottom drawer
    <EarthquakeDetails />           # Selected earthquake info
    <ScenarioDetails />             # Selected scenario description
    <CrossSectionView />            # 2D cross-section (Phase 3)
  </InfoPanel>
  <Timeline />                      # Bottom timeline bar (Phase 3)
  <Legend />                        # Color scale legends
  <AboutModal />                    # Project info, credits, data sources
</App>
```

### 4.2 Layer System

Each data layer implements a common interface:

```typescript
interface DataLayer {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  loading: boolean;
  error: string | null;
  phase: 1 | 2 | 3;       // Which delivery phase
  toggle(): void;
  load(): Promise<void>;
  render(viewer: Cesium.Viewer): void;
  destroy(): void;
}
```

Layers are registered in the Zustand store and managed uniformly by the ControlPanel.

---

## 5. 3D Rendering Details

### 5.1 Slab Rendering

The Slab2 data provides a depth grid (lat, lon → depth_km). To render in CesiumJS:

1. **Mesh approach**: Convert depth grid to triangle mesh. Each vertex is positioned at (lon, lat, -depth) in Cartesian3 coordinates using `Cesium.Cartesian3.fromDegrees(lon, lat, -depth * 1000)`.
2. **Material**: Semi-transparent, color-ramped by depth (yellow at shallow → blue at deep).
3. **Contour lines**: Rendered as Cesium Polylines at each depth interval, following the isodepth curves.
4. **Vertical exaggeration**: Optional multiplier on depth for visual clarity (e.g., 2x-5x). Toggle-able.

### 5.2 Earthquake Depth Rendering

Standard earthquake maps plot events as surface circles. We plot at true 3D depth:

1. Convert each earthquake's (lon, lat, depth_km) to Cartesian3 with negative altitude.
2. Render as `Cesium.PointPrimitive` or `Cesium.Billboard` at that 3D position.
3. For earthquakes above the slab: they appear "floating" above the slab surface.
4. For earthquakes on the slab: they cluster on/near the slab surface (validates the model).
5. Size: `radius = Math.pow(10, (mag - 1) / 2) * scaleFactor` (exponential by magnitude).
6. Transparency: Recent events opaque, older events fade.

### 5.3 GPS Vector Rendering

GPS velocities rendered as 3D arrows on the surface:

1. Arrow origin: GPS station position on surface.
2. Arrow direction: velocity azimuth.
3. Arrow length: proportional to velocity magnitude (mm/yr).
4. Arrow color: blue for slow → red for fast.
5. Use `Cesium.Polyline` with `Cesium.PolylineArrowMaterialProperty`.

### 5.4 Vertical Exaggeration

Subduction zone features are very deep (up to ~100km) relative to horizontal extent (~300km). Without exaggeration, the slab appears nearly flat.

- Default: 5x vertical exaggeration
- Slider control: 1x (true scale) to 10x
- Apply to: slab mesh, earthquake depths, contour depths
- Do NOT apply to: surface features, terrain

---

## 6. Performance Strategy

### 6.1 Initial Load Optimization

- **Code splitting**: Lazy-load CesiumJS (it's ~30MB). Show loading screen while Cesium initializes.
- **Progressive data loading**: Load terrain + faults first (fast), then slab mesh, then earthquakes.
- **Asset compression**: gzip/brotli all static JSON/GeoJSON files.
- **Cesium Worker**: CesiumJS uses web workers internally for terrain decoding.

### 6.2 Runtime Performance

- **Level of Detail (LOD)**: Reduce slab mesh resolution when zoomed out.
- **Point clustering**: Cluster earthquake markers when zoomed out, expand on zoom.
- **Temporal culling**: Only render earthquakes in the selected time window.
- **RequestAnimationFrame budgeting**: Prioritize camera movement over data layer updates.
- **WebGL context management**: Monitor GPU memory, unload non-visible layers.

### 6.3 Bundle Size Budget

| Asset | Estimated Size | Loading |
|-------|---------------|---------|
| CesiumJS (core) | ~8 MB gzipped | Lazy, code-split |
| React + UI | ~200 KB | Initial |
| Slab mesh (glTF) | ~2 MB | Lazy |
| Fault GeoJSON | ~500 KB | Lazy |
| GPS vectors | ~200 KB | Lazy |
| Scenario data (each) | ~1 MB | On-demand |

---

## 7. Directory Structure

```
cascadia-explorer/
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── DATA_SOURCES.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── .env.example                    # CESIUM_ION_TOKEN placeholder
├── .gitignore
├── scripts/                        # Python preprocessing
│   ├── requirements.txt
│   ├── download_data.py
│   ├── process_slab2.py
│   ├── process_faults.py
│   ├── process_gps.py
│   └── process_scenarios.py
├── data/                           # Raw source data (gitignored)
│   ├── slab2/
│   ├── crescent-cfm/
│   ├── gage-gps/
│   └── cszm9/
├── public/
│   ├── data/                       # Preprocessed static data
│   │   ├── slab/
│   │   ├── faults/
│   │   ├── gps/
│   │   ├── scenarios/
│   │   └── annotations/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── store/
│   │   └── useAppStore.ts          # Zustand store
│   ├── components/
│   │   ├── viewer/
│   │   │   ├── CesiumViewer.tsx
│   │   │   └── CameraController.tsx
│   │   ├── layers/
│   │   │   ├── SlabLayer.tsx
│   │   │   ├── EarthquakeLayer.tsx
│   │   │   ├── FaultLayer.tsx
│   │   │   ├── GPSVectorLayer.tsx
│   │   │   ├── ScenarioOverlay.tsx
│   │   │   └── TsunamiOverlay.tsx
│   │   ├── controls/
│   │   │   ├── ControlPanel.tsx
│   │   │   ├── LayerToggles.tsx
│   │   │   ├── TimeRangeSelector.tsx
│   │   │   ├── ScenarioSelector.tsx
│   │   │   └── ViewModeToggle.tsx
│   │   ├── info/
│   │   │   ├── InfoPanel.tsx
│   │   │   ├── EarthquakeDetails.tsx
│   │   │   └── ScenarioDetails.tsx
│   │   └── ui/
│   │       ├── Legend.tsx
│   │       ├── LoadingScreen.tsx
│   │       └── AboutModal.tsx
│   ├── hooks/
│   │   ├── useEarthquakes.ts       # TanStack Query hook for USGS API
│   │   ├── useSlabData.ts
│   │   └── useScenarios.ts
│   ├── lib/
│   │   ├── cesium-utils.ts         # Coordinate conversion helpers
│   │   ├── color-scales.ts         # Depth/magnitude color ramps
│   │   └── earthquake-api.ts       # USGS API client
│   └── types/
│       ├── earthquake.ts
│       ├── slab.ts
│       ├── gps.ts
│       └── scenario.ts
└── tests/
    └── ...
```

---

## 8. Development Workflow

1. **Setup**: `npm install` + Python venv for preprocessing scripts
2. **Data Download**: `python scripts/download_data.py` (one-time, downloads raw data to `data/`)
3. **Data Processing**: `python scripts/process_*.py` (generates `public/data/`)
4. **Development**: `npm run dev` (Vite dev server with HMR)
5. **Build**: `npm run build` (production build to `dist/`)
6. **Deploy**: Push to GitHub → Vercel auto-deploy

### Environment Variables

```
VITE_CESIUM_ION_TOKEN=<your-cesium-ion-token>
```

Cesium Ion free tier provides 500k tile requests/month — more than sufficient for a showcase project.

---

## 9. Reference Implementations

These existing projects serve as architectural references:

1. **CRESCENT CFM Web Viewer** — https://github.com/cascadiaquakes/CRESCENT-CFM-WEB
   - CesiumJS + FastAPI
   - 3D fault surface rendering
   - GeoJSON loading patterns
   - Our closest reference

2. **Cesium Sandcastle Examples** — https://sandcastle.cesium.com/
   - 3D point rendering, polylines, terrain providers
   - Entity and Primitive API examples

3. **USGS Earthquake Map** — https://earthquake.usgs.gov/earthquakes/map/
   - 2D reference for earthquake data display patterns
   - API usage patterns
