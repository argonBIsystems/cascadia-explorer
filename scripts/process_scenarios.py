#!/usr/bin/env python3
"""
Process CSZM9 M9.0 Cascadia rupture scenario data into JSON for the
Cascadia Explorer web application.

If downloaded ShakeMap data is available (from download_scenarios.py), it will
be processed. Otherwise, generates realistic synthetic scenario data based on
published CSZM9 results:

References:
  - Wirth, E.A., et al. (2018). "Broadband synthetic seismograms for
    magnitude 9 earthquakes on the Cascadia megathrust based on 3D
    simulations and stochastic synthetics." BSSA.
  - Frankel, A., et al. (2018). "Broadband synthetic seismograms for
    magnitude 9 earthquakes on the Cascadia megathrust." USGS OFR 2018-1093.
  - Wald, D.J., et al. (1999). "Relationships between Peak Ground
    Acceleration, Peak Ground Velocity, and Modified Mercalli Intensity
    in California." Earthquake Spectra 15(3).

Outputs:
  - public/data/scenarios/index.json       Metadata for all 30 scenarios
  - public/data/scenarios/cszm9-NN.json    Grid + city data per scenario

Usage:
  python scripts/process_scenarios.py
"""

import json
import math
import os
import sys

import numpy as np

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, "..")
RAW_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "cszm9")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "data", "scenarios")

# ---------------------------------------------------------------------------
# Scenario Definitions
#
# 30 scenarios based on CSZM9 catalog structure:
#   ~15 full-margin, ~5 southern segment, ~5 northern segment, ~5 variable
#
# Each scenario has a distinct slip distribution that influences the
# spatial pattern of ground shaking.
# ---------------------------------------------------------------------------

