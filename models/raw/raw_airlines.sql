-- OpenFlights airlines.
-- Source: https://github.com/jpatokal/openflights/tree/master/data
-- License: Open Database License (ODbL).

{{ config(materialized='table') }}

select *
from read_csv(
    'data/raw/openflights/airlines.dat',
    header = false,
    delim = ',',
    quote = '"',
    nullstr = '\N',
    columns = {
        'airline_id': 'BIGINT',
        'name': 'VARCHAR',
        'alias': 'VARCHAR',
        'iata': 'VARCHAR',
        'icao': 'VARCHAR',
        'callsign': 'VARCHAR',
        'country': 'VARCHAR',
        'active': 'VARCHAR'
    }
)
