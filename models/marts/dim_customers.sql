select
    customer_id,
    customer_name,
    signup_date,
    signup_month
from {{ ref('int_customers_enriched') }}
