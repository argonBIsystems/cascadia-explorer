#!/usr/bin/env python3
"""
Process GPS velocity field data for Cascadia Explorer.

Reads downloaded GAGE/UNAVCO velocity files (or generates realistic
synthetic data if downloads failed) and produces two JSON files:

  public/data/gps/velocity-vectors-nam14.json   -- NAM14 reference frame
  public/data/gps/velocity-vectors-itrf.json    -- ITRF2014 reference frame

Each file contains an array of station objects:
  {
    "id": "P403",
    "name": "Station name",
    "latitude": 46.123,
    "longitude": -123.456,
    "velocityEast": -12.5,    # mm/yr
    "velocityNorth": 8.3,     # mm/yr
    "velocityUp": 1.2,        # mm/yr
    "speed": 15.0             # mm/yr, horizontal magnitude
  }

Synthetic data is based on published GPS velocity patterns for Cascadia:
  - McCaffrey et al. (2013) -- Plate coupling and block rotation
  - Schmalzle et al. (2014) -- Coupling and creep along CSZ
  - Michel et al. (2019) -- Interseismic coupling map

Usage:
    python scripts/process_gps.py
"""

import json
import math
import os
import random
import sys

import numpy as np

# Project root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data", "gps")
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "gps")

# Downloaded velocity files
NAM14_FILE = os.path.join(DATA_DIR, "velocity_nam14.vel")
ITRF14_FILE = os.path.join(DATA_DIR, "velocity_itrf14.vel")

# Cascadia bounding box
LAT_MIN, LAT_MAX = 40.0, 51.0
LON_MIN, LON_MAX = -130.0, -121.0


# ===================================================================
# Section 1: Try to parse real velocity files
# ===================================================================

def try_parse_vel_file(path):
    """
    Attempt to parse a UNAVCO/NGL .vel file.

    UNAVCO .vel format (space-delimited):
        Station  Lat  Lon  VelN  VelE  VelU  SigN  SigE  SigU  CorrNE  ...

    NGL MIDAS format:
        Station  Lat  Lon  VelE  VelN  VelU  SigE  SigN  SigU  ...

    Returns a list of station dicts or None on failure.
    """
    if not os.path.exists(path):
        return None

    print(f"  Parsing: {path}")
    stations = []

    try:
        with open(path, "r") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"  [FAIL] Cannot read file: {e}")
        return None

    if len(lines) < 5:
        print(f"  [FAIL] File too short ({len(lines)} lines)")
        return None

    # Detect format from header/content
    parsed = 0
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("%"):
            continue

        parts = line.split()
        if len(parts) < 8:
            continue

        try:
            station_id = parts[0]
            lat = float(parts[1])
            lon = float(parts[2])

            # Try UNAVCO format: VelN VelE VelU
            vel_n = float(parts[3])
            vel_e = float(parts[4])
            vel_u = float(parts[5])

            # Filter to Cascadia bounding box
            if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
                continue

            speed = math.sqrt(vel_e**2 + vel_n**2)

            stations.append({
                "id": station_id,
                "name": station_id,
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "velocityEast": round(vel_e, 2),
                "velocityNorth": round(vel_n, 2),
                "velocityUp": round(vel_u, 2),
                "speed": round(speed, 2),
            })
            parsed += 1

        except (ValueError, IndexError):
            continue

    if parsed >= 10:
        print(f"  [OK] Parsed {parsed} stations in Cascadia region")
        return stations
    else:
        print(f"  [FAIL] Only parsed {parsed} stations (need >= 10)")
        return None


# ===================================================================
# Section 2: Synthetic GPS data generation
# ===================================================================

# --- Trench geometry (same as process_slab2.py for consistency) ---
TRENCH_POINTS = np.array([
    [-124.50, 40.30],   # Mendocino Triple Junction
    [-124.70, 41.00],
    [-124.90, 42.00],   # Southern Oregon
    [-125.10, 43.00],
    [-125.20, 44.00],   # Central Oregon
    [-125.30, 44.60],
    [-125.40, 45.00],
    [-125.50, 45.50],
    [-125.60, 46.00],   # Columbia River
    [-125.50, 46.50],
    [-125.30, 47.00],   # Washington coast
    [-125.20, 47.50],
    [-125.10, 48.00],
    [-125.00, 48.30],   # Juan de Fuca Strait
    [-125.20, 48.70],
    [-125.50, 49.00],
    [-126.00, 49.50],   # Vancouver Island
    [-126.50, 50.00],
    [-127.00, 50.50],   # Northern end
])

