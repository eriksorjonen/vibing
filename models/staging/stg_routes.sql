with source as (
    select * from {{ ref('raw_routes') }}
)

select
    nullif(airline, '') as airline_iata,
    airline_id,
    nullif(source_airport, '') as source_airport_iata,
    source_airport_id,
    nullif(destination_airport, '') as destination_airport_iata,
    destination_airport_id,
    nullif(codeshare, '') as codeshare,
    stops,
    nullif(equipment, '') as equipment
from source
where airline_id is not null
  and source_airport_id is not null
  and destination_airport_id is not null
