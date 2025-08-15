import { VendorManager } from '../VendorManager';
import { CreateOpenRouterVendorRequest } from './OpenRouterVendor';
import { OpenRouterClient } from './OpenRouterClient';

// Example usage of the vendor system with OpenRouter
async function example() {
  // Create vendor manager
  const vendorManager = new VendorManager();
  
  // Create an OpenRouter vendor
  const openRouterVendorData: CreateOpenRouterVendorRequest = {
    name: 'My OpenRouter Account',
    apiKey: 'your-api-key-here',
    enabled: true,
    provider: 'OpenAI', // This will be used in the provider field
    defaultModel: 'openai/gpt-3.5-turbo'
  };
  
  const vendor = vendorManager.createOpenRouterVendor(openRouterVendorData);
  console.log('Created vendor:', vendor);
  
  // Use the vendor with OpenRouter client
  const client = new OpenRouterClient(vendor);
  
  try {
    // List available models
    const models = await client.listModels();
    console.log('Available models:', models);
    
    // Create a chat completion
    const response = await client.createChatCompletion({
      model: vendor.defaultModel || 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, how are you?' }
      ]
    });
    
    console.log('Chat completion response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
example();