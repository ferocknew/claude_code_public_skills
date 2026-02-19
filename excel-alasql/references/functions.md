# AlaSQL Function Reference

Complete reference for AlaSQL built-in functions and operators.

## Aggregate Functions

| Function | Description | Example |
|----------|-------------|---------|
| `COUNT(*)` | Count rows | `SELECT COUNT(*) FROM table` |
| `COUNT(column)` | Count non-null values | `SELECT COUNT(email) FROM users` |
| `SUM(column)` | Sum values | `SELECT SUM(amount) FROM sales` |
| `AVG(column)` | Average values | `SELECT AVG(price) FROM products` |
| `MIN(column)` | Minimum value | `SELECT MIN(date) FROM events` |
| `MAX(column)` | Maximum value | `SELECT MAX(score) FROM results` |
| `FIRST(column)` | First value | `SELECT FIRST(name) FROM table` |
| `LAST(column)` | Last value | `SELECT LAST(name) FROM table` |

## String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `CONCAT(s1, s2, ...)` | Concatenate strings | `SELECT CONCAT(first, ' ', last) FROM users` |
| `LENGTH(string)` | String length | `SELECT LENGTH(name) FROM table` |
| `LOWER(string)` | Convert to lowercase | `SELECT LOWER(email) FROM users` |
| `UPPER(string)` | Convert to uppercase | `SELECT UPPER(code) FROM products` |
| `TRIM(string)` | Remove whitespace | `SELECT TRIM(name) FROM table` |
| `LEFT(string, n)` | Left n characters | `SELECT LEFT(code, 3) FROM table` |
| `RIGHT(string, n)` | Right n characters | `SELECT RIGHT(code, 4) FROM table` |
| `SUBSTRING(s, start, len)` | Extract substring | `SELECT SUBSTRING(name, 1, 5) FROM table` |
| `REPLACE(s, from, to)` | Replace occurrences | `SELECT REPLACE(text, 'old', 'new') FROM table` |
| `POSITION(s1 IN s2)` | Find position | `SELECT POSITION('@' IN email) FROM users` |

## Date and Time Functions

| Function | Description | Example |
|----------|-------------|---------|
| `YEAR(date)` | Extract year | `SELECT YEAR(order_date) FROM orders` |
| `MONTH(date)` | Extract month (1-12) | `SELECT MONTH(date) FROM events` |
| `DAY(date)` | Extract day (1-31) | `SELECT DAY(date) FROM events` |
| `HOUR(date)` | Extract hour (0-23) | `SELECT HOUR(timestamp) FROM logs` |
| `MINUTE(date)` | Extract minute | `SELECT MINUTE(time) FROM schedule` |
| `SECOND(date)` | Extract second | `SELECT SECOND(time) FROM events` |
| `NOW()` | Current date/time | `SELECT NOW()` |
| `DATE()` | Current date | `SELECT DATE()` |
| `TIME()` | Current time | `SELECT TIME()` |
| `DATEDIFF(unit, d1, d2)` | Date difference | `SELECT DATEDIFF('day', start, end) FROM table` |
| `DATEADD(unit, n, date)` | Add to date | `SELECT DATEADD('day', 7, order_date) FROM orders` |

## Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `ABS(n)` | Absolute value | `SELECT ABS(amount) FROM transactions` |
| `CEIL(n)` | Round up | `SELECT CEIL(price) FROM products` |
| `FLOOR(n)` | Round down | `SELECT FLOOR(price) FROM products` |
| `ROUND(n, digits)` | Round to digits | `SELECT ROUND(amount, 2) FROM sales` |
| `POWER(base, exp)` | Power | `SELECT POWER(price, 2) FROM table` |
| `SQRT(n)` | Square root | `SELECT SQRT(value) FROM data` |
| `MOD(n, divisor)` | Modulo | `SELECT MOD(id, 10) FROM items` |
| `RAND()` | Random number | `SELECT RAND()` |
| `LOG(n)` | Natural logarithm | `SELECT LOG(value) FROM data` |
| `EXP(n)` | Exponential | `SELECT EXP(rate) FROM table` |

## Conversion Functions

| Function | Description | Example |
|----------|-------------|---------|
| `CAST(expr AS type)` | Convert type | `SELECT CAST(price AS NUMBER) FROM table` |
| `STRING(expr)` | Convert to string | `SELECT STRING(123)` |
| `NUMBER(expr)` | Convert to number | `SELECT NUMBER('123.45')` |
| `DATE(expr)` | Convert to date | `SELECT DATE('2024-01-01')` |

