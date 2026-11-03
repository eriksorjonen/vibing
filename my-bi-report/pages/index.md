---
title: Customer Overview
---

# Customer Overview

This report queries the Cube semantic layer through its Postgres-compatible SQL API.

```sql customers
select
    customer_name,
    count(*) as customer_count
from cube.dim_customers
group by customer_name
order by customer_count desc
```

<BarChart
    data={customers}
    x=customer_name
    y=customer_count
    title="Customers by Name"
    yAxisTitle="Customers"
/>

```sql signups_by_month
select
    date_trunc('month', signup_month) as month,
    count(*) as customers
from cube.dim_customers
group by date_trunc('month', signup_month)
order by month
```

<LineChart
    data={signups_by_month}
    x=month
    y=customers
    title="Customer Signups by Month"
    yAxisTitle="Customers"
/>

## Customer detail

<DataTable data={customers} />
