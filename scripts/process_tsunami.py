#!/usr/bin/env python3
"""
Process tsunami data for Cascadia Explorer.

Reads synthetic (or downloaded) tsunami data and produces optimized
output files for the web application:

1. public/data/tsunami/cascadia-propagation.json
   - Animation frames for tsunami wave propagation visualization
   - Target: < 500 KB

2. public/data/tsunami/coastal-arrivals.json
   - Arrival times and max wave heights at coastal communities
   - Target: < 5 KB

Usage:
    python scripts/process_tsunami.py

Prerequisites:
    python scripts/download_tsunami.py  (generates source data)
"""

import json
import math
import os
import sys

import numpy as np

# Project root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data", "tsunami")
OUTPUT_DIR = os.path.join(ROOT, "public", "data", "tsunami")

# Input files (from download_tsunami.py)
PROPAGATION_INPUT = os.path.join(DATA_DIR, "synthetic_propagation.json")
ARRIVALS_INPUT = os.path.join(DATA_DIR, "coastal_arrivals.json")


def optimize_propagation(data):
    """
    Optimize propagation data for web delivery.

    Strategies to reduce file size:
    1. Round coordinates to 1 decimal (0.5-degree grid, so .0 and .5 only)
    2. Round heights to 2 decimal places
    3. Remove points with very small wave heights
    4. Use compact JSON encoding
    5. Limit points per frame if needed
    """
    print("\n  Optimizing propagation data for web delivery...")

    metadata = data["metadata"]
    raw_frames = data["frames"]

    total_raw_points = sum(len(f["points"]) for f in raw_frames)
    print(f"  Raw data: {len(raw_frames)} frames, {total_raw_points:,} total points")

    # Determine a height threshold that keeps file under 500KB
    # Start with a generous threshold and tighten if needed
    height_threshold = 0.03
    max_file_bytes = 500 * 1024

    for attempt in range(10):
        optimized_frames = []

        for frame in raw_frames:
            opt_points = []
            for p in frame["points"]:
                h = p["height"]
                if abs(h) < height_threshold:
                    continue
                opt_points.append({
                    "latitude": round(p["latitude"], 1),
                    "longitude": round(p["longitude"], 1),
                    "height": round(h, 2)
                })
            optimized_frames.append({
                "time": frame["time"],
                "points": opt_points
            })

        output = {
            "metadata": metadata,
            "frames": optimized_frames
        }

        # Estimate size
        json_str = json.dumps(output, separators=(",", ":"))
        estimated_bytes = len(json_str.encode("utf-8"))

        total_opt_points = sum(len(f["points"]) for f in optimized_frames)
        print(f"  Attempt {attempt + 1}: threshold={height_threshold:.3f}m, "
              f"{total_opt_points:,} points, ~{estimated_bytes / 1024:.0f} KB")

        if estimated_bytes <= max_file_bytes:
            break

        # Tighten threshold — use a more aggressive scaling factor
        ratio = estimated_bytes / max_file_bytes
        height_threshold *= ratio ** 0.7
        height_threshold = round(height_threshold, 3)

    # Print frame statistics
    frame_sizes = [len(f["points"]) for f in optimized_frames]
    print(f"\n  Final statistics:")
    print(f"    Frames: {len(optimized_frames)}")
    print(f"    Points per frame: min={min(frame_sizes)}, "
          f"max={max(frame_sizes)}, avg={sum(frame_sizes)/len(frame_sizes):.0f}")
    print(f"    Total points: {sum(frame_sizes):,}")
    print(f"    Estimated size: {estimated_bytes / 1024:.1f} KB")

    # Analyze wave height distribution
    all_heights = []
    for f in optimized_frames:
        for p in f["points"]:
            all_heights.append(p["height"])

    if all_heights:
        all_heights = np.array(all_heights)
        print(f"    Height range: [{all_heights.min():.2f}, {all_heights.max():.2f}] m")
        print(f"    Mean |height|: {np.abs(all_heights).mean():.3f} m")

    return output


def optimize_arrivals(data):
    """
    Optimize coastal arrivals data for web delivery.
    Remove verbose notes field to save space, keep essential data.
    """
    print("\n  Optimizing coastal arrivals data...")

    optimized = []
    for entry in data:
        opt_entry = {
            "name": entry["name"],
            "latitude": entry["latitude"],
            "longitude": entry["longitude"],
            "arrivalMinutes": entry["arrivalMinutes"],
            "maxHeight": entry["maxHeight"]
        }
        optimized.append(opt_entry)

    # Sort by arrival time for display order
    optimized.sort(key=lambda x: x["arrivalMinutes"])

    print(f"  {len(optimized)} coastal communities")
    print(f"  Earliest arrival: {optimized[0]['name']} "
          f"({optimized[0]['arrivalMinutes']} min)")
    print(f"  Latest arrival: {optimized[-1]['name']} "
          f"({optimized[-1]['arrivalMinutes']} min)")

    heights = [e["maxHeight"] for e in optimized]
    print(f"  Max wave height range: {min(heights):.1f} - {max(heights):.1f} m")

    return optimized


