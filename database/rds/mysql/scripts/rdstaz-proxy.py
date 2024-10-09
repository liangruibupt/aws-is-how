import pymysql
import time
from datetime import datetime

def connect_to_db():
    while True:
        try:
            conn = pymysql.connect(
                host="proxy-1719849319787-taz1.proxy-c7b8fns5un9o.us-east-1.rds.amazonaws.com",
                user="admin",
                password="xxxxxxxx",
                database="test"
            )
            return conn
        except pymysql.Error as e:
            print(f"Error connecting to MySQL database: {e}")
            time.sleep(1)  # Wait for 1 second before retrying
            continue  # Continue to the next iteration of the loop

while True:
    conn = None
    cursor = None

    try:
        conn = connect_to_db()
        if conn:
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
                cursor.execute("SELECT id, DATE_FORMAT(ts, '%Y-%m-%d %H:%i:%s.%f') AS formatted_time FROM time_table ORDER BY id DESC LIMIT 1")
                result = cursor.fetchone()
                if result:
                    print(f"ID: {result[0]}, Time: {result[1]}")
            except pymysql.Error as e:
                error_code = e.args[0]
                if error_code in (1053, 2013, 0):  # Server shutdown, lost connection, or empty error
                    print(f"Error executing SQL statements: {e}")
                    print("Reconnecting to the database...")
                    conn.close()  # Close the current connection
                    conn = connect_to_db()  # Reconnect to the database
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

    # Close the database connection
    if conn:
        conn.close()