# North American plate motion in ITRF2014 (approximate Euler pole values)
# NA plate moves roughly SW relative to ITRF2014, which means ITRF
# stations on NA appear to move NE at about 20 mm/yr
NA_PLATE_VEL_EAST = 3.5     # mm/yr (small eastward)
NA_PLATE_VEL_NORTH = 18.5   # mm/yr (strongly northward)

# Juan de Fuca plate convergence direction and rate relative to NA
# JdF moves roughly ENE relative to NA at ~37-42 mm/yr
JDF_CONVERGENCE_AZ = 55.0    # degrees from north (ENE)
JDF_CONVERGENCE_RATE = 40.0  # mm/yr


def _interp_trench_lon(lat):
    """Interpolate trench longitude at a given latitude."""
    trench_lats = TRENCH_POINTS[:, 1]
    trench_lons = TRENCH_POINTS[:, 0]
    if lat < trench_lats.min() or lat > trench_lats.max():
        return None
    return float(np.interp(lat, trench_lats, trench_lons))


def _distance_from_trench_km(lat, lon):
    """
    Approximate distance east of the trench in km.
    Positive = inland (east of trench), negative = offshore.
    """
    trench_lon = _interp_trench_lon(lat)
    if trench_lon is None:
        return None
    cos_lat = math.cos(math.radians(lat))
    dlon = lon - trench_lon  # positive east
    return dlon * 111.0 * cos_lat


def _surface_velocity_fraction(dist_km):
    """
    Model the fraction of convergence rate observed at the surface as a
    function of distance inland from the trench.

    This uses a simplified elastic half-space model calibrated to match
    published GPS velocity fields for Cascadia (McCaffrey et al., 2013;
    Schmalzle et al., 2014).  The key insight is that the coast sits
    ~100-150 km from the trench, and the locked zone extends from the
    trench to ~60 km depth (~120 km downdip).  The elastic response at
    the coast is therefore only a fraction of the full convergence rate.

    Published observations:
      - Coastal stations (coast is ~80-120 km from trench): 8-15 mm/yr
      - That's roughly 20-35% of the 40 mm/yr convergence rate
      - 50 km from trench (offshore): 30-40% (if we could measure there)
      - 200+ km from trench (inland): <5% (<2 mm/yr)

    We model this with an arctangent profile calibrated to these values.
    """
    if dist_km < -30:
        return 0.0
    elif dist_km < 0:
        # Just offshore, ramp up
        return 0.35 * (dist_km + 30) / 30.0

    # Empirical profile calibrated to published Cascadia GPS observations:
    #   80 km from trench (near coast):  ~10-15 mm/yr  -> ~30%
    #   100 km (typical coast):          ~8-12 mm/yr   -> ~25%
    #   150 km (inland):                 ~3-6 mm/yr    -> ~10%
    #   200 km:                          ~1-2 mm/yr    -> ~4%
    #   300+ km:                         <1 mm/yr      -> ~1%
    #
    # The elastic backslip model for a thrust fault with locking depth
    # D and downdip locked width W gives surface-parallel velocity:
    #   v/V = (1/pi) * [atan(x/D) - atan((x-W)/D)]
    # We use D=40 km and W=80 km (surface projections), which produces
    # the right coastal velocity magnitudes.

    D = 40.0   # effective locking depth, km
    W = 80.0   # locked zone width (surface projection), km

    x = dist_km
    term1 = math.atan2(x, D)
    term2 = math.atan2(x - W, D)
    fraction = (term1 - term2) / math.pi

    # Apply average coupling efficiency (< 1.0 everywhere)
    fraction *= 0.82
    return max(0, min(fraction, 0.95))