def validate_propagation(path):
    """Validate the propagation output file."""
    print("\n  Validating propagation data...")

    with open(path) as f:
        data = json.load(f)

    errors = []

    # Check metadata
    meta = data.get("metadata", {})
    if meta.get("totalMinutes") != 240:
        errors.append(f"Expected 240 totalMinutes, got {meta.get('totalMinutes')}")
    if meta.get("frameIntervalMinutes") != 4:
        errors.append(f"Expected 4 frameIntervalMinutes, got {meta.get('frameIntervalMinutes')}")
    if meta.get("totalFrames") != 60:
        errors.append(f"Expected 60 totalFrames, got {meta.get('totalFrames')}")

    # Check frames
    frames = data.get("frames", [])
    if len(frames) != 60:
        errors.append(f"Expected 60 frames, got {len(frames)}")

    # Check time progression
    for i, frame in enumerate(frames):
        expected_time = i * 4
        if frame.get("time") != expected_time:
            errors.append(f"Frame {i}: expected time={expected_time}, "
                          f"got {frame.get('time')}")
            break

    # Check point structure
    sample_frame = frames[15] if len(frames) > 15 else frames[-1]
    if sample_frame["points"]:
        p = sample_frame["points"][0]
        for key in ["latitude", "longitude", "height"]:
            if key not in p:
                errors.append(f"Missing key '{key}' in point data")

    # Check geographic bounds
    all_lats = []
    all_lons = []
    for frame in frames:
        for p in frame["points"]:
            all_lats.append(p["latitude"])
            all_lons.append(p["longitude"])

    if all_lats:
        lat_range = (min(all_lats), max(all_lats))
        lon_range = (min(all_lons), max(all_lons))
        print(f"    Latitude range: [{lat_range[0]}, {lat_range[1]}]")
        print(f"    Longitude range: [{lon_range[0]}, {lon_range[1]}]")

        if lat_range[0] < 25 or lat_range[1] > 60:
            errors.append(f"Latitude out of expected range: {lat_range}")
        if lon_range[0] < -145 or lon_range[1] > -115:
            errors.append(f"Longitude out of expected range: {lon_range}")

    # File size check
    size_bytes = os.path.getsize(path)
    size_kb = size_bytes / 1024
    print(f"    File size: {size_kb:.1f} KB")
    if size_kb > 500:
        errors.append(f"File size {size_kb:.1f} KB exceeds 500 KB target")

    # Check wave propagation makes physical sense
    # Early frames should have fewer points than middle frames
    early_count = len(frames[0]["points"]) if frames else 0
    mid_count = len(frames[30]["points"]) if len(frames) > 30 else 0
    late_count = len(frames[-1]["points"]) if frames else 0
    print(f"    Points: frame 0={early_count}, frame 30={mid_count}, "
          f"frame 59={late_count}")

    if errors:
        print("\n  VALIDATION ERRORS:")
        for e in errors:
            print(f"    - {e}")
        return False

    print("    All validations passed!")
    return True


def validate_arrivals(path):
    """Validate the coastal arrivals output file."""
    print("\n  Validating coastal arrivals data...")

    with open(path) as f:
        data = json.load(f)

    errors = []

    if not isinstance(data, list):
        errors.append("Expected array at top level")
        return False

    if len(data) < 10:
        errors.append(f"Expected at least 10 communities, got {len(data)}")

    # Check required fields
    required_keys = {"name", "latitude", "longitude", "arrivalMinutes", "maxHeight"}
    for i, entry in enumerate(data):
        missing = required_keys - set(entry.keys())
        if missing:
            errors.append(f"Entry {i} ({entry.get('name', '?')}): "
                          f"missing keys: {missing}")
            break

    # Check value ranges
    for entry in data:
        if not (30 < entry["latitude"] < 55):
            errors.append(f"{entry['name']}: latitude {entry['latitude']} out of range")
        if not (-130 < entry["longitude"] < -120):
            errors.append(f"{entry['name']}: longitude {entry['longitude']} out of range")
        if not (0 < entry["arrivalMinutes"] < 300):
            errors.append(f"{entry['name']}: arrivalMinutes {entry['arrivalMinutes']} out of range")
        if not (0 < entry["maxHeight"] < 30):
            errors.append(f"{entry['name']}: maxHeight {entry['maxHeight']} out of range")

    # File size check
    size_bytes = os.path.getsize(path)
    size_kb = size_bytes / 1024
    print(f"    File size: {size_kb:.1f} KB")
    if size_kb > 5:
        errors.append(f"File size {size_kb:.1f} KB exceeds 5 KB target")

    # Print summary
    print(f"    Communities: {len(data)}")
    print(f"    Arrival times: "
          f"{min(e['arrivalMinutes'] for e in data)} - "
          f"{max(e['arrivalMinutes'] for e in data)} min")
    print(f"    Max heights: "
          f"{min(e['maxHeight'] for e in data):.1f} - "
          f"{max(e['maxHeight'] for e in data):.1f} m")

    if errors:
        print("\n  VALIDATION ERRORS:")
        for e in errors:
            print(f"    - {e}")
        return False

    print("    All validations passed!")
    return True