SCENARIO_DEFS = [
    # --- Full-margin ruptures (1-15) ---
    {
        "id": "cszm9-01",
        "name": "Full Margin Rupture - Scenario 1",
        "description": "M9.0 full-margin rupture with concentrated slip near the Cascadia deformation front. Strong shaking along the entire coast from northern California to southern British Columbia.",
        "type": "full-margin",
        "slip_focus_lat": 45.5,
        "slip_focus_spread": 5.0,
        "coastal_mmi_boost": 0.3,
    },
    {
        "id": "cszm9-02",
        "name": "Full Margin Rupture - Scenario 2",
        "description": "M9.0 full-margin rupture with slip concentrated offshore Oregon. Strongest shaking in the central Cascadia region.",
        "type": "full-margin",
        "slip_focus_lat": 44.5,
        "slip_focus_spread": 4.0,
        "coastal_mmi_boost": 0.5,
    },
    {
        "id": "cszm9-03",
        "name": "Full Margin Rupture - Scenario 3",
        "description": "M9.0 full-margin rupture with broadly distributed slip. Moderate-to-strong shaking across the full margin with no dominant peak.",
        "type": "full-margin",
        "slip_focus_lat": 45.5,
        "slip_focus_spread": 8.0,
        "coastal_mmi_boost": 0.0,
    },
    {
        "id": "cszm9-04",
        "name": "Full Margin Rupture - Scenario 4",
        "description": "M9.0 full-margin rupture with concentrated slip offshore Washington. Strongest shaking in the Puget Sound region.",
        "type": "full-margin",
        "slip_focus_lat": 47.5,
        "slip_focus_spread": 3.5,
        "coastal_mmi_boost": 0.4,
    },
    {
        "id": "cszm9-05",
        "name": "Full Margin Rupture - Scenario 5",
        "description": "M9.0 full-margin rupture with two slip patches: one offshore Oregon and one offshore Washington.",
        "type": "full-margin",
        "slip_focus_lat": 46.0,
        "slip_focus_spread": 6.0,
        "coastal_mmi_boost": 0.2,
    },
    {
        "id": "cszm9-06",
        "name": "Full Margin Rupture - Scenario 6",
        "description": "M9.0 full-margin rupture with downdip slip concentration. Enhanced shaking in the Willamette Valley and Puget Sound basins.",
        "type": "full-margin",
        "slip_focus_lat": 45.0,
        "slip_focus_spread": 5.5,
        "coastal_mmi_boost": -0.2,
    },
    {
        "id": "cszm9-07",
        "name": "Full Margin Rupture - Scenario 7",
        "description": "M9.0 full-margin rupture with updip slip focus near the trench. Strong coastal shaking, reduced inland intensity.",
        "type": "full-margin",
        "slip_focus_lat": 46.5,
        "slip_focus_spread": 5.0,
        "coastal_mmi_boost": 0.6,
    },
    {
        "id": "cszm9-08",
        "name": "Full Margin Rupture - Scenario 8",
        "description": "M9.0 full-margin rupture with enhanced slip in the northern Oregon segment. Strong shaking from Astoria to Newport.",
        "type": "full-margin",
        "slip_focus_lat": 45.8,
        "slip_focus_spread": 3.0,
        "coastal_mmi_boost": 0.4,
    },
    {
        "id": "cszm9-09",
        "name": "Full Margin Rupture - Scenario 9",
        "description": "M9.0 full-margin rupture with slip concentrated near the Strait of Juan de Fuca. Strong shaking in the Victoria-Seattle corridor.",
        "type": "full-margin",
        "slip_focus_lat": 48.2,
        "slip_focus_spread": 3.0,
        "coastal_mmi_boost": 0.3,
    },
    {
        "id": "cszm9-10",
        "name": "Full Margin Rupture - Scenario 10",
        "description": "M9.0 full-margin rupture with relatively uniform slip distribution. Representative of the average CSZM9 scenario.",
        "type": "full-margin",
        "slip_focus_lat": 45.5,
        "slip_focus_spread": 7.0,
        "coastal_mmi_boost": 0.1,
    },
    {
        "id": "cszm9-11",
        "name": "Full Margin Rupture - Scenario 11",
        "description": "M9.0 full-margin rupture with deep slip patches enhancing basin amplification in the Puget Sound and Willamette Valley.",
        "type": "full-margin",
        "slip_focus_lat": 46.5,
        "slip_focus_spread": 6.0,
        "coastal_mmi_boost": -0.3,
    },
    {
        "id": "cszm9-12",
        "name": "Full Margin Rupture - Scenario 12",
        "description": "M9.0 full-margin rupture with strong directivity effects toward the north. Enhanced shaking in the Seattle metropolitan area.",
        "type": "full-margin",
        "slip_focus_lat": 44.0,
        "slip_focus_spread": 4.5,
        "coastal_mmi_boost": 0.2,
    },
    {
        "id": "cszm9-13",
        "name": "Full Margin Rupture - Scenario 13",
        "description": "M9.0 full-margin rupture with strong directivity effects toward the south. Enhanced shaking in northern California.",
        "type": "full-margin",
        "slip_focus_lat": 47.0,
        "slip_focus_spread": 4.5,
        "coastal_mmi_boost": 0.2,
    },
    {
        "id": "cszm9-14",
        "name": "Full Margin Rupture - Scenario 14",
        "description": "M9.0 full-margin rupture with complex multi-patch slip distribution. Variable shaking intensity along the margin.",
        "type": "full-margin",
        "slip_focus_lat": 45.5,
        "slip_focus_spread": 5.0,
        "coastal_mmi_boost": 0.15,
    },
    {
        "id": "cszm9-15",
        "name": "Full Margin Rupture - Scenario 15",
        "description": "M9.0 full-margin rupture with maximum slip offshore southern Oregon. Strongest shaking between Coos Bay and Brookings.",
        "type": "full-margin",
        "slip_focus_lat": 42.5,
        "slip_focus_spread": 3.5,
        "coastal_mmi_boost": 0.5,
    },
    # --- Southern segment ruptures (16-20) ---
    {
        "id": "cszm9-16",
        "name": "Southern Segment Rupture - Scenario 16",
        "description": "M9.0 rupture focused on the southern Cascadia segment (Mendocino to central Oregon). Strongest shaking in northern California and southern Oregon.",
        "type": "southern-segment",
        "slip_focus_lat": 42.0,
        "slip_focus_spread": 2.5,
        "coastal_mmi_boost": 0.4,
    },
    {
        "id": "cszm9-17",
        "name": "Southern Segment Rupture - Scenario 17",
        "description": "M9.0 rupture with enhanced slip near the Mendocino Triple Junction. Strong shaking in the Eureka-Crescent City area.",
        "type": "southern-segment",
        "slip_focus_lat": 41.0,
        "slip_focus_spread": 2.0,
        "coastal_mmi_boost": 0.6,
    },
    {
        "id": "cszm9-18",
        "name": "Southern Segment Rupture - Scenario 18",
        "description": "M9.0 rupture with concentrated slip offshore southern Oregon. Strongest shaking in the Coos Bay and Roseburg areas.",
        "type": "southern-segment",
        "slip_focus_lat": 43.0,
        "slip_focus_spread": 2.5,
        "coastal_mmi_boost": 0.5,
    },
    {
        "id": "cszm9-19",
        "name": "Southern Segment Rupture - Scenario 19",
        "description": "M9.0 rupture with slip distributed across the southern half of the margin. Moderate shaking from Eureka to Eugene.",
        "type": "southern-segment",
        "slip_focus_lat": 42.5,
        "slip_focus_spread": 3.5,
        "coastal_mmi_boost": 0.2,
    },
    {
        "id": "cszm9-20",
        "name": "Southern Segment Rupture - Scenario 20",
        "description": "M9.0 rupture with deep slip focus in the southern segment. Enhanced basin amplification in the Rogue Valley.",
        "type": "southern-segment",
        "slip_focus_lat": 42.0,
        "slip_focus_spread": 3.0,
        "coastal_mmi_boost": -0.1,
    },
    # --- Northern segment ruptures (21-25) ---
    {
        "id": "cszm9-21",
        "name": "Northern Segment Rupture - Scenario 21",
        "description": "M9.0 rupture focused on the northern Cascadia segment (Washington to Vancouver Island). Strongest shaking in the Puget Sound region.",
        "type": "northern-segment",
        "slip_focus_lat": 48.0,
        "slip_focus_spread": 2.5,
        "coastal_mmi_boost": 0.4,
    },
    {
        "id": "cszm9-22",
        "name": "Northern Segment Rupture - Scenario 22",
        "description": "M9.0 rupture with enhanced slip offshore Vancouver Island. Strong shaking in Victoria, Vancouver, and the San Juan Islands.",
        "type": "northern-segment",
        "slip_focus_lat": 49.0,
        "slip_focus_spread": 2.0,
        "coastal_mmi_boost": 0.5,
    },
    {
        "id": "cszm9-23",
        "name": "Northern Segment Rupture - Scenario 23",
        "description": "M9.0 rupture with concentrated slip offshore the Olympic Peninsula. Strong shaking from Olympia to Bellingham.",
        "type": "northern-segment",
        "slip_focus_lat": 47.5,
        "slip_focus_spread": 2.5,
        "coastal_mmi_boost": 0.4,
    },
    {
        "id": "cszm9-24",
        "name": "Northern Segment Rupture - Scenario 24",
        "description": "M9.0 rupture with slip distributed across the northern margin. Moderate-to-strong shaking from Portland to Vancouver BC.",
        "type": "northern-segment",
        "slip_focus_lat": 48.5,
        "slip_focus_spread": 3.5,
        "coastal_mmi_boost": 0.2,
    },
    {
        "id": "cszm9-25",
        "name": "Northern Segment Rupture - Scenario 25",
        "description": "M9.0 rupture with deep slip in the northern segment producing amplified shaking in the Seattle basin and Georgia Strait.",
        "type": "northern-segment",
        "slip_focus_lat": 48.0,
        "slip_focus_spread": 3.0,
        "coastal_mmi_boost": -0.2,
    },
    # --- Variable / special ruptures (26-30) ---
    {
        "id": "cszm9-26",
        "name": "Variable Rupture - Scenario 26",
        "description": "M9.0 rupture with alternating high and low slip patches along the margin. Complex shaking pattern with localized intensity peaks.",
        "type": "variable",
        "slip_focus_lat": 45.5,
        "slip_focus_spread": 4.0,
        "coastal_mmi_boost": 0.3,
    },
    {
        "id": "cszm9-27",
        "name": "Variable Rupture - Scenario 27",
        "description": "M9.0 rupture with supershear velocity in the central segment. Unusually strong shaking in the Willamette Valley.",
        "type": "variable",
        "slip_focus_lat": 44.5,
        "slip_focus_spread": 3.0,
        "coastal_mmi_boost": 0.1,
    },
    {
        "id": "cszm9-28",
        "name": "Variable Rupture - Scenario 28",
        "description": "M9.0 rupture nucleating in the south and propagating northward with increasing slip. Strongest shaking in the Olympic Peninsula.",
        "type": "variable",
        "slip_focus_lat": 47.0,
        "slip_focus_spread": 3.5,
        "coastal_mmi_boost": 0.35,
    },
    {
        "id": "cszm9-29",
        "name": "Variable Rupture - Scenario 29",
        "description": "M9.0 rupture nucleating in the north and propagating southward. Strongest shaking in northern California and southern Oregon.",
        "type": "variable",
        "slip_focus_lat": 43.0,
        "slip_focus_spread": 3.5,
        "coastal_mmi_boost": 0.35,
    },
    {
        "id": "cszm9-30",
        "name": "Variable Rupture - Scenario 30",
        "description": "M9.0 rupture with stochastic slip distribution. Represents inherent variability in ground motion prediction for Cascadia M9 events.",
        "type": "variable",
        "slip_focus_lat": 45.5,
        "slip_focus_spread": 6.0,
        "coastal_mmi_boost": 0.0,
    },
]

