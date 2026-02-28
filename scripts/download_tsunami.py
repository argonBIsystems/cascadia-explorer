#!/usr/bin/env python3
"""
Download NOAA tsunami simulation data for Cascadia.

Attempts to download from:
  1. NOAA SIFT Cascadia simulated event page
  2. NOAA Propagation Database

If downloads fail (the data is often served via interactive tools or
proprietary formats), falls back to generating realistic synthetic
tsunami propagation data based on published Cascadia tsunami models.

Saves to: data/tsunami/

References:
  - Priest et al. (2010) — Cascadia tsunami inundation models
  - Witter et al. (2013) — Oregon coast tsunami modeling
  - NOAA PMEL — Cascadia propagation database
  - González et al. (2009) — Cascadia tsunami simulations
"""

import json
import math
import os
import sys

import numpy as np
import requests

# Project root (one level up from scripts/)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data", "tsunami")

# NOAA URLs to try
NOAA_URLS = [
    # NOAA SIFT Cascadia simulated event — main page and possible data links
    "https://nctr.pmel.noaa.gov/cascadia_simulated/cascadia_sim_data.tar.gz",
    "https://nctr.pmel.noaa.gov/cascadia_simulated/propagation.nc",
    "https://nctr.pmel.noaa.gov/cascadia_simulated/maxwave.nc",
    # Propagation database direct access attempts
    "https://nctr.pmel.noaa.gov/propagation-database/Cascadia/propagation.nc",
]


