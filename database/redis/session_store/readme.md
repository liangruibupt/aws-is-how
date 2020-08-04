This code is part of an Amazon ElastiCache store session info Tutorial


1. Install dependencies:

    $ pip3 install -r requirements.txt


2. Configure environment variables:
```bash
    # Use the name of the example you want to run.
    $ export FLASK_APP=scripts/login_flask.py

    # Replace the value with a random string.
    $ export SECRET_KEY=some_secret_string

    # Replace the hostname with the endpoint of your ElastiCache instance.
    $ export REDIS_URL=redis://hostname:6379/
```

3.  Start the server on port 5000:
```bash
    $ flask run -h 0.0.0.0 -p 5000
```