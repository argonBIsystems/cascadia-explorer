#!/usr/bin/env python3
"""
Download Cascadia Slab2 data from USGS slab2 GitHub repository.

Downloads:
  - cas_slab2_dep_02.24.18.grd  (depth grid, GMT/NetCDF format)
  - cas_slab2_clp_02.24.18.csv  (clip polygon)

Saves to: data/slab2/

If downloads fail (404, binary issues), the processing script will
fall back to generating synthetic data from published Slab2 parameters.
"""

import os
import sys
import requests

# Project root (one level up from scripts/)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data", "slab2")

# USGS Slab2 GitHub URLs — try multiple paths since the repo structure
# has changed over time
DEPTH_GRID_URLS = [
    "https://raw.githubusercontent.com/usgs/slab2/master/Output/cas_slab2_dep_02.24.18.grd",
    "https://raw.githubusercontent.com/usgs/slab2/main/Output/cas_slab2_dep_02.24.18.grd",
    "https://raw.githubusercontent.com/usgs/slab2/master/cas_slab2_dep_02.24.18.grd",
    "https://raw.githubusercontent.com/usgs/slab2/main/cas_slab2_dep_02.24.18.grd",
]

CLIP_POLYGON_URLS = [
    "https://raw.githubusercontent.com/usgs/slab2/master/Output/cas_slab2_clp_02.24.18.csv",
    "https://raw.githubusercontent.com/usgs/slab2/main/Output/cas_slab2_clp_02.24.18.csv",
    "https://raw.githubusercontent.com/usgs/slab2/master/cas_slab2_clp_02.24.18.csv",
    "https://raw.githubusercontent.com/usgs/slab2/main/cas_slab2_clp_02.24.18.csv",
]


def download_file(urls, filename, description):
    """Try downloading from multiple URLs, return True if successful."""
    dest = os.path.join(DATA_DIR, filename)

    if os.path.exists(dest):
        size = os.path.getsize(dest)
        print(f"  [SKIP] {filename} already exists ({size:,} bytes)")
        return True

    for url in urls:
        print(f"  Trying: {url}")
        try:
            resp = requests.get(url, timeout=30, stream=True)
            if resp.status_code == 200:
                with open(dest, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                size = os.path.getsize(dest)
                print(f"  [OK] Downloaded {filename} ({size:,} bytes)")
                return True
            else:
                print(f"  [FAIL] HTTP {resp.status_code}")
        except requests.RequestException as e:
            print(f"  [FAIL] {e}")

    print(f"  [WARN] Could not download {description}. "
          f"Process script will use synthetic fallback.")
    return False


def main():
    print("=" * 60)
    print("Slab2 Data Downloader — Cascadia Subduction Zone")
    print("=" * 60)

    # Create output directory
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"\nOutput directory: {DATA_DIR}\n")

    # Download depth grid
    print("1. Downloading depth grid (cas_slab2_dep_02.24.18.grd)...")
    grd_ok = download_file(
        DEPTH_GRID_URLS,
        "cas_slab2_dep_02.24.18.grd",
        "Slab2 depth grid"
    )

    # Download clip polygon
    print("\n2. Downloading clip polygon (cas_slab2_clp_02.24.18.csv)...")
    clp_ok = download_file(
        CLIP_POLYGON_URLS,
        "cas_slab2_clp_02.24.18.csv",
        "Slab2 clip polygon"
    )

    # Summary
    print("\n" + "=" * 60)
    if grd_ok and clp_ok:
        print("All files downloaded successfully.")
    elif grd_ok:
        print("Depth grid downloaded. Clip polygon missing (non-critical).")
    else:
        print("Downloads failed. The processing script will generate")
        print("synthetic slab data based on published Slab2 parameters.")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
