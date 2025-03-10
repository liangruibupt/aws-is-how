import boto3
from botocore.exceptions import ClientError



#Set up the SES email needs
SENDER = "Sender Name <sender@example.com>"     #replace with your emails
RECIPIENT = "recipient@example.com"  #replace with your emails
AWS_REGION = "ap-northeast-1"

# Create a new SES resource and specify a region.

session = boto3.Session(profile_name='global_ruiliang',
                        region_name=AWS_REGION)
client = session.client('ses')

# The subject line for the email.
SUBJECT = "Amazon SES Test (SDK for Python)"

# The full path to the file that will be attached to the email.
# ATTACHMENT = "path/to/customers-to-contact.xlsx"

# The email body for recipients with non-HTML email clients.
BODY_TEXT = ("Amazon SES Test (Python)\r\n"
             "This email was sent with Amazon SES using the "
             "AWS SDK for Python (Boto)."
            )

# The HTML body of the email.
BODY_HTML = """<html>
    <head></head>
    <body>
    <h1>Amazon SES Test (SDK for Python)</h1>
    <p>This email was sent with
    <a href='https://aws.amazon.com/ses/'>Amazon SES</a> using the
    <a href='https://aws.amazon.com/sdk-for-python/'>
      AWS SDK for Python (Boto)</a>.</p>
    </body>
    </html>
    """

# The character encoding for the email.
CHARSET = "UTF-8"

# Try to send the email.
try:
    # Provide the contents of the email.
    response = client.send_email(
        Destination={
            'ToAddresses': [
                RECIPIENT,
            ],
        },
        Message={
            'Body': {
                'Html': {
                    'Charset': CHARSET,
                    'Data': BODY_HTML,
                },
                'Text': {
                    'Charset': CHARSET,
                    'Data': BODY_TEXT,
                },
            },
            'Subject': {
                'Charset': CHARSET,
                'Data': SUBJECT,
            },
        },
        Source=SENDER
    )
    # Display an error if something goes wrong.
except ClientError as e:
    print(e.response['Error']['Message'])
else:
    print("Email sent! Message ID:"),
    print(response['MessageId'])