# Customer Overview — Evidence Report

Evidence report that queries the Cube semantic layer through Cube's
Postgres-compatible SQL API.

## Stack

- Evidence Core v40 (Node-based)
- `@evidence-dev/postgres` direct connector
- Cube Core SQL API at `127.0.0.1:15432`
- Cube cube: `dim_customers` (backed by the dbt mart `marts.dim_customers`)

## Start the stack

Cube must be running before Evidence starts:

```bash
cd /home/eriksorj/projects/dbt_duckdb/cube
docker-compose up -d

curl -fsS http://localhost:4000/readyz
```

Then start Evidence:

```bash
cd /home/eriksorj/projects/dbt_duckdb/my-bi-report
npm install
npm run sources
npm run dev
```

Open **http://localhost:3000**.

`npm run sources` validates the Cube connection and evaluates the SQL in
`sources/cube/`. `npm run dev` starts the Evidence development server.

Both scripts set `TZ=UTC`. This prevents Evidence from shifting Cube timestamp
columns into the host timezone (`Europe/Stockholm` on this machine) when it
writes the source Parquet files.

Stop the dev server with `Ctrl+C`.

## Cube connection

The connection is defined in `sources/cube/connection.yaml`:

```yaml
name: cube
type: postgres
options:
  host: 127.0.0.1
  port: 15432
  database: cube
  user: cube
  password: cube-dev-password
  ssl: false
```

`connection.yaml` is gitignored because it contains credentials. The tracked
template is `sources/cube/connection.yaml.example`.

The SQL API settings come from `cube/docker-compose.yml`:

| Setting | Value |
|---|---|
| `CUBEJS_PG_SQL_PORT` | `15432` |
| `CUBEJS_SQL_USER` | `cube` |
| `CUBEJS_SQL_PASSWORD` | `cube-dev-password` |

## Querying Cube from Evidence

Evidence source queries reference the source name followed by the Cube name:

```sql
select
    customer_name,
    count(*) as customer_count
from cube.dim_customers
group by customer_name
order by customer_count desc
```

The sample page `pages/index.md` contains:

- a bar chart of customers by name
- a line chart of signups by month
- a data table of customer counts

## Deployment data snapshot

GitHub Actions cannot reach the local Cube SQL API. The tracked `deploy-data/`
folder is a snapshot of the Evidence source Parquet files used by the Pages build.

Refresh it after `npm run sources`:

```bash
npm run sources
npm run data:snapshot
```

Commit the updated `deploy-data/` files when the source data changes.

## GitHub Pages

The repository workflow at `.github/workflows/deploy.yml` builds this app and
deploys `my-bi-report/build` to GitHub Pages whenever `main` is pushed.

The workflow:

1. Installs Node dependencies with `npm ci`.
2. Copies `deploy-data/` into Evidence's generated static data directory.
3. Sets `deployment.basePath` from the GitHub repository name.
4. Runs `npm run build`.
5. Uploads the build artifact and deploys it to Pages.

Enable GitHub Pages under **Repository Settings → Pages → Source: GitHub Actions**.

For a project repository, the site will be published at:

```text
https://<github-user>.github.io/<repository-name>/
```

## Important DuckDB locking note

Cube holds a write lock on `data/dev.duckdb` while it is running, so stop Cube
before running `dbt build`. Evidence can stay running but will use the data Cube
had loaded when the query runs.

Recommended refresh cycle:

```bash
# Stop Cube, rebuild dbt, restart Cube, then refresh Evidence source state
cd /home/eriksorj/projects/dbt_duckdb/cube
docker-compose down

cd /home/eriksorj/projects/dbt_duckdb
source .venv/bin/activate
dbt build

cd cube
docker-compose up -d

cd ../my-bi-report
npm run sources
```
