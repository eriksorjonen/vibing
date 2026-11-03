# Cube Core + DuckDB

Cube Core runs in Docker and reads the dbt-built DuckDB database at
`../data/dev.duckdb`. The container sees that file at `/data/dev.duckdb`.

## One-time Docker permission setup

The Docker CLI needs access to the Docker daemon. Add your user to the `docker`
group once, then log out and back in (or run `newgrp docker` in the current
shell):

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

Until the group change is active, prefix Docker commands with `sudo`.

## Start Cube

This machine has Docker Compose v1, so use:

```bash
cd /home/eriksorj/projects/dbt_duckdb/cube
docker-compose up -d
```

If you later install the Compose v2 plugin, the equivalent command is:

```bash
docker compose up -d
```

Cube Playground: http://localhost:4000

The port is bound to `127.0.0.1` so it is only reachable from the local machine.
`CUBEJS_DEV_MODE=true` is a development-only setting: it enables Playground and
disables API authentication. Do not expose it to a network.

## Check that Cube is running

```bash
docker-compose ps
```

The `cube` service should show `Up` and, after the start period, `healthy`.

Check the health endpoint:

```bash
curl -fsS http://localhost:4000/readyz
```

A successful response is HTTP 200.

Check the Cube metadata endpoint:

```bash
curl -fsS http://localhost:4000/cubejs-api/v1/meta
```

The response should include the `dim_customers` cube.

Inspect logs:

```bash
docker-compose logs -f cube
```

Look for a line similar to:

```text
Cube API server is listening on 4000
```

## SQL API

Cube exposes a Postgres-compatible SQL API on port `15432`:

```text
host:     127.0.0.1
port:     15432
database: cube
user:     cube
password: cube-dev-password
sslmode:  disable
```

Test it with `psql`:

```bash
PGPASSWORD=cube-dev-password psql \
  -h 127.0.0.1 -p 15432 -U cube -d cube \
  -c "select customer_name, count(*) from dim_customers group by customer_name;"
```

The Evidence report in `../my-bi-report` uses this SQL API through its Postgres
connector.

## Query the cube

In development mode, the REST API accepts requests without a token:

```bash
curl -sS http://localhost:4000/cubejs-api/v1/load \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "measures": ["dim_customers.count"],
      "dimensions": ["dim_customers.customer_name"]
    }
  }'
```

Or use Playground at http://localhost:4000 to build the query interactively.

## Stop Cube

```bash
docker-compose down
```

## Important DuckDB locking note

Cube's DuckDB driver opens the database read-write, and DuckDB allows only one
writer per database file. While the Cube container is running, it can hold a lock
on `data/dev.duckdb`, which prevents `dbt build` from writing to the same file.

Recommended workflow:

```bash
# 1. Stop Cube
cd /home/eriksorj/projects/dbt_duckdb/cube
docker-compose down

# 2. Rebuild the warehouse with dbt
cd /home/eriksorj/projects/dbt_duckdb
source .venv/bin/activate
dbt build

# 3. Restart Cube against the updated database
cd /home/eriksorj/projects/dbt_duckdb/cube
docker-compose up -d
```

If `dbt build` reports a file-lock error, find and stop the process holding the
DuckDB file before retrying.

## Schema

`model/cubes/dim_customers.yml` is the base Cube schema generated from the dbt
mart `models/marts/dim_customers.sql`:

| dbt column | Cube member | Type |
|---|---|---|
| `customer_id` | `customer_id` | number, primary key |
| `customer_name` | `customer_name` | string |
| `signup_date` | `signup_date` | time |
| `signup_month` | `signup_month` | time |
| row count | `count` | count measure |
| distinct `customer_id` | `unique_customers` | count_distinct measure |

The `staging` and `intermediate` dbt models are intentionally not exposed as
cubes; they are internal transformation layers. Add more cubes for the marts
layer as the dbt project grows.
