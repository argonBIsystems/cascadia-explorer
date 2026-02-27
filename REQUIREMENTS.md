# Cascadia Explorer — Requirements Document

**Project**: Cascadia Explorer
**Organization**: ArgonBI Systems Inc.
**Author**: Claude (CTO) & Arnold (CEO)
**Created**: 2026-02-27
**Status**: Planning

---

## 1. Overview

Cascadia Explorer is an interactive 3D web application that visualizes the Cascadia Subduction Zone (CSZ) — the megathrust fault system running from northern California to southern British Columbia. The application combines real-time seismic data, 3D geological models, GPS plate motion data, and earthquake scenario simulations into a single unified visualization.

This is ArgonBI's second open-source showcase project, following [Infernis](https://infernis.ca) (wildfire risk prediction for BC). Where Infernis demonstrates our capabilities in ML-powered environmental risk prediction, Cascadia Explorer demonstrates our capabilities in geospatial data visualization, real-time data integration, and interactive 3D rendering.

### 1.1 Problem Statement

The Cascadia Subduction Zone poses one of the most significant seismic hazards in North America. A full-margin M9.0+ earthquake has a 10-15% probability of occurring in the next 50 years. Despite extensive scientific research and publicly available data, no single tool exists that:

- Renders the subducting slab in true 3D (showing depth beneath the surface)
- Plots real-time earthquakes at their actual 3D depth rather than as 2D surface markers
- Overlays GPS plate convergence vectors showing how the plates are moving
- Allows interactive comparison of USGS rupture scenarios
- Integrates the latest scientific discoveries (Pioneer Fragment, slab tears, fluid pathways)

Cascadia Explorer fills this gap by creating an accessible, scientifically accurate, visually compelling tool that serves both public education and scientific communication.

### 1.2 Target Audience

1. **General public in BC/PNW** — People living in the seismic hazard zone who want to understand the risk
2. **Emergency managers** — Municipal and regional emergency coordinators (same audience as Infernis)
3. **Science communicators & educators** — Teachers, journalists, university courses
4. **Geoscientists** — Researchers who want a quick visual reference or presentation tool
5. **Policy makers** — Government officials making infrastructure and preparedness decisions

### 1.3 Success Criteria

- Live, publicly accessible web application
- Loads and renders within 5 seconds on modern broadband
- Handles 3D interaction smoothly at 30+ FPS on mid-range hardware
- Attracts attention from at least one of: scientific community, emergency management, or media
- Demonstrates ArgonBI's data visualization capabilities for business development

---

## 2. Functional Requirements

### 2.1 Core Visualization (MVP)

#### FR-1: 3D Globe Rendering
- Render an interactive 3D globe or regional view centered on the Cascadia region (40°N to 51°N, -130°W to -121°W)
- Support pan, zoom, rotate, and tilt interactions
- Display ocean floor bathymetry as terrain (not flat blue ocean)
- Display land topography/elevation
- Support both globe view and flat/mercator projection toggle

#### FR-2: Subduction Zone Slab Geometry
- Render the USGS Slab2 Cascadia model as a 3D translucent surface beneath the terrain
- Show depth contours (color-coded by depth: shallow = warm colors, deep = cool colors)
- Display slab strike and dip information on hover/click
- Allow toggling slab visibility on/off
- Show the extent of the subduction zone from Cape Mendocino to northern Vancouver Island

#### FR-3: Real-Time Seismicity
- Fetch and display earthquakes from the USGS Earthquake Catalog API
- Plot earthquakes at their true 3D position (latitude, longitude, AND depth)
- Size markers by magnitude (exponential scaling)
- Color markers by depth (matching slab color scheme for visual correlation)
- Support time range filtering (past 24h, 7d, 30d, 1yr, custom)
- Auto-refresh every 5 minutes for near-real-time updates
- Click on earthquake for details: magnitude, depth, time, location, USGS event page link

#### FR-4: Plate Boundary & Fault Lines
- Display the Cascadia megathrust fault trace on the surface
- Show the Juan de Fuca, Gorda, and Explorer plate boundaries
- Show the San Andreas Fault and Mendocino Fracture Zone for context
- Display transform faults that cut across the Juan de Fuca plate (related to slab tear research)
- Source from USGS Quaternary Fault database and/or CRESCENT Community Fault Model

