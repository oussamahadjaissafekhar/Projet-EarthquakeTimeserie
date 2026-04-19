import duckdb

con = duckdb.connect(':memory:')
df = con.execute("SELECT station, mag, max_amplitude FROM read_parquet('data/silver/**/*.parquet') LIMIT 10").df()
print(df)
