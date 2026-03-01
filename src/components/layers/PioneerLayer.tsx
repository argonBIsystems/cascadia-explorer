import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Color,
  Entity,
  PolygonHierarchy,
  NearFarScalar,
  PointPrimitiveCollection,
  LabelStyle,
  HeightReference,
} from 'cesium';
import { usePioneerData } from '../../hooks/usePioneerData';
import { useAppStore } from '../../store/useAppStore';

interface PioneerLayerProps {
  viewer: Viewer;
}

const FRAGMENT_COLOR = Color.fromCssColorString('#14b8a6').withAlpha(0.25); // teal
const FRAGMENT_OUTLINE_COLOR = Color.fromCssColorString('#14b8a6').withAlpha(0.6);
const LFE_COLOR = Color.fromCssColorString('#5eead4'); // teal-300
const LFE_OUTLINE_COLOR = Color.fromCssColorString('#0d9488');
const ARROW_COLOR = Color.fromCssColorString('#2dd4bf'); // teal-400
const CONNECTION_COLOR = Color.fromCssColorString('#14b8a6').withAlpha(0.4);
const LABEL_BG_COLOR = Color.fromCssColorString('#0f172a');

export default function PioneerLayer({ viewer }: PioneerLayerProps) {
  const visible = useAppStore((s) => s.layers.pioneer.visible);
  const { data } = usePioneerData();
  const entitiesRef = useRef<Entity[]>([]);
  const pointsRef = useRef<PointPrimitiveCollection | null>(null);

  // Create/destroy entities when data or visibility changes
  useEffect(() => {
    // Cleanup previous entities
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];
    if (pointsRef.current) {
      viewer.scene.primitives.remove(pointsRef.current);
      pointsRef.current = null;
    }

    if (!data || !visible) return;

    // 1. Fragment polygon outline
    const polygonPositions = data.outline.coordinates.map(
      ([lon, lat]) => Cartesian3.fromDegrees(lon, lat, 0)
    );

    const polygonEntity = viewer.entities.add({
      polygon: {
        hierarchy: new PolygonHierarchy(polygonPositions),
        material: FRAGMENT_COLOR,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        outline: true,
        outlineColor: FRAGMENT_OUTLINE_COLOR,
        outlineWidth: 2,
      },
    });
    entitiesRef.current.push(polygonEntity);

    // 2. LFE dots as point primitives
    const points = new PointPrimitiveCollection();
    for (const lfe of data.lfe_events) {
      points.add({
        position: Cartesian3.fromDegrees(lfe.lon, lfe.lat, 0),
        pixelSize: 4 + lfe.magnitude * 3,
        color: LFE_COLOR,
        outlineColor: LFE_OUTLINE_COLOR,
        outlineWidth: 1,
        scaleByDistance: new NearFarScalar(1.0e5, 1.0, 5.0e6, 0.3),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
    viewer.scene.primitives.add(points);
    pointsRef.current = points;

    // 3. Motion arrow (northward from center of fragment)
    const centerLat = 40.3;
    const centerLon = -124.2;
    const arrowEnd = centerLat + 0.8; // Arrow pointing north

    const arrowEntity = viewer.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArray([
          centerLon, centerLat,
          centerLon, arrowEnd,
        ]),
        width: 3,
        material: ARROW_COLOR,
        clampToGround: true,
      },
    });
    entitiesRef.current.push(arrowEntity);

    // Arrowhead (small triangle at the tip)
    const arrowheadEntity = viewer.entities.add({
      polygon: {
        hierarchy: new PolygonHierarchy(
          Cartesian3.fromDegreesArray([
            centerLon, arrowEnd + 0.15,
            centerLon - 0.08, arrowEnd,
            centerLon + 0.08, arrowEnd,
          ])
        ),
        material: ARROW_COLOR,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
    });
    entitiesRef.current.push(arrowheadEntity);

    // Label for motion
    const labelEntity = viewer.entities.add({
      position: Cartesian3.fromDegrees(centerLon + 0.3, arrowEnd, 0),
      label: {
        text: '15 mm/yr N',
        font: '11px "JetBrains Mono", monospace',
        fillColor: ARROW_COLOR,
        outlineColor: LABEL_BG_COLOR,
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(1.0e5, 1.0, 5.0e6, 0.0),
      },
    });
    entitiesRef.current.push(labelEntity);

    // 4. Connection line to Cascadia slab
    const connEntity = viewer.entities.add({
      polyline: {
        positions: Cartesian3.fromDegreesArray([
          data.connection_to_cascadia.start.lon, data.connection_to_cascadia.start.lat,
          data.connection_to_cascadia.end.lon, data.connection_to_cascadia.end.lat,
        ]),
        width: 2,
        material: CONNECTION_COLOR,
        clampToGround: true,
      },
    });
    entitiesRef.current.push(connEntity);

    return () => {
      for (const entity of entitiesRef.current) {
        viewer.entities.remove(entity);
      }
      entitiesRef.current = [];
      if (pointsRef.current) {
        viewer.scene.primitives.remove(pointsRef.current);
        pointsRef.current = null;
      }
    };
  }, [viewer, data, visible]);

  // Toggle visibility
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      entity.show = visible;
    }
    if (pointsRef.current) {
      pointsRef.current.show = visible;
    }
  }, [visible]);

  return null;
}
