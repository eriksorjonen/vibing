select
    airline_id,
    airline_name,
    alias,
    iata_code,
    icao_code,
    callsign,
    country,
    active
from {{ ref('stg_airlines') }}