def main():
    print("=" * 60)
    print("Tsunami Data Processor — Cascadia Explorer")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Step 1: Load source data
    print("\n" + "-" * 40)
    print("Step 1: Loading source data")
    print("-" * 40)

    if not os.path.exists(PROPAGATION_INPUT):
        print(f"\n  ERROR: Source data not found: {PROPAGATION_INPUT}")
        print("  Run download_tsunami.py first to generate source data.")
        return 1

    if not os.path.exists(ARRIVALS_INPUT):
        print(f"\n  ERROR: Source data not found: {ARRIVALS_INPUT}")
        print("  Run download_tsunami.py first to generate source data.")
        return 1

    print(f"  Loading: {PROPAGATION_INPUT}")
    with open(PROPAGATION_INPUT) as f:
        propagation_raw = json.load(f)
    prop_size = os.path.getsize(PROPAGATION_INPUT) / 1024
    print(f"  Source size: {prop_size:.1f} KB")

    print(f"  Loading: {ARRIVALS_INPUT}")
    with open(ARRIVALS_INPUT) as f:
        arrivals_raw = json.load(f)
    arr_size = os.path.getsize(ARRIVALS_INPUT) / 1024
    print(f"  Source size: {arr_size:.1f} KB")

    # Step 2: Optimize propagation data
    print("\n" + "-" * 40)
    print("Step 2: Processing propagation data")
    print("-" * 40)

    propagation = optimize_propagation(propagation_raw)

    prop_path = os.path.join(OUTPUT_DIR, "cascadia-propagation.json")
    with open(prop_path, "w") as f:
        json.dump(propagation, f, separators=(",", ":"))

    prop_out_size = os.path.getsize(prop_path) / 1024
    print(f"\n  Wrote: {prop_path}")
    print(f"  Size: {prop_out_size:.1f} KB "
          f"({prop_out_size / prop_size * 100:.0f}% of source)")

    # Step 3: Optimize arrivals data
    print("\n" + "-" * 40)
    print("Step 3: Processing coastal arrivals")
    print("-" * 40)

    arrivals = optimize_arrivals(arrivals_raw)

    arr_path = os.path.join(OUTPUT_DIR, "coastal-arrivals.json")
    with open(arr_path, "w") as f:
        json.dump(arrivals, f, separators=(",", ":"))

    arr_out_size = os.path.getsize(arr_path) / 1024
    print(f"\n  Wrote: {arr_path}")
    print(f"  Size: {arr_out_size:.1f} KB")

    # Step 4: Validation
    print("\n" + "=" * 60)
    print("Validation")
    print("=" * 60)

    prop_ok = validate_propagation(prop_path)
    arr_ok = validate_arrivals(arr_path)

    # Final summary
    print("\n" + "=" * 60)
    print("Pipeline Summary")
    print("=" * 60)
    print(f"\n  Output files:")
    print(f"    1. {prop_path}")
    print(f"       Size: {prop_out_size:.1f} KB "
          f"(target: < 500 KB) {'PASS' if prop_out_size < 500 else 'FAIL'}")
    print(f"    2. {arr_path}")
    print(f"       Size: {arr_out_size:.1f} KB "
          f"(target: < 5 KB) {'PASS' if arr_out_size < 5 else 'FAIL'}")

    if prop_ok and arr_ok:
        print("\n  All validations passed!")
    else:
        print("\n  Some validations failed. Check output above.")

    print("\n" + "=" * 60)
    return 0 if (prop_ok and arr_ok) else 1


if __name__ == "__main__":
    sys.exit(main())
