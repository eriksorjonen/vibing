select
    airline_id,
    airline_name,
    airline_country,
    count(*) as route_count,
    count(distinct destination_airport_id) as destination_count,
    avg(stops) as avg_stops
from {{ ref('fct_routes') }}
group by airline_id, airline_name, airline_country
