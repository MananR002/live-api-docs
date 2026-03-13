# Live API Docs

An automatic API documentation middleware for Express that tracks HTTP methods and paths for each request.

## Installation

```bash
npm install
```

## Usage

```javascript
const express = require('express');
const { autoDocs } = require('./src/autoDocs');

const app = express();

// IMPORTANT: Apply body parsing middleware BEFORE autoDocs
app.use(express.json());

// Create and apply the middleware
const docsMiddleware = autoDocs();
app.use(docsMiddleware);

// Register the docs endpoint
app.get(docsMiddleware.docsPath, docsMiddleware.docsHandler);

// Your routes...
app.get('/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/users', (req, res) => {
  res.json({ user: req.body });
});

app.listen(3000);
```

## API

### `autoDocs(options)`

Creates a new autoDocs middleware instance.

**Options:**
- `docsPath` (string): Path for the docs endpoint. Default: `'/docs'`

**Returns:** A middleware function with attached methods.

### Middleware Methods

- `docsHandler` - Express route handler for the docs endpoint
- `docsPath` - The configured docs path (default: `/docs`)
- `getEndpoints()` - Returns array of captured endpoints
- `clearEndpoints()` - Clears all captured endpoints

## Example

Run the example server:

```bash
npm start
```

Then test with:

```bash
# Make some requests
curl http://localhost:3000/users
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Manan","age":28,"skills":["Software engineering"]}'
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com"}'
curl http://localhost:3000/users/123

# View captured endpoints with inferred schemas
curl http://localhost:3000/docs
```

## Response Format

The `/docs` endpoint returns:

```json
{
  "totalEndpoints": 3,
  "endpoints": [
    {
      "method": "GET",
      "path": "/users",
      "firstObserved": "2024-01-15T10:30:00.000Z",
      "hitCount": 5
    },
    {
      "method": "POST",
      "path": "/users",
      "firstObserved": "2024-01-15T10:31:00.000Z",
      "hitCount": 2,
      "lastObserved": "2024-01-15T10:35:00.000Z",
      "bodySchema": {
        "name": "string",
        "age": "number",
        "skills": "[]string"
      },
      "responseSchema": {
        "message": "string",
        "data": {
          "name": "string",
          "age": "number",
          "skills": "[]string"
        }
      }
    }
  ]
}
```

## Request Body Schema Inference

The middleware automatically infers schemas from request bodies for POST, PUT, and PATCH requests. The schema is merged when multiple requests with different payloads are observed for the same endpoint.

## Response Schema Inference

The middleware monkey patches `res.json()` to infer response schemas and merge them across multiple responses for the same endpoint. Only JSON responses sent with `res.json()` are captured.

### Schema Types

- Primitives: `"string"`, `"number"`, `"boolean"`, `"null"`
- Arrays: `"[]string"`, `"[]number"`, `"[]object"`, etc.
- Objects: `{ "field": "type", ... }`
- Union types: `"string|number"` when different types are observed

### Example Schema Merging

If you send two POST requests to `/users`:

1. `{"name":"Manan","age":28}`
2. `{"name":"John","email":"john@example.com"}`

The resulting schema will be:

```json
{
  "name": "string",
  "age": "number",
  "email": "string"
}
```

**Note:** Body parsing middleware (e.g., `express.json()`) must be applied **before** the autoDocs middleware for request body schema inference to work.
