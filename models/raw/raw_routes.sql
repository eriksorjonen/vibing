-- OpenFlights routes.
-- Source: https://github.com/jpatokal/openflights/tree/master/data
-- License: Open Database License (ODbL).

{{ config(materialized='table') }}

select *
from read_csv(
    'data/raw/openflights/routes.dat',
    header = false,
    delim = ',',
    quote = '"',
    nullstr = '\N',
    columns = {
        'airline': 'VARCHAR',
        'airline_id': 'BIGINT',
        'source_airport': 'VARCHAR',
        'source_airport_id': 'BIGINT',
        'destination_airport': 'VARCHAR',
        'destination_airport_id': 'BIGINT',
        'codeshare': 'VARCHAR',
        'stops': 'INTEGER',
        'equipment': 'VARCHAR'
    }
)
