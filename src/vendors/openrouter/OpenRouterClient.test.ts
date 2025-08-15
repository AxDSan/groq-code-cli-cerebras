import { OpenRouterClient } from './OpenRouterClient';
import { OpenRouterVendor } from './OpenRouterVendor';

// Mock vendor for testing
const mockVendor: OpenRouterVendor = {
  id: 'test-vendor-1',
  name: 'Test OpenRouter Vendor',
  apiKey: 'test-api-key',
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  provider: 'OpenAI',
  defaultModel: 'openai/gpt-3.5-turbo'
};

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;
  
  beforeEach(() => {
    client = new OpenRouterClient(mockVendor);
  });
  
  it('should create a client instance', () => {
    expect(client).toBeInstanceOf(OpenRouterClient);
  });
  
  it('should include provider in chat completion request', async () => {
    // Mock fetch to test the request structure
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test-response',
        choices: []
      })
    } as any);
    
    const request = {
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    };
    
    await client.createChatCompletion(request);
    
    // Check that fetch was called with the correct body including provider
    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...request,
          provider: {
            order: ['OpenAI']
          }
        })
      })
    );
    
    mockFetch.mockRestore();
  });
});