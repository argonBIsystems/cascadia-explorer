# Cascadia Explorer

Interactive 3D visualization of the Cascadia Subduction Zone — combining real-time seismic data, tectonic models, and scientific research into a single CesiumJS-powered globe.

**Live**: [cascadia-explorer.argonbi.com](https://cascadia-explorer.argonbi.com)

![Cascadia Explorer](https://img.shields.io/badge/status-live-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Real-time Earthquakes** — Live USGS feed with 3D depth positioning and magnitude scaling
- **Slab Geometry** — USGS Slab2 depth contours with labeled isolines
- **Plate Boundaries** — Megathrust, ridge, and transform faults from Bird (2003)
- **GPS Velocity Vectors** — UNAVCO station velocities in ITRF and NAM14 reference frames
- **M9.0 Scenario Modeling** — 30 CSZM9 ShakeMap scenarios with MMI shaking intensity grids
- **Tsunami Propagation** — Animated wave simulation from a full-margin Cascadia rupture
- **Scientific Discoveries** — Annotated research findings with paper references
- **Historical Timeline** — Key events from 8000 BCE to present with camera fly-to
- **Cross-Section View** — Interactive 2D depth profile at any latitude

## Tech Stack

- React 19 + TypeScript 5 + Vite 6
- CesiumJS — 3D globe rendering
- Tailwind CSS 4
- Zustand — state management
- TanStack Query — data fetching
- Python (NumPy, SciPy) — data preprocessing pipeline

## Getting Started

```bash
npm install
npm run dev
```

Requires a [Cesium Ion](https://ion.cesium.com/) token in `.env`:

```
VITE_CESIUM_ION_TOKEN=your_token_here
```

## Data Sources

- [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/) — real-time seismic data
- [USGS Slab2](https://www.sciencebase.gov/catalog/item/5aa1b00ee4b0b1c392e86467) — subduction zone geometry
- [UNAVCO/EarthScope](https://www.unavco.org/) — GPS velocity data
- [Bird (2003)](https://peterbird.name/publications/2003_PB2002/2003_PB2002.htm) — plate boundary model
- [CSZM9 Project](https://www.designsafe-ci.org/) — M9.0 Cascadia earthquake scenarios
- Published tsunami models (Priest et al. 2010, Witter et al. 2013, Gonzalez et al. 2009)

## License

[MIT](LICENSE) — ArgonBI Systems Inc.
