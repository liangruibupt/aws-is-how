import sys
def handler(event, context): 
    print("input event {}".format(event))
    return 'Hello from AWS Lambda using Python' + sys.version + '!'