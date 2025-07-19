import { AsyncDuckDB, selectBundle, getJsDelivrBundles, ConsoleLogger, createWorker } from '@duckdb/duckdb-wasm';

let db: AsyncDuckDB | null = null;
let initializationPromise: Promise<AsyncDuckDB> | null = null;

export const initializeDuckDB = async (): Promise<AsyncDuckDB> => {
  if (db) {
    return db;
  }

  // Prevent multiple simultaneous initializations
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Initialize DuckDB WASM with explicit bundle selection
      const bundles = getJsDelivrBundles();
      
      // Try to select the best bundle for the current environment
      const bundle = await selectBundle(bundles);
      
      if (!bundle.mainWorker) {
        throw new Error('No worker URL found in bundle');
      }
      
      const worker = await createWorker(bundle.mainWorker);
      
      db = new AsyncDuckDB(new ConsoleLogger(), worker);
      
      // Initialize the database
      await db.instantiate(bundle.mainModule);
      
      // Install and load spatial extension
      const spatialConnection = await db.connect();
      await spatialConnection.query('INSTALL spatial');
      await spatialConnection.query('LOAD spatial');
      await spatialConnection.close();
      
      // Load the parquet files
      await loadParquetFiles();
      
      // Test the database with a simple query
      const connection = await db.connect();
      await connection.query('SELECT 1 as test');
      await connection.close();
      
      return db;
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error);
      db = null;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};

const loadParquetFiles = async () => {
  if (!db) return;

  try {
    // Load geoparquet files from the public folder
    const buildingsResponse = await fetch('/buildings.geoparquet');
    if (!buildingsResponse.ok) {
      throw new Error(`Failed to load buildings.geoparquet: ${buildingsResponse.status}`);
    }
    const buildingsBuffer = await buildingsResponse.arrayBuffer();
    
    // Check if file has valid parquet magic bytes
    const buildingsArray = new Uint8Array(buildingsBuffer);
    if (buildingsArray.length < 4 || 
        buildingsArray[0] !== 0x50 || 
        buildingsArray[1] !== 0x41 || 
        buildingsArray[2] !== 0x52 || 
        buildingsArray[3] !== 0x31) {
      throw new Error('Invalid geoparquet file format: buildings.geoparquet');
    }
    
    const roadsResponse = await fetch('/roads.geoparquet');
    if (!roadsResponse.ok) {
      throw new Error(`Failed to load roads.geoparquet: ${roadsResponse.status}`);
    }
    const roadsBuffer = await roadsResponse.arrayBuffer();
    
    const roadsArray = new Uint8Array(roadsBuffer);
    if (roadsArray.length < 4 || 
        roadsArray[0] !== 0x50 || 
        roadsArray[1] !== 0x41 || 
        roadsArray[2] !== 0x52 || 
        roadsArray[3] !== 0x31) {
      throw new Error('Invalid geoparquet file format: roads.geoparquet');
    }
    
    const landuseResponse = await fetch('/landuse.geoparquet');
    if (!landuseResponse.ok) {
      throw new Error(`Failed to load landuse.geoparquet: ${landuseResponse.status}`);
    }
    const landuseBuffer = await landuseResponse.arrayBuffer();
    
    const landuseArray = new Uint8Array(landuseBuffer);
    if (landuseArray.length < 4 || 
        landuseArray[0] !== 0x50 || 
        landuseArray[1] !== 0x41 || 
        landuseArray[2] !== 0x52 || 
        landuseArray[3] !== 0x31) {
      throw new Error('Invalid geoparquet file format: landuse.geoparquet');
    }

    // Register the files with DuckDB
    await db.registerFileBuffer('buildings.geoparquet', buildingsArray);
    await db.registerFileBuffer('roads.geoparquet', roadsArray);
    await db.registerFileBuffer('landuse.geoparquet', landuseArray);
  } catch (error) {
    console.error('Error loading parquet files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load parquet files: ${errorMessage}. Please ensure the parquet files are valid and not corrupted.`);
  }
};



// Helper function to serialize DuckDB results
const serializeResult = (data: any[]): any[] => {
  return data.map(row => {
    const serializedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'bigint') {
        serializedRow[key] = Number(value);
      } else if (value === null || value === undefined) {
        serializedRow[key] = null;
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects (like geometry)
        serializedRow[key] = JSON.parse(JSON.stringify(value, (_, v) => 
          typeof v === 'bigint' ? Number(v) : v
        ));
      } else {
        serializedRow[key] = value;
      }
    }
    return serializedRow;
  });
};

