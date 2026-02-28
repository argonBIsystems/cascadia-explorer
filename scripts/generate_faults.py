#!/usr/bin/env python3
"""
Generate a curated GeoJSON file with plate boundary data for the Cascadia region.

Coordinates are based on published plate boundary databases (Peter Bird, 2003)
and USGS sources, simplified to key waypoints for visualization.

Output: public/data/faults/plate-boundaries.json
"""

import json
import os

features = []


def line_feature(coords, props):
    """Create a GeoJSON LineString feature."""
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {
            "type": "LineString",
            "coordinates": coords,  # [lon, lat] pairs
        },
    }


# ---------------------------------------------------------------------------
# 1. Cascadia Megathrust Trace
#    Surface trace from Cape Mendocino to northern Vancouver Island.
#    Based on the deformation front mapped by Fluck et al. (1997)
#    and the USGS Slab2 model surface trace.
# ---------------------------------------------------------------------------
megathrust_coords = [
    [-124.40, 40.30],   # Cape Mendocino / Mendocino Triple Junction
    [-124.55, 40.80],
    [-124.65, 41.30],
    [-124.75, 41.80],
    [-124.80, 42.30],
    [-124.85, 42.80],
    [-124.90, 43.20],
    [-124.95, 43.60],
    [-125.00, 44.00],
    [-125.05, 44.40],
    [-125.10, 44.80],
    [-125.20, 45.20],
    [-125.30, 45.60],
    [-125.40, 46.00],
    [-125.55, 46.40],
    [-125.70, 46.80],
    [-125.90, 47.20],
    [-126.10, 47.60],
    [-126.40, 48.00],
    [-126.70, 48.40],
    [-127.00, 48.80],
    [-127.30, 49.20],
    [-127.60, 49.60],
    [-127.90, 50.00],
    [-128.20, 50.30],
    [-128.50, 50.50],   # Northern Vancouver Island
]

features.append(line_feature(megathrust_coords, {
    "type": "megathrust",
    "name": "Cascadia Megathrust",
}))

# ---------------------------------------------------------------------------
# 2. Juan de Fuca Ridge
#    Main spreading center offshore, roughly 46°N to 48°N.
#    Based on Bird (2003) plate boundary data.
# ---------------------------------------------------------------------------
jdf_ridge_coords = [
    [-130.20, 45.90],
    [-130.05, 46.20],
    [-129.90, 46.50],
    [-129.80, 46.80],
    [-129.70, 47.00],
    [-129.60, 47.30],
    [-129.55, 47.60],
    [-129.50, 47.90],
    [-129.45, 48.20],
]

features.append(line_feature(jdf_ridge_coords, {
    "type": "ridge",
    "name": "Juan de Fuca Ridge",
}))

# ---------------------------------------------------------------------------
# 3. Blanco Fracture Zone
#    Left-lateral transform connecting the Juan de Fuca Ridge to the
#    Gorda Ridge, approximately at 43.5°N.
# ---------------------------------------------------------------------------
blanco_coords = [
    [-130.20, 45.90],   # Connects to JdF Ridge southern end
    [-129.80, 45.20],
    [-129.40, 44.60],
    [-128.80, 44.00],
    [-128.40, 43.60],
    [-128.10, 43.40],
    [-127.80, 43.30],
]

features.append(line_feature(blanco_coords, {
    "type": "transform",
    "name": "Blanco Fracture Zone",
}))

# ---------------------------------------------------------------------------
# 4. Sovanco Fracture Zone
#    Transform fault at approximately 48.5°N, connecting the Juan de Fuca
#    Ridge to the Explorer Ridge.
# ---------------------------------------------------------------------------
sovanco_coords = [
    [-129.45, 48.20],   # Northern end of JdF Ridge
    [-129.80, 48.40],
    [-130.10, 48.50],
    [-130.40, 48.60],
    [-130.80, 48.70],
]

features.append(line_feature(sovanco_coords, {
    "type": "transform",
    "name": "Sovanco Fracture Zone",
}))