## Conditional Functions

| Function | Description | Example |
|----------|-------------|---------|
| `CASE WHEN ... THEN ... ELSE ... END` | Conditional expression | See examples below |
| `COALESCE(expr1, expr2, ...)` | First non-null | `SELECT COALESCE(phone, email) FROM users` |
| `NULLIF(expr1, expr2)` | NULL if equal | `SELECT NULLIF(a, b) FROM table` |
| `IF(condition, true_val, false_val)` | If-then-else | `SELECT IF(age > 18, 'adult', 'minor') FROM users` |

## CASE Expression Examples

```sql
-- Simple CASE
SELECT
  CASE status
    WHEN 'A' THEN 'Active'
    WHEN 'I' THEN 'Inactive'
    ELSE 'Unknown'
  END as status_text
FROM users

-- Searched CASE
SELECT
  CASE
    WHEN score >= 90 THEN 'A'
    WHEN score >= 80 THEN 'B'
    WHEN score >= 70 THEN 'C'
    ELSE 'F'
  END as grade
FROM students

-- CASE in aggregation
SELECT
  category,
  SUM(CASE WHEN month = 'Jan' THEN amount ELSE 0 END) as january,
  SUM(CASE WHEN month = 'Feb' THEN amount ELSE 0 END) as february
FROM sales
GROUP BY category
```

## Type Casting

```sql
-- Cast to NUMBER
SELECT CAST(price AS NUMBER) FROM products
SELECT CAST('123.45' AS NUMBER)

-- Cast to STRING
SELECT CAST(123 AS STRING)
SELECT STRING(order_date)

-- Cast to DATE
SELECT CAST('2024-01-01' AS DATE)
SELECT CAST(timestamp AS DATE)
```

## Operators

### Comparison Operators
- `=` - Equal
- `<>` or `!=` - Not equal
- `<` - Less than
- `>` - Greater than
- `<=` - Less than or equal
- `>=` - Greater than or equal
- `IS NULL` - Is NULL
- `IS NOT NULL` - Is not NULL
- `BETWEEN a AND b` - Between range (inclusive)
- `IN (values)` - In list of values
- `LIKE pattern` - Pattern matching (`%` wildcard)
- `REGEXP pattern` - Regular expression match

### Logical Operators
- `AND` - Logical AND
- `OR` - Logical OR
- `NOT` - Logical NOT

### Mathematical Operators
- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `%` - Modulo

### String Operators
- `||` or `CONCAT()` - Concatenation
- `LIKE` - Pattern matching with `%` and `_`

## UNION and UNION ALL

```sql
-- UNION removes duplicates
SELECT name FROM table1
UNION
SELECT name FROM table2

-- UNION ALL keeps duplicates
SELECT name FROM table1
UNION ALL
SELECT name FROM table2
```

## DISTINCT

```sql
-- Remove duplicate rows
SELECT DISTINCT category FROM products

-- Count distinct values
SELECT COUNT(DISTINCT user_id) FROM orders
```

## Aliases

```sql
-- Column aliases
SELECT
  SUM(amount) as total_sales,
  AVG(amount) as average_sale,
  COUNT(*) as order_count
FROM orders

-- Table aliases
SELECT
  o.order_date,
  c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
```

## Comments

```sql
-- Single line comment
SELECT * FROM users

/* Multi-line
   comment */
SELECT * FROM products

SELECT
  amount, -- inline comment
  quantity
FROM sales
```

## Wildcards

```sql
-- % matches any sequence of characters
SELECT * FROM users WHERE name LIKE 'John%'  -- Starts with John
SELECT * FROM users WHERE email LIKE '%@gmail.com'  -- Ends with @gmail.com

-- _ matches any single character
SELECT * FROM users WHERE code LIKE 'A_123'  -- A, any char, then 123
```

## IN Clause

```sql
-- Match multiple values
SELECT * FROM products WHERE category IN ('Electronics', 'Books', 'Clothing')

-- NOT IN
SELECT * FROM products WHERE category NOT IN ('Archived', 'Deleted')

-- Subquery with IN
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE status = 'active')
```

## BETWEEN Clause

```sql
-- Range check (inclusive)
SELECT * FROM sales
WHERE amount BETWEEN 100 AND 500

-- Date range
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'
```
