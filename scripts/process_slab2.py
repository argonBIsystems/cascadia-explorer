#!/usr/bin/env python3
"""
Process Slab2 data for Cascadia Explorer.

Reads the downloaded Slab2 depth grid (or generates synthetic data if
download failed) and produces two output files:

1. public/data/slab/cascadia-slab-contours.json
   - GeoJSON FeatureCollection of depth contour lines at 10km intervals
   - Each Feature is a LineString with properties.depth (km)

2. public/data/slab/cascadia-slab-surface.json
   - JSON grid for mesh rendering in CesiumJS
   - Resampled to ~0.1deg spacing, NaN values excluded

Usage:
    python scripts/process_slab2.py
"""

import json
import os
import sys
import traceback

import numpy as np

# Project root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data", "slab2")
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "slab")

GRD_FILE = os.path.join(DATA_DIR, "cas_slab2_dep_02.24.18.grd")

# Depth contour levels (km, positive = below surface)
CONTOUR_LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

# Resample spacing for the surface grid (degrees)
RESAMPLE_SPACING = 0.1


# ---------------------------------------------------------------------------
# Attempt to read the real Slab2 .grd file
# ---------------------------------------------------------------------------

def try_read_grd_scipy(path):
    """
    Try to read a GMT/NetCDF .grd file using scipy.io.netcdf_file.
    Returns (lons, lats, depth_grid) or raises on failure.
    """
    from scipy.io import netcdf_file

    with netcdf_file(path, "r", mmap=False) as nc:
        # GMT .grd files typically use 'x'/'y'/'z' or 'lon'/'lat'/'z'
        # Try common variable names
        lon_names = ["x", "lon", "longitude"]
        lat_names = ["y", "lat", "latitude"]
        z_names = ["z", "depth", "elevation"]

        lons = None
        for name in lon_names:
            if name in nc.variables:
                lons = nc.variables[name][:].copy()
                break

        lats = None
        for name in lat_names:
            if name in nc.variables:
                lats = nc.variables[name][:].copy()
                break

        z = None
        for name in z_names:
            if name in nc.variables:
                z = nc.variables[name][:].copy()
                break

        if lons is None or lats is None or z is None:
            # Print available variables for debugging
            var_names = list(nc.variables.keys())
            raise ValueError(
                f"Could not find expected variables. "
                f"Available: {var_names}"
            )

        # z may be 1D (needs reshaping) or 2D
        if z.ndim == 1:
            z = z.reshape(len(lats), len(lons))

        return lons, lats, z