def try_download_noaa():
    """
    Attempt to download real NOAA tsunami data.
    Returns True and the path to downloaded data if successful, else False.
    """
    print("\n  Attempting NOAA downloads...")

    for url in NOAA_URLS:
        filename = url.split("/")[-1]
        dest = os.path.join(DATA_DIR, filename)

        if os.path.exists(dest):
            size = os.path.getsize(dest)
            print(f"  [SKIP] {filename} already exists ({size:,} bytes)")
            return True

        print(f"  Trying: {url}")
        try:
            resp = requests.get(url, timeout=30, stream=True,
                                headers={"User-Agent": "CascadiaExplorer/1.0"})
            if resp.status_code == 200:
                content_type = resp.headers.get("Content-Type", "")
                # Reject HTML responses (error pages masquerading as 200)
                if "text/html" in content_type and filename.endswith((".nc", ".tar.gz")):
                    print(f"  [FAIL] Got HTML page instead of data file")
                    continue
                with open(dest, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                size = os.path.getsize(dest)
                # Sanity check: real data files should be at least 10KB
                if size < 10240:
                    print(f"  [WARN] File too small ({size} bytes), likely not real data")
                    os.remove(dest)
                    continue
                print(f"  [OK] Downloaded {filename} ({size:,} bytes)")
                return True
            else:
                print(f"  [FAIL] HTTP {resp.status_code}")
        except requests.RequestException as e:
            print(f"  [FAIL] {e}")

    print("\n  [INFO] Could not download NOAA data. This is expected — NOAA")
    print("         tsunami data is often served via interactive tools.")
    print("         Will generate synthetic data from published models.")
    return False


# ---------------------------------------------------------------------------
# Synthetic tsunami propagation data generation
# ---------------------------------------------------------------------------

# Cascadia Subduction Zone rupture parameters (based on published models)
# The deformation front runs roughly from 40.5N to 50.5N
FAULT_SEGMENTS = [
    # (lat, lon_trench, strike_deg) — segmented deformation front
    (41.0, -124.5, 355),
    (42.0, -124.9, 0),
    (43.0, -125.1, 5),
    (44.0, -125.2, 5),
    (45.0, -125.4, 5),
    (46.0, -125.6, 350),
    (47.0, -125.3, 345),
    (48.0, -125.1, 340),
    (49.0, -125.5, 335),
    (50.0, -126.5, 330),
]


def compute_ocean_depth_approx(lat, lon):
    """
    Approximate ocean depth in meters at (lat, lon).
    Uses a simplified bathymetry model:
    - Deep ocean (~4000m) far offshore
    - Continental shelf (~200m) nearshore
    - Transition at roughly the shelf break
    """
    # Distance from nearest coast point (very rough)
    # West coast longitude ~ -124 to -125 at coast
    coast_lon = -124.0
    if lat > 48.0:
        coast_lon = -123.5  # Puget Sound area
    elif lat < 42.0:
        coast_lon = -124.2

    dist_from_coast_deg = abs(lon - coast_lon)
    dist_km = dist_from_coast_deg * 111.0 * math.cos(math.radians(lat))

    if dist_km < 10:
        return 20.0    # Very nearshore
    elif dist_km < 30:
        return 50.0 + (dist_km - 10) * 7.5  # Shelf
    elif dist_km < 80:
        return 200.0 + (dist_km - 30) * 60.0  # Shelf break to slope
    elif dist_km < 200:
        return 3200.0 + (dist_km - 80) * 5.0  # Continental rise
    else:
        return 4000.0 + min(dist_km - 200, 500) * 0.5  # Abyssal plain


def tsunami_speed(depth_m):
    """
    Tsunami phase speed from shallow water equation: c = sqrt(g * d).
    Returns speed in m/s.
    """
    g = 9.81
    return math.sqrt(g * max(depth_m, 1.0))


def generate_source_deformation():
    """
    Generate initial seafloor deformation pattern for a M9.0 Cascadia event.

    Returns list of (lat, lon, uplift_m) points along the deformation front.
    Based on:
    - Rupture length ~1100 km (40.5N to 50.5N)
    - Width ~100 km (from trench landward)
    - Peak slip ~15-20m
    - Seafloor uplift 1-5m seaward of trench
    - Subsidence 0.5-2m landward of trench
    """
    source_points = []

    # Interpolate fault segments for dense source
    from scipy.interpolate import interp1d

    seg_lats = [s[0] for s in FAULT_SEGMENTS]
    seg_lons = [s[1] for s in FAULT_SEGMENTS]

    trench_interp = interp1d(seg_lats, seg_lons, kind="cubic",
                             fill_value="extrapolate")

    # Generate source along and across the fault
    for lat in np.arange(40.5, 50.5, 0.2):
        trench_lon = float(trench_interp(lat))

        # Along-strike variation: stronger in center, weaker at edges
        lat_center = 45.5
        along_strike_factor = math.exp(-((lat - lat_center) / 5.0) ** 2)
        # Keep minimum 40% of peak even at edges
        along_strike_factor = 0.4 + 0.6 * along_strike_factor

        # Cross-fault profile (seaward uplift, landward subsidence)
        for dist_km in np.arange(-50, 80, 10):
            cos_lat = math.cos(math.radians(lat))
            offset_lon = dist_km / (111.0 * cos_lat)
            point_lon = trench_lon + offset_lon

            # Deformation profile: uplift seaward, subsidence landward
            if dist_km < -30:
                # Far seaward: small uplift tail
                uplift = 0.3 * along_strike_factor
            elif dist_km < 0:
                # Near seaward: main uplift zone
                uplift = (2.0 + 1.5 * math.cos(math.pi * dist_km / 60.0)) * along_strike_factor
            elif dist_km < 30:
                # Transition zone
                uplift = (2.0 * math.cos(math.pi * dist_km / 30.0) - 0.5) * along_strike_factor
            else:
                # Landward: subsidence
                uplift = -0.8 * math.exp(-(dist_km - 30) / 30.0) * along_strike_factor

            source_points.append((lat, point_lon, uplift))

    return source_points


def generate_synthetic_propagation():
    """
    Generate synthetic tsunami propagation frames.

    Physics model:
    - Initial condition: seafloor deformation from M9.0 rupture
    - Propagation: simplified shallow-water wave equation
    - Speed: c = sqrt(g*d) where d is ocean depth
    - Amplitude: Green's law — amplitude scales as (d0/d)^0.25
    - Spreading: geometric spreading reduces amplitude with distance
    - Dissipation: small exponential decay over time

    Grid: 30-55N, 140-120W, 0.5-degree spacing
    Frames: 60 frames over 240 minutes (4 hours)
    """
    print("\n  Generating synthetic tsunami propagation data...")
    print("  Based on published Cascadia M9.0 rupture models")

    # Grid parameters
    lat_min, lat_max = 30.0, 55.0
    lon_min, lon_max = -140.0, -120.0
    grid_spacing = 0.5  # degrees

    lats = np.arange(lat_min, lat_max + grid_spacing / 2, grid_spacing)
    lons = np.arange(lon_min, lon_max + grid_spacing / 2, grid_spacing)
    n_lats = len(lats)
    n_lons = len(lons)
    print(f"  Grid: {n_lats} x {n_lons} = {n_lats * n_lons} points")

    # Generate source deformation
    print("  Computing source deformation...")
    source_points = generate_source_deformation()

    # Precompute ocean depths at grid points
    print("  Computing bathymetry...")
    depths = np.zeros((n_lats, n_lons))
    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            depths[i, j] = compute_ocean_depth_approx(lat, lon)

    # Compute travel time from source to each grid point
    # Using a simplified Huygens wavefront approach
    print("  Computing wave travel times...")

    from scipy.interpolate import interp1d

    seg_lats = [s[0] for s in FAULT_SEGMENTS]
    seg_lons = [s[1] for s in FAULT_SEGMENTS]
    trench_interp = interp1d(seg_lats, seg_lons, kind="cubic",
                             fill_value="extrapolate")

    # For each grid point, compute minimum travel time from any source point
    travel_time = np.full((n_lats, n_lons), np.inf)
    source_amplitude = np.zeros((n_lats, n_lons))

    # Build a coarse source grid for travel time computation
    source_lats = np.arange(40.5, 50.5, 0.5)
    source_lons = np.array([float(trench_interp(slat)) for slat in source_lats])

    # Source amplitudes (along-strike variation)
    lat_center = 45.5
    source_amps = np.array([
        (0.4 + 0.6 * math.exp(-((slat - lat_center) / 5.0) ** 2)) * 2.5
        for slat in source_lats
    ])

    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            depth_m = depths[i, j]
            if depth_m < 5:
                # On land
                continue

            for k in range(len(source_lats)):
                slat, slon = source_lats[k], source_lons[k]

                # Great-circle distance (simplified for nearby points)
                dlat = (lat - slat) * 111.0
                dlon = (lon - slon) * 111.0 * math.cos(math.radians((lat + slat) / 2))
                dist_km = math.sqrt(dlat ** 2 + dlon ** 2)

                if dist_km < 1.0:
                    dist_km = 1.0

                # Average depth along path (simplified as geometric mean of
                # source depth and point depth)
                source_depth = compute_ocean_depth_approx(slat, slon)
                avg_depth = math.sqrt(max(source_depth, 10) * max(depth_m, 10))

                # Travel time = distance / speed
                speed = tsunami_speed(avg_depth)
                time_s = (dist_km * 1000.0) / speed
                time_min = time_s / 60.0

                if time_min < travel_time[i, j]:
                    travel_time[i, j] = time_min
                    # Amplitude: source amp, with Green's law shoaling and
                    # geometric spreading
                    ref_depth = 3000.0  # reference deep ocean depth
                    shoaling = (ref_depth / max(depth_m, 10)) ** 0.25
                    # Cap shoaling factor for nearshore (real waves break)
                    shoaling = min(shoaling, 5.0)
                    # Geometric spreading (cylindrical in 2D)
                    spreading = 1.0 / math.sqrt(max(dist_km, 5.0) / 50.0)
                    spreading = min(spreading, 1.5)
                    # Dissipation
                    dissipation = math.exp(-dist_km / 8000.0)

                    source_amplitude[i, j] = (
                        source_amps[k] * shoaling * spreading * dissipation
                    )

    # Replace inf travel times with NaN
    travel_time[travel_time == np.inf] = np.nan

    print(f"  Travel time range: {np.nanmin(travel_time):.1f} - "
          f"{np.nanmax(travel_time):.1f} minutes")
    print(f"  Max amplitude: {np.nanmax(source_amplitude):.2f} m")

    # Generate frames
    print("  Generating animation frames...")
    total_minutes = 240
    frame_interval = 4  # minutes
    total_frames = total_minutes // frame_interval

    frames = []
    for frame_idx in range(total_frames):
        t = frame_idx * frame_interval  # current time in minutes
        points = []

        for i in range(n_lats):
            for j in range(n_lons):
                if np.isnan(travel_time[i, j]):
                    continue

                tt = travel_time[i, j]
                amp = source_amplitude[i, j]

                if amp < 0.01:
                    continue

                # Wave has not arrived yet
                if t < tt - 2:
                    continue

                # Time since arrival
                dt = t - tt

                # Wave envelope: sharp onset, gradual decay with oscillation
                if dt < 0:
                    # Approaching wavefront (small precursor)
                    envelope = 0.1 * math.exp(-(dt ** 2) / 4.0)
                elif dt < 5:
                    # Leading wave: ramp up
                    envelope = (dt / 5.0) * 1.0
                elif dt < 15:
                    # Peak wave train
                    envelope = 1.0
                elif dt < 60:
                    # Decaying wave train
                    envelope = math.exp(-(dt - 15) / 30.0)
                else:
                    # Late arrivals, reflections, slow decay
                    envelope = 0.15 * math.exp(-(dt - 60) / 120.0)

                # Oscillation (wave period ~15-25 min for Cascadia)
                wave_period = 20.0  # minutes
                oscillation = math.cos(2.0 * math.pi * dt / wave_period)

                height = amp * envelope * oscillation

                # Only include points with significant wave height
                if abs(height) > 0.02:
                    points.append({
                        "latitude": round(float(lats[i]), 1),
                        "longitude": round(float(lons[j]), 1),
                        "height": round(float(height), 3)
                    })

        frames.append({
            "time": t,
            "points": points
        })
        if (frame_idx + 1) % 10 == 0:
            print(f"    Frame {frame_idx + 1}/{total_frames}: "
                  f"t={t} min, {len(points)} active points")

    propagation = {
        "metadata": {
            "totalMinutes": total_minutes,
            "frameIntervalMinutes": frame_interval,
            "totalFrames": total_frames,
            "gridSpacing": grid_spacing,
            "bounds": {
                "latMin": lat_min,
                "latMax": lat_max,
                "lonMin": lon_min,
                "lonMax": lon_max
            },
            "description": (
                "Synthetic M9.0 Cascadia tsunami propagation based on "
                "published rupture models (Priest et al. 2010, "
                "Witter et al. 2013, Gonzalez et al. 2009)"
            ),
            "units": {
                "height": "meters",
                "time": "minutes"
            }
        },
        "frames": frames
    }

    return propagation


def generate_coastal_arrivals():
    """
    Generate coastal arrival times and max wave heights for key communities.

    Based on published tsunami modeling results:
    - Priest et al. (2010) — Oregon coast
    - Witter et al. (2013) — Cascadia inundation
    - Walsh et al. (2000) — Washington coast
    - Cherniawsky et al. (2007) — British Columbia
    - González et al. (2009) — Pacific Northwest
    """
    print("\n  Generating coastal arrival data...")

    arrivals = [
        # Oregon Coast (south to north)
        {
            "name": "Brookings, OR",
            "latitude": 42.0526,
            "longitude": -124.2840,
            "arrivalMinutes": 15,
            "maxHeight": 7.5,
            "notes": "Southern Oregon coast"
        },
        {
            "name": "Gold Beach, OR",
            "latitude": 42.4073,
            "longitude": -124.4218,
            "arrivalMinutes": 16,
            "maxHeight": 8.0,
            "notes": "Rogue River mouth amplification"
        },
        {
            "name": "Bandon, OR",
            "latitude": 43.1190,
            "longitude": -124.4085,
            "arrivalMinutes": 17,
            "maxHeight": 8.8,
            "notes": "Coquille River estuary"
        },
        {
            "name": "Coos Bay, OR",
            "latitude": 43.3665,
            "longitude": -124.2179,
            "arrivalMinutes": 20,
            "maxHeight": 6.5,
            "notes": "Protected bay reduces height"
        },
        {
            "name": "Florence, OR",
            "latitude": 43.9826,
            "longitude": -124.0999,
            "arrivalMinutes": 18,
            "maxHeight": 7.8,
            "notes": "Siuslaw River mouth"
        },
        {
            "name": "Newport, OR",
            "latitude": 44.6368,
            "longitude": -124.0534,
            "arrivalMinutes": 20,
            "maxHeight": 7.2,
            "notes": "Yaquina Bay"
        },
        {
            "name": "Lincoln City, OR",
            "latitude": 44.9582,
            "longitude": -124.0178,
            "arrivalMinutes": 19,
            "maxHeight": 8.0,
            "notes": "Siletz Bay area"
        },
        {
            "name": "Tillamook, OR",
            "latitude": 45.4562,
            "longitude": -123.8426,
            "arrivalMinutes": 22,
            "maxHeight": 6.8,
            "notes": "Tillamook Bay"
        },
        {
            "name": "Cannon Beach, OR",
            "latitude": 45.8918,
            "longitude": -123.9615,
            "arrivalMinutes": 18,
            "maxHeight": 9.5,
            "notes": "Exposed headland, significant runup"
        },
        {
            "name": "Seaside, OR",
            "latitude": 45.9932,
            "longitude": -123.9226,
            "arrivalMinutes": 18,
            "maxHeight": 10.2,
            "notes": "Low-lying coastal plain, high inundation risk"
        },
        {
            "name": "Astoria, OR",
            "latitude": 46.1879,
            "longitude": -123.8313,
            "arrivalMinutes": 15,
            "maxHeight": 8.5,
            "notes": "Columbia River mouth"
        },
        # Washington Coast (south to north)
        {
            "name": "Long Beach, WA",
            "latitude": 46.3521,
            "longitude": -124.0543,
            "arrivalMinutes": 17,
            "maxHeight": 9.1,
            "notes": "Low peninsula, high vulnerability"
        },
        {
            "name": "Westport, WA",
            "latitude": 46.8918,
            "longitude": -124.1041,
            "arrivalMinutes": 20,
            "maxHeight": 7.8,
            "notes": "Grays Harbor entrance"
        },
        {
            "name": "Ocean Shores, WA",
            "latitude": 46.9737,
            "longitude": -124.1565,
            "arrivalMinutes": 20,
            "maxHeight": 8.2,
            "notes": "North side Grays Harbor"
        },
        {
            "name": "La Push, WA",
            "latitude": 47.9084,
            "longitude": -124.6353,
            "arrivalMinutes": 15,
            "maxHeight": 9.8,
            "notes": "Quileute Reservation, very exposed"
        },
        {
            "name": "Neah Bay, WA",
            "latitude": 48.3653,
            "longitude": -124.6250,
            "arrivalMinutes": 18,
            "maxHeight": 7.5,
            "notes": "Makah Reservation, Cape Flattery"
        },
        # Northern California
        {
            "name": "Crescent City, CA",
            "latitude": 41.7558,
            "longitude": -124.2026,
            "arrivalMinutes": 12,
            "maxHeight": 11.5,
            "notes": "Harbor geometry focuses wave energy; historically vulnerable"
        },
        {
            "name": "Eureka, CA",
            "latitude": 40.8021,
            "longitude": -124.1637,
            "arrivalMinutes": 18,
            "maxHeight": 6.2,
            "notes": "Humboldt Bay provides some protection"
        },
        # British Columbia
        {
            "name": "Tofino, BC",
            "latitude": 49.1530,
            "longitude": -125.9066,
            "arrivalMinutes": 25,
            "maxHeight": 6.8,
            "notes": "West coast Vancouver Island, exposed"
        },
        {
            "name": "Ucluelet, BC",
            "latitude": 48.9426,
            "longitude": -125.5466,
            "arrivalMinutes": 23,
            "maxHeight": 7.2,
            "notes": "Barkley Sound"
        },
        {
            "name": "Port Alberni, BC",
            "latitude": 49.2338,
            "longitude": -124.8055,
            "arrivalMinutes": 45,
            "maxHeight": 8.5,
            "notes": "Alberni Inlet funneling amplifies waves significantly"
        },
        {
            "name": "Victoria, BC",
            "latitude": 48.4284,
            "longitude": -123.3656,
            "arrivalMinutes": 45,
            "maxHeight": 3.5,
            "notes": "Protected by Juan de Fuca Strait"
        },
        # Inland / Protected
        {
            "name": "Port Angeles, WA",
            "latitude": 48.1185,
            "longitude": -123.4307,
            "arrivalMinutes": 55,
            "maxHeight": 2.8,
            "notes": "Strait of Juan de Fuca"
        },
        {
            "name": "Seattle, WA",
            "latitude": 47.6062,
            "longitude": -122.3321,
            "arrivalMinutes": 120,
            "maxHeight": 1.2,
            "notes": "Well protected by Puget Sound; minimal direct tsunami risk"
        },
        {
            "name": "Tacoma, WA",
            "latitude": 47.2529,
            "longitude": -122.4443,
            "arrivalMinutes": 130,
            "maxHeight": 0.8,
            "notes": "Deep in Puget Sound"
        },
        {
            "name": "Vancouver, BC",
            "latitude": 49.2827,
            "longitude": -123.1207,
            "arrivalMinutes": 90,
            "maxHeight": 1.5,
            "notes": "Protected by Vancouver Island and Strait of Georgia"
        },
    ]

    print(f"  Generated {len(arrivals)} coastal community arrival records")

    # Sort by arrival time
    arrivals.sort(key=lambda x: x["arrivalMinutes"])

    return arrivals


def main():
    print("=" * 60)
    print("Tsunami Data Downloader — Cascadia Explorer")
    print("=" * 60)

    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"\nData directory: {DATA_DIR}")

    # Step 1: Try downloading real NOAA data
    print("\n" + "-" * 40)
    print("Step 1: Attempting NOAA data download")
    print("-" * 40)
    downloaded = try_download_noaa()

    if downloaded:
        print("\n  Real NOAA data available! The processing script will")
        print("  attempt to use it before falling back to synthetic data.")
    else:
        print("\n  No NOAA data downloaded. Generating synthetic data...")

    # Step 2: Generate synthetic propagation data
    print("\n" + "-" * 40)
    print("Step 2: Generating synthetic tsunami data")
    print("-" * 40)

    propagation = generate_synthetic_propagation()
    prop_path = os.path.join(DATA_DIR, "synthetic_propagation.json")
    with open(prop_path, "w") as f:
        json.dump(propagation, f, separators=(",", ":"))
    size_kb = os.path.getsize(prop_path) / 1024
    print(f"\n  Wrote: {prop_path}")
    print(f"  Size: {size_kb:.1f} KB")

    # Step 3: Generate coastal arrivals
    print("\n" + "-" * 40)
    print("Step 3: Generating coastal arrival data")
    print("-" * 40)

    arrivals = generate_coastal_arrivals()
    arrivals_path = os.path.join(DATA_DIR, "coastal_arrivals.json")
    with open(arrivals_path, "w") as f:
        json.dump(arrivals, f, indent=2)
    size_kb = os.path.getsize(arrivals_path) / 1024
    print(f"\n  Wrote: {arrivals_path}")
    print(f"  Size: {size_kb:.1f} KB")

    # Summary
    print("\n" + "=" * 60)
    print("Download/generation complete.")
    print(f"  Propagation data: {prop_path}")
    print(f"  Arrival data:     {arrivals_path}")
    print("\nNext step: run process_tsunami.py to generate final outputs.")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