def _compute_nam14_velocity(lat, lon, dist_km):
    """
    Compute NAM14 (relative to stable North America) velocity for a
    station on the overriding plate.

    In the NAM14 frame:
      - Coastal stations (~100 km from trench) accumulate elastic
        strain, moving in the direction of plate convergence at
        ~8-15 mm/yr.
      - The convergence direction is ~N55E (ENE), matching the JdF-NA
        relative motion.
      - Velocity magnitude comes from an elastic backslip model.
      - Inland stations beyond the locked zone are nearly stationary.
      - Vertical: coastal subsidence due to downward flexure, some
        inland uplift from elastic bulge.
    """
    frac = _surface_velocity_fraction(dist_km)

    # Horizontal velocity from elastic backslip model
    backslip = JDF_CONVERGENCE_RATE * frac  # mm/yr
    az_rad = math.radians(JDF_CONVERGENCE_AZ)
    vel_e = backslip * math.sin(az_rad)
    vel_n = backslip * math.cos(az_rad)

    # Vertical component
    # Interseismic vertical signal: subsidence near coast from plate
    # dragging, slight uplift at the transition zone (~150-200 km).
    if dist_km < 0:
        vel_u = 0.0
    elif dist_km < 120:
        # Coastal subsidence zone (0 to -3 mm/yr), peaks around 80 km
        subsidence_peak = 80.0
        vel_u = -2.5 * math.exp(-((dist_km - subsidence_peak) / 50.0)**2)
    elif dist_km < 250:
        # Transition to slight uplift (elastic bulge)
        t = (dist_km - 120) / 130.0
        vel_u = -1.0 * (1 - t) + 1.0 * math.sin(math.pi * t)
    else:
        # Far inland: negligible vertical
        vel_u = 0.3 * math.exp(-(dist_km - 250) / 100.0)

    return vel_e, vel_n, vel_u


def _compute_jdf_plate_velocity_nam14():
    """
    Velocity of a station on the Juan de Fuca plate, in NAM14 frame.
    JdF moves roughly ENE relative to NA at ~40 mm/yr.
    """
    az_rad = math.radians(JDF_CONVERGENCE_AZ)
    vel_e = JDF_CONVERGENCE_RATE * math.sin(az_rad)
    vel_n = JDF_CONVERGENCE_RATE * math.cos(az_rad)
    vel_u = 0.0
    return vel_e, vel_n, vel_u


def _nam14_to_itrf14(vel_e, vel_n, vel_u):
    """
    Convert NAM14 velocity to ITRF2014 by adding North American plate
    motion.
    """
    return (
        vel_e + NA_PLATE_VEL_EAST,
        vel_n + NA_PLATE_VEL_NORTH,
        vel_u,
    )


# --- Station placement ---

# Major PNW cities / geographic reference points for station clustering
CLUSTER_CENTERS = [
    # (lon, lat, name_prefix, station_count, radius_deg)
    (-122.33, 47.61, "SEA", 18, 0.7),    # Seattle metro
    (-122.68, 45.52, "POR", 15, 0.6),    # Portland metro
    (-123.02, 44.94, "SAL", 8, 0.4),     # Salem
    (-123.09, 44.05, "EUG", 8, 0.4),     # Eugene
    (-122.87, 42.33, "MED", 6, 0.4),     # Medford
    (-124.06, 46.98, "GRH", 5, 0.3),     # Grays Harbor coast
    (-122.90, 48.45, "ANA", 6, 0.3),     # Anacortes / San Juan
    (-122.77, 48.86, "BEL", 5, 0.3),     # Bellingham
    (-123.37, 48.43, "VIC", 6, 0.4),     # Victoria, BC
    (-123.12, 49.28, "VAN", 10, 0.5),    # Vancouver, BC
    (-125.25, 48.77, "TOF", 4, 0.3),     # Tofino / west Van Isl
    (-124.10, 44.63, "NPT", 5, 0.3),     # Newport, OR coast
    (-123.80, 46.19, "AST", 5, 0.3),     # Astoria coast
    (-124.21, 43.37, "COO", 4, 0.3),     # Coos Bay coast
    (-124.55, 42.05, "BRK", 3, 0.3),     # Brookings coast
    (-124.16, 40.80, "EKA", 5, 0.3),     # Eureka, CA
    (-121.74, 47.75, "SFP", 4, 0.3),     # Snoqualmie Pass
    (-120.54, 46.60, "YAK", 5, 0.4),     # Yakima
    (-120.51, 47.41, "WEN", 4, 0.3),     # Wenatchee
    (-117.43, 47.66, "SPO", 5, 0.4),     # Spokane
    (-121.50, 44.27, "BND", 5, 0.3),     # Bend, OR
    (-121.18, 48.80, "BAK", 3, 0.2),     # Mt. Baker area
    (-121.76, 46.85, "RAI", 3, 0.2),     # Mt. Rainier area
    (-122.19, 45.37, "HOO", 3, 0.2),     # Mt. Hood area
    (-123.83, 41.76, "CRS", 3, 0.3),     # Crescent City, CA
    (-120.69, 43.54, "LPR", 3, 0.3),     # La Pine, OR
    (-121.94, 42.19, "KLF", 3, 0.3),     # Klamath Falls, OR
    (-122.63, 46.10, "LON", 3, 0.3),     # Longview, WA
    (-126.50, 49.80, "NVI", 3, 0.4),     # North Vancouver Island
]

