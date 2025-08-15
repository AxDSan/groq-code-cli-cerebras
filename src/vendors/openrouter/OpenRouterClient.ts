import { OpenRouterVendor } from './OpenRouterVendor';

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  provider?: {
    order: string[];
  };
  // Other OpenRouter specific parameters
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private static readonly BASE_URL = 'https://openrouter.ai/api/v1';
  
  constructor(private vendor: OpenRouterVendor) {}
  
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Add provider information if available in the vendor configuration
    const requestBody = { ...request };
    
    if (this.vendor.provider) {
      requestBody.provider = {
        order: [this.vendor.provider]
      };
    }
    
    const response = await fetch(`${OpenRouterClient.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.vendor.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async listModels(): Promise<any> {
    const response = await fetch(`${OpenRouterClient.BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.vendor.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
}