#### FR-5: GPS Plate Motion Vectors
- Display arrows at GPS station locations showing velocity and direction of ground movement
- Color arrows by velocity magnitude
- Show the convergence rate between the Juan de Fuca plate and North American plate
- Support toggling between absolute motion and relative-to-North-America reference frames
- Source from GAGE/PANGA velocity fields

### 2.2 Scenario Simulation (Phase 2)

#### FR-6: CSZM9 Rupture Scenarios
- Load all 30 USGS CSZM9 M9.0 Cascadia rupture scenarios
- Allow user to select/toggle between scenarios
- Display ShakeMap ground motion intensity as a color overlay on the terrain
- Animate the rupture propagation (if temporal data available)
- Show peak ground acceleration (PGA) values at major cities
- Compare full-margin vs. partial-margin rupture scenarios side by side

#### FR-7: Tsunami Propagation
- Overlay NOAA tsunami simulation data for Cascadia scenarios
- Animate wave propagation across the Pacific
- Show wave height at coastal locations
- Display estimated arrival times at major coastal cities (Seattle, Vancouver, Victoria, Portland, etc.)
- Source from NOAA SIFT propagation database and/or UMich simulation dataset

### 2.3 Educational / Contextual Features (Phase 3)

#### FR-8: Cross-Section View
- Render a 2D cross-section slice through the subduction zone at user-selected latitude
- Show the slab diving beneath the continent
- Plot earthquakes along the cross-section projected onto the plane
- Label the key geological features: oceanic crust, continental crust, mantle wedge, volcanic arc
- Highlight the locked zone, transition zone, and free-slip zone

#### FR-9: Historical Timeline
- Interactive timeline of significant Cascadia events:
  - 1700 M9.0 megathrust earthquake and tsunami
  - Paleoseismic record (~19 events over 10,000 years)
  - 2001 Nisqually earthquake (M6.8)
  - Episodic tremor and slip (ETS) events
  - Recent research milestones (CASIE21, Pioneer Fragment discovery)
- Click on timeline events for narrative descriptions

#### FR-10: Discovery Annotations
- Annotate the locations of recent scientific discoveries on the map:
  - Pioneer Fragment location at the Mendocino Triple Junction
  - Slab tear zones in the northern Juan de Fuca / Explorer plate region
  - Fluid pathway locations from the Feb 2026 UW study
  - Locked vs. creeping fault segments
- Each annotation links to the relevant scientific paper or news article

#### FR-11: "What If" Scenario Builder
- Allow users to select a rupture scenario and see estimated impacts:
  - ShakeMap intensity at their location (input address or click on map)
  - Estimated shaking duration
  - Tsunami arrival time (if coastal)
  - Historical context (how does this compare to 1700?)

---

## 3. Non-Functional Requirements

### NFR-1: Performance
- Initial page load: < 5 seconds on 50 Mbps connection
- 3D rendering: 30+ FPS during interaction on hardware with integrated GPU
- Data layer toggle: < 1 second to show/hide any layer
- Earthquake data refresh: < 2 seconds for API response

### NFR-2: Responsiveness
- Primary target: Desktop browsers (1280px+ width)
- Secondary: Tablet landscape
- Mobile: Graceful degradation — show 2D map view with reduced interactivity
- Touch interaction support for tablets

### NFR-3: Accessibility
- Keyboard navigation for all controls
- Screen reader descriptions for key visual elements
- High contrast mode option
- Alt-text descriptions of geological features

### NFR-4: Browser Support
- Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- WebGL 2.0 required (graceful fallback message if not available)

### NFR-5: Data Freshness
- Earthquake data: Near-real-time (5-minute auto-refresh)
- GPS velocity data: Updated monthly (or as source provides)
- Slab model: Static (update with new Slab2 releases)
- Scenarios: Static (update with new USGS scenario releases)

