import http from 'node:http';

const HOST = process.env.TOOLS_HOST || '127.0.0.1';
const PORT = Number(process.env.TOOLS_PORT || 4100);
const CUBE_API_URL = (process.env.CUBE_API_URL || 'http://127.0.0.1:4000/cubejs-api/v1').replace(
  /\/$/,
  ''
);
const CUBE_API_TOKEN = process.env.CUBE_API_TOKEN || '';
const CUBE_ALLOWED_CUBES = (process.env.CUBE_ALLOWED_CUBES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const MAX_ROWS = Math.max(1, Number(process.env.MAX_ROWS || 1000));
const META_TTL_MS = 30_000;
const MAX_BODY_BYTES = 1_000_000;

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_semantic_model',
      description:
        'Read the Cube semantic model. Call this before querying. Returns cubes with their measures, dimensions, and segments. Optionally filter to one cube.',
      parameters: {
        type: 'object',
        properties: {
          cube: {
            type: 'string',
            description: 'Optional cube name, e.g. earthquakes or routes.'
          }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_cube_query',
      description:
        'Run a read-only Cube semantic query. Use only measure and dimension names returned by get_semantic_model. Do not send raw SQL.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'object',
            description: 'Cube query JSON.',
            properties: {
              measures: {
                type: 'array',
                items: { type: 'string' },
                description: 'Fully qualified measures, e.g. earthquakes.count.'
              },
              dimensions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Fully qualified dimensions, e.g. earthquakes.magnitude_band.'
              },
              filters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    member: { type: 'string' },
                    operator: { type: 'string' },
                    values: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['member', 'operator'],
                  additionalProperties: true
                }
              },
              timeDimensions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    dimension: { type: 'string' },
                    granularity: { type: 'string' },
                    dateRange: {
                      oneOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } }
                      ]
                    }
                  },
                  required: ['dimension'],
                  additionalProperties: true
                }
              },
              segments: {
                type: 'array',
                items: { type: 'string' }
              },
              order: {
                type: 'object',
                description:
                  'Map of member name to sort direction, e.g. {"routes.route_count":"desc"}.',
                additionalProperties: { type: 'string' }
              },
              limit: { type: 'number' },
              timezone: { type: 'string' },
              ungrouped: { type: 'boolean' }
            },
            additionalProperties: true
          }
        },
        required: ['query'],
        additionalProperties: false
      }
    }
  }
];

let metaCache = {
  expiresAt: 0,
  value: null
};

function authHeaders() {
  return CUBE_API_TOKEN ? { Authorization: `Bearer ${CUBE_API_TOKEN}` } : {};
}

