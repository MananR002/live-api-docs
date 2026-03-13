# Live API Docs

An automatic API documentation middleware for Express that tracks HTTP methods and paths for each request and provides a live Swagger UI based on observed traffic.

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

// Register Swagger UI and JSON spec routes
app.get(docsMiddleware.swaggerJsonPath, docsMiddleware.swaggerSpecHandler);
app.use(
  docsMiddleware.swaggerPath,
  docsMiddleware.swaggerUi.serve,
  docsMiddleware.swaggerUi.setup(null, {
    swaggerOptions: {
      url: docsMiddleware.swaggerJsonPath
    }
  })
);

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
- `swaggerPath` (string): Path for the Swagger UI endpoint. Default: `'/live-api-docs-swagger'`
- `swaggerJsonPath` (string): Path for the Swagger JSON endpoint. Default: `'/live-api-docs-swagger.json'`
- `title` (string): Swagger UI title. Default: `'Live API Docs'`
- `version` (string): Swagger version. Default: `'1.0.0'`
- `description` (string): Swagger description text

**Returns:** A middleware function with attached methods.

### Middleware Methods

- `docsHandler` - Express route handler for the docs endpoint
- `swaggerSpecHandler` - Express route handler for Swagger JSON
- `swaggerUi` - Swagger UI middleware (from `swagger-ui-express`)
- `docsPath` - The configured docs path (default: `/docs`)
- `swaggerPath` - The configured Swagger UI path
- `swaggerJsonPath` - The configured Swagger JSON path
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

# View Swagger UI
open http://localhost:3000/live-api-docs-swagger
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
      "querySchema": {
        "page": "number",
        "limit": "number",
        "sort": "string"
      },
      "responseSchema": {
        "200": {
          "message": "string",
          "data": {
            "name": "string",
            "age": "number",
            "skills": "[]string"
          }
        },
        "404": {
          "error": "string"
        }
      }
    }
  ]
}
```

## Request Body Schema Inference

The middleware automatically infers schemas from request bodies for POST, PUT, and PATCH requests. The schema is merged when multiple requests with different payloads are observed for the same endpoint.

## Response Schema Inference

The middleware monkey patches `res.json()` and `res.send()` to infer response schemas and merge them across multiple responses for the same endpoint. Response schemas are grouped by status code (e.g., "200", "404").

## Query Parameter Schema Inference

The middleware automatically infers schemas from query parameters (`req.query`) for all requests. If query parameters are present, their schema is captured and merged across requests.

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

**Note:** 
- Body parsing middleware (e.g., `express.json()`) must be applied **before** the autoDocs middleware for request body schema inference to work.
- Query parsing middleware (e.g., `express.urlencoded()` or `qs`) must be applied **before** the autoDocs middleware for query parameter schema inference to work.