### NFR-6: Hosting & Infrastructure
- Static frontend deployable to Vercel (hobby tier) or Railway
- No backend server required for MVP (client-side API calls to USGS/NOAA)
- Data preprocessing pipeline can run as build-time scripts
- Total bundle size target: < 5 MB initial load (lazy-load heavy data layers)

---

## 4. Data Sources

See [DATA_SOURCES.md](DATA_SOURCES.md) for comprehensive data source documentation including APIs, formats, and access details.

### Summary of Primary Sources

| Data | Source | Format | Update Frequency |
|------|--------|--------|-----------------|
| Slab geometry | USGS Slab2 | NetCDF/CSV | Static (rare updates) |
| Real-time earthquakes | USGS FDSNWS API | GeoJSON | Real-time |
| Fault model | CRESCENT CFM | GeoJSON | Periodic |
| GPS velocities | GAGE/PANGA | CSV/JSON | Monthly |
| Bathymetry | GEBCO | GeoTIFF | Annual |
| Rupture scenarios | USGS CSZM9 | ShakeMap XML/GeoJSON | Static |
| Tsunami simulations | NOAA SIFT / UMich | NetCDF | Static |
| Topography | Mapbox/CesiumIon terrain | Tiles | Continuous |

---

## 5. Phased Delivery Plan

### Phase 1: MVP (Target: 1-2 weeks)
- 3D globe with bathymetry and topography (FR-1)
- Slab2 geometry rendered in 3D (FR-2)
- Real-time earthquake overlay at depth (FR-3)
- Plate boundaries and major faults (FR-4)
- Basic UI: layer toggles, time filter, info panel

### Phase 2: Scenarios & Motion (Target: 2-3 weeks after MVP)
- GPS velocity vectors (FR-5)
- CSZM9 rupture scenario viewer (FR-6)
- Tsunami propagation animation (FR-7)

### Phase 3: Education & Polish (Target: 3-4 weeks after MVP)
- Cross-section view (FR-8)
- Historical timeline (FR-9)
- Discovery annotations (FR-10)
- "What If" scenario builder (FR-11)
- Performance optimization
- Mobile graceful degradation

### Phase 4: Public Launch
- Custom domain (cascadia-explorer.argonbi.com or similar)
- ArgonBI website integration
- Social media / LinkedIn announcement
- README and contributor documentation for open source

---

## 6. Out of Scope

- Real-time early warning system (this is a visualization tool, not an alert system)
- Original scientific research or modeling (we visualize existing data)
- Earthquake prediction (we show probabilities and scenarios, not predictions)
- Mobile-native apps (web only)
- User accounts or saved preferences (fully client-side, no auth)
- Backend API development (all data comes from public APIs or preprocessed static files)

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 3D performance issues on low-end hardware | Medium | High | Progressive loading, LOD system, 2D fallback |
| USGS API rate limiting | Low | Medium | Client-side caching, fallback to hourly snapshots |
| Large data files (bathymetry, slab model) | Medium | Medium | Tile-based loading, WebWorker processing, CDN hosting |
| CesiumJS learning curve | Medium | Low | CRESCENT CFM Viewer as reference implementation |
| Scope creep into Phase 2/3 features | High | Medium | Strict MVP focus, feature flags for phased rollout |

---

## 8. Competitive Landscape

| Existing Tool | What It Does | What We Do Better |
|--------------|-------------|-------------------|
| USGS Earthquake Map | 2D earthquake map | 3D depth rendering, slab geometry, GPS vectors |
| CRESCENT CFM Viewer | 3D fault model viewer | Live seismicity, GPS data, scenario comparison, public-facing UX |
| PNSN Interactive Map | Regional seismic monitoring | 3D visualization, scenario simulation, educational narrative |
| Temblor.net | Seismic hazard maps | Free, open-source, 3D, Cascadia-focused depth |

---

## 9. Naming & Branding

**Project Name**: Cascadia Explorer
**Tagline**: "Visualizing the seismic forces beneath the Pacific Northwest"
**Repo Name**: `cascadia-explorer`
**Domain**: TBD (cascadia-explorer.argonbi.com or cascadiaexplorer.com)
**License**: MIT (open source)
