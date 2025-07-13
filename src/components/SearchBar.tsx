import React, { useState, useEffect, useRef } from 'react';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface SearchBarProps {
  onLocationSelect: (place: string, lat: number, lon: number) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Popular Estonian cities for quick access
  const popularCities = [
    'Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Kohtla-Järve', 
    'Viljandi', 'Rakvere', 'Maardu', 'Kuressaare', 'Sillamäe'
  ];

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Estonia')}&limit=5`;
      const response = await fetch(url);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error searching locations:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleLocationSelect = (result: SearchResult) => {
    onLocationSelect(result.display_name, parseFloat(result.lat), parseFloat(result.lon));
    setQuery('');
    setShowResults(false);
  };

  const handlePopularCityClick = (city: string) => {
    onLocationSelect(city, 0, 0); // Will be resolved by Nominatim
    setQuery('');
    setShowResults(false);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      width: '400px',
      maxWidth: '90vw'
    }}>
      <div style={{
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        overflow: 'hidden'
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: showResults ? '1px solid #eee' : 'none'
        }}>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search locations in Estonia..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              backgroundColor: 'transparent'
            }}
          />
          {isLoading && (
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginLeft: '8px'
            }} />
          )}
        </div>

        {/* Search Results */}
        {showResults && (
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {/* Popular Cities */}
            {!query && (
              <div style={{
                padding: '12px',
                borderBottom: '1px solid #eee',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#666',
                  marginBottom: '8px'
                }}>
                  Popular Cities
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  {popularCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handlePopularCityClick(city)}
                      style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => handleLocationSelect(result)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  {result.display_name.split(',')[0]}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '2px'
                }}>
                  {result.display_name}
                </div>
              </div>
            ))}

            {query && results.length === 0 && !isLoading && (
              <div style={{
                padding: '12px',
                textAlign: 'center',
                color: '#666',
                fontSize: '14px'
              }}>
                No locations found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showResults && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1
          }}
          onClick={() => setShowResults(false)}
        />
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default SearchBar; 