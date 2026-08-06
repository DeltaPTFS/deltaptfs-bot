const http = require('node:http');

function startHealthServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const state = { discordReady: false, error: null };

  const server = http.createServer(async (request, response) => {
    if (options.requestHandler && await options.requestHandler(request, response)) return;
    const isHealthCheck = request.url === '/health';
    const statusCode = isHealthCheck && !state.discordReady ? 503 : 200;
    response.writeHead(statusCode, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      service: 'delta-air-lines-ptfs-bot',
      status: state.discordReady ? 'ready' : 'starting',
      discordReady: state.discordReady,
      error: state.error,
    }));
  });

  server.listen(port, '0.0.0.0', () => {
    const address = server.address();
    console.log(`Health server listening on port ${address.port}.`);
  });

  return {
    server,
    markReady() {
      state.discordReady = true;
      state.error = null;
    },
    markError(error) {
      state.discordReady = false;
      state.error = error instanceof Error ? error.message : String(error);
    },
  };
}

module.exports = { startHealthServer };