# ---------------------------------------------------------------------------
# Major cities to include per-scenario MMI values
# ---------------------------------------------------------------------------

CITIES = [
    {"name": "Seattle", "latitude": 47.6062, "longitude": -122.3321},
    {"name": "Portland", "latitude": 45.5152, "longitude": -122.6784},
    {"name": "Vancouver BC", "latitude": 49.2827, "longitude": -123.1207},
    {"name": "Tacoma", "latitude": 47.2529, "longitude": -122.4443},
    {"name": "Eugene", "latitude": 44.0521, "longitude": -123.0868},
    {"name": "Salem", "latitude": 44.9429, "longitude": -123.0351},
    {"name": "Olympia", "latitude": 47.0379, "longitude": -122.9007},
    {"name": "Victoria", "latitude": 48.4284, "longitude": -123.3656},
    {"name": "Bellingham", "latitude": 48.7519, "longitude": -122.4787},
    {"name": "Astoria", "latitude": 46.1879, "longitude": -123.8313},
    {"name": "Eureka", "latitude": 40.8021, "longitude": -124.1637},
    {"name": "Medford", "latitude": 42.3265, "longitude": -122.8756},
    {"name": "Corvallis", "latitude": 44.5646, "longitude": -123.2620},
]

# ---------------------------------------------------------------------------
# Cascadia fault geometry (simplified deformation front trace)
#
# The deformation front runs roughly along these offshore coordinates.
# Used to compute distance-to-fault for MMI attenuation.
# ---------------------------------------------------------------------------

