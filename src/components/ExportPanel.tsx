import React, { useState } from 'react';

interface QueryResult {
  id: string;
  name: string;
  data: any;
  timestamp: Date;
  visible: boolean;
}

interface ExportPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  queryHistory: QueryResult[];
}

const ExportPanel: React.FC<ExportPanelProps> = ({ isVisible, onToggle, queryHistory }) => {
  const [exportFormat, setExportFormat] = useState<'geojson' | 'csv'>('geojson');
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);

  const handleExport = () => {
    if (selectedQueries.length === 0) return;

    const queriesToExport = queryHistory.filter(q => selectedQueries.includes(q.id));
    
    if (exportFormat === 'geojson') {
      exportAsGeoJSON(queriesToExport);
    } else {
      exportAsCSV(queriesToExport);
    }
  };

  const exportAsGeoJSON = (queries: QueryResult[]) => {
    const combinedGeoJSON = {
      type: 'FeatureCollection',
      features: queries.flatMap(query => 
        query.data.features.map((feature: any, index: number) => ({
          ...feature,
          properties: {
            ...feature.properties,
            query_name: query.name,
            query_id: query.id
          }
        }))
      )
    };

    const blob = new Blob([JSON.stringify(combinedGeoJSON, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estonia-geospatial-data-${new Date().toISOString().split('T')[0]}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = (queries: QueryResult[]) => {
    const allFeatures = queries.flatMap(query => 
      query.data.features.map((feature: any) => ({
        ...feature.properties,
        query_name: query.name,
        query_id: query.id,
        geometry_type: feature.geometry.type,
        coordinates: JSON.stringify(feature.geometry.coordinates)
      }))
    );

    if (allFeatures.length === 0) return;

    const headers = Object.keys(allFeatures[0]);
    const csvContent = [
      headers.join(','),
      ...allFeatures.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estonia-geospatial-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleQuerySelection = (queryId: string) => {
    setSelectedQueries(prev => 
      prev.includes(queryId) 
        ? prev.filter(id => id !== queryId)
        : [...prev, queryId]
    );
  };

  const selectAll = () => {
    setSelectedQueries(queryHistory.map(q => q.id));
  };

  const selectNone = () => {
    setSelectedQueries([]);
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      zIndex: 1000
    }}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#333',
          border: '1px solid #ddd',
          cursor: 'pointer',
          fontSize: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        📁
      </button>

      {/* Export Panel */}
      {isVisible && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '0',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          minWidth: '280px',
          maxWidth: '350px'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Export Data
          </h3>

          {queryHistory.length === 0 ? (
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              No data to export. Run some queries first!
            </p>
          ) : (
            <>
              {/* Format Selection */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                  Export Format:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="radio"
                      value="geojson"
                      checked={exportFormat === 'geojson'}
                      onChange={(e) => setExportFormat(e.target.value as 'geojson' | 'csv')}
                      style={{ marginRight: '4px' }}
                    />
                    GeoJSON
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="radio"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as 'geojson' | 'csv')}
                      style={{ marginRight: '4px' }}
                    />
                    CSV
                  </label>
                </div>
              </div>

              {/* Query Selection */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    Select Queries:
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={selectAll}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={selectNone}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      None
                    </button>
                  </div>
                </div>

                <div style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px'
                }}>
                  {queryHistory.map((query) => (
                    <label
                      key={query.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 0',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedQueries.includes(query.id)}
                        onChange={() => toggleQuerySelection(query.id)}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ flex: 1 }}>
                        {query.name} ({query.data.features.length} features)
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={selectedQueries.length === 0}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: selectedQueries.length === 0 ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedQueries.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Export {selectedQueries.length} Query{selectedQueries.length !== 1 ? 's' : ''}
              </button>

              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#666',
                textAlign: 'center'
              }}>
                {exportFormat === 'geojson' 
                  ? 'GeoJSON preserves geometry and properties'
                  : 'CSV includes coordinates as text'
                }
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportPanel; 