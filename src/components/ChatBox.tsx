import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBoxProps {
  onQueryGenerated: (query: string, label?: string) => void;
  onCenterMap: (place: string) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ onQueryGenerated, onCenterMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I can help you generate Overpass queries for Tartu or center the map on a place. Try asking "Show all parks" or "Center map on Paris".',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    addMessage(userInput, true);
    setLoading(true);

    try {
      // Detect if user wants to center the map
      const centerMatch = userInput.match(/(?:center|go to|move|fly)\s+(?:map\s+)?(?:on|to)?\s*([\w\s,]+)/i);
      if (centerMatch && centerMatch[1]) {
        const place = centerMatch[1].trim();
        addMessage(`Centering map on ${place}...`, false);
        onCenterMap(place);
        setLoading(false);
        return;
      }

      // Otherwise, treat as Overpass query
      const response = await simulateOpenAIResponse(userInput);
      const query = extractOverpassQuery(response);
      if (query) {
        addMessage(`Searching for ${userInput}...`, false);
        onQueryGenerated(query, userInput);
      } else {
        addMessage(response, false);
      }
    } catch (error) {
      addMessage('Sorry, I encountered an error. Please try again.', false);
    } finally {
      setLoading(false);
    }
  };

  const simulateOpenAIResponse = async (prompt: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple response logic for demo
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('park') || lowerPrompt.includes('green')) {
      return `Here's an Overpass query to find parks in Tartu:

\`\`\`
[out:json][timeout:25];
(
  way["leisure"="park"](58.3476,26.6951,58.4076,26.7551);
  relation["leisure"="park"](58.3476,26.6951,58.4076,26.7551);
);
out body;
>;
out skel qt;
\`\`\`

This will find all parks in the Tartu area.`;
    } else if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('food')) {
      return `Here's an Overpass query to find restaurants in Tartu:

\`\`\`
[out:json][timeout:25];
(
  way["amenity"="restaurant"](58.3476,26.6951,58.4076,26.7551);
  node["amenity"="restaurant"](58.3476,26.6951,58.4076,26.7551);
);
out body;
>;
out skel qt;
\`\`\`

This will find all restaurants in the Tartu area.`;
    } else {
      return `I can help you generate Overpass queries for Tartu. Try asking about:
- Parks and green spaces
- Restaurants and cafes
- Schools and universities
- Hospitals and medical facilities
- Shopping centers and stores

What would you like to find?`;
    }
  };

  const extractOverpassQuery = (response: string): string | null => {
    const match = response.match(/```\n([\s\S]*?)\n```/);
    return match ? match[1].trim() : null;
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
      right: '20px', 
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
            fontWeight: 'bold'
          }}>
            AI Assistant
          </div>

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
                  Thinking...
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
                placeholder="Ask me to find something in Tartu..."
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