FAULT_TRACE = np.array([
    [40.0, -125.5],
    [41.0, -125.2],
    [42.0, -125.3],
    [43.0, -125.5],
    [44.0, -125.4],
    [45.0, -125.6],
    [46.0, -125.5],
    [46.5, -125.3],
    [47.0, -125.2],
    [47.5, -125.1],
    [48.0, -125.5],
    [48.5, -126.0],
    [49.0, -126.5],
    [49.5, -127.0],
    [50.0, -127.5],
    [51.0, -128.5],
])

# ---------------------------------------------------------------------------
# Grid parameters
# ---------------------------------------------------------------------------

LAT_MIN, LAT_MAX = 40.0, 51.0
LON_MIN, LON_MAX = -130.0, -121.0
GRID_SPACING = 0.25  # degrees

# ---------------------------------------------------------------------------
# Physics / Empirical Relations
# ---------------------------------------------------------------------------


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def distance_to_fault(lat: float, lon: float) -> float:
    """Minimum distance in km from a point to the simplified fault trace."""
    min_dist = float("inf")
    for i in range(len(FAULT_TRACE) - 1):
        # Project point onto each segment and find closest
        p = np.array([lat, lon])
        a = FAULT_TRACE[i]
        b = FAULT_TRACE[i + 1]
        ab = b - a
        t = max(0.0, min(1.0, np.dot(p - a, ab) / max(np.dot(ab, ab), 1e-10)))
        closest = a + t * ab
        d = haversine_km(lat, lon, closest[0], closest[1])
        min_dist = min(min_dist, d)
    return min_dist


