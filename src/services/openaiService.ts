import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface QueryIntent {
  dataType: 'buildings' | 'roads' | 'landuse';
  location?: string;
  radius?: number;
  filters?: Record<string, any>;
  query: string;
  explanation: string;
}

export const analyzeQueryWithGPT = async (userQuery: string): Promise<QueryIntent> => {
  try {
    // Debug: Check if API key is loaded
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log('Gemini API Key loaded:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
    
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
    }

    const systemPrompt = `You are an expert geospatial data analyst working with Estonian geospatial data using DuckDB. Your job is to analyze user queries and generate the exact SQL query to execute.

Available datasets:
- buildings.geoparquet: Contains building footprints with properties like building type, name, address, addr_city
- roads.geoparquet: Contains road networks with properties like highway type, name, surface
- landuse.geoparquet: Contains land use areas with properties like landuse type, name

Important SQL requirements:
- Always use read_parquet('filename.geoparquet') to read data
- Always include ST_AsText(geometry) as geometry_wkt in SELECT statements
- Always add LIMIT 1000 to prevent overwhelming results
- Use ST_DWithin(geometry, ST_Point(lon, lat), radius_degrees) for spatial filtering
- Convert km to degrees by dividing by 111 (approximate)

City coordinates for spatial queries:
- Tartu: 26.7251, 58.3776
- Tallinn: 24.7536, 59.4369
- Pärnu: 24.4971, 58.3858
- Narva: 28.1906, 59.3772
- Kohtla-Järve: 27.2731, 59.3986
- Viljandi: 25.5900, 58.3639
- Rakvere: 26.3558, 59.3464
- Maardu: 25.0250, 59.4767
- Kuressaare: 22.4853, 58.2525
- Sillamäe: 27.7639, 59.3997

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any other text, explanations, or markdown formatting.

The JSON object must contain:
{
  "dataType": "buildings|roads|landuse",
  "location": "city name if specified",
  "radius": number in km (default 10),
  "filters": {"property": "value"} for specific filters,
  "query": "the complete SQL query to execute",
  "explanation": "explanation of what the query does"
}

Examples:
- "Show me buildings around Tartu" → {"dataType": "buildings", "location": "Tartu", "radius": 10, "query": "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE ST_DWithin(geometry, ST_Point(26.7251, 58.3776), 0.09) LIMIT 1000", "explanation": "Find buildings within 10km of Tartu"}
- "Find commercial buildings" → {"dataType": "buildings", "filters": {"building": "commercial"}, "query": "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE building = 'commercial' LIMIT 1000", "explanation": "Find all commercial buildings"}
- "Highways near Tallinn" → {"dataType": "roads", "location": "Tallinn", "radius": 10, "filters": {"highway": ["motorway", "trunk", "primary"]}, "query": "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('roads.geoparquet') WHERE highway IN ('motorway', 'trunk', 'primary') AND ST_DWithin(geometry, ST_Point(24.7536, 59.4369), 0.09) LIMIT 1000", "explanation": "Find major highways within 10km of Tallinn"}
- "Residential areas in Pärnu" → {"dataType": "landuse", "location": "Pärnu", "radius": 10, "filters": {"landuse": "residential"}, "query": "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('landuse.geoparquet') WHERE landuse = 'residential' AND ST_DWithin(geometry, ST_Point(24.4971, 58.3858), 0.09) LIMIT 1000", "explanation": "Find residential areas within 10km of Pärnu"}

If the query is unclear or not related to geospatial data, respond with:
{"dataType": "buildings", "location": "Tartu", "radius": 10, "filters": {}, "query": "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE ST_DWithin(geometry, ST_Point(26.7251, 58.3776), 0.09) LIMIT 1000", "explanation": "Showing buildings around Tartu as an example"}

Generate the complete, executable SQL query that can be run directly in DuckDB.`;

    const fullPrompt = `${systemPrompt}\n\nUser query: ${userQuery}\n\nResponse:`;

    console.log('Sending request to Gemini...');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const content = response.text();
    
    if (!content) {
      throw new Error('No response from Gemini');
    }

    console.log('Raw AI response:', content);

    // Clean the response - remove any markdown formatting
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse JSON from the response
    let parsed;
    try {
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Attempting to extract JSON from response...');
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback to a default query
        console.log('No JSON found, using fallback query');
        parsed = {
          dataType: "buildings",
          location: "Tartu",
          radius: 10,
          filters: {},
          query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE ST_DWithin(geometry, ST_Point(26.7251, 58.3776), 0.09) LIMIT 1000",
          explanation: "Showing buildings around Tartu as an example"
        };
      } else {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          console.error('Second JSON parse error:', secondParseError);
          // Final fallback
          parsed = {
            dataType: "buildings",
            location: "Tartu",
            radius: 10,
            filters: {},
            query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE ST_DWithin(geometry, ST_Point(26.7251, 58.3776), 0.09) LIMIT 1000",
            explanation: "Showing buildings around Tartu as an example"
          };
        }
      }
    }

    console.log('Parsed JSON:', parsed);
    
    // Validate the parsed object
    if (!parsed.dataType || !parsed.query || !parsed.explanation) {
      console.log('Invalid parsed object, using fallback');
      parsed = {
        dataType: "buildings",
        location: "Tartu",
        radius: 10,
        filters: {},
        query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE ST_DWithin(geometry, ST_Point(26.7251, 58.3776), 0.09) LIMIT 1000",
        explanation: "Showing buildings around Tartu as an example"
      };
    }
    
    return parsed as QueryIntent;

  } catch (error) {
    console.error('Gemini API error:', error);
    // Return a fallback query instead of throwing
    return {
      dataType: "buildings",
      location: "Tartu",
      radius: 10,
      filters: {},
      query: "SELECT *, ST_AsText(geometry) as geometry_wkt FROM read_parquet('buildings.geoparquet') WHERE ST_DWithin(geometry, ST_Point(26.7251, 58.3776), 0.09) LIMIT 1000",
      explanation: "Showing buildings around Tartu as an example"
    };
  }
};

export const generateQueryExplanation = async (query: string, results: any[]): Promise<string> => {
  try {
    const prompt = `Explain this geospatial query result in a user-friendly way:

Query: ${query}
Results: ${results.length} features found

Please provide a brief, natural explanation of what was found.`;

    console.log('Generating explanation with Gemini...');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text() || 'Query executed successfully.';
    
    console.log('Generated explanation:', explanation);
    return explanation;
  } catch (error) {
    console.error('Error generating explanation:', error);
    return `Found ${results.length} features.`;
  }
}; 