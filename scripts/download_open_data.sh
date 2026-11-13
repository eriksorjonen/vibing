#!/usr/bin/env bash
# Download the public datasets used by the dbt raw models.
#
# USGS earthquakes: public domain
#   https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv
#
# OpenFlights: Open Database License
#   https://github.com/jpatokal/openflights/tree/master/data
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EARTHQUAKES_DIR="${ROOT_DIR}/data/raw/earthquakes"
OPENFLIGHTS_DIR="${ROOT_DIR}/data/raw/openflights"

mkdir -p "${EARTHQUAKES_DIR}" "${OPENFLIGHTS_DIR}"

echo "Downloading USGS earthquakes (last 30 days)..."
curl -fsSL --retry 3 \
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv" \
  -o "${EARTHQUAKES_DIR}/earthquakes.csv"

echo "Downloading OpenFlights airports, airlines, and routes..."
curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat" \
  -o "${OPENFLIGHTS_DIR}/airports.dat"
curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat" \
  -o "${OPENFLIGHTS_DIR}/airlines.dat"
curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat" \
  -o "${OPENFLIGHTS_DIR}/routes.dat"

echo "Done:"
ls -lh "${EARTHQUAKES_DIR}/earthquakes.csv" \
  "${OPENFLIGHTS_DIR}/airports.dat" \
  "${OPENFLIGHTS_DIR}/airlines.dat" \
  "${OPENFLIGHTS_DIR}/routes.dat"
