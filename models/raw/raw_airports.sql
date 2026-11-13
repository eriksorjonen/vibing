-- OpenFlights airports.
-- Source: https://github.com/jpatokal/openflights/tree/master/data
-- License: Open Database License (ODbL).

{{ config(materialized='table') }}

select *
from read_csv(
    'data/raw/openflights/airports.dat',
    header = false,
    delim = ',',
    quote = '"',
    nullstr = '\N',
    columns = {
        'airport_id': 'BIGINT',
        'name': 'VARCHAR',
        'city': 'VARCHAR',
        'country': 'VARCHAR',
        'iata': 'VARCHAR',
        'icao': 'VARCHAR',
        'latitude': 'DOUBLE',
        'longitude': 'DOUBLE',
        'altitude': 'DOUBLE',
        'timezone_offset': 'DOUBLE',
        'dst': 'VARCHAR',
        'tz_database_time_zone': 'VARCHAR',
        'type': 'VARCHAR',
        'source': 'VARCHAR'
    }
)
