select
    source_country,
    count(*) as route_count,
    count(distinct destination_airport_id) as destination_count,
    count(distinct airline_id) as airline_count
from {{ ref('fct_routes') }}
where source_country is not null
group by source_country
