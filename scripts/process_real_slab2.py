#!/usr/bin/env python3
"""
Process real USGS Slab2 earthquake relocation data into slab depth contours.

Uses 73,000+ earthquake relocations from the USGS Slab2 model input database
(Hayes et al., 2018) to generate depth contour GeoJSON for the Cascadia slab.

Two approaches combined:
1. Grid-based marching squares for shallow contours (dense data, 10-30 km)
2. Latitude-binned median for deeper contours (sparse data, 40-100 km)

Input: data/raw/slab2/cas_ER_*.csv
Output: public/data/slab/cascadia-slab-contours.json
        public/data/slab/cascadia-slab-surface.json
"""

import csv
import json
import math
import os
import numpy as np
from pathlib import Path

# --- Configuration ---
CONTOUR_DEPTHS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
GRID_SPACING = 0.12
SMOOTH_PASSES = 3
LON_RANGE = (-131, -120)
LAT_RANGE = (39.5, 51.5)

ALL_CATALOGS = [
    'cas_ER_anssA.csv', 'cas_ER_anssB.csv',
    'cas_ER_cnsnA.csv', 'cas_ER_cnsnB.csv',
    'cas_ER_ncssA.csv', 'cas_ER_ncssB.csv',
    'cas_ER_hyp231.csv', 'cas_ER_hyp232.csv', 'cas_ER_hyp39.csv',
]


def load_earthquakes(data_dir):
    events = []
    for fname in ALL_CATALOGS:
        fpath = os.path.join(data_dir, fname)
        if not os.path.exists(fpath):
            continue
        with open(fpath) as f:
            for row in csv.DictReader(f):
                try:
                    lon = float(row['lon'])
                    lat = float(row['lat'])
                    depth = float(row['depth'])
                    mag = float(row.get('mag', 0))
                    if (LON_RANGE[0] <= lon <= LON_RANGE[1] and
                        LAT_RANGE[0] <= lat <= LAT_RANGE[1] and
                        0 < depth < 200):
                        events.append({'lon': lon, 'lat': lat, 'depth': depth, 'mag': mag})
                except (ValueError, KeyError):
                    continue
    print(f"  Total: {len(events)} earthquakes loaded")
    return events


def build_depth_grid(events):
    lons = np.arange(LON_RANGE[0], LON_RANGE[1] + GRID_SPACING, GRID_SPACING)
    lats = np.arange(LAT_RANGE[0], LAT_RANGE[1] + GRID_SPACING, GRID_SPACING)
    nlon, nlat = len(lons), len(lats)
    depth_sum = np.zeros((nlat, nlon))
    weight_sum = np.zeros((nlat, nlon))
    search_r = 0.35

    for ev in events:
        ilon = int(round((ev['lon'] - LON_RANGE[0]) / GRID_SPACING))
        ilat = int(round((ev['lat'] - LAT_RANGE[0]) / GRID_SPACING))
        if not (0 <= ilon < nlon and 0 <= ilat < nlat):
            continue
        w = max(1.0, ev['mag'])
        r = int(search_r / GRID_SPACING)
        for di in range(-r, r+1):
            for dj in range(-r, r+1):
                ni, nj = ilat + di, ilon + dj
                if 0 <= ni < nlat and 0 <= nj < nlon:
                    dist = math.sqrt(di**2 + dj**2) * GRID_SPACING
                    if dist <= search_r:
                        gw = w * math.exp(-0.5 * (dist / (search_r/2))**2)
                        depth_sum[ni, nj] += ev['depth'] * gw
                        weight_sum[ni, nj] += gw

    mask = weight_sum > 0
    grid = np.full((nlat, nlon), np.nan)
    grid[mask] = depth_sum[mask] / weight_sum[mask]

    for _ in range(SMOOTH_PASSES):
        s = grid.copy()
        for i in range(1, nlat-1):
            for j in range(1, nlon-1):
                if np.isnan(grid[i, j]):
                    continue
                vals = [grid[i+di, j+dj] for di in range(-1,2) for dj in range(-1,2)
                        if not np.isnan(grid[i+di, j+dj])]
                if len(vals) >= 3:
                    s[i, j] = sum(vals) / len(vals)
        grid = s

    return lons, lats, grid


