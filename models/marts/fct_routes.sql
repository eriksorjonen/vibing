select
    row_number() over (
        order by
            routes.airline_id,
            routes.source_airport_id,
            routes.destination_airport_id,
            routes.stops,
            routes.equipment
    ) as route_key,
    routes.airline_id,
    airlines.airline_name,
    airlines.country as airline_country,
    routes.airline_iata,
    routes.source_airport_id,
    source_airports.airport_name as source_airport_name,
    source_airports.city as source_city,
    source_airports.country as source_country,
    routes.destination_airport_id,
    destination_airports.airport_name as destination_airport_name,
    destination_airports.city as destination_city,
    destination_airports.country as destination_country,
    routes.stops,
    routes.equipment
from {{ ref('stg_routes') }} as routes
left join {{ ref('dim_airlines') }} as airlines
    on routes.airline_id = airlines.airline_id
left join {{ ref('dim_airports') }} as source_airports
    on routes.source_airport_id = source_airports.airport_id
left join {{ ref('dim_airports') }} as destination_airports
    on routes.destination_airport_id = destination_airports.airport_id
