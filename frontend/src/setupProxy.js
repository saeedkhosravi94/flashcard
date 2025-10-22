const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use environment variable for backend URL
  // Default to localhost for local development, backend service name for Docker
  const isDocker = process.env.DOCKER_ENV === 'true';
  const target = process.env.REACT_APP_BACKEND_URL || 
                 (isDocker ? 'http://backend:5000' : 'http://localhost:5000');
  
  console.log('Proxy configuration:', target);
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ 
          error: 'Backend service is not available. Please ensure the backend is running.',
          details: err.message,
          target: target
        }));
      },
    })
  );
};