# Additional stations along the coast for dense coverage
COASTAL_STRIP = [
    # (lon, lat) seed points along the coast, spaced ~0.5 deg
    (-124.10, 40.40), (-124.20, 40.80), (-124.30, 41.20),
    (-124.40, 41.60), (-124.50, 42.00), (-124.50, 42.40),
    (-124.55, 42.80), (-124.55, 43.20), (-124.55, 43.60),
    (-124.60, 44.00), (-124.05, 44.60), (-124.00, 45.00),
    (-123.95, 45.40), (-123.95, 45.80), (-123.90, 46.20),
    (-124.05, 46.60), (-124.10, 47.00), (-124.30, 47.40),
    (-124.60, 47.80), (-124.70, 48.20), (-125.30, 48.60),
    (-125.70, 49.00), (-126.20, 49.40), (-126.60, 49.80),
    (-127.00, 50.20),
]

# Offshore stations on the JdF plate (OBS or offshore GNSS-A style)
OFFSHORE_STATIONS = [
    (-127.0, 44.5, "JDF1"),
    (-127.5, 45.5, "JDF2"),
    (-128.0, 46.5, "JDF3"),
    (-127.0, 47.0, "JDF4"),
    (-128.5, 47.5, "JDF5"),
    (-128.0, 48.5, "JDF6"),
    (-129.0, 46.0, "JDF7"),
    (-126.5, 43.5, "GOR1"),  # Gorda plate
    (-126.0, 41.5, "GOR2"),
    (-127.5, 42.5, "GOR3"),
]


def _generate_station_id(index, prefix="P"):
    """Generate a PBO-style station ID like P001, P403, etc."""
    return f"{prefix}{index:03d}"


def _add_noise(vel_e, vel_n, vel_u, noise_h=0.5, noise_v=0.8):
    """Add realistic measurement noise to velocity components."""
    vel_e += random.gauss(0, noise_h)
    vel_n += random.gauss(0, noise_h)
    vel_u += random.gauss(0, noise_v)
    return vel_e, vel_n, vel_u


