// Tartu coordinates and bounding box (expanded for better coverage)
const TARTU_BOUNDS = {
  south: 58.3476,
  north: 58.4076,
  west: 26.6951,
  east: 26.7551
};

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{
    lat: number;
    lon: number;
  }>;
  nodes?: number[];
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export const fetchTartuData = async () => {
  try {
    // Fetch roads with proper bounding box
    const roadsQuery = `
      [out:json][timeout:25];
      (
        way["highway"~"^(primary|secondary|tertiary|residential|service)$"](${TARTU_BOUNDS.south},${TARTU_BOUNDS.west},${TARTU_BOUNDS.north},${TARTU_BOUNDS.east});
      );
      out body;
      >;
      out skel qt;
    `;

    // Fetch buildings with proper bounding box
    const buildingsQuery = `
      [out:json][timeout:25];
      (
        way["building"](${TARTU_BOUNDS.south},${TARTU_BOUNDS.west},${TARTU_BOUNDS.north},${TARTU_BOUNDS.east});
        relation["building"](${TARTU_BOUNDS.south},${TARTU_BOUNDS.west},${TARTU_BOUNDS.north},${TARTU_BOUNDS.east});
      );
      out body;
      >;
      out skel qt;
    `;

    console.log('Fetching roads and buildings data...');
    
    const [roadsResponse, buildingsResponse] = await Promise.all([
      fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(roadsQuery)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }),
      fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(buildingsQuery)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })
    ]);

    if (!roadsResponse.ok || !buildingsResponse.ok) {
      throw new Error('Failed to fetch data from Overpass API');
    }

    const roadsData: OverpassResponse = await roadsResponse.json();
    const buildingsData: OverpassResponse = await buildingsResponse.json();

    console.log('Raw roads response:', roadsData);
    console.log('Raw buildings response:', buildingsData);
    console.log('Roads data:', roadsData.elements.length, 'elements');
    console.log('Buildings data:', buildingsData.elements.length, 'elements');

    // Process roads data
    const processedRoads = roadsData.elements
      .filter(element => element.type === 'way' && element.geometry)
      .map(element => ({
        id: element.id,
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: element.geometry!.map(coord => [coord.lon, coord.lat])
        },
        properties: element.tags || {}
      }));

    // Process buildings data
    const processedBuildings = buildingsData.elements
      .filter(element => element.type === 'way' && element.geometry)
      .map(element => ({
        id: element.id,
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [element.geometry!.map(coord => [coord.lon, coord.lat])]
        },
        properties: element.tags || {}
      }));

    console.log('Processed roads:', processedRoads.length);
    console.log('Processed buildings:', processedBuildings.length);

    return {
      roads: processedRoads,
      buildings: processedBuildings
    };
  } catch (error) {
    console.error('Error fetching data from Overpass API:', error);
    return {
      roads: [],
      buildings: []
    };
  }
}; 