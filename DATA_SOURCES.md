# Cascadia Explorer — Data Sources Reference

**Last Updated**: 2026-02-27

This document catalogs all data sources used by Cascadia Explorer, including API endpoints, data formats, access methods, and preprocessing requirements.

---

## 1. Earthquake Data

### 1.1 USGS Earthquake Catalog API (FDSNWS)

**Purpose**: Real-time and historical earthquake events
**Access**: Public REST API, no authentication required
**Rate Limits**: Reasonable use policy (~20 requests/minute)
**Format**: GeoJSON, CSV, QuakeML

**Base URL**: `https://earthquake.usgs.gov/fdsnws/event/1/`

**Key Endpoints**:

```
# Query earthquakes in Cascadia region, past 30 days, M2.5+
GET https://earthquake.usgs.gov/fdsnws/event/1/query
  ?format=geojson
  &starttime=2026-01-27
  &endtime=2026-02-27
  &minlatitude=40
  &maxlatitude=51
  &minlongitude=-130
  &maxlongitude=-121
  &minmagnitude=2.5

# All M1.0+ for detailed regional view
GET https://earthquake.usgs.gov/fdsnws/event/1/query
  ?format=geojson
  &starttime=2025-02-27
  &endtime=2026-02-27
  &minlatitude=40
  &maxlatitude=51
  &minlongitude=-130
  &maxlongitude=-121
  &minmagnitude=1.0
```

**Response Fields Used**:
- `geometry.coordinates` — [longitude, latitude, depth_km]
- `properties.mag` — Magnitude
- `properties.time` — Epoch milliseconds
- `properties.place` — Human-readable location
- `properties.url` — Link to USGS event page
- `properties.type` — Event type (earthquake, quarry blast, etc.)

**Preprocessing**: None — use GeoJSON directly. Depth is in km (positive downward).

### 1.2 USGS Real-Time GeoJSON Feeds

**Purpose**: Pre-built feeds optimized for real-time applications
**Access**: Static GeoJSON files, updated every minute
**Format**: GeoJSON

**Endpoints**:
```
# All M2.5+ past day (updated every minute)
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson

# All M2.5+ past week
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson

# All M2.5+ past month
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson

# All M1.0+ past day (more events, larger response)
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson

# Significant earthquakes past month
https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson
```

**Note**: These feeds are global. Client-side filtering by bounding box is needed for Cascadia region.

---

## 2. Slab Geometry

### 2.1 USGS Slab2 Model

**Purpose**: 3D geometry of the subducting Cascadia slab (depth contours, strike, dip)
**Access**: Direct download from USGS/GitHub
**Format**: CSV (lat, lon, depth), NetCDF (gridded), GeoJSON (contours)
**Update Frequency**: Rare (last major update: 2018, minor revisions ongoing)

**Data Repository**:
- GitHub: https://github.com/usgs/slab2
- USGS Data: https://www.usgs.gov/data/slab2-a-comprehensive-subduction-zone-geometry-model
- ScienceBase: https://doi.org/10.5066/F7PV6JNV

**Cascadia-Specific Files**:
```
cas_slab2_dep_02.24.18.grd    # Depth grid (GMT format)
cas_slab2_str_02.24.18.grd    # Strike grid
cas_slab2_dip_02.24.18.grd    # Dip grid
cas_slab2_thk_02.24.18.grd    # Thickness grid
cas_slab2_unc_02.24.18.grd    # Uncertainty grid
cas_slab2_clp_02.24.18.csv    # Slab clip outline (lat, lon)
```

**Preprocessing Required**:
1. Convert GMT .grd files to GeoJSON or a 3D mesh format (e.g., glTF)
2. Resample grid to manageable resolution for web rendering (~0.1° spacing)
3. Generate depth contour lines at regular intervals (10km, 20km, 30km, etc.)
4. Convert depth values to 3D coordinates for CesiumJS rendering (depth below surface → Cartesian3)
5. Generate triangle mesh for translucent slab surface

**Python libraries for preprocessing**: `netCDF4`, `scipy.interpolate`, `trimesh`, `pyvista`

### 2.2 CRESCENT Community Fault Model (CFM)

**Purpose**: 3D non-planar fault surfaces for the entire Cascadia region
**Access**: GitHub repository + web viewer
**Format**: GeoJSON, GeoPackage, KML
**Update Frequency**: Active development (cascadiaquakes research group)

**Repository**: https://github.com/cascadiaquakes/CRESCENT-CFM
**Web Viewer**: https://cascadiaquakes.org/cfm/
**Viewer Source**: https://github.com/cascadiaquakes/CRESCENT-CFM-WEB

