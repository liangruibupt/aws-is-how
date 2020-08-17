from flask import Flask
from flask import render_template
import json

app = Flask(__name__)

@app.route('/')
def webpage():
    return render_template('webpage.html',title='webpage')

if __name__ == '__main__':
    app.run(threaded=True,host='0.0.0.0',port=9080)