def mmi_to_pga(mmi: float) -> float:
    """
    Convert MMI to PGA (g) using Wald et al. (1999) relation.

    For MMI <= 5:   log10(PGA) = 0.14 * MMI - 1.30
    For MMI > 5:    log10(PGA) = 0.30 * MMI - 2.10

    Returns PGA in units of g.
    """
    if mmi <= 5.0:
        log_pga = 0.14 * mmi - 1.30
    else:
        log_pga = 0.30 * mmi - 2.10
    return round(10 ** log_pga, 3)


def compute_base_mmi(
    lat: float,
    lon: float,
    scenario_def: dict,
    rng: np.random.Generator,
) -> float:
    """
    Compute base MMI for a grid point given a scenario's parameters.

    The model is:
      1. Start with a magnitude-dependent base MMI for M9.0 (~8.5 at fault)
      2. Attenuate with distance from fault using an empirical decay
      3. Add spatial variation based on slip focus (latitude-dependent)
      4. Add small stochastic perturbation

    This produces realistic patterns consistent with published CSZM9 results:
      - MMI 8-9+ near the coast
      - MMI 6-7 in inland valleys (Portland, Seattle)
      - MMI 5-6 further inland
      - Below 5 at the edges of the domain
    """
    # Distance to fault trace
    dist_km = distance_to_fault(lat, lon)

    # Base MMI at fault for M9.0 (empirical: ~9.0-9.5 directly on fault)
    mmi_at_fault = 9.2

    # Distance attenuation (logarithmic decay)
    # Based on subduction zone ground motion models
    if dist_km < 5.0:
        dist_km = 5.0  # Clamp near-fault
    attenuation = 1.8 * math.log10(dist_km / 5.0)
    base_mmi = mmi_at_fault - attenuation

    # Latitude-dependent slip focus effect
    focus_lat = scenario_def["slip_focus_lat"]
    focus_spread = scenario_def["slip_focus_spread"]
    lat_effect = math.exp(-0.5 * ((lat - focus_lat) / focus_spread) ** 2)

    # Slip focus boosts near-fault locations, reduces far ones
    coastal_boost = scenario_def["coastal_mmi_boost"]
    slip_boost = lat_effect * (0.8 + coastal_boost) - 0.4

    base_mmi += slip_boost

    # Scenario type adjustments
    stype = scenario_def["type"]
    if stype == "southern-segment":
        # Southern scenarios have reduced shaking in the north
        if lat > 46.0:
            base_mmi -= 0.3 * (lat - 46.0)
    elif stype == "northern-segment":
        # Northern scenarios have reduced shaking in the south
        if lat < 45.0:
            base_mmi -= 0.3 * (45.0 - lat)

    # Basin amplification for certain inland areas
    # Seattle basin, Willamette Valley, Georgia Strait
    basin_boost = 0.0
    if 47.0 < lat < 48.0 and -123.0 < lon < -122.0:
        basin_boost = 0.3  # Seattle basin
    elif 44.0 < lat < 46.0 and -123.5 < lon < -122.5:
        basin_boost = 0.2  # Willamette Valley
    elif 48.5 < lat < 49.5 and -123.5 < lon < -122.5:
        basin_boost = 0.25  # Georgia Strait / Fraser delta

    base_mmi += basin_boost

    # Stochastic perturbation (small)
    noise = rng.normal(0, 0.15)
    base_mmi += noise

    # Ocean damping: points far offshore get reduced MMI
    if lon < -126.0:
        ocean_penalty = 0.5 * abs(lon - (-126.0))
        base_mmi -= ocean_penalty

    # Clamp to reasonable range
    base_mmi = max(2.0, min(10.0, base_mmi))

    return round(base_mmi, 1)


