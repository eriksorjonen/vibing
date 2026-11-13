with source as (
    select * from {{ ref('raw_earthquakes') }}
)

select
    nullif(id, '') as event_id,
    try_cast("time" as timestamp) as occurred_at,
    try_cast(latitude as double) as latitude,
    try_cast(longitude as double) as longitude,
    try_cast(depth as double) as depth_km,
    try_cast(mag as double) as magnitude,
    nullif(magType, '') as magnitude_type,
    nullif(place, '') as place,
    nullif(type, '') as event_type,
    nullif(status, '') as status,
    try_cast(updated as timestamp) as updated_at
from source
where try_cast(mag as double) is not null