def generate_synthetic_stations():
    """
    Generate a set of ~300 synthetic GPS stations with realistic
    velocity patterns for the Cascadia region.

    Returns two lists: (nam14_stations, itrf14_stations)
    """
    print("\n  Generating synthetic GPS station network...")
    print("  Based on published Cascadia GPS velocity fields")
    print("  (McCaffrey et al., 2013; Schmalzle et al., 2014)")

    random.seed(42)  # Reproducible placement
    np.random.seed(42)

    nam14_stations = []
    itrf14_stations = []
    station_idx = 1

    def add_station(lat, lon, sid, name, is_offshore=False):
        nonlocal station_idx

        # Ensure within bounding box
        if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
            return

        dist = _distance_from_trench_km(lat, lon)
        if dist is None:
            return

        if is_offshore and dist > 0:
            dist = -abs(dist)  # Force offshore

        if is_offshore or dist < -20:
            # Station on JdF/Gorda plate
            ve_n, vn_n, vu_n = _compute_jdf_plate_velocity_nam14()
            # Add some variation for realism
            ve_n += random.gauss(0, 2.0)
            vn_n += random.gauss(0, 2.0)
            vu_n += random.gauss(0, 1.0)
        else:
            # Station on the overriding plate
            ve_n, vn_n, vu_n = _compute_nam14_velocity(lat, lon, dist)
            ve_n, vn_n, vu_n = _add_noise(ve_n, vn_n, vu_n)

            # Add along-strike variation: southern Cascadia has slightly
            # different convergence direction due to Gorda plate geometry
            if lat < 42.0:
                # Gorda-NA convergence is more northerly
                correction_az = math.radians(30)
                extra = 3.0 * _surface_velocity_fraction(dist)
                ve_n += extra * math.sin(correction_az)
                vn_n += extra * math.cos(correction_az)

            # Northern BC stations: Explorer plate region, slower convergence
            if lat > 49.5:
                reduction = 0.7
                ve_n *= reduction
                vn_n *= reduction

        # ITRF = NAM14 + NA plate motion
        ve_i, vn_i, vu_i = _nam14_to_itrf14(ve_n, vn_n, vu_n)

        speed_n = math.sqrt(ve_n**2 + vn_n**2)
        speed_i = math.sqrt(ve_i**2 + vn_i**2)

        nam14_stations.append({
            "id": sid,
            "name": name,
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "velocityEast": round(ve_n, 2),
            "velocityNorth": round(vn_n, 2),
            "velocityUp": round(vu_n, 2),
            "speed": round(speed_n, 2),
        })

        itrf14_stations.append({
            "id": sid,
            "name": name,
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "velocityEast": round(ve_i, 2),
            "velocityNorth": round(vn_i, 2),
            "velocityUp": round(vu_i, 2),
            "speed": round(speed_i, 2),
        })

        station_idx += 1

    # --- Phase 1: Cluster-based stations near cities/landmarks ---
    print("  Phase 1: Generating stations near population centers...")
    for (clon, clat, prefix, count, radius) in CLUSTER_CENTERS:
        for k in range(count):
            lat = clat + random.gauss(0, radius * 0.4)
            lon = clon + random.gauss(0, radius * 0.4)
            sid = _generate_station_id(station_idx, prefix[0])
            name = f"{prefix}_{k+1:02d}"
            add_station(lat, lon, sid, name)

    # --- Phase 2: Dense coastal strip ---
    print("  Phase 2: Generating coastal stations...")
    for (clon, clat) in COASTAL_STRIP:
        for k in range(3):
            lat = clat + random.uniform(-0.15, 0.15)
            lon = clon + random.uniform(-0.15, 0.15)
            sid = _generate_station_id(station_idx)
            name = f"COAST_{station_idx:03d}"
            add_station(lat, lon, sid, name)

    # --- Phase 3: Inland transect stations ---
    print("  Phase 3: Generating inland transect stations...")
    transect_lats = [41.0, 42.0, 43.0, 44.0, 44.5, 45.0, 45.5,
                     46.0, 46.5, 47.0, 47.5, 48.0, 48.5, 49.0, 50.0]
    for t_lat in transect_lats:
        trench_lon = _interp_trench_lon(t_lat)
        if trench_lon is None:
            continue
        # Place stations at varying distances from trench: 30, 80, 130,
        # 200, 300 km inland
        for dist_target in [30, 80, 130, 200, 300]:
            cos_lat = math.cos(math.radians(t_lat))
            lon = trench_lon + dist_target / (111.0 * cos_lat)
            lat = t_lat + random.gauss(0, 0.1)
            if lon > LON_MAX:
                continue
            sid = _generate_station_id(station_idx)
            name = f"TRANS_{station_idx:03d}"
            add_station(lat, lon, sid, name)

    # --- Phase 4: Offshore JdF plate stations ---
    print("  Phase 4: Generating offshore stations (JdF plate)...")
    for (olon, olat, oname) in OFFSHORE_STATIONS:
        add_station(olat, olon, oname, f"Offshore {oname}", is_offshore=True)

    print(f"\n  Total stations generated: {len(nam14_stations)}")

    return nam14_stations, itrf14_stations


# ===================================================================
# Section 3: Main pipeline
# ===================================================================