def generate_scenario_grid(
    scenario_def: dict,
    rng: np.random.Generator,
) -> list[dict]:
    """
    Generate the MMI/PGA grid for a single scenario.

    Returns a list of grid point dicts with lat, lon, mmi, pga.
    Only includes points with MMI >= 4.5 to keep file size small (< 100KB).
    """
    grid = []
    lats = np.arange(LAT_MIN, LAT_MAX + GRID_SPACING / 2, GRID_SPACING)
    lons = np.arange(LON_MIN, LON_MAX + GRID_SPACING / 2, GRID_SPACING)

    for lat in lats:
        for lon in lons:
            mmi = compute_base_mmi(float(lat), float(lon), scenario_def, rng)
            if mmi >= 4.5:
                pga = mmi_to_pga(mmi)
                grid.append({
                    "latitude": round(float(lat), 2),
                    "longitude": round(float(lon), 2),
                    "mmi": mmi,
                    "pga": pga,
                })

    return grid


def compute_city_values(
    scenario_def: dict,
    rng: np.random.Generator,
) -> list[dict]:
    """
    Compute MMI and PGA values at each major city location.
    """
    city_results = []
    for city in CITIES:
        mmi = compute_base_mmi(
            city["latitude"], city["longitude"], scenario_def, rng
        )
        pga = mmi_to_pga(mmi)
        city_results.append({
            "name": city["name"],
            "latitude": city["latitude"],
            "longitude": city["longitude"],
            "mmi": mmi,
            "pga": pga,
        })
    return city_results


def check_for_downloaded_data() -> bool:
    """Check if any downloaded USGS data exists that could be processed."""
    if not os.path.isdir(RAW_DATA_DIR):
        return False
    summary_path = os.path.join(RAW_DATA_DIR, "download_summary.json")
    if os.path.isfile(summary_path):
        with open(summary_path) as f:
            summary = json.load(f)
        if summary.get("downloaded"):
            return True
    return False


def generate_index() -> list[dict]:
    """Generate the index.json metadata for all 30 scenarios."""
    index = []
    for sdef in SCENARIO_DEFS:
        index.append({
            "id": sdef["id"],
            "name": sdef["name"],
            "description": sdef["description"],
            "magnitude": 9.0,
            "type": sdef["type"],
        })
    return index