**What It Includes**:
- Megathrust fault surface
- Crustal faults (Seattle Fault, Tacoma Fault, etc.)
- Slab interface geometry
- Fault metadata (slip rate, last event, etc.)

**Preprocessing**: Minimal — GeoJSON can be loaded directly into CesiumJS. The CFM web viewer source code is a valuable reference for how to render these in Cesium.

---

## 3. GPS / Geodetic Data

### 3.1 GAGE Facility GPS Velocity Fields

**Purpose**: Post-processed GPS station velocities showing plate convergence and crustal deformation
**Access**: Public download from EarthScope/UNAVCO
**Format**: CSV (station, lat, lon, velocity_east, velocity_north, uncertainty)
**Update Frequency**: ~Annually (2025 release available)

**Data Portal**: https://www.unavco.org/data/gps-gnss/gps-gnss.html
**Velocity Field Products**: https://www.unavco.org/data/gps-gnss/derived-products/derived-products.html

**Key Fields**:
- Station ID
- Latitude, Longitude
- East velocity (mm/yr)
- North velocity (mm/yr)
- Vertical velocity (mm/yr)
- Uncertainties for each component

**Reference Frames Available**:
- ITRF2014 (absolute motion)
- NAM14 (relative to stable North America — best for showing convergence)

**Preprocessing**:
1. Filter to Cascadia region stations
2. Convert mm/yr velocities to arrow vectors for visualization
3. Scale arrows for visual clarity (velocity magnitudes range from ~5-45 mm/yr)

### 3.2 PANGA (Pacific NW Geodetic Array)

**Purpose**: Real-time GPS time series from ~350 stations in the Pacific Northwest
**Access**: Public web interface + data download
**URL**: https://www.geodesy.org/realtime/

**Preprocessing**: Time series data would need aggregation into velocity vectors. Use GAGE velocity products instead for static display; PANGA for real-time anomaly detection (Phase 3+).

### 3.3 NASA CDDIS GNSS Products

**Purpose**: Historical GPS velocity solutions, coseismic offsets, ETS event catalogs, strain rate grids
**Access**: Public (NASA EarthData login may be required)
**URL**: https://cddis.nasa.gov/Data_and_Derived_Products/GNSS/MEaSUREs_products.html

**Key Datasets**:
- Station velocities since 1992
- Strain rate grids (shows where deformation is concentrated)
- Episodic Tremor and Slip (ETS) event catalog with dates and locations

---

## 4. Bathymetry / Ocean Floor Terrain

### 4.1 GEBCO (General Bathymetric Chart of the Oceans)

**Purpose**: Global ocean floor topography
**Access**: Public download, WMS/WMTS tiles
**Format**: GeoTIFF, NetCDF (gridded), WMS tiles
**Resolution**: 15 arc-second (~450m)
**URL**: https://www.gebco.net/data_and_products/gridded_bathymetry_data/

**Preprocessing**:
1. Clip to Cascadia region
2. Convert to terrain tiles for CesiumJS (Quantized Mesh format) or use as elevation overlay
3. Alternatively, use Cesium Ion to host and serve terrain tiles

### 4.2 USGS-NOAA Multibeam Bathymetry (Cascadia Margin)

**Purpose**: High-resolution (30m) ocean floor mapping of the Cascadia margin specifically
**Access**: USGS PCMSC data release
**Format**: GeoTIFF
**URL**: https://www.usgs.gov/centers/pcmsc/science/2019-usgs-noaa-multibeam-bathymetry

**Note**: Much higher resolution than GEBCO but only covers the immediate margin. Best used as an overlay in detailed views.

### 4.3 CesiumJS / Mapbox Terrain (Alternative)

For simplicity, CesiumJS includes built-in terrain providers:
- **Cesium World Terrain** (via Cesium Ion): Includes bathymetry. Free tier available with token.
- **Mapbox Terrain**: If using deck.gl/Mapbox instead of CesiumJS.

**Recommendation**: Use Cesium World Terrain for MVP to avoid preprocessing. Use GEBCO/USGS data for enhanced ocean floor detail in later phases.

---

## 5. Earthquake Scenario Data

### 5.1 USGS CSZM9 Scenario Catalog

**Purpose**: 30 pre-computed M9.0 Cascadia rupture scenarios with ShakeMaps
**Access**: Public download from USGS
**Format**: ShakeMap XML, GeoJSON, shapefiles, grid data
**URL**: https://earthquake.usgs.gov/scenarios/catalog/cszm9/

