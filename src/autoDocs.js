/**
 * Automatic API Documentation Middleware
 * 
 * Tracks HTTP method and path for each request, infers schemas from request bodies,
 * and exposes a /docs endpoint to view captured endpoints.
 */

/**
 * Infers a schema from a value
 * @param {*} value - The value to infer schema from
 * @returns {string|Object} The inferred schema type
 */
function inferSchema(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  const type = typeof value;
  
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]any';
    
    // Infer schema for array items and merge them
    const itemSchemas = value.map(inferSchema);
    const mergedItemSchema = mergeMultipleSchemas(itemSchemas);
    return `[]${formatSchemaType(mergedItemSchema)}`;
  }
  
  if (type === 'object') {
    const schema = {};
    for (const [key, val] of Object.entries(value)) {
      schema[key] = inferSchema(val);
    }
    return schema;
  }
  
  return 'any';
}

/**
 * Formats a schema type for display in array notation
 * @param {*} schema - The schema to format
 * @returns {string} Formatted schema type
 */
function formatSchemaType(schema) {
  if (typeof schema === 'string') return schema;
  if (typeof schema === 'object' && schema !== null) return 'object';
  return 'any';
}

/**
 * Merges two schemas together
 * @param {*} existing - The existing schema
 * @param {*} incoming - The incoming schema to merge
 * @returns {*} The merged schema
 */
function mergeSchemas(existing, incoming) {
  // If types are different, create a union type
  const existingType = typeof existing;
  const incomingType = typeof incoming;
  
  if (existingType !== incomingType) {
    return mergeTypeStrings(formatSchemaType(existing), formatSchemaType(incoming));
  }
  
  // Both are primitive type strings
  if (existingType === 'string') {
    return mergeTypeStrings(existing, incoming);
  }
  
  // Both are objects (for nested object schemas)
  if (existingType === 'object' && existing !== null && incoming !== null) {
    const merged = { ...existing };
    
    for (const [key, val] of Object.entries(incoming)) {
      if (key in merged) {
        merged[key] = mergeSchemas(merged[key], val);
      } else {
        merged[key] = val;
      }
    }
    
    return merged;
  }
  
  return existing;
}

/**
 * Merges multiple schemas together
 * @param {Array} schemas - Array of schemas to merge
 * @returns {*} The merged schema
 */
function mergeMultipleSchemas(schemas) {
  if (schemas.length === 0) return 'any';
  if (schemas.length === 1) return schemas[0];
  
  return schemas.reduce((acc, schema) => mergeSchemas(acc, schema));
}

/**
 * Merges two type strings, creating a union if different
 * @param {string} type1 - First type
 * @param {string} type2 - Second type
 * @returns {string} Merged type string
 */
function mergeTypeStrings(type1, type2) {
  if (type1 === type2) return type1;
  
  // Handle array types
  const isArray1 = type1.startsWith('[]');
  const isArray2 = type2.startsWith('[]');
  
  if (isArray1 && isArray2) {
    const itemType1 = type1.slice(2);
    const itemType2 = type2.slice(2);
    const mergedItemType = mergeTypeStrings(itemType1, itemType2);
    return `[]${mergedItemType}`;
  }
  
  // Create union type
  const types1 = type1.split('|');
  const types2 = type2.split('|');
  const allTypes = new Set([...types1, ...types2]);
  return Array.from(allTypes).sort().join('|');
}

/**
 * Creates the autoDocs middleware instance
 * @param {Object} options - Configuration options
 * @param {string} options.docsPath - Path for the docs endpoint (default: '/docs')
 * @returns {Function} Express middleware function with attached methods
 */
function autoDocs(options = {}) {
  const { docsPath = '/docs' } = options;

  // Store for captured endpoints
  // Using a Map to store unique endpoints by "METHOD PATH" key
  const endpoints = new Map();

  /**
   * Generates a unique key for an endpoint
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @returns {string} Unique key
   */
  function getEndpointKey(method, path) {
    return `${method} ${path}`;
  }

  /**
   * Merges a schema into an endpoint object
   * @param {Object} endpoint - The endpoint object
   * @param {string} schemaKey - The schema property key
   * @param {*} schema - The schema to merge
   */
  function mergeEndpointSchema(endpoint, schemaKey, schema) {
    if (!schema) return;

    if (endpoint[schemaKey]) {
      endpoint[schemaKey] = mergeSchemas(endpoint[schemaKey], schema);
    } else {
      endpoint[schemaKey] = schema;
    }
  }

  /**
   * Records an endpoint observation
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Object} bodySchema - Inferred schema from request body (optional)
   */
  function recordEndpoint(method, path, bodySchema = null) {
    const key = getEndpointKey(method, path);
    
    if (!endpoints.has(key)) {
      const endpoint = {
        method,
        path,
        firstObserved: new Date().toISOString(),
        hitCount: 1
      };
      
      mergeEndpointSchema(endpoint, 'bodySchema', bodySchema);
      
      endpoints.set(key, endpoint);
    } else {
      const endpoint = endpoints.get(key);
      endpoint.hitCount += 1;
      endpoint.lastObserved = new Date().toISOString();
      
      // Merge body schemas if provided
      mergeEndpointSchema(endpoint, 'bodySchema', bodySchema);
    }
  }

  /**
   * Gets all captured endpoints as an array
   * @returns {Array} Array of endpoint objects
   */
  function getEndpoints() {
    return Array.from(endpoints.values()).sort((a, b) => {
      // Sort by path, then by method
      if (a.path !== b.path) {
        return a.path.localeCompare(b.path);
      }
      return a.method.localeCompare(b.method);
    });
  }

  /**
   * Clears all captured endpoints
   */
  function clearEndpoints() {
    endpoints.clear();
  }

  /**
   * The main middleware function
   */
  function middleware(req, res, next) {
    // Skip recording the docs endpoint itself
    if (req.path === docsPath) {
      return next();
    }

    // Capture request body schema for POST and PUT requests
    let bodySchema = null;
    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    
    if (methodsWithBody.includes(req.method) && req.body && typeof req.body === 'object') {
      bodySchema = inferSchema(req.body);
    }

    // Record the endpoint with body schema if available
    recordEndpoint(req.method, req.path, bodySchema);

    // Monkey patch res.json to capture response schema
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (data && typeof data === 'object') {
        const responseSchema = inferSchema(data);
        const key = getEndpointKey(req.method, req.path);
        const endpoint = endpoints.get(key);
        if (endpoint) {
          mergeEndpointSchema(endpoint, 'responseSchema', responseSchema);
        }
      }

      return originalJson(data);
    };

    // Continue to next middleware
    next();
  }

  /**
   * Express route handler for the docs endpoint
   */
  function docsHandler(req, res) {
    res.json({
      totalEndpoints: endpoints.size,
      endpoints: getEndpoints()
    });
  }

  // Attach public methods to the middleware function
  middleware.docsHandler = docsHandler;
  middleware.getEndpoints = getEndpoints;
  middleware.clearEndpoints = clearEndpoints;
  middleware.docsPath = docsPath;

  return middleware;
}

module.exports = { autoDocs };
