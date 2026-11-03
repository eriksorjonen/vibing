VENV := .venv
DBT := $(VENV)/bin/dbt --profiles-dir .
PY := $(VENV)/bin/python

.PHONY: setup version parse debug seed run test build verify docs serve lint clean reset

setup:
	mkdir -p data data/raw
	python3 -m venv $(VENV)
	$(PY) -m pip install --upgrade pip
	$(VENV)/bin/pip install -r requirements-dev.txt

version:
	$(DBT) --version

parse:
	$(DBT) parse

debug:
	$(DBT) debug

seed:
	$(DBT) seed

run:
	$(DBT) run

test:
	$(DBT) test

build:
	$(DBT) build

verify:
	$(PY) scripts/verify_duckdb.py

docs:
	$(DBT) docs generate

serve:
	$(DBT) docs serve --port 8080

lint:
	$(DBT) lint

clean:
	$(DBT) clean

reset:
	rm -f data/dev.duckdb data/dev.duckdb.wal
