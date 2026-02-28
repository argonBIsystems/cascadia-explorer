import type { TimeRange, EarthquakeFeature } from '../types';

const CASCADIA_BOUNDS = {
  minLatitude: 40,
  maxLatitude: 51,
  minLongitude: -130,
  maxLongitude: -121,
};

function getStartTime(range: TimeRange): string {
  const now = new Date();
  switch (range) {
    case '24h':
      now.setHours(now.getHours() - 24);
      break;
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '1yr':
      now.setFullYear(now.getFullYear() - 1);
      break;
  }
  return now.toISOString();
}

export async function fetchEarthquakes(
  range: TimeRange,
): Promise<EarthquakeFeature[]> {
  const startTime = getStartTime(range);

  const params = new URLSearchParams({
    format: 'geojson',
    starttime: startTime,
    endtime: new Date().toISOString(),
    minlatitude: String(CASCADIA_BOUNDS.minLatitude),
    maxlatitude: String(CASCADIA_BOUNDS.maxLatitude),
    minlongitude: String(CASCADIA_BOUNDS.minLongitude),
    maxlongitude: String(CASCADIA_BOUNDS.maxLongitude),
    minmagnitude: '1.0',
    orderby: 'time',
  });

  const res = await fetch(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`,
  );

  if (!res.ok) throw new Error(`USGS API error: ${res.status}`);

  const data = await res.json();

  return (data.features as any[]).map((f) => ({
    id: f.id as string,
    longitude: f.geometry.coordinates[0] as number,
    latitude: f.geometry.coordinates[1] as number,
    depth: (f.geometry.coordinates[2] as number) ?? 0,
    magnitude: f.properties.mag as number,
    time: f.properties.time as number,
    place: f.properties.place as string,
    url: f.properties.url as string,
    type: f.properties.type as string,
  }));
}
