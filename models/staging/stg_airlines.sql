with source as (
    select * from {{ ref('raw_airlines') }}
)

select
    airline_id,
    name as airline_name,
    nullif(alias, '') as alias,
    nullif(iata, '') as iata_code,
    nullif(icao, '') as icao_code,
    nullif(callsign, '') as callsign,
    nullif(country, '') as country,
    nullif(active, '') as active
from source
where airline_id is not null
