"""
Synthetic Data Generator — Meridian Capital Transaction Data
CDE Lesson 2.3 Hands-On Exercise

Make sure Faker is installed (for example, by using pip: `pip install Faker`)

Fill in the blanks (marked with ___) to complete the generator.
"""
from faker import Faker
import csv
import random
from datetime import date

fake = Faker()
Faker.seed(42)  # Reproducible output for validation

# Schema: acct_id, cust_initials, txn_date, txn_amount,
#          merchant_category, merchant_zip, txn_type, balance_after

MERCHANT_CATEGORIES = [
    "Groceries", "Gas Station", "Restaurant", "Online Shopping",
    "Utilities", "Healthcare", "Travel", "Entertainment"
]
TXN_TYPES = ["debit", "credit", "transfer", "payment"]

NUM_ROWS = 50000  # BLANK 1: 50,000 rows to match the customer's dataset

def generate_row():
    return {
        "acct_id": fake.bothify("####-####-####"),
        "cust_initials": fake.lexify("??", letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ"),  # BLANK 2: Generate 2-letter initials
        "txn_date": fake.date_between(start_date=date(2024, 1, 1), end_date=date(2024, 12, 31)).isoformat(),  # BLANK 3: A date within 2024
        "txn_amount": round(random.uniform(1.50, 5000.00), 2),
        "merchant_category": random.choice(MERCHANT_CATEGORIES),
        "merchant_zip": fake.zipcode(),  # BLANK 4: A valid US zip code
        "txn_type": random.choice(TXN_TYPES),
        "balance_after": round(random.uniform(100.00, 50000.00), 2),
    }

# Generate and write to CSV
with open("synthetic_transactions.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "acct_id", "cust_initials", "txn_date", "txn_amount",
        "merchant_category", "merchant_zip", "txn_type", "balance_after"
    ])
    writer.writeheader()
    for _ in range(NUM_ROWS):
        writer.writerow(generate_row())

print(f"✓ Generated {NUM_ROWS} synthetic transaction records → synthetic_transactions.csv")
