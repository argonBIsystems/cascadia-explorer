#!/usr/bin/env python3
"""
Download USGS CSZM9 M9.0 Cascadia rupture scenario data.

Attempts to download ShakeMap grid data from the USGS CSZM9 scenario catalog.
If downloads fail, generates realistic synthetic scenario data based on
published CSZM9 results (Wirth et al., 2018; Frankel et al., 2018).

CSZM9 Catalog: https://earthquake.usgs.gov/scenarios/catalog/cszm9/
"""

import json
import os
import sys
import time
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "cszm9")

# USGS CSZM9 scenario event IDs (30 scenarios)
# These follow the naming convention from the USGS catalog
SCENARIO_IDS = [f"cszm9scen{i:02d}_se" for i in range(1, 31)]

# URLs to try for ShakeMap grid data
SHAKEMAP_URL_PATTERNS = [
    "https://earthquake.usgs.gov/scenarios/eventpage/{scenario_id}/shakemap/grids/grid.xml",
    "https://earthquake.usgs.gov/archive/product/shakemap/{scenario_id}/us/1/download/grid.xml",
    "https://earthquake.usgs.gov/scenarios/eventpage/{scenario_id}/shakemap/download/grid.xml.zip",
    "https://earthquake.usgs.gov/fdsnws/event/1/query?eventid={scenario_id}&format=geojson",
]

HEADERS = {
    "User-Agent": "CascadiaExplorer/1.0 (research visualization project)"
}


def ensure_data_dir():
    """Create the data directory if it doesn't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"Data directory: {DATA_DIR}")


def try_download_scenario(scenario_id: str) -> dict | None:
    """
    Attempt to download ShakeMap data for a single scenario.
    Returns parsed data dict or None if all URLs fail.
    """
    for url_pattern in SHAKEMAP_URL_PATTERNS:
        url = url_pattern.format(scenario_id=scenario_id)
        try:
            print(f"  Trying: {url}")
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                # Save the raw response
                ext = "xml" if "xml" in url else "json"
                out_path = os.path.join(DATA_DIR, f"{scenario_id}.{ext}")
                with open(out_path, "wb") as f:
                    f.write(resp.content)
                print(f"  -> Downloaded successfully to {out_path}")
                return {"status": "downloaded", "path": out_path, "url": url}
        except requests.RequestException as e:
            print(f"  -> Failed: {e}")
        time.sleep(0.5)  # Be polite to USGS servers

    return None


def download_all():
    """
    Attempt to download all 30 CSZM9 scenarios.
    Returns a summary of what was downloaded vs what needs synthesis.
    """
    ensure_data_dir()

    results = {"downloaded": [], "failed": []}

    print("\n=== Attempting to download CSZM9 ShakeMap data ===\n")

    for i, scenario_id in enumerate(SCENARIO_IDS, 1):
        print(f"\n[{i}/30] Scenario: {scenario_id}")
        result = try_download_scenario(scenario_id)
        if result:
            results["downloaded"].append(scenario_id)
        else:
            results["failed"].append(scenario_id)
            print(f"  -> All URLs failed for {scenario_id}")

    # Save download summary
    summary_path = os.path.join(DATA_DIR, "download_summary.json")
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n=== Download Summary ===")
    print(f"Downloaded: {len(results['downloaded'])}/30")
    print(f"Failed: {len(results['failed'])}/30")
    print(f"Summary saved to: {summary_path}")

    return results


def main():
    """
    Main entry point. Downloads what we can, marks the rest for synthesis.
    """
    print("CSZM9 Scenario Data Downloader")
    print("=" * 50)
    print("Source: https://earthquake.usgs.gov/scenarios/catalog/cszm9/")
    print()

    results = download_all()

    if results["failed"]:
        print(f"\n{len(results['failed'])} scenarios need synthetic data generation.")
        print("Run process_scenarios.py to generate complete dataset.")

    return 0 if results["downloaded"] else 1


if __name__ == "__main__":
    sys.exit(main())
