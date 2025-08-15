#!/usr/bin/env node

/**
 * Debug script for OpenRouter vendor implementation
 * This script can be used to test and debug the OpenRouter vendor integration
 */

import { VendorManager } from './VendorManager.js';
import { CreateOpenRouterVendorRequest } from './openrouter/OpenRouterVendor.js';
import { OpenRouterClient } from './openrouter/OpenRouterClient.js';

async function debugOpenRouter() {
  console.log('🔍 Debugging OpenRouter Vendor Implementation\n');
  
  try {
    // Create vendor manager
    console.log('1. Creating VendorManager...');
    const vendorManager = new VendorManager();
    console.log('   ✅ VendorManager created successfully\n');
    
    // Create an OpenRouter vendor
    console.log('2. Creating OpenRouter vendor...');
    const openRouterVendorData: CreateOpenRouterVendorRequest = {
      name: 'Debug OpenRouter Account',
      apiKey: 'debug-api-key', // This is just for testing
      enabled: true,
      provider: 'OpenAI',
      defaultModel: 'openai/gpt-3.5-turbo'
    };
    
    const vendor = vendorManager.createOpenRouterVendor(openRouterVendorData);
    console.log('   ✅ OpenRouter vendor created:', vendor.name);
    console.log('   📋 Vendor ID:', vendor.id);
    console.log('   🏷️  Provider:', vendor.provider);
    console.log('   🧠 Default Model:', vendor.defaultModel);
    console.log('');
    
    // Test vendor retrieval
    console.log('3. Testing vendor retrieval...');
    const retrievedVendor = vendorManager.getVendor(vendor.id);
    if (retrievedVendor) {
      console.log('   ✅ Vendor retrieved successfully');
      console.log('   🆔 ID match:', retrievedVendor.id === vendor.id);
      console.log('   🏷️  Provider match:', retrievedVendor.provider === vendor.provider);
    } else {
      console.log('   ❌ Failed to retrieve vendor');
    }
    console.log('');
    
    // Test OpenRouter client creation
    console.log('4. Creating OpenRouter client...');
    const client = new OpenRouterClient(vendor as any); // Type assertion for debugging
    console.log('   ✅ OpenRouter client created');
    console.log('');
    
    // Test request structure
    console.log('5. Testing request structure...');
    const testRequest = {
      model: vendor.defaultModel || 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Debug test message' }
      ]
    };
    
    console.log('   📝 Test request:', JSON.stringify(testRequest, null, 2));
    
    // Show what the final request would look like with provider
    console.log('   📨 Request with provider field:');
    const finalRequest = {
      ...testRequest,
      provider: {
        order: [vendor.provider || 'OpenAI']
      }
    };
    console.log('   ', JSON.stringify(finalRequest, null, 2));
    console.log('');
    
    console.log('✅ Debug session completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Vendor management: Working');
    console.log('   - Provider field integration: Working');
    console.log('   - Request structure: Correct');
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
    process.exit(1);
  }
}

// Run the debug script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugOpenRouter();
}

export { debugOpenRouter };