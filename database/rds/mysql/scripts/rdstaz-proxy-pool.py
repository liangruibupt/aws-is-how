import pymysql
import time
from datetime import datetime
from DBUtils.PooledDB import PooledDB

# MySQL connection configuration
config = {
    'host': "proxy-1719849319787-taz1.proxy-c7b8fns5un9o.us-east-1.rds.amazonaws.com",
    'user': "admin",
    'password': "xxxxxxxx",
    'database': "test"
}

# Create a connection pool
pool = PooledDB(
    creator=pymysql,
    maxconnections=10,  # Maximum number of connections in the pool
    mincached=2,  # Minimum number of idle connections in the pool
    maxcached=5,  # Maximum number of idle connections in the pool
    maxshared=3,  # Maximum number of connections to share
    blocking=True,  # Block and wait for a connection if the pool is full
    maxusage=None,  # Maximum number of times a connection can be reused
    setsession=[],  # Custom SQL commands to run when a connection is created
    ping=0,  # Ping the database to check if the connection is still alive
    **config  # Pass the connection configuration
)

while True:
    conn = None
    cursor = None

    try:
        # Get a connection from the pool
        conn = pool.connection()
        cursor = conn.cursor()
    except pymysql.Error as e:
        print(f"Error connecting to MySQL database: {e}")
        time.sleep(1)  # Wait for 1 second before retrying
        continue  # Continue to the next iteration of the loop

    if cursor:
        while True:
            try:
                # Get the current time with milliseconds
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

                # Insert the current time into the database
                sql = "INSERT INTO time_table (ts) VALUES (%s)"
                cursor.execute(sql, (current_time,))
                conn.commit()

                # Select and print the latest row with milliseconds
                cursor.execute("SELECT id, DATE_FORMAT(ts, '%Y-%m-%d %H:%i:%s.%f') AS formatted_time FROM time_table ORDER
 BY id DESC LIMIT 1")
                result = cursor.fetchone()
                if result:
                    print(f"ID: {result[0]}, Time: {result[1]}")
            except pymysql.Error as e:
                error_code = e.args[0]
                if error_code in (1053, 2013, 0):  # Server shutdown, lost connection, or empty error
                    print(f"Error executing SQL statements: {e}")
                    print("Reconnecting to the database...")
                    conn.close()  # Close the current connection
                    conn = pool.connection()  # Get a new connection from the pool
                    if conn:
                        cursor = conn.cursor()
                    else:
                        print("Failed to reconnect to the database.")
                        break
                else:
                    print(f"Error executing SQL statements: {e}")
                    time.sleep(1)  # Wait for 1 second before retrying
                    continue  # Continue to the next iteration of the loop

            # Wait for 100 milliseconds (0.1 seconds)
            time.sleep(0.1)

    # Close the cursor and return the connection to the pool
    if cursor:
        cursor.close()
    if conn:
        conn.close()
