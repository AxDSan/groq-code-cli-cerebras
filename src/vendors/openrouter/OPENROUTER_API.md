# OpenRouter API Integration

## Overview
OpenRouter is a unified interface for accessing multiple language models through a single API. It allows developers to easily switch between different models and providers.

## Base URL
```
https://openrouter.ai/api/v1
```

## Authentication
Authentication is done via API keys in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Key Endpoints

### Chat Completion
```
POST /chat/completions
```

### Models List
```
GET /models
```

## Example Request
```javascript
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "model": "openai/gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "provider": {
      "order": ["OpenAI", "Anthropic", "Google"]
    }
  })
});
```

## Vendor Integration Requirements
To integrate vendors with OpenRouter, we need to:

1. Create vendor data models with provider information
2. Implement API client for OpenRouter
3. Create mapping logic between vendor data and OpenRouter format
4. Handle authentication and API key management
5. Implement error handling and rate limiting
6. Support vendor specification in request body via "provider" field