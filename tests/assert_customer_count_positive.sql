with row_count as (
    select count(*) as customer_count
    from {{ ref('dim_customers') }}
)

select *
from row_count
where customer_count = 0
