---
title: Earthquakes
---

# Earthquakes — last 30 days

Data from the USGS earthquake feed, loaded through dbt and Cube.

```sql quakes_daily
select
    occurred_date,
    earthquake_count,
    max_magnitude,
    average_magnitude
from cube.earthquakes_daily
order by occurred_date
```

<LineChart
    data={quakes_daily}
    x=occurred_date
    y=earthquake_count
    title="Earthquakes per Day"
    yAxisTitle="Events"
/>

## Magnitude distribution

```sql magnitude_bands
select
    magnitude_band,
    count(*) as events
from cube.earthquakes
group by magnitude_band
order by events desc
```

<BarChart
    data={magnitude_bands}
    x=magnitude_band
    y=events
    title="Events by Magnitude Band"
    yAxisTitle="Events"
/>

## Recent magnitude 5+ events

```sql recent_significant
select
    occurred_at,
    magnitude,
    place,
    depth_km
from cube.earthquakes
where magnitude >= 5
order by occurred_at desc
limit 25
```

<DataTable data={recent_significant} />
