import { Registry, Histogram, Counter, Gauge } from 'prom-client';

const register = new Registry();

export const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  }),

  httpRequestTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  }),

  aiRequestDuration: new Histogram({
    name: 'ai_request_duration_seconds',
    help: 'Duration of AI requests',
    labelNames: ['model', 'operation'],
    registers: [register],
  }),

  aiTokensUsed: new Counter({
    name: 'ai_tokens_used_total',
    help: 'Total AI tokens consumed',
    labelNames: ['model', 'type'],
    registers: [register],
  }),

  simulationDuration: new Histogram({
    name: 'simulation_duration_seconds',
    help: 'Duration of simulations',
    labelNames: ['type', 'domain'],
    registers: [register],
  }),

  activeSimulations: new Gauge({
    name: 'active_simulations',
    help: 'Number of currently running simulations',
    registers: [register],
  }),

  dbQueryDuration: new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'model'],
    registers: [register],
  }),

  dbConnectionPool: new Gauge({
    name: 'db_connection_pool_size',
    help: 'Database connection pool size',
    labelNames: ['state'],
    registers: [register],
  }),
};

export const getMetrics = async () => {
  return await register.metrics();
};

export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    metrics.httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );

    metrics.httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });

  next();
};