def main():
    print("=" * 60)
    print("GPS Velocity Field Processor -- Cascadia Explorer")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    nam14_stations = None
    itrf14_stations = None

    # --- Try real data first ---
    print("\nStep 1: Attempting to load downloaded velocity files...")

    if os.path.exists(NAM14_FILE):
        print(f"\n  Found NAM14 file: {NAM14_FILE}")
        nam14_stations = try_parse_vel_file(NAM14_FILE)
    else:
        print(f"  NAM14 file not found: {NAM14_FILE}")

    if os.path.exists(ITRF14_FILE):
        print(f"\n  Found ITRF14 file: {ITRF14_FILE}")
        itrf14_stations = try_parse_vel_file(ITRF14_FILE)
    else:
        print(f"  ITRF14 file not found: {ITRF14_FILE}")

    # --- Fall back to synthetic data if needed ---
    if nam14_stations is None or itrf14_stations is None:
        print("\n" + "-" * 40)
        print("Step 2: Generating synthetic GPS velocity data...")
        print("(Real data unavailable or insufficient)")
        syn_nam14, syn_itrf14 = generate_synthetic_stations()

        if nam14_stations is None:
            nam14_stations = syn_nam14
        if itrf14_stations is None:
            itrf14_stations = syn_itrf14
    else:
        print("\n  Using downloaded real data for both frames.")

    # --- Write output files ---
    print("\n" + "-" * 40)
    print("Step 3: Writing output JSON files...")

    nam14_path = os.path.join(OUTPUT_DIR, "velocity-vectors-nam14.json")
    with open(nam14_path, "w") as f:
        json.dump(nam14_stations, f, indent=2)
    size_kb = os.path.getsize(nam14_path) / 1024
    print(f"\n  Wrote: {nam14_path}")
    print(f"  Stations: {len(nam14_stations)}")
    print(f"  Size: {size_kb:.1f} KB")

    itrf_path = os.path.join(OUTPUT_DIR, "velocity-vectors-itrf.json")
    with open(itrf_path, "w") as f:
        json.dump(itrf14_stations, f, indent=2)
    size_kb = os.path.getsize(itrf_path) / 1024
    print(f"\n  Wrote: {itrf_path}")
    print(f"  Stations: {len(itrf14_stations)}")
    print(f"  Size: {size_kb:.1f} KB")

    # --- Validation ---
    print("\n" + "=" * 60)
    print("Validation")
    print("=" * 60)

    for label, path in [("NAM14", nam14_path), ("ITRF14", itrf_path)]:
        with open(path) as f:
            data = json.load(f)
        print(f"\n  {label} ({os.path.basename(path)}):")
        print(f"    Station count: {len(data)}")

        lats = [s["latitude"] for s in data]
        lons = [s["longitude"] for s in data]
        speeds = [s["speed"] for s in data]
        ve = [s["velocityEast"] for s in data]
        vn = [s["velocityNorth"] for s in data]
        vu = [s["velocityUp"] for s in data]

        print(f"    Lat range: [{min(lats):.2f}, {max(lats):.2f}]")
        print(f"    Lon range: [{min(lons):.2f}, {max(lons):.2f}]")
        print(f"    Speed range: [{min(speeds):.1f}, {max(speeds):.1f}] mm/yr")
        print(f"    Mean speed: {sum(speeds)/len(speeds):.1f} mm/yr")
        print(f"    VelE range: [{min(ve):.1f}, {max(ve):.1f}] mm/yr")
        print(f"    VelN range: [{min(vn):.1f}, {max(vn):.1f}] mm/yr")
        print(f"    VelU range: [{min(vu):.1f}, {max(vu):.1f}] mm/yr")

        # Sanity checks
        assert len(data) >= 100, f"Too few stations: {len(data)}"
        assert all(LAT_MIN <= s["latitude"] <= LAT_MAX for s in data), \
            "Station latitude out of bounds"
        assert all(LON_MIN <= s["longitude"] <= LON_MAX for s in data), \
            "Station longitude out of bounds"

        # Check that speed = sqrt(ve^2 + vn^2) within rounding tolerance
        for s in data:
            expected = math.sqrt(s["velocityEast"]**2 + s["velocityNorth"]**2)
            assert abs(s["speed"] - expected) < 0.1, \
                f"Speed mismatch for {s['id']}: {s['speed']} vs {expected:.2f}"

    # Verify NAM14 speeds are generally lower than ITRF14
    # (because ITRF includes NA plate motion)
    with open(nam14_path) as f:
        nam_data = json.load(f)
    with open(itrf_path) as f:
        itrf_data = json.load(f)

    # Find matching stations (inland ones, not offshore)
    nam_speeds = {s["id"]: s["speed"] for s in nam_data}
    itrf_speeds = {s["id"]: s["speed"] for s in itrf_data}

    # Count how many inland stations have higher ITRF speed (expected)
    inland_faster_itrf = 0
    inland_total = 0
    for sid in nam_speeds:
        if sid in itrf_speeds and not sid.startswith("JDF") and not sid.startswith("GOR"):
            inland_total += 1
            if itrf_speeds[sid] > nam_speeds[sid]:
                inland_faster_itrf += 1

    if inland_total > 0:
        pct = 100 * inland_faster_itrf / inland_total
        print(f"\n  Frame consistency: {pct:.0f}% of inland stations move faster "
              f"in ITRF14 than NAM14 (expected: >80%)")
        if pct < 50:
            print("  [WARN] Frame velocities may be inconsistent")

    print("\n  All validations passed!")

    print("\n" + "=" * 60)
    print("Pipeline complete. Output files:")
    print(f"  1. {nam14_path}")
    print(f"  2. {itrf_path}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
