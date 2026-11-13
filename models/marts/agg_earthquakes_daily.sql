select
    occurred_date,
    count(*) as earthquake_count,
    max(magnitude) as max_magnitude,
    avg(magnitude) as avg_magnitude,
    avg(depth_km) as avg_depth_km
from {{ ref('fct_earthquakes') }}
group by occurred_date
