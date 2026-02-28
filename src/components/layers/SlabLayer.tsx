import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Color,
  PolylineCollection,
  Material,
  LabelCollection,
  LabelStyle,
  VerticalOrigin,
} from 'cesium';
import { useSlabContours } from '../../hooks/useSlabData';
import { useAppStore } from '../../store/useAppStore';
import { getDepthColor } from '../../lib/color-scales';
import type { SlabContourFeature } from '../../hooks/useSlabData';

// Render contours on the surface — depth is encoded in color.
// The cross-section view provides the true depth profile.
const SURFACE_OFFSET = 50; // meters above ground
const CONTOUR_OPACITY = 0.85;
const CONTOUR_WIDTH = 3.5;

interface SlabLayerProps {
  viewer: Viewer;
}

/**
 * Build a flat array of Cartesian3 positions from a LineString coordinate array.
 * Each coordinate is [lon, lat] and the height is derived from depth.
 */
function lineToPositions(
  coords: number[][],
  _depthKm: number,
): Cartesian3[] {
  const degreesAndHeights: number[] = [];

  for (const coord of coords) {
    const lon = coord[0];
    const lat = coord[1];
    if (lon === undefined || lat === undefined) continue;
    degreesAndHeights.push(lon, lat, SURFACE_OFFSET);
  }

  return Cartesian3.fromDegreesArrayHeights(degreesAndHeights);
}

/**
 * Create a Cesium Color from a depth value using the depth color scale.
 */
function depthToCesiumColor(depthKm: number): Color {
  const { r, g, b } = getDepthColor(depthKm);
  return new Color(r / 255, g / 255, b / 255, CONTOUR_OPACITY);
}

export default function SlabLayer({ viewer }: SlabLayerProps) {
  const { data: contourData } = useSlabContours();
  const visible = useAppStore((s) => s.layers.slab.visible);

  const collectionRef = useRef<PolylineCollection | null>(null);
  const labelCollectionRef = useRef<LabelCollection | null>(null);

  // Create the polyline and label collections once
  useEffect(() => {
    const collection = new PolylineCollection();
    viewer.scene.primitives.add(collection);
    collectionRef.current = collection;

    const labels = new LabelCollection();
    viewer.scene.primitives.add(labels);
    labelCollectionRef.current = labels;

    return () => {
      if (collectionRef.current) {
        viewer.scene.primitives.remove(collectionRef.current);
        collectionRef.current = null;
      }
      if (labelCollectionRef.current) {
        viewer.scene.primitives.remove(labelCollectionRef.current);
        labelCollectionRef.current = null;
      }
    };
  }, [viewer]);

  // Rebuild polylines and labels when contour data arrives
  useEffect(() => {
    const collection = collectionRef.current;
    const labels = labelCollectionRef.current;
    if (!collection || !labels || !contourData) return;

    collection.removeAll();
    labels.removeAll();

    for (const feature of contourData.features) {
      const depthKm = feature.properties.depth;
      const color = depthToCesiumColor(depthKm);
      const material = Material.fromType('Color', { color });

      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates as number[][];
        const positions = lineToPositions(coords, depthKm);
        if (positions.length >= 2) {
          collection.add({
            positions,
            width: CONTOUR_WIDTH,
            material,
          });

          // Add depth label at the midpoint of the line
          const midIdx = Math.floor(coords.length / 2);
          const midCoord = coords[midIdx];
          if (midCoord && midCoord[0] !== undefined && midCoord[1] !== undefined) {
            const labelColor = depthToCesiumColor(depthKm);
            labels.add({
              position: Cartesian3.fromDegrees(midCoord[0], midCoord[1], SURFACE_OFFSET + 50),
              text: `${depthKm} km`,
              font: '12px JetBrains Mono, monospace',
              fillColor: labelColor,
              outlineColor: Color.BLACK,
              outlineWidth: 3,
              style: LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              scale: 1.0,
            });
          }
        }
      } else if (feature.geometry.type === 'MultiLineString') {
        const rings = feature.geometry.coordinates as number[][][];
        let labelAdded = false;
        for (const ring of rings) {
          const positions = lineToPositions(ring, depthKm);
          if (positions.length >= 2) {
            collection.add({
              positions,
              width: CONTOUR_WIDTH,
              material,
            });

            // Only label the first (longest) ring to avoid clutter
            if (!labelAdded) {
              const midIdx = Math.floor(ring.length / 2);
              const midCoord = ring[midIdx];
              if (midCoord && midCoord[0] !== undefined && midCoord[1] !== undefined) {
                const labelColor = depthToCesiumColor(depthKm);
                labels.add({
                  position: Cartesian3.fromDegrees(midCoord[0], midCoord[1], SURFACE_OFFSET + 50),
                  text: `${depthKm} km`,
                  font: '12px JetBrains Mono, monospace',
                  fillColor: labelColor,
                  outlineColor: Color.BLACK,
                  outlineWidth: 3,
                  style: LabelStyle.FILL_AND_OUTLINE,
                  verticalOrigin: VerticalOrigin.BOTTOM,
                  disableDepthTestDistance: Number.POSITIVE_INFINITY,
                  scale: 1.0,
                });
                labelAdded = true;
              }
            }
          }
        }
      }
    }
  }, [contourData]);

  // Toggle visibility
  useEffect(() => {
    const collection = collectionRef.current;
    if (collection) {
      collection.show = visible;
    }
    const labels = labelCollectionRef.current;
    if (labels) {
      labels.show = visible;
    }
  }, [visible]);

  return null;
}

// Re-export for type checking — marks feature as used
export type { SlabContourFeature };
