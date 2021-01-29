import logging
import os
from logging.handlers import RotatingFileHandler
import time
import random
import datetime
import json

log_fmt = '%(message)s'
log_path = 'C:\LogSource\windows-iot-app.log'
logging.basicConfig(level=logging.INFO, format=log_fmt,
                    filename=log_path, filemode='a')
log_file_handler = RotatingFileHandler(
    log_path, mode='a', maxBytes=1 * 1024 * 1024, backupCount=2)
formatter = logging.Formatter(log_fmt)
log_file_handler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(log_file_handler)


def generateLogs(count):
    now = datetime.datetime.now()
    # Need Python3
    str_now = now.timestamp()
    # Declaring our variables
    CORP = random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV'])
    message = {
        'Critical': random.choice(range(5)),
        'AlertMessage': "Temperature exceeded " + CORP,
        'AlertCount': random.choice(range(count)),
        'Device': "RAT Internals - " + str(count),
        'EventTime': str_now
    }
    logger.info(json.dumps(message))


def main():
    count = 0
    while True:
        count += 1
        generateLogs(count)
        time.sleep(1)

if __name__ == '__main__':
    main()