def extract_contour_marching(depth_grid, lons, lats, target):
    """Marching squares contour extraction for dense data."""
    nlat, nlon = depth_grid.shape
    segments = []
    for i in range(nlat - 1):
        for j in range(nlon - 1):
            v00, v10, v01, v11 = depth_grid[i,j], depth_grid[i+1,j], depth_grid[i,j+1], depth_grid[i+1,j+1]
            if any(np.isnan(v) for v in [v00, v10, v01, v11]):
                continue
            b00 = 1 if v00 >= target else 0
            b01 = 1 if v01 >= target else 0
            b11 = 1 if v11 >= target else 0
            b10 = 1 if v10 >= target else 0
            case = b00 | (b01 << 1) | (b11 << 2) | (b10 << 3)
            if case in (0, 15):
                continue

            lon0, lon1 = float(lons[j]), float(lons[j+1])
            lat0, lat1 = float(lats[i]), float(lats[i+1])

            def interp(va, vb, pa, pb):
                t = 0.5 if abs(vb-va) < 1e-10 else (target-va)/(vb-va)
                return (pa[0]+t*(pb[0]-pa[0]), pa[1]+t*(pb[1]-pa[1]))

            bot = lambda: interp(v00, v01, (lon0, lat0), (lon1, lat0))
            top = lambda: interp(v10, v11, (lon0, lat1), (lon1, lat1))
            lft = lambda: interp(v00, v10, (lon0, lat0), (lon0, lat1))
            rgt = lambda: interp(v01, v11, (lon1, lat0), (lon1, lat1))

            cs = []
            if case in (1,14): cs.append((bot(), lft()))
            elif case in (2,13): cs.append((bot(), rgt()))
            elif case in (3,12): cs.append((lft(), rgt()))
            elif case in (4,11): cs.append((top(), rgt()))
            elif case == 5:
                c = (v00+v10+v01+v11)/4
                cs = [(bot(), rgt()), (top(), lft())] if c >= target else [(bot(), lft()), (top(), rgt())]
            elif case in (6,9): cs.append((bot(), top()))
            elif case in (7,8): cs.append((top(), lft()))
            elif case == 10:
                c = (v00+v10+v01+v11)/4
                cs = [(bot(), lft()), (top(), rgt())] if c >= target else [(bot(), rgt()), (top(), lft())]
            segments.extend(cs)

    return stitch_segments(segments) if segments else []