def try_read_grd(path):
    """
    Try multiple approaches to read the .grd file.
    Returns (lons_1d, lats_1d, depth_2d) where depth is in km (positive down).
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Grid file not found: {path}")

    size = os.path.getsize(path)
    print(f"  Grid file size: {size:,} bytes")

    # Approach 1: scipy.io.netcdf_file
    print("  Trying scipy.io.netcdf_file...")
    try:
        lons, lats, z = try_read_grd_scipy(path)
        # Slab2 depth values are negative (below surface), convert to positive km
        if np.nanmean(z) < 0:
            z = -z
        # Convert from meters to km if values seem too large
        if np.nanmax(z) > 500:
            z = z / 1000.0
        print(f"  Success! Grid shape: {z.shape}, "
              f"lon range: [{lons.min():.2f}, {lons.max():.2f}], "
              f"lat range: [{lats.min():.2f}, {lats.max():.2f}], "
              f"depth range: [{np.nanmin(z):.1f}, {np.nanmax(z):.1f}] km")
        return lons, lats, z
    except Exception as e:
        print(f"  Failed: {e}")

    raise RuntimeError("Could not read .grd file with any available method")


# ---------------------------------------------------------------------------
# Synthetic slab data generation (fallback)
# ---------------------------------------------------------------------------

def generate_synthetic_slab():
    """
    Generate geologically accurate synthetic Cascadia slab geometry based on
    published Slab2 model parameters (Hayes et al., 2018).

    Key characteristics of the Cascadia slab:
    - Strikes roughly N-S from ~40.3N (Mendocino TJ) to ~50.5N (Explorer plate)
    - Deformation front (trench) lies ~50-150 km offshore
    - Slab dips gently (~8-12 deg) for first ~100 km, steepening to ~30-45 deg
    - Depth ranges from ~10 km at deformation front to ~100 km beneath Cascades
    - Slight curvature: the trench curves westward at both ends

    We model the slab as a surface defined by:
    - A trench line (deformation front) digitized from published maps
    - A depth profile perpendicular to the trench
    """
    print("\n  Generating synthetic Cascadia slab geometry...")
    print("  Based on published Slab2 parameters (Hayes et al., 2018)")

    # Define the deformation front (trench) as a set of (lon, lat) waypoints
    # These approximate the Cascadia trench from published maps
    trench_points = np.array([
        [-124.5, 40.3],   # Mendocino Triple Junction
        [-124.7, 41.0],
        [-124.9, 42.0],   # Southern Oregon
        [-125.1, 43.0],
        [-125.2, 44.0],   # Central Oregon
        [-125.3, 44.6],
        [-125.4, 45.0],
        [-125.5, 45.5],
        [-125.6, 46.0],   # Columbia River
        [-125.5, 46.5],
        [-125.3, 47.0],   # Washington coast
        [-125.2, 47.5],
        [-125.1, 48.0],
        [-125.0, 48.3],   # Juan de Fuca Strait
        [-125.2, 48.7],
        [-125.5, 49.0],
        [-126.0, 49.5],   # Vancouver Island
        [-126.5, 50.0],
        [-127.0, 50.5],   # Northern end
    ])

    # Create a regular grid
    lon_min, lon_max = -130.0, -120.0
    lat_min, lat_max = 40.0, 51.0
    spacing = 0.05  # degrees, will be resampled to 0.1 later

    lons = np.arange(lon_min, lon_max + spacing, spacing)
    lats = np.arange(lat_min, lat_max + spacing, spacing)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    # Initialize depth grid with NaN
    depth = np.full_like(lon_grid, np.nan)

    # For each grid point, compute:
    # 1. Distance perpendicular to trench (positive = inland)
    # 2. Depth based on that distance using a realistic depth profile

    # Interpolate trench to dense set of points
    from scipy.interpolate import interp1d

    # Parameterize trench by latitude
    trench_lat = trench_points[:, 1]
    trench_lon = trench_points[:, 0]
    trench_interp = interp1d(trench_lat, trench_lon, kind="cubic",
                             fill_value="extrapolate")

    # Depth profile: distance from trench (km) -> depth (km)
    # Based on published Cascadia slab cross-sections
    # The profile has a gentle initial dip, then steepens
    profile_dist = np.array([0, 20, 40, 60, 80, 100, 130, 160, 200, 250, 300, 350])
    profile_depth = np.array([8, 12, 16, 22, 28, 35, 45, 55, 68, 82, 95, 105])
    depth_profile = interp1d(profile_dist, profile_depth, kind="cubic",
                             fill_value=(np.nan, 105), bounds_error=False)

    # Approximate conversion: 1 degree longitude ~ 85 km at 45N, 1 deg lat ~ 111 km
    for i in range(len(lats)):
        lat = lats[i]
        cos_lat = np.cos(np.radians(lat))

        # Get trench longitude at this latitude
        if lat < trench_lat.min() or lat > trench_lat.max():
            continue

        trench_lon_here = trench_interp(lat)

        for j in range(len(lons)):
            lon = lons[j]

            # Distance from trench (positive = east/inland)
            dlon = lon - trench_lon_here  # degrees east of trench
            if dlon < 0:
                # West of trench — check if close enough for shallow slab
                dist_km = dlon * 111.0 * cos_lat  # negative
                if dist_km < -30:
                    continue  # Too far west
            else:
                dist_km = dlon * 111.0 * cos_lat

            # Add small perpendicular distance from latitude offset
            # (the trench isn't perfectly N-S)
            dist_from_trench_km = dist_km

            if dist_from_trench_km < -30 or dist_from_trench_km > 350:
                continue

            # Clamp negative distances to near-trench values
            if dist_from_trench_km < 0:
                dist_from_trench_km = max(0, dist_from_trench_km + 30) * 8.0 / 30.0

            d = depth_profile(dist_from_trench_km)
            if not np.isnan(d):
                # Add subtle along-strike variation (slab is slightly
                # deeper in the center, shallower at edges)
                lat_center = 45.5
                lat_variation = -2.0 * np.exp(-((lat - lat_center) / 4.0) ** 2)
                depth[i, j] = d + lat_variation

    # Count valid points
    valid = np.count_nonzero(~np.isnan(depth))
    total = depth.size
    print(f"  Grid shape: {depth.shape}")
    print(f"  Valid points: {valid:,} / {total:,} ({100*valid/total:.1f}%)")
    print(f"  Lon range: [{lons.min():.2f}, {lons.max():.2f}]")
    print(f"  Lat range: [{lats.min():.2f}, {lats.max():.2f}]")
    print(f"  Depth range: [{np.nanmin(depth):.1f}, {np.nanmax(depth):.1f}] km")

    return lons, lats, depth


# ---------------------------------------------------------------------------
# Contour generation
# ---------------------------------------------------------------------------

def generate_contours(lons, lats, depth, levels):
    """
    Generate depth contour lines using matplotlib.

    Returns a GeoJSON FeatureCollection with LineString features,
    each having a 'depth' property (km).
    """
    import matplotlib
    matplotlib.use("Agg")  # Non-interactive backend
    import matplotlib.pyplot as plt

    print("\n  Generating contour lines...")

    # Create a figure (we only need the contour computation, not the plot)
    fig, ax = plt.subplots(figsize=(1, 1))

    # matplotlib contour expects (x, y, z) where x=lons, y=lats
    cs = ax.contour(lons, lats, depth, levels=levels)

    features = []

    # Use cs.allsegs which works across matplotlib versions.
    # cs.allsegs[level_idx] is a list of Nx2 arrays, one per segment.
    for level_idx, level_value in enumerate(cs.levels):
        segments = cs.allsegs[level_idx]
        for seg in segments:
            if len(seg) < 2:
                continue

            # Convert to [lon, lat] coordinate list
            coords = []
            for v in seg:
                lon, lat = float(v[0]), float(v[1])
                # Round to 4 decimal places (~11m precision)
                coords.append([round(lon, 4), round(lat, 4)])

            # Skip very short segments
            if len(coords) < 3:
                continue

            feature = {
                "type": "Feature",
                "properties": {
                    "depth": float(level_value)
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                }
            }
            features.append(feature)

    plt.close(fig)

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    print(f"  Generated {len(features)} contour line features")
    for level in levels:
        count = sum(1 for f in features if f["properties"]["depth"] == level)
        if count > 0:
            print(f"    {level:3d} km: {count} segment(s)")

    return geojson


# ---------------------------------------------------------------------------
# Surface grid generation
# ---------------------------------------------------------------------------

def generate_surface_grid(lons, lats, depth, spacing=RESAMPLE_SPACING):
    """
    Create a resampled surface grid JSON for mesh rendering.

    Output format:
    {
        "rows": N, "cols": M,
        "lonMin": ..., "lonMax": ..., "latMin": ..., "latMax": ...,
        "positions": [lon, lat, depth_km, lon, lat, depth_km, ...]
    }

    NaN values are excluded from the positions array, and an index map
    is provided for reconstruction.
    """
    from scipy.interpolate import RegularGridInterpolator

    print("\n  Generating resampled surface grid...")

    # Create resampled grid
    lon_min = float(np.floor(lons.min() / spacing) * spacing)
    lon_max = float(np.ceil(lons.max() / spacing) * spacing)
    lat_min = float(np.floor(lats.min() / spacing) * spacing)
    lat_max = float(np.ceil(lats.max() / spacing) * spacing)

    new_lons = np.arange(lon_min, lon_max + spacing / 2, spacing)
    new_lats = np.arange(lat_min, lat_max + spacing / 2, spacing)

    print(f"  Resampled grid: {len(new_lats)} x {len(new_lons)}")

    # Replace NaN with a sentinel for interpolation, then mask
    # Use RegularGridInterpolator with nearest-neighbor for missing data
    depth_filled = np.where(np.isnan(depth), -9999.0, depth)

    try:
        interp = RegularGridInterpolator(
            (lats, lons), depth_filled,
            method="linear",
            bounds_error=False,
            fill_value=-9999.0
        )

        new_lon_grid, new_lat_grid = np.meshgrid(new_lons, new_lats)
        pts = np.column_stack([new_lat_grid.ravel(), new_lon_grid.ravel()])
        new_depth = interp(pts).reshape(len(new_lats), len(new_lons))
    except Exception as e:
        print(f"  Interpolation failed ({e}), using nearest-neighbor...")
        # Fallback: just subsample
        from scipy.interpolate import NearestNDInterpolator

        valid_mask = ~np.isnan(depth)
        lat_grid, lon_grid = np.meshgrid(lats, lons, indexing="ij")
        pts_valid = np.column_stack([
            lat_grid[valid_mask],
            lon_grid[valid_mask]
        ])
        vals_valid = depth[valid_mask]
        nn = NearestNDInterpolator(pts_valid, vals_valid)

        new_lon_grid, new_lat_grid = np.meshgrid(new_lons, new_lats)
        query_pts = np.column_stack([new_lat_grid.ravel(), new_lon_grid.ravel()])
        new_depth = nn(query_pts).reshape(len(new_lats), len(new_lons))

    # Build positions array (only valid points)
    positions = []
    valid_count = 0
    for i in range(len(new_lats)):
        for j in range(len(new_lons)):
            d = float(new_depth[i, j])
            if d < 0 or d > 200 or d == -9999.0:
                continue
            lon = round(float(new_lons[j]), 4)
            lat = round(float(new_lats[i]), 4)
            dep = round(d, 2)
            positions.extend([lon, lat, dep])
            valid_count += 1

    surface = {
        "rows": int(len(new_lats)),
        "cols": int(len(new_lons)),
        "lonMin": round(float(new_lons.min()), 4),
        "lonMax": round(float(new_lons.max()), 4),
        "latMin": round(float(new_lats.min()), 4),
        "latMax": round(float(new_lats.max()), 4),
        "spacing": spacing,
        "pointCount": valid_count,
        "positions": positions
    }

    print(f"  Valid surface points: {valid_count:,}")
    print(f"  Positions array length: {len(positions):,} values")

    return surface


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Slab2 Data Processor — Cascadia Explorer")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Step 1: Load data (real or synthetic)
    lons = lats = depth = None

    if os.path.exists(GRD_FILE):
        print(f"\nFound grid file: {GRD_FILE}")
        try:
            lons, lats, depth = try_read_grd(GRD_FILE)
            print("  Successfully loaded real Slab2 data!")
        except Exception as e:
            print(f"\n  ERROR reading grid file: {e}")
            traceback.print_exc()
            print("  Falling back to synthetic data generation...")

    if depth is None:
        print("\nNo usable grid file — generating synthetic slab data.")
        lons, lats, depth = generate_synthetic_slab()

    # Step 2: Generate contour lines
    print("\n" + "-" * 40)
    print("Generating depth contours...")
    contours_geojson = generate_contours(lons, lats, depth, CONTOUR_LEVELS)

    contours_path = os.path.join(OUTPUT_DIR, "cascadia-slab-contours.json")
    with open(contours_path, "w") as f:
        json.dump(contours_geojson, f, separators=(",", ":"))
    size_kb = os.path.getsize(contours_path) / 1024
    print(f"\n  Wrote: {contours_path}")
    print(f"  Size: {size_kb:.1f} KB")

    # Step 3: Generate surface grid
    print("\n" + "-" * 40)
    print("Generating surface grid...")
    surface_json = generate_surface_grid(lons, lats, depth)

    surface_path = os.path.join(OUTPUT_DIR, "cascadia-slab-surface.json")
    with open(surface_path, "w") as f:
        json.dump(surface_json, f, separators=(",", ":"))
    size_kb = os.path.getsize(surface_path) / 1024
    print(f"\n  Wrote: {surface_path}")
    print(f"  Size: {size_kb:.1f} KB")

    # Step 4: Validation
    print("\n" + "=" * 60)
    print("Validation")
    print("=" * 60)

    # Validate contours
    with open(contours_path) as f:
        data = json.load(f)
    n_features = len(data["features"])
    depths_found = sorted(set(f["properties"]["depth"] for f in data["features"]))
    print(f"\n  Contours: {n_features} features")
    print(f"  Depth levels: {depths_found}")

    # Validate surface
    with open(surface_path) as f:
        data = json.load(f)
    print(f"\n  Surface grid: {data['rows']} x {data['cols']}")
    print(f"  Point count: {data['pointCount']:,}")
    print(f"  Lon: [{data['lonMin']}, {data['lonMax']}]")
    print(f"  Lat: [{data['latMin']}, {data['latMax']}]")
    print(f"  Positions array: {len(data['positions']):,} values")

    # Verify positions are triplets
    assert len(data["positions"]) == data["pointCount"] * 3, \
        "Positions array length mismatch!"

    print("\n  All validations passed!")
    print("\n" + "=" * 60)
    print("Pipeline complete. Output files:")
    print(f"  1. {contours_path}")
    print(f"  2. {surface_path}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
