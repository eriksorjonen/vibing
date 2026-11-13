---
title: Flights
---

# OpenFlights route network

Airline, airport, and route data from OpenFlights, joined and transformed with dbt.

```sql top_airlines
select
    airline_name,
    count(*) as route_count
from cube.routes
where airline_name is not null
group by airline_name
order by route_count desc
limit 15
```

<BarChart
    data={top_airlines}
    x=airline_name
    y=route_count
    title="Top Airlines by Route Count"
    yAxisTitle="Routes"
/>

## Routes by source country

```sql top_countries
select
    source_country,
    count(*) as route_count,
    count(distinct destination_airport_id) as destination_count
from cube.routes
where source_country is not null
group by source_country
order by route_count desc
limit 15
```

<BarChart
    data={top_countries}
    x=source_country
    y=route_count
    title="Top Source Countries by Route Count"
    yAxisTitle="Routes"
/>

## Busiest source airports

```sql top_airports
select
    source_airport_name,
    source_country,
    count(*) as departure_routes
from cube.routes
where source_airport_name is not null
group by source_airport_name, source_country
order by departure_routes desc
limit 15
```

<DataTable data={top_airports} />

## Airport coverage

```sql top_airport_countries
select
    country,
    count(*) as airport_count
from cube.airports
where country is not null
group by country
order by airport_count desc
limit 15
```

<BarChart
    data={top_airport_countries}
    x=country
    y=airport_count
    title="Airports by Country"
    yAxisTitle="Airports"
/>
