select
    customer_id,
    trim(customer_name) as customer_name,
    cast(signup_date as date) as signup_date
from {{ ref('example_customers') }}
