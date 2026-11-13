# Cube Semantic Tools for LLMs

A small, dependency-free HTTP tool server that exposes the Cube semantic layer to
an LLM through function calling. It never exposes raw DuckDB or warehouse SQL.

```text
LLM client
   │  tool calls
   ▼
cube-tools (127.0.0.1:4100)
   │  /meta and /load
   ▼
Cube Core (127.0.0.1:4000)
   │  semantic SQL
   ▼
DuckDB
```

## Tools

| Tool | Purpose |
|---|---|
| `get_semantic_model` | Returns cubes, measures, dimensions, and segments from Cube `/meta` |
| `run_cube_query` | Validates member names, then runs a read-only Cube `/load` query |

The server rejects unknown cubes/members before forwarding a query to Cube.

## Start

Cube must already be running:

```bash
cd /home/eriksorj/projects/dbt_duckdb/cube
docker-compose up -d
```

Start the tool server:

```bash
cd /home/eriksorj/projects/dbt_duckdb/cube-tools
cp .env.example .env
npm start
```

Expected:

```text
cube-tools listening on http://127.0.0.1:4100
Cube API: http://127.0.0.1:4000/cubejs-api/v1
```

Check it:

```bash
curl -sS http://127.0.0.1:4100/health

curl -sS http://127.0.0.1:4100/tools

curl -sS http://127.0.0.1:4100/tools/get_semantic_model \
  -H 'Content-Type: application/json' \
  -d '{"cube":"earthquakes"}'
```

Run a query:

```bash
curl -sS http://127.0.0.1:4100/tools/run_cube_query \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "measures": ["earthquakes.count"],
      "dimensions": ["earthquakes.magnitude_band"],
      "order": {"earthquakes.count": "desc"}
    }
  }'
```

## Connect an LLM

The server is provider-agnostic. Any client that supports OpenAI-style
`tools` / `tool_calls` can use it.

### OpenAI / DeepSeek example

```bash
cd /home/eriksorj/projects/dbt_duckdb/cube-tools

OPENAI_API_KEY=... \
OPENAI_BASE_URL=https://api.deepseek.com \
OPENAI_MODEL=deepseek-chat \
node examples/openai-compatible.mjs \
  "Which source countries have the most airline routes?"
```

For OpenAI:

```bash
OPENAI_API_KEY=... \
OPENAI_BASE_URL=https://api.openai.com/v1 \
OPENAI_MODEL=<model-name> \
node examples/openai-compatible.mjs \
  "Which earthquakes were magnitude 5 or higher?"
```

The example client:

1. Fetches tool definitions from `GET /tools`.
2. Sends them to the model.
3. Executes returned tool calls against the local server.
4. Sends tool results back to the model until it produces a final answer.

### Manual system prompt

If you are wiring your own client, use:

```text
You are a governed analytics assistant.
Use only the Cube semantic layer tools.
Always call get_semantic_model before writing a query.
Never invent cube, measure, dimension, or segment names.
Use run_cube_query to fetch data.
Return the Cube query you used with the answer.
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `CUBE_API_URL` | `http://127.0.0.1:4000/cubejs-api/v1` | Cube REST API |
| `CUBE_API_TOKEN` | empty | Optional bearer token for non-dev Cube |
| `CUBE_ALLOWED_CUBES` | all public cubes | Comma-separated cube allowlist |
| `TOOLS_HOST` | `127.0.0.1` | Tool server bind address |
| `TOOLS_PORT` | `4100` | Tool server port |
| `MAX_ROWS` | `1000` | Maximum rows returned to the LLM |

## Security

- Bind to `127.0.0.1` by default. Do not expose the tool server or Cube dev mode publicly.
- The tools are read-only; there is no raw SQL tool and no write endpoint.
- `CUBE_ALLOWED_CUBES` limits which cubes the model can discover or query.
- Use `CUBE_API_TOKEN` when Cube auth is enabled.
- Put real secrets in `cube-tools/.env`; it is gitignored.
- For production, put an authenticated reverse proxy in front of the tool server and log every query.

## Available cubes

```text
dim_customers
earthquakes
earthquakes_daily
airports
routes
```
