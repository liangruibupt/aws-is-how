import smtplib
from email.message import EmailMessage


SENDER = "Sender Name <sender@example.com>"     #replace with your emails
RECIPIENT = "recipient@example.com"  #replace with your emails
PORT = 465
HOST = "email-smtp.ap-northeast-1.amazonaws.com"
SUBJECT = "Amazon SES Test (SMTP Interface for Python)"
USER = "Replace with your SMTP Username"   #Replace with your SMTP Username
PASSWORD = "Replace with your SMTP Password"  #Replace with your SMTP Password

msg = EmailMessage()
msg['From'] = SENDER
msg['To'] = RECIPIENT
msg['Subject'] = "Notification: {}".format(SUBJECT)
msg.set_content('The content from Python mail code!')


server = smtplib.SMTP_SSL(HOST, PORT)
server.set_debuglevel(1)
server.login(USER, PASSWORD)
server.send_message(msg)
server.quit()