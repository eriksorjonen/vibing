# dbt v2 + DuckDB Analytics Project

A local analytics project built with **dbt v2** and **DuckDB**. DuckDB is embedded,
so no warehouse account or server is required.

## Requirements

- Linux / Crostini
- Python 3.10+ (3.11 recommended)
- Network access for the initial dbt/DuckDB driver download

## Setup

```bash
cd /home/eriksorj/projects/dbt_duckdb
mkdir -p data data/raw
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
```

The `data/` directory must exist before the first dbt run; dbt/DuckDB will create
the database file, but not its parent directory. `make setup` does this for you.

`requirements.txt` installs dbt v2 (`dbt==2.0.11`). `requirements-dev.txt` adds the
Python DuckDB client used for inspection queries.

The Python DuckDB client is pinned to `1.5.5` because the `2.0.0` wheel crashes
with `SIGILL` on older CPUs without AVX support (for example the Celeron N4000
used by some Crostini devices). dbt itself uses its own built-in DuckDB driver,
so this pin only affects inspection scripts.

## Configuration

- `dbt_project.yml` defines the project, model paths, schemas, and materializations.
- `profiles.yml` defines the local DuckDB targets. Relative database paths are
  resolved relative to `profiles.yml`.
- The local database is `data/dev.duckdb`.

dbt v2 searches for `profiles.yml` in the project root automatically. The Makefile
passes `--profiles-dir .` explicitly for deterministic runs.

## Common commands

```bash
dbt parse          # Validate the project definition
dbt debug          # Test the DuckDB connection
dbt seed           # Load seeds/example_customers.csv
dbt run            # Build models
dbt test           # Run data tests
dbt build          # Seed + run + test in DAG order
dbt docs generate  # Build documentation
dbt docs serve --port 8080
dbt lint           # Built-in v2 SQL linter
```

Or use the Makefile:

```bash
make setup
make debug
make build
make verify
make docs
make serve
```

## Project layout

```text
models/
  staging/       # Clean and rename raw inputs
  intermediate/  # Reusable business logic
  marts/         # Final tables for analysis
seeds/           # CSV files loaded by dbt
tests/           # Singular data tests
macros/          # Reusable Jinja macros
analyses/        # Ad-hoc compiled SQL
snapshots/       # dbt snapshots
checks/          # Optional dbt v2 project checks
data/            # Local DuckDB files and raw data
cube/            # Cube Core Docker setup and semantic model
scripts/         # Local verification helpers
```

## Cube Core semantic layer

Cube Core runs from `cube/docker-compose.yml` and reads `data/dev.duckdb` through
the `marts.dim_customers` model.

```bash
cd cube
docker-compose up -d
curl -fsS http://localhost:4000/readyz
```

Cube Playground: http://localhost:4000

Stop Cube before rebuilding the DuckDB database:

```bash
cd cube
docker-compose down
```

See `cube/README.md` for the full lifecycle and verification commands.

## Evidence report

The Evidence app in `my-bi-report/` queries Cube through its Postgres-compatible
SQL API.

```bash
# Cube must be running first
cd cube
docker-compose up -d

# Then start Evidence
cd ../my-bi-report
npm install
npm run sources
npm run dev
```

Open http://localhost:3000.

See `my-bi-report/README.md` for the Cube connection settings and refresh cycle.

## Verification

After `dbt build`, inspect the database:

```bash
.venv/bin/python - <<'PY'
import duckdb

con = duckdb.connect("data/dev.duckdb", read_only=True)
print(con.sql("select current_database(), current_schema()").fetchall())
print(con.sql("""
    select table_schema, table_name
    from information_schema.tables
    where table_schema not in ('information_schema', 'pg_catalog')
    order by 1, 2
""").fetchall())
print(con.sql("select * from marts.dim_customers limit 5").fetchall())
con.close()
PY
```

## Git and GitHub Pages

This directory is its own Git repository. The Evidence site is deployed by
`.github/workflows/deploy.yml` whenever `main` is pushed.

One-time GitHub setup:

1. Create an empty repository on GitHub.
2. Link it locally:
   ```bash
   cd /home/eriksorj/projects/dbt_duckdb
   git remote add origin https://github.com/<github-user>/<repository-name>.git
   git push -u origin main
   ```
3. Open **Repository Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Push to `main` or run the **Deploy Evidence to GitHub Pages** workflow manually.

The workflow publishes the Evidence app from `my-bi-report/` at:

```text
https://<github-user>.github.io/<repository-name>/
```

The Evidence source data used by CI is committed under
`my-bi-report/deploy-data/`. Refresh it after changing the Cube data:

```bash
cd my-bi-report
npm run sources
npm run data:snapshot
git add deploy-data
git commit -m "Refresh Evidence deployment data"
```

## Notes

- DuckDB allows only one writer at a time. Close any DuckDB CLI/UI, Dagster, or
  Evidence process before running `dbt build`.
- The bundled dbt v2 DuckDB driver does not load DuckDB extensions. If you need
  extensions such as `httpfs` or `spatial`, install the DuckDB driver with `dbc`.
- dbt v2 performs strict YAML validation. Add source definitions only when the
  referenced raw tables actually exist.
