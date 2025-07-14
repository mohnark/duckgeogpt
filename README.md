# Estonia Geospatial Demo App

An interactive web application for exploring geospatial data in Estonia using React, DeckGL, and DuckDB for local data processing.

## Features

### 🗺️ Interactive Map
- **DeckGL Integration**: High-performance 3D map rendering with WebGL
- **Multiple Layers**: Support for buildings, roads, and land use data
- **Automatic Zooming**: Smart viewport fitting to query results
- **Navigation Controls**: Pan, zoom, and rotate functionality

### 💬 AI-Powered Chat Interface
- **Gemini Integration**: Powered by Google's Gemini 2.0 Flash for intelligent query understanding
- **Natural Language Queries**: Ask questions in plain English with complex reasoning
- **Smart Query Analysis**: AI automatically determines data types, locations, and filters
- **Intelligent Explanations**: Get AI-generated explanations of query results
- **Quick Actions**: One-click buttons for common queries
- **Query History**: Track and manage your previous searches
- **Help System**: Built-in guidance and examples

### 🔍 Advanced Search & Navigation
- **Location Search**: Find any place in Estonia with autocomplete
- **Popular Cities**: Quick access to major Estonian cities
- **Geocoding**: Automatic coordinate resolution via Nominatim
- **Real-time Results**: Instant search suggestions

### 📊 Layer Management
- **Multiple Query Results**: Run multiple queries and compare results
- **Layer Visibility**: Show/hide individual query layers
- **Color Coding**: Automatic color assignment for different layers
- **Layer Controls**: Collapsible panel with layer management
- **Feature Counts**: Display number of features per layer

### 📁 Data Export
- **GeoJSON Export**: Preserve geometry and properties
- **CSV Export**: Tabular format with coordinates
- **Selective Export**: Choose which queries to export
- **Batch Export**: Export multiple queries at once
- **Automatic Naming**: Date-stamped file names

### ℹ️ Information Panel
- **Current Location**: Display active map location
- **Layer Statistics**: Show active layers and feature counts
- **Data Sources**: Information about available datasets
- **Usage Tips**: Helpful guidance for users

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop and mobile
- **Clean Interface**: Modern, intuitive design
- **Smooth Animations**: Polished user experience
- **Accessibility**: Keyboard navigation and screen reader support

## Data Sources

The application uses OpenStreetMap data for Estonia, including:
- **Buildings**: Residential, commercial, and public buildings
- **Roads**: Highways, primary roads, and local streets
- **Land Use**: Residential areas, parks, commercial zones

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Mapping**: DeckGL + react-map-gl + Mapbox
- **Database**: DuckDB WASM for client-side data processing
- **Data Format**: Parquet files for efficient storage
- **Styling**: Inline styles for component isolation

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   Create a `.env` file in the root directory:
   ```
   # Google Gemini API Key - Get one from https://makersuite.google.com/app/apikey
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   
   # Mapbox Access Token (optional - for better map tiles)
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Open Browser**:
   Navigate to `http://localhost:5173`

## Usage Examples

### Chat Queries
- "Show me buildings in Tallinn"
- "Find commercial areas within 5km of Tartu"
- "Display parks and recreational spaces"
- "Show me schools near residential areas"
- "Center map on Viljandi"
- "What types of buildings are available?"

### Quick Actions
- Buildings, Roads, Residential, Commercial
- Parks, Schools, Highways
- Center on Tartu

### Layer Management
- Toggle layer visibility
- Remove individual layers
- Clear all layers
- View feature counts

### Data Export
- Select queries to export
- Choose GeoJSON or CSV format
- Download with automatic naming

## File Structure

```
src/
├── components/
│   ├── Map.tsx              # Main map component
│   ├── ChatBox.tsx          # AI chat interface
│   ├── SearchBar.tsx        # Location search
│   ├── InfoPanel.tsx        # Information display
│   ├── ExportPanel.tsx      # Data export
│   └── LayerSelector.tsx    # Layer management
├── services/
│   ├── duckdbService.ts     # DuckDB integration
│   ├── openaiService.ts     # Google Gemini AI integration
│   └── overpassService.ts   # Overpass API (legacy)
└── public/
    ├── buildings.geoparquet # Building data
    ├── roads.geoparquet     # Road data
    └── landuse.geoparquet   # Land use data
```

## Performance Features

- **Client-side Processing**: All data processing happens in the browser
- **Efficient Queries**: DuckDB provides fast SQL queries on parquet files
- **WebGL Rendering**: Hardware-accelerated map rendering
- **Lazy Loading**: Components load only when needed
- **Memory Management**: Automatic cleanup of unused layers

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires WebGL support for optimal performance.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- OpenStreetMap contributors for the geospatial data
- DuckDB team for the excellent WASM implementation
- Mapbox for the mapping platform
- DeckGL team for the powerful WebGL mapping library
