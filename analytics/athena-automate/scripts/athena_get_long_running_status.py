import logging
import json
from athena_query_helper import get_execution_status
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):

    query_execution_id = event["WaitTask"]["QueryExecutionId"]

    # Get the status
    status_information = get_execution_status(query_execution_id)

    event["WaitTask"]["QueryState"] = status_information['QueryState'],

    status_key = "{}StatusInformation".format(
        event["WaitTask"]["ResultPrefix"])
    event[status_key] = status_information

    return event
