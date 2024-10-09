import pymysql
import threading
import random
import string
from time import sleep, time

# MySQL connection configuration
config = {
    'host': "rds-proxy.proxy-c7b8fns5un9o.us-east-1.rds.amazonaws.com",
    'user': "admin",
    'password': "xxxxxxxx",
    'database': "test"
}

# Function to generate dummy data
def generate_dummy_data(batch_size):
    data_batch = []
    for _ in range(batch_size):
        column1_value = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        column2_value = random.randint(1, 100)
        column3_value = ''.join(random.choices(string.ascii_letters, k=20))
        data_batch.append((column1_value, column2_value, column3_value))
    return data_batch

# Global variables for QPS calculation
total_queries = 0
last_time = time()
lock = threading.Lock()

# Function to insert data into the database
def insert_data():
    batch_size = 10000  # Adjust batch size as needed

    while True:
        try:
            # Connect to the MySQL database
            conn = pymysql.connect(**config)
            cursor = conn.cursor()

            # Generate a batch of dummy data
            data_batch = generate_dummy_data(batch_size)

            while True:
                try:
                    # Insert data into the database in batches
                    query = "INSERT INTO dummy_table (column1, column2, column3) VALUES (%s, %s, %s)"
                    cursor.executemany(query, data_batch)
                    conn.commit()
                    break  # Exit the inner loop if the SQL statement is executed successfully
                except pymysql.Error as err:
                    print("Error inserting data:", err)
                    print("Retrying in 1 second")
                    sleep(1)  # Retry after 1 second

            # Update total_queries with thread-safe locking
            with lock:
                global total_queries
                total_queries += batch_size

            # Close the connection
            conn.close()

            # Introduce a delay to control the insertion rate
            sleep(0.1)  # Adjust the delay as needed

        except pymysql.Error as err:
            print("Error connecting to the database:", err)
            print("Retrying in 1 second")
            sleep(1)  # Retry after 1 second

# Function to calculate and print QPS
def calculate_qps():
    global total_queries, last_time

    while True:
        current_time = time()
        if current_time - last_time >= 10:
            with lock:
                qps = total_queries / (current_time - last_time)
                print(f"Total QPS: {qps:.2f}")
                total_queries = 0
                last_time = current_time
        sleep(1)

# Create and start the worker threads
num_threads = 4  # Number of threads to use
threads = []
for _ in range(num_threads):
    thread = threading.Thread(target=insert_data)
    thread.start()
    threads.append(thread)

# Create and start the QPS calculation thread
qps_thread = threading.Thread(target=calculate_qps)
qps_thread.start()

# Wait for the threads to finish (they will run indefinitely)
for thread in threads:
    thread.join()
qps_thread.join()
