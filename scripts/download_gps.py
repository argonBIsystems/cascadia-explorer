#!/usr/bin/env python3
"""
Download GAGE/UNAVCO GPS velocity field data for the Cascadia region.

Attempts to download velocity field solutions from EarthScope/UNAVCO in
both ITRF2014 and NAM14 reference frames.  If the downloads fail (the
UNAVCO data portal URLs change frequently), the processing script will
fall back to generating realistic synthetic station data based on
published GPS velocity patterns for the Cascadia subduction zone.

Downloads to: data/gps/
"""

import os
import sys
import requests

# Project root (one level up from scripts/)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data", "gps")

# Cascadia bounding box for filtering
LAT_MIN, LAT_MAX = 40.0, 51.0
LON_MIN, LON_MAX = -130.0, -121.0

# -------------------------------------------------------------------
# UNAVCO/EarthScope velocity field URLs
# These are best-effort guesses at current locations; the UNAVCO data
# portal reorganises periodically.
# -------------------------------------------------------------------

VELOCITY_URLS = {
    "nam14": [
        # GAGE final combined velocity field, NAM14 frame
        "https://data.unavco.org/archive/gnss/products/velocity/cwu.final_nam14.vel",
        "https://data.unavco.org/archive/gnss/products/velocity/pbo.final_nam14.vel",
        "https://gage-data.earthscope.org/archive/gnss/products/velocity/cwu.final_nam14.vel",
        "https://gage-data.earthscope.org/archive/gnss/products/velocity/pbo.final_nam14.vel",
        # NGL (Nevada Geodetic Lab) NAM14 velocities
        "http://geodesy.unr.edu/velocities/midas.NA.txt",
    ],
    "itrf14": [
        "https://data.unavco.org/archive/gnss/products/velocity/cwu.final_igs14.vel",
        "https://data.unavco.org/archive/gnss/products/velocity/pbo.final_igs14.vel",
        "https://gage-data.earthscope.org/archive/gnss/products/velocity/cwu.final_igs14.vel",
        "https://gage-data.earthscope.org/archive/gnss/products/velocity/pbo.final_igs14.vel",
        # NGL IGS14 velocities
        "http://geodesy.unr.edu/velocities/midas.IGS14.txt",
    ],
}


def download_velocity_file(urls, output_filename, description):
    """Try downloading a velocity file from multiple candidate URLs.

    Returns True if the file was downloaded (or already exists), False
    if all URLs failed.
    """
    dest = os.path.join(DATA_DIR, output_filename)

    if os.path.exists(dest):
        size = os.path.getsize(dest)
        print(f"  [SKIP] {output_filename} already exists ({size:,} bytes)")
        return True

    for url in urls:
        print(f"  Trying: {url}")
        try:
            resp = requests.get(url, timeout=30, stream=True)
            if resp.status_code == 200:
                content_type = resp.headers.get("Content-Type", "")
                # Quick sanity check: velocity files are plain text
                first_chunk = next(resp.iter_content(chunk_size=512), b"")
                if len(first_chunk) == 0:
                    print(f"  [FAIL] Empty response")
                    continue

                # Write file
                with open(dest, "wb") as f:
                    f.write(first_chunk)
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)

                size = os.path.getsize(dest)
                print(f"  [OK] Downloaded {output_filename} ({size:,} bytes)")
                return True
            else:
                print(f"  [FAIL] HTTP {resp.status_code}")
        except requests.RequestException as e:
            print(f"  [FAIL] {e}")

    print(f"  [WARN] Could not download {description}.")
    print(f"         Process script will generate synthetic data.")
    return False


def main():
    print("=" * 60)
    print("GPS Velocity Field Downloader -- Cascadia Region")
    print("=" * 60)

    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"\nOutput directory: {DATA_DIR}")
    print(f"Bounding box: {LAT_MIN}-{LAT_MAX} N, {LON_MIN}-{LON_MAX} E\n")

    # 1. NAM14 velocity field
    print("1. Downloading NAM14 velocity field...")
    nam_ok = download_velocity_file(
        VELOCITY_URLS["nam14"],
        "velocity_nam14.vel",
        "NAM14 GPS velocity field",
    )

    # 2. ITRF2014 velocity field
    print("\n2. Downloading ITRF2014 velocity field...")
    itrf_ok = download_velocity_file(
        VELOCITY_URLS["itrf14"],
        "velocity_itrf14.vel",
        "ITRF2014 GPS velocity field",
    )

    # Summary
    print("\n" + "=" * 60)
    if nam_ok and itrf_ok:
        print("All velocity files downloaded successfully.")
    elif nam_ok or itrf_ok:
        print("Partial download success.")
        print("Process script can derive the other frame if one is present,")
        print("or will generate synthetic data for any missing frames.")
    else:
        print("Downloads failed. This is expected -- UNAVCO/EarthScope URLs")
        print("change frequently.  The processing script will generate")
        print("realistic synthetic GPS velocity data based on published")
        print("Cascadia GPS measurements (McCaffrey et al., 2013; Schmalzle")
        print("et al., 2014; Michel et al., 2019).")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
