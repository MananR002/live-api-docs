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

// Create and apply the middleware
const docsMiddleware = autoDocs();
app.use(docsMiddleware);

// Register the docs endpoint
app.get(docsMiddleware.docsPath, docsMiddleware.docsHandler);

// Your routes...
app.get('/users', (req, res) => {
  res.json({ users: [] });
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
curl -X POST http://localhost:3000/users
curl http://localhost:3000/users/123

# View captured endpoints
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
      "lastObserved": "2024-01-15T10:35:00.000Z"
    }
  ]
}
```