**Scenarios Include**:
- 30 variations of M9.0 rupture (different rupture patterns, slip distributions)
- Each includes: PGA, PGV, MMI (Modified Mercalli Intensity), spectral acceleration
- Available at multiple percentiles (2nd, 16th, 50th, 84th, 98th)

**Key Scenario Types**:
- Full-margin rupture (entire 1,100 km)
- Southern segment only
- Northern segment only
- Various slip concentration patterns

**Preprocessing**:
1. Download ShakeMap grids for each scenario
2. Convert to GeoJSON polygons or raster tiles for map overlay
3. Extract PGA/MMI values at major city locations
4. Generate comparison data structure (scenario metadata + key metrics)

### 5.2 USGS Cascadia Subduction Zone Database

**Purpose**: Comprehensive compiled database of geologic, paleoseismic, geophysical, and instrumental data
**Access**: ScienceBase download
**Format**: ArcGIS shapefiles, raster images, CSV
**URL**: https://www.sciencebase.gov/catalog/item/623cf2a6d34e915b67d47586

**What It Includes**:
- Paleoseismic site locations (turbidite records)
- Coastal subsidence data
- Instrumental earthquake catalog
- Geophysical survey lines
- GPS velocity data
- Thermal models

---

## 6. Tsunami Simulation Data

### 6.1 NOAA Cascadia Simulated Event

**Purpose**: Full M9.0 Cascadia tsunami simulation results
**Access**: Public
**URL**: https://nctr.pmel.noaa.gov/cascadia_simulated/

**Includes**:
- Sea level time series at numerous coastal locations
- Propagation animation frames
- Maximum wave height maps

### 6.2 NOAA SIFT Propagation Database

**Purpose**: Pre-computed tsunami propagation unit sources
**Access**: OpenDAP (programmatic access to NetCDF)
**Format**: NetCDF
**URL**: https://nctr.pmel.noaa.gov/propagation-database.html

**Preprocessing**: Combine unit sources corresponding to Cascadia rupture scenarios. Complex — defer to Phase 2.

### 6.3 University of Michigan Cascadia Tsunami Dataset

**Purpose**: Simulation results for multiple Cascadia rupture scenarios
**Access**: Deep Blue Data (UMich repository)
**Format**: NetCDF
**URL**: https://doi.org/10.7302/xe96-3z26

**Preprocessing**: Extract time-series wave height grids, convert to animation frames.

---

## 7. Plate Boundary & Tectonic Reference Data

### 7.1 USGS Quaternary Faults Database

**Purpose**: Active fault traces in the US
**Access**: Public download + WMS
**Format**: Shapefile, KML, WMS
**URL**: https://www.usgs.gov/programs/earthquake-hazards/faults

### 7.2 Peter Bird's Plate Boundary Dataset

**Purpose**: Global tectonic plate boundaries
**Access**: Public
**Format**: Various (commonly available as GeoJSON conversions)
**Reference**: Bird, P. (2003) — widely used in geoscience visualization

### 7.3 Natural Earth Data

**Purpose**: Tectonic plate boundaries (simplified, cartographic quality)
**Access**: Public
**Format**: Shapefile, GeoJSON
**URL**: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-tectonic/

---

## 8. API Usage Summary

| API | Auth | Rate Limit | CORS | Format |
|-----|------|-----------|------|--------|
| USGS Earthquake (FDSNWS) | None | ~20 req/min | Yes | GeoJSON |
| USGS Real-time Feeds | None | None (static files) | Yes | GeoJSON |
| Cesium Ion | Token (free tier) | Generous | Yes | Tiles |
| GEBCO WMS | None | Reasonable use | Yes | WMS |
| NOAA SIFT OpenDAP | None | Reasonable use | Varies | NetCDF |

---

## 9. Data Pipeline Overview

```
[Build Time]                          [Runtime (Client)]

USGS Slab2 (.grd) ──→ Python ──→
  Convert to mesh/GeoJSON
                                      USGS Earthquake API ──→ GeoJSON ──→ 3D Plot
GAGE GPS velocities ──→ Process ──→
  Filter, compute arrows
                                      Cesium Ion Terrain ──→ 3D Globe
CSZM9 Scenarios ──→ Process ──→
  Extract grids, convert formats

GEBCO Bathymetry ──→ Tile ──→
  Generate terrain tiles

CRESCENT CFM ──→ Validate ──→
  (GeoJSON, use directly)
```

**Build-time preprocessing** generates static assets deployed with the app.
**Runtime API calls** fetch live earthquake data only.