export const queryDuckDB = async (query: string): Promise<any[]> => {
  try {
    const database = await initializeDuckDB();
    
    const connection = await database.connect();
    
    const result = await connection.query(query);
    
    const rawData = result.toArray();
    
    // Serialize the data to handle BigInt and other non-serializable types
    const data = serializeResult(rawData);
    
    await connection.close();
    
    return data;
  } catch (error) {
    console.error('DuckDB query error:', error);
    throw error;
  }
};

export const inspectParquetSchema = async (filename: string): Promise<any[]> => {
  try {
    const database = await initializeDuckDB();
    const connection = await database.connect();
    
    // Get the schema of the parquet file
    const result = await connection.query(`DESCRIBE SELECT * FROM read_parquet('${filename}') LIMIT 0`);
    const schema = result.toArray();
    
    await connection.close();
    return schema;
  } catch (error) {
    console.error('Error inspecting parquet schema:', error);
    throw error;
  }
};


export const getSampleQueries = () => {
  return [
    {
      keyword: 'buildings',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') LIMIT 1000",
      description: 'Show all buildings in Estonia (limited to 1000)'
    },
    {
      keyword: 'commercial',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE building = 'commercial' OR building = 'retail' OR building = 'office' LIMIT 1000",
      description: 'Show commercial buildings and offices'
    },
    {
      keyword: 'residential',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE building = 'residential' OR building = 'house' OR building = 'apartments' LIMIT 1000",
      description: 'Show residential buildings and houses'
    },
    {
      keyword: 'roads',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('roads.geoparquet') LIMIT 1000",
      description: 'Show all roads in Estonia (limited to 1000)'
    },
    {
      keyword: 'highway',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('roads.geoparquet') WHERE highway IN ('motorway', 'trunk', 'primary', 'secondary') LIMIT 1000",
      description: 'Show major highways and primary roads'
    },
    {
      keyword: 'landuse',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('landuse.geoparquet') LIMIT 1000",
      description: 'Show all land use areas in Estonia (limited to 1000)'
    },
    {
      keyword: 'residential-areas',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('landuse.geoparquet') WHERE landuse = 'residential' LIMIT 1000",
      description: 'Show residential land use areas'
    },
    {
      keyword: 'commercial-zones',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('landuse.geoparquet') WHERE landuse = 'commercial' OR landuse = 'retail' LIMIT 1000",
      description: 'Show commercial and retail zones'
    },
    {
      keyword: 'parks',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('landuse.geoparquet') WHERE landuse = 'park' OR landuse = 'recreation_ground' OR landuse = 'leisure' LIMIT 1000",
      description: 'Show parks and recreational areas'
    },
    {
      keyword: 'industrial',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('landuse.geoparquet') WHERE landuse = 'industrial' OR landuse = 'manufacturing' LIMIT 1000",
      description: 'Show industrial areas'
    },
    {
      keyword: 'schools',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE building = 'school' OR building = 'university' OR building = 'college' LIMIT 1000",
      description: 'Show schools and educational buildings'
    },
    {
      keyword: 'hospitals',
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE building = 'hospital' OR building = 'clinic' OR building = 'medical' LIMIT 1000",
      description: 'Show hospitals and medical facilities'
    },
    {
      keyword: 'schema',
      query: "DESCRIBE SELECT * FROM read_parquet('buildings.geoparquet') LIMIT 0",
      description: 'Show buildings table schema'
    }
  ];
};

