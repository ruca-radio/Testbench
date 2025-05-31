# TestBench

# TestBench is a fully configurable, multi-model, multi-provider AI inference platform.

## Setup
1. Copy `.env.example` to `.env` and set your `OPENAI_API_KEY`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser at http://localhost:3000 to use the chat UI.

## API

## API (Advanced)
### POST /chat
Use this endpoint directly if you need to integrate with another client.
Request Body (JSON):
```json
{
  "model": "gpt-3.5-turbo", // optional, defaults to gpt-3.5-turbo
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello, how are you?" }
  ]
}
```

Response:

Returns the full OpenAI Chat Completion response JSON.