async function cubeRequest(path, options = {}) {
  const response = await fetch(`${CUBE_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new HttpError(
      response.status,
      `Cube request failed: ${response.status} ${response.statusText}`,
      body
    );
  }

  return body;
}

function filterModel(meta) {
  const allowed = CUBE_ALLOWED_CUBES.length ? new Set(CUBE_ALLOWED_CUBES) : null;
  const cubes = Array.isArray(meta?.cubes) ? meta.cubes : [];
  return cubes
    .filter((cube) => !allowed || allowed.has(cube.name))
    .map((cube) => ({
      name: cube.name,
      title: cube.title,
      description: cube.description,
      type: cube.type,
      measures: (cube.measures || []).map((member) => ({
        name: member.name,
        title: member.title,
        description: member.description,
        type: member.type,
        aggType: member.aggType
      })),
      dimensions: (cube.dimensions || []).map((member) => ({
        name: member.name,
        title: member.title,
        description: member.description,
        type: member.type
      })),
      segments: (cube.segments || []).map((member) => ({
        name: member.name,
        title: member.title,
        description: member.description
      }))
    }));
}

async function getSemanticModel(force = false) {
  const now = Date.now();
  if (!force && metaCache.value && now < metaCache.expiresAt) {
    return metaCache.value;
  }

  const meta = await cubeRequest('/meta');
  const model = { cubes: filterModel(meta) };
  metaCache = { value: model, expiresAt: now + META_TTL_MS };
  return model;
}

function collectMemberNames(model) {
  const names = new Set();
  for (const cube of model.cubes) {
    for (const member of cube.measures || []) names.add(member.name);
    for (const member of cube.dimensions || []) names.add(member.name);
    for (const member of cube.segments || []) names.add(member.name);
  }
  return names;
}

function assertKnownMember(names, member, kind) {
  if (typeof member !== 'string' || !member.includes('.')) {
    throw new HttpError(400, `Invalid ${kind} member: ${JSON.stringify(member)}`);
  }
  if (!names.has(member)) {
    throw new HttpError(400, `Unknown ${kind} member: ${member}`, {
      hint: 'Call get_semantic_model to discover valid member names.'
    });
  }
}

function normalizeOrder(order) {
  if (!order) return undefined;
  if (Array.isArray(order)) {
    return Object.fromEntries(
      order
        .map((entry) => {
          if (Array.isArray(entry) && entry.length >= 2) return [entry[0], entry[1]];
          if (entry && typeof entry === 'object' && entry.member) {
            return [entry.member, entry.direction || 'asc'];
          }
          return null;
        })
        .filter(Boolean)
    );
  }
  if (typeof order === 'object') return order;
  return undefined;
}

function validateQuery(query, model) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) {
    throw new HttpError(400, 'query must be a JSON object.');
  }

  const names = collectMemberNames(model);
  const measures = query.measures || [];
  const dimensions = query.dimensions || [];
  const segments = query.segments || [];

  for (const member of measures) assertKnownMember(names, member, 'measure');
  for (const member of dimensions) assertKnownMember(names, member, 'dimension');
  for (const member of segments) assertKnownMember(names, member, 'segment');

  for (const filter of query.filters || []) {
    assertKnownMember(names, filter.member, 'filter');
  }

  for (const timeDimension of query.timeDimensions || []) {
    assertKnownMember(names, timeDimension.dimension, 'time dimension');
  }

  const order = normalizeOrder(query.order);
  for (const member of Object.keys(order || {})) assertKnownMember(names, member, 'order');
}

async function runCubeQuery(input) {
  const model = await getSemanticModel();
  const query = input?.query ?? input;

  validateQuery(query, model);

  const order = normalizeOrder(query.order);
  const safeQuery = {
    ...query,
    limit: Math.min(Number(query.limit) || MAX_ROWS, MAX_ROWS)
  };

  if (order) {
    safeQuery.order = order;
  } else {
    delete safeQuery.order;
  }

  const result = await cubeRequest('/load', {
    method: 'POST',
    body: JSON.stringify({ query: safeQuery })
  });

  const data = Array.isArray(result?.data) ? result.data : [];
  const truncated = data.length >= safeQuery.limit;

  return {
    query: safeQuery,
    rowCount: data.length,
    truncated,
    total: result?.total ?? null,
    data: truncated ? data.slice(0, MAX_ROWS) : data
  };
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Request body too large.');
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');

  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function log(method, path, status, startedAt) {
  const ms = Date.now() - startedAt;
  console.log(`${new Date().toISOString()} ${method} ${path} ${status} ${ms}ms`);
}

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);
  const path = url.pathname.replace(/^\/v1(?=\/tools)/, '');

  try {
    if (req.method === 'GET' && path === '/') {
      sendJson(res, 200, {
        service: 'cube-tools',
        cubeApiUrl: CUBE_API_URL,
        tools: tools.map((tool) => tool.function.name),
        endpoints: ['GET /health', 'GET /tools', 'POST /tools/get_semantic_model', 'POST /tools/run_cube_query']
      });
      log(req.method, url.pathname, 200, startedAt);
      return;
    }

    if (req.method === 'GET' && path === '/health') {
      const model = await getSemanticModel(true);
      sendJson(res, 200, {
        status: 'ok',
        cubeApiUrl: CUBE_API_URL,
        cubes: model.cubes.map((cube) => cube.name)
      });
      log(req.method, url.pathname, 200, startedAt);
      return;
    }

    if (req.method === 'GET' && path === '/tools') {
      sendJson(res, 200, tools);
      log(req.method, url.pathname, 200, startedAt);
      return;
    }

    if (req.method === 'POST' && path === '/tools/get_semantic_model') {
      const body = await readJsonBody(req);
      const model = await getSemanticModel();
      const cubes = body.cube
        ? model.cubes.filter((cube) => cube.name === body.cube)
        : model.cubes;

      if (body.cube && cubes.length === 0) {
        throw new HttpError(404, `Unknown or disallowed cube: ${body.cube}`);
      }

      sendJson(res, 200, { cubes });
      log(req.method, url.pathname, 200, startedAt);
      return;
    }

    if (req.method === 'POST' && path === '/tools/run_cube_query') {
      const body = await readJsonBody(req);
      const result = await runCubeQuery(body);
      sendJson(res, 200, result);
      log(req.method, url.pathname, 200, startedAt);
      return;
    }

    throw new HttpError(404, 'Not found.');
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const payload = {
      error: error instanceof Error ? error.message : String(error)
    };
    if (error instanceof HttpError && error.details) payload.details = error.details;
    if (status >= 500) payload.hint = 'Check that Cube is running at CUBE_API_URL.';

    sendJson(res, status, payload);
    log(req.method, url.pathname, status, startedAt);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`cube-tools listening on http://${HOST}:${PORT}`);
  console.log(`Cube API: ${CUBE_API_URL}`);
  console.log(`Allowed cubes: ${CUBE_ALLOWED_CUBES.length ? CUBE_ALLOWED_CUBES.join(', ') : 'all public cubes'}`);
});