def extract_contour_binned(events, target, half_width=10):
    """
    Extract contour at target_depth by binning earthquakes in latitude bands.
    For each latitude bin, find the median longitude of earthquakes near the target depth.
    Works well for sparse deep data.
    """
    # Collect events near this depth
    nearby = [e for e in events if abs(e['depth'] - target) <= half_width]
    if len(nearby) < 5:
        return []

    # Bin by latitude (1° bins)
    lat_bins = {}
    bin_size = 0.8  # degrees
    for e in nearby:
        bin_key = round(e['lat'] / bin_size) * bin_size
        if bin_key not in lat_bins:
            lat_bins[bin_key] = []
        lat_bins[bin_key].append(e['lon'])

    # For each bin with enough data, compute median longitude
    points = []
    for lat, lon_list in sorted(lat_bins.items()):
        if len(lon_list) >= 2:
            med_lon = sorted(lon_list)[len(lon_list)//2]
            points.append((med_lon, lat))

    if len(points) < 2:
        return []

    # Smooth the line
    if len(points) >= 3:
        smoothed = [points[0]]
        for i in range(1, len(points)-1):
            avg_lon = (points[i-1][0] + points[i][0] + points[i+1][0]) / 3
            avg_lat = (points[i-1][1] + points[i][1] + points[i+1][1]) / 3
            smoothed.append((avg_lon, avg_lat))
        smoothed.append(points[-1])
        points = smoothed

    return [points]


def stitch_segments(segments):
    def pk(pt): return (round(pt[0], 5), round(pt[1], 5))
    remaining = list(range(len(segments)))
    polylines = []
    while remaining:
        idx = remaining.pop(0)
        seg = segments[idx]
        line = [seg[0], seg[1]]
        for direction in ['forward', 'backward']:
            changed = True
            while changed:
                changed = False
                key = pk(line[-1]) if direction == 'forward' else pk(line[0])
                for i in list(remaining):
                    s = segments[i]
                    if pk(s[0]) == key:
                        if direction == 'forward': line.append(s[1])
                        else: line.insert(0, s[1])
                        remaining.remove(i); changed = True; break
                    elif pk(s[1]) == key:
                        if direction == 'forward': line.append(s[0])
                        else: line.insert(0, s[0])
                        remaining.remove(i); changed = True; break
        if len(line) >= 2:
            polylines.append(line)
    return polylines


def simplify_line(coords, tolerance=0.015):
    if len(coords) <= 2:
        return coords
    start, end = coords[0], coords[-1]
    max_d, max_i = 0, 0
    for i in range(1, len(coords)-1):
        pt = coords[i]
        dx, dy = end[0]-start[0], end[1]-start[1]
        len_sq = dx*dx + dy*dy
        if len_sq < 1e-12:
            d = math.sqrt((pt[0]-start[0])**2 + (pt[1]-start[1])**2)
        else:
            t = max(0, min(1, ((pt[0]-start[0])*dx + (pt[1]-start[1])*dy) / len_sq))
            d = math.sqrt((pt[0]-start[0]-t*dx)**2 + (pt[1]-start[1]-t*dy)**2)
        if d > max_d:
            max_d, max_i = d, i
    if max_d > tolerance:
        return simplify_line(coords[:max_i+1], tolerance)[:-1] + simplify_line(coords[max_i:], tolerance)
    return [start, end]


def make_feature(polylines, target):
    """Create a GeoJSON feature from polylines."""
    simplified = [simplify_line(l, 0.012) for l in polylines if len(l) >= 2]
    simplified = [s for s in simplified if len(s) >= 2]
    if not simplified:
        return None

    total_pts = sum(len(s) for s in simplified)

    if len(simplified) == 1:
        geom = {
            'type': 'LineString',
            'coordinates': [[round(p[0],4), round(p[1],4)] for p in simplified[0]]
        }
    else:
        # Filter out tiny fragments
        simplified = [s for s in simplified if len(s) >= 3 or
                      math.sqrt((s[0][0]-s[-1][0])**2 + (s[0][1]-s[-1][1])**2) > 0.3]
        if not simplified:
            return None

        geom = {
            'type': 'MultiLineString',
            'coordinates': [[[round(p[0],4), round(p[1],4)] for p in line] for line in simplified]
        }

    return {
        'type': 'Feature',
        'properties': {'depth': float(target)},
        'geometry': geom,
    }, len(simplified), total_pts


def main():
    project_root = Path(__file__).parent.parent
    raw_dir = project_root / 'data' / 'raw' / 'slab2'
    out_dir = project_root / 'public' / 'data' / 'slab'
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Loading earthquake data from USGS Slab2 catalogs...")
    events = load_earthquakes(str(raw_dir))
    if not events:
        return

    print(f"\nBuilding depth grid ({GRID_SPACING}° spacing)...")
    lons, lats, depth_grid = build_depth_grid(events)
    valid = np.count_nonzero(~np.isnan(depth_grid))
    print(f"  {valid} cells with data")

    print(f"\nExtracting contours...")
    features = []

    for target in CONTOUR_DEPTHS:
        # Use marching squares for shallow (dense) data
        polylines = extract_contour_marching(depth_grid, lons, lats, target)

        # If marching squares gives poor results, fall back to binned approach
        total_pts = sum(len(l) for l in polylines)
        if total_pts < 10:
            hw = 8 if target <= 40 else 12 if target <= 60 else 15
            polylines = extract_contour_binned(events, target, half_width=hw)

        if not polylines:
            print(f"  {target} km: no contour (insufficient data)")
            continue

        result = make_feature(polylines, target)
        if result:
            feat, n_lines, n_pts = result
            features.append(feat)
            print(f"  {target} km: {n_lines} lines, {n_pts} pts")

    geojson = {
        'type': 'FeatureCollection',
        'metadata': {
            'source': 'USGS Slab2 earthquake catalogs (Hayes et al., 2018)',
            'description': 'Depth contours derived from 73,000+ real earthquake relocations. '
                          'Shallow contours use grid-based marching squares. '
                          'Deeper contours use latitude-binned median positions.',
            'repository': 'https://github.com/usgs/slab2',
            'totalEvents': len(events),
        },
        'features': features,
    }

    path = out_dir / 'cascadia-slab-contours.json'
    with open(path, 'w') as f:
        json.dump(geojson, f, separators=(',', ':'))
    print(f"\nWrote {path} ({os.path.getsize(path)/1024:.1f} KB, {len(features)} features)")

    # Surface grid
    surface = {
        'metadata': {
            'source': 'USGS Slab2 earthquake catalogs (Hayes et al., 2018)',
            'gridSpacing': GRID_SPACING,
        },
        'lons': [round(float(x), 2) for x in lons],
        'lats': [round(float(x), 2) for x in lats],
        'depths': [
            [round(float(v), 1) if not np.isnan(v) else None for v in row]
            for row in depth_grid
        ],
    }
    path2 = out_dir / 'cascadia-slab-surface.json'
    with open(path2, 'w') as f:
        json.dump(surface, f, separators=(',', ':'))
    print(f"Wrote {path2} ({os.path.getsize(path2)/1024:.1f} KB)")
    print("\nDone!")


if __name__ == '__main__':
    main()
