with source as (
    select * from {{ ref('raw_airports') }}
)

select
    airport_id,
    name as airport_name,
    nullif(city, '') as city,
    nullif(country, '') as country,
    nullif(iata, '') as iata_code,
    nullif(icao, '') as icao_code,
    latitude,
    longitude,
    altitude as altitude_ft,
    nullif(type, '') as airport_type
from source
where airport_id is not null
