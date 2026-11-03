with customers as (
    select
        customer_id,
        customer_name,
        signup_date
    from {{ ref('stg_example_customers') }}
)

select
    customer_id,
    customer_name,
    signup_date,
    date_trunc('month', signup_date) as signup_month
from customers
