import React, { useState, useRef, useEffect } from 'react';
import { queryDuckDB } from '../services/duckdbService';
import { analyzeQueryWithGPT, generateQueryExplanation, QueryIntent } from '../services/openaiService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBoxProps {
  onQueryGenerated: (geoJSONString: string, label?: string) => void;
  onCenterMap: (place: string) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ onQueryGenerated, onCenterMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m your AI-powered geospatial assistant for Estonia. I can help you explore buildings, roads, and land use data.\n\nTry asking:\n• "Show me buildings around Tartu"\n• "Find commercial areas within 5km of Tallinn"\n• "Display parks and recreational spaces"\n• "Show me schools near residential areas"\n• "Center map on Viljandi"\n\nBe specific about what you want to see (buildings, roads, or land use) and where!',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Quick action buttons
  const quickActions = [
    { label: 'Buildings', query: 'Show me buildings in Estonia' },
    { label: 'Roads', query: 'Display roads in Estonia' },
    { label: 'Residential', query: 'Find residential areas' },
    { label: 'Commercial', query: 'Show commercial buildings and areas' },
    { label: 'Parks', query: 'Display parks and recreational areas' },
    { label: 'Schools', query: 'Find schools and educational buildings' },
    { label: 'Highways', query: 'Show major highways and primary roads' },
    { label: 'Center Tartu', action: 'center', place: 'Tartu' }
  ];

  const handleQuickAction = (action: any) => {
    if (action.action === 'center') {
      addMessage(`Center map on ${action.place}`, true);
      onCenterMap(action.place);
    } else {
      addMessage(action.query, true);
      handleQuery(action.query);
    }
  };

  const handleQuery = async (queryText: string) => {
    setLoading(true);

    try {
      // Detect if user wants to center the map
      const centerMatch = queryText.match(/(?:center|go to|move|fly)\s+(?:map\s+)?(?:on|to)?\s*([\w\s,]+)/i);
      if (centerMatch && centerMatch[1]) {
        const place = centerMatch[1].trim();
        addMessage(`Centering map on ${place}...`, false);
        onCenterMap(place);
        setLoading(false);
        return;
      }

      // Use Gemini to analyze and generate the query
      addMessage(`Processing your query with Gemini...`, false);
      
      let queryIntent: QueryIntent;
      try {
        queryIntent = await analyzeQueryWithGPT(queryText);
        addMessage(`Analysis: ${queryIntent.explanation}`, false);
      } catch (error) {
        console.error('Gemini analysis failed:', error);
        addMessage(`I couldn't understand that. Try being more specific, like "Show me buildings in Tallinn" or "Find roads around Tartu".`, false);
        setLoading(false);
        return;
      }

      // Execute the AI-generated query
      addMessage(`Running query...`, false);
      console.log('AI Generated Query:', queryIntent.query);
      
      const result = await queryDuckDB(queryIntent.query);

      if (result && result.length > 0) {
        const count = result.length;
        
        // Generate AI explanation of results
        try {
          const explanation = await generateQueryExplanation(queryIntent.query, result);
          addMessage(`${explanation}`, false);
        } catch (error) {
          console.error('Error generating explanation:', error);
          addMessage(`Found ${count} ${queryIntent.dataType} features.`, false);
        }
        
        // Convert to GeoJSON and send to map
        const geoJSON = convertToGeoJSON(result);
        console.log('Converted GeoJSON:', geoJSON);
        console.log('GeoJSON features count:', geoJSON.features.length);
        
        // Add to query history
        setQueryHistory(prev => [...prev, queryText]);
        
        const label = queryIntent.location ? `${queryIntent.dataType} around ${queryIntent.location}` : queryIntent.dataType;
        onQueryGenerated(JSON.stringify(geoJSON), label);
      } else {
        addMessage(`No ${queryIntent.dataType} found${queryIntent.location ? ` within ${queryIntent.radius}km of ${queryIntent.location}` : ''}. Try a different search term or location.`, false);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addMessage(`Error: ${errorMessage}. Please try again.`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    const userInput = input.trim();
    setInput('');
    await handleQuery(userInput);
  };

  // Convert DuckDB results to GeoJSON
  const convertToGeoJSON = (data: any[]): any => {
    console.log('Converting data to GeoJSON, sample row:', data[0]);
    
    return {
      type: 'FeatureCollection',
      features: data.map((row, index) => {
        // Parse WKT geometry from DuckDB
        let geometry = null;
        
        if (row.geometry_wkt) {
          console.log(`Parsing WKT geometry: ${row.geometry_wkt}`);
          
          // Parse WKT (Well-Known Text) format
          const wkt = row.geometry_wkt;
          
          // Handle POINT
          const pointMatch = wkt.match(/POINT\s*\(([^)]+)\)/i);
          if (pointMatch) {
            const coords = pointMatch[1].split(' ').map(Number);
            geometry = {
              type: 'Point',
              coordinates: coords
            };
          } else {
            // Handle LINESTRING
            const lineMatch = wkt.match(/LINESTRING\s*\(([^)]+)\)/i);
            if (lineMatch) {
              const coords = lineMatch[1].split(',').map((c: string) => 
                c.trim().split(' ').map(Number)
              );
              geometry = {
                type: 'LineString',
                coordinates: coords
              };
            } else {
              // Handle POLYGON
              const polygonMatch = wkt.match(/POLYGON\s*\(\(([^)]+)\)\)/i);
              if (polygonMatch) {
                const coords = polygonMatch[1].split(',').map((c: string) => 
                  c.trim().split(' ').map(Number)
                );
                geometry = {
                  type: 'Polygon',
                  coordinates: [coords]
                };
              } else {
                // Handle MULTIPOLYGON
                const multiPolygonMatch = wkt.match(/MULTIPOLYGON\s*\(\(\(([^)]+)\)\)\)/i);
                if (multiPolygonMatch) {
                  const coords = multiPolygonMatch[1].split(',').map((c: string) => 
                    c.trim().split(' ').map(Number)
                  );
                  geometry = {
                    type: 'Polygon',
                    coordinates: [coords]
                  };
                }
              }
            }
          }
        }
        
        // Fallback to coordinate fields if no WKT geometry
        if (!geometry) {
          if (row.lon && row.lat) {
            geometry = {
              type: 'Point',
              coordinates: [row.lon, row.lat]
            };
          } else if (row.longitude && row.latitude) {
            geometry = {
              type: 'Point',
              coordinates: [row.longitude, row.latitude]
            };
          } else {
            // Default point at origin
            geometry = {
              type: 'Point',
              coordinates: [0, 0]
            };
          }
        }

        const feature = {
          type: 'Feature',
          id: index,
          geometry: geometry,
          properties: Object.fromEntries(
            Object.entries(row).filter(([key]) => 
              !['geometry', 'geometry_wkt', 'geom', 'shape', 'wkt', 'coordinates', 'lon', 'lat', 'longitude', 'latitude', 'x', 'y'].includes(key)
            )
          )
        };
        
        if (index === 0) {
          console.log('First feature:', feature);
        }
        
        return feature;
      })
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '0px',
      zIndex: 1000,
      width: '350px',
      maxHeight: '500px'
    }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          marginBottom: '10px',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #eee',
            borderRadius: '12px 12px 0 0',
            backgroundColor: '#f8f9fa',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Estonia Geospatial Assistant</span>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#007bff',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              {showQuickActions ? 'Hide' : 'Quick'} Actions
            </button>
          </div>

          {/* Quick Actions */}
          {showQuickActions && (
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #eee',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px'
              }}>
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action)}
                    disabled={loading}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            maxHeight: '300px'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: message.isUser ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: message.isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  backgroundColor: message.isUser ? '#007bff' : '#f1f3f4',
                  color: message.isUser ? 'white' : 'black',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap'
                }}>
                  {message.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '18px 18px 18px 4px',
                  backgroundColor: '#f1f3f4',
                  fontSize: '14px'
                }}>
                  Searching...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #eee'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to find something in Estonia..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  resize: 'none',
                  fontSize: '14px',
                  minHeight: '40px',
                  maxHeight: '100px'
                }}
                rows={1}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: loading || !input.trim() ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  );
};

export default ChatBox; 