# ---------------------------------------------------------------------------
# 5. Nootka Fault
#    Transform fault at approximately 49.5°N, separating the Explorer
#    and Juan de Fuca plates near Vancouver Island.
# ---------------------------------------------------------------------------
nootka_coords = [
    [-127.00, 49.50],
    [-127.40, 49.60],
    [-127.80, 49.70],
    [-128.20, 49.70],
    [-128.60, 49.60],
    [-128.90, 49.50],
]

features.append(line_feature(nootka_coords, {
    "type": "transform",
    "name": "Nootka Fault",
}))

# ---------------------------------------------------------------------------
# 6. Gorda Ridge
#    Southern spreading center, approximately 42°N.
# ---------------------------------------------------------------------------
gorda_ridge_coords = [
    [-127.80, 43.30],   # Connects to Blanco FZ southern end
    [-127.60, 42.80],
    [-127.50, 42.40],
    [-127.40, 42.00],
    [-127.30, 41.60],
    [-127.20, 41.20],
    [-127.10, 40.80],
    [-127.00, 40.40],
]

features.append(line_feature(gorda_ridge_coords, {
    "type": "ridge",
    "name": "Gorda Ridge",
}))

# ---------------------------------------------------------------------------
# 7. Explorer Ridge
#    Northern spreading center, approximately 49-50°N.
# ---------------------------------------------------------------------------
explorer_ridge_coords = [
    [-130.80, 48.70],   # Connects to Sovanco FZ
    [-131.00, 49.00],
    [-131.10, 49.30],
    [-131.20, 49.60],
    [-131.30, 49.90],
    [-131.40, 50.20],
]

features.append(line_feature(explorer_ridge_coords, {
    "type": "ridge",
    "name": "Explorer Ridge",
}))

# ---------------------------------------------------------------------------
# 8. Mendocino Fracture Zone
#    East-west transform fault at approximately 40.3°N, extending
#    westward from the Mendocino Triple Junction.
# ---------------------------------------------------------------------------
mendocino_fz_coords = [
    [-124.40, 40.30],   # Mendocino Triple Junction
    [-125.00, 40.35],
    [-125.60, 40.35],
    [-126.20, 40.35],
    [-127.00, 40.40],   # Connects to Gorda Ridge southern end
]

features.append(line_feature(mendocino_fz_coords, {
    "type": "transform",
    "name": "Mendocino Fracture Zone",
}))

# ---------------------------------------------------------------------------
# 9. San Andreas Fault (northern section)
#    From the Mendocino Triple Junction heading south-southeast.
# ---------------------------------------------------------------------------
san_andreas_coords = [
    [-124.40, 40.30],   # Mendocino Triple Junction
    [-124.10, 39.90],
    [-123.80, 39.50],
    [-123.50, 39.10],
    [-123.20, 38.80],
    [-123.00, 38.50],
    [-122.80, 38.20],
    [-122.60, 37.90],
    [-122.45, 37.60],
    [-122.30, 37.30],
]

features.append(line_feature(san_andreas_coords, {
    "type": "fault",
    "name": "San Andreas Fault (Northern Section)",
}))

# ---------------------------------------------------------------------------
# Assemble GeoJSON FeatureCollection and write to disk
# ---------------------------------------------------------------------------
geojson = {
    "type": "FeatureCollection",
    "metadata": {
        "title": "Cascadia Region Plate Boundaries",
        "description": (
            "Curated plate boundary traces for the Cascadia subduction zone "
            "and surrounding tectonic features. Based on Peter Bird (2003) "
            "plate boundary database and USGS sources."
        ),
        "source": "Bird, P. (2003) An updated digital model of plate boundaries. "
                  "Geochemistry Geophysics Geosystems, 4(3), 1027.",
    },
    "features": features,
}

# Output path relative to project root
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
output_dir = os.path.join(project_root, "public", "data", "faults")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "plate-boundaries.json")

with open(output_path, "w") as f:
    json.dump(geojson, f, indent=2)

print(f"Generated {len(features)} fault features -> {output_path}")
