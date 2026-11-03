"""Inspect the local DuckDB database created by dbt."""

from pathlib import Path

import duckdb

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "dev.duckdb"


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}. Run `dbt build` first.")

    con = duckdb.connect(str(DB_PATH), read_only=True)
    try:
        print("catalog/schema:", con.sql("select current_database(), current_schema()").fetchall())
        print("relations:")
        print(
            con.sql(
                """
                select table_schema, table_name
                from information_schema.tables
                where table_schema not in ('information_schema', 'pg_catalog')
                order by 1, 2
                """
            ).fetchall()
        )
        print("sample rows:")
        print(con.sql("select * from marts.dim_customers limit 5").fetchall())
    finally:
        con.close()


if __name__ == "__main__":
    main()
