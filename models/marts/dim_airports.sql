select
    airport_id,
    airport_name,
    city,
    country,
    iata_code,
    icao_code,
    latitude,
    longitude,
    altitude_ft,
    airport_type
from {{ ref('stg_airports') }}
