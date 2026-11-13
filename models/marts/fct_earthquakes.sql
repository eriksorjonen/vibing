select
    event_id,
    occurred_at,
    cast(occurred_at as date) as occurred_date,
    latitude,
    longitude,
    depth_km,
    magnitude,
    case
        when magnitude >= 6.0 then '6.0+'
        when magnitude >= 5.0 then '5.0-5.9'
        when magnitude >= 4.0 then '4.0-4.9'
        when magnitude >= 3.0 then '3.0-3.9'
        when magnitude >= 2.0 then '2.0-2.9'
        else '< 2.0'
    end as magnitude_band,
    magnitude_type,
    place,
    event_type,
    status
from {{ ref('stg_earthquakes') }}