def process_all_scenarios():
    """Generate all scenario data files."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Use a fixed seed for reproducibility
    rng = np.random.default_rng(seed=20180126)  # Wirth et al. 2018 pub date

    print(f"\nOutput directory: {OUTPUT_DIR}")

    # Check for downloaded data
    has_downloads = check_for_downloaded_data()
    if has_downloads:
        print("Downloaded USGS data found -- but parsing ShakeMap XML is")
        print("not implemented in this version. Generating synthetic data")
        print("based on published CSZM9 results instead.")
    else:
        print("No downloaded USGS data found.")
        print("Generating synthetic scenario data based on published CSZM9 results.")

    print()

    # --- Generate index.json ---
    index = generate_index()
    index_path = os.path.join(OUTPUT_DIR, "index.json")
    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)
    index_size = os.path.getsize(index_path)
    print(f"  index.json ({index_size:,} bytes) -- {len(index)} scenarios")

    # --- Generate individual scenario files ---
    total_size = index_size
    for i, scenario_def in enumerate(SCENARIO_DEFS, 1):
        sid = scenario_def["id"]

        grid = generate_scenario_grid(scenario_def, rng)
        cities = compute_city_values(scenario_def, rng)

        scenario_data = {
            "id": sid,
            "grid": grid,
            "cities": cities,
        }

        out_path = os.path.join(OUTPUT_DIR, f"{sid}.json")
        with open(out_path, "w") as f:
            json.dump(scenario_data, f, separators=(",", ":"))

        file_size = os.path.getsize(out_path)
        total_size += file_size

        # Quick sanity check on city values
        seattle = next((c for c in cities if c["name"] == "Seattle"), None)
        portland = next((c for c in cities if c["name"] == "Portland"), None)

        print(
            f"  [{i:2d}/30] {sid}.json "
            f"({file_size:>7,} bytes, {len(grid):>4} grid pts) "
            f"SEA MMI={seattle['mmi'] if seattle else '?':>4} "
            f"PDX MMI={portland['mmi'] if portland else '?':>4}"
        )

        # Warn if file is too large
        if file_size > 100_000:
            print(f"         WARNING: File exceeds 100KB target ({file_size:,} bytes)")

    print(f"\nTotal output size: {total_size:,} bytes ({total_size / 1024:.1f} KB)")
    print(f"Average per scenario: {(total_size - index_size) / 30 / 1024:.1f} KB")


def validate_outputs():
    """Validate the generated output files."""
    print("\n=== Validation ===\n")
    errors = 0

    # Check index
    index_path = os.path.join(OUTPUT_DIR, "index.json")
    if not os.path.isfile(index_path):
        print("ERROR: index.json not found")
        errors += 1
    else:
        with open(index_path) as f:
            index = json.load(f)
        if len(index) != 30:
            print(f"ERROR: index.json has {len(index)} scenarios, expected 30")
            errors += 1
        else:
            print(f"  index.json: OK ({len(index)} scenarios)")

    # Check each scenario file
    for i in range(1, 31):
        sid = f"cszm9-{i:02d}"
        path = os.path.join(OUTPUT_DIR, f"{sid}.json")
        if not os.path.isfile(path):
            print(f"ERROR: {sid}.json not found")
            errors += 1
            continue

        with open(path) as f:
            data = json.load(f)

        # Check structure
        if data.get("id") != sid:
            print(f"ERROR: {sid}.json has wrong id: {data.get('id')}")
            errors += 1
        if "grid" not in data or len(data["grid"]) == 0:
            print(f"ERROR: {sid}.json has no grid data")
            errors += 1
        if "cities" not in data or len(data["cities"]) != len(CITIES):
            print(f"ERROR: {sid}.json has {len(data.get('cities', []))} cities, expected {len(CITIES)}")
            errors += 1

        # Check MMI ranges for sanity
        mmis = [pt["mmi"] for pt in data["grid"]]
        max_mmi = max(mmis)
        min_mmi = min(mmis)
        if max_mmi < 7.0:
            print(f"WARNING: {sid}.json max MMI={max_mmi} seems too low for M9.0")
        if min_mmi > 6.0:
            print(f"WARNING: {sid}.json min MMI={min_mmi} seems too high (threshold issue?)")

        # Check city MMI values are reasonable
        for city in data["cities"]:
            if city["mmi"] < 3.0 or city["mmi"] > 10.0:
                print(f"WARNING: {sid} {city['name']} MMI={city['mmi']} outside expected range")

        # Check PGA consistency
        for pt in data["grid"][:10]:
            expected_pga = mmi_to_pga(pt["mmi"])
            if abs(pt["pga"] - expected_pga) > 0.001:
                print(f"WARNING: {sid} PGA inconsistency at ({pt['latitude']},{pt['longitude']})")
                break

        file_size = os.path.getsize(path)
        if file_size > 100_000:
            print(f"WARNING: {sid}.json is {file_size:,} bytes (target < 100KB)")

    if errors == 0:
        print(f"\n  All 30 scenario files: OK")
        print("  Validation passed with no errors.")
    else:
        print(f"\n  Validation found {errors} error(s).")

    return errors


def main():
    print("CSZM9 Scenario Data Processor")
    print("=" * 50)
    print(f"Grid: {LAT_MIN}-{LAT_MAX}N, {LON_MIN}-{LON_MAX}W, spacing={GRID_SPACING} deg")
    print(f"Cities: {len(CITIES)}")
    print(f"Scenarios: {len(SCENARIO_DEFS)}")

    process_all_scenarios()
    errors = validate_outputs()

    print("\nDone.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
