-- USGS earthquake feed, last 30 days.
-- Source: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv
-- Public domain. Loaded as text so staging can control type casting.

{{ config(materialized='table') }}

select *
from read_csv_auto(
    'data/raw/earthquakes/earthquakes.csv',
    header = true,
    all_varchar = true
)
