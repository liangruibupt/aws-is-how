
## Create the Layer package
```bash
cd lambda_layer_sample

mkdir python
cd python

pip install pandas -t ./

tree -L 1
.
├── bin
├── dateutil
├── numpy
├── numpy-1.20.3.dist-info
├── numpy.libs
├── pandas
├── pandas-1.2.4.dist-info
├── __pycache__
├── python_dateutil-2.8.1.dist-info
├── pytz
├── pytz-2021.1.dist-info
├── six-1.16.0.dist-info
└── six.py

zip -r pandas_layer.zip .
```

## Create the Lambda Layer
Follow up the guide https://docs.aws.amazon.com/zh_cn/lambda/latest/dg/configuration-layers.html#configuration-layers-create

## Create the lambda function for testing

Note if your layer created via python 3.7 runtime, you should also create the lambda function for python 3.7

## Testing code
```python
import json
import pandas as pd
import numpy as np

def lambda_handler(event, context):
    
    series = pd.Series([2, 4, 6, 8])
    print('Hello from Pandas, max value is ' + str(series.max()))
    a = np.array([2,3,4])
    print(a)
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Pandas, max value is  ' + str(series.max()) )
    }
```