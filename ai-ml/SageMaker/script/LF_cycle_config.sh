#!/bin/bash

set -e

ENVIRONMENT=JupyterSystemEnv
NOTEBOOK_FILE=/home/ec2-user/SageMaker/notebook1.ipynb

source /home/ec2-user/anaconda3/bin/activate "$ENVIRONMENT"
pip install pysmb
pip install hdbcli
pip install matplotlib

#jupyter nbconvert "$NOTEBOOK_FILE" --ExecutePreprocessor.kernel_name=python3 --execute
nohup jupyter nbconvert "$NOTEBOOK_FILE" --ExecutePreprocessor.timeout=-1 --ExecutePreprocessor.kernel_name=python3 --to notebook --execute >output.log 2>&1 &

source /home/ec2-user/anaconda3/bin/deactivate