/**
 * Automatic API Documentation Middleware
 * 
 * Tracks HTTP method and path for each request and exposes a /docs endpoint
 * to view captured endpoints.
 */

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
   * Records an endpoint observation
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   */
  function recordEndpoint(method, path) {
    const key = getEndpointKey(method, path);
    
    if (!endpoints.has(key)) {
      endpoints.set(key, {
        method,
        path,
        firstObserved: new Date().toISOString(),
        hitCount: 1
      });
    } else {
      const endpoint = endpoints.get(key);
      endpoint.hitCount += 1;
      endpoint.lastObserved = new Date().toISOString();
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

    // Record the endpoint
    recordEndpoint(req.method, req.path);

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
