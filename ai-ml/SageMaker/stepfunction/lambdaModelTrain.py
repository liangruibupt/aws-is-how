import json
import boto3
import copy
from time import gmtime, strftime


region = boto3.Session().region_name    
smclient = boto3.Session().client('sagemaker')
role = 'arn:aws:iam::account-id:role/lambda_basic_execution'


bucket_path='s3://sagemaker-us-east-1-account-id'
prefix = "invoice-forecast"

container = '811284229777.dkr.ecr.us-east-1.amazonaws.com/xgboost:latest'

# hyperparameter tunning optimization job
def lambda_handler(event, context):   
    tuning_job_config = {
    "ParameterRanges": {
    "CategoricalParameterRanges": [],
    "ContinuousParameterRanges": [
        {
        "MaxValue": "1",
        "MinValue": "0",
        "Name": "eta"
        },
        {
        "MaxValue": "2",
        "MinValue": "0",
        "Name": "alpha"
        },
        {
        "MaxValue": "10",
        "MinValue": "1",
        "Name": "min_child_weight"
        }
    ],
    "IntegerParameterRanges": [
        {
        "MaxValue": "20",
        "MinValue": "10",
        "Name": "max_depth"
        }
    ]
    },
    "ResourceLimits": {
    "MaxNumberOfTrainingJobs": 5,
    "MaxParallelTrainingJobs": 5
    },
    "Strategy": "Bayesian",
    "HyperParameterTuningJobObjective": {
    "MetricName": "validation:mae",
    "Type": "Minimize"
    }
    }
  
    training_job_definition = \
    { 
        "AlgorithmSpecification": {
            "TrainingImage": container,
            "TrainingInputMode": "File"
        },
        "RoleArn": role,
        "OutputDataConfig": {
            "S3OutputPath": bucket_path + "/"+ prefix + "/xgboost"
        },
        "ResourceConfig": {
            "InstanceCount": 2,   
            "InstanceType": "ml.m4.xlarge",
            "VolumeSizeInGB": 5
        },
        "StaticHyperParameters": {
            "objective": "reg:linear",
            "num_round": "100",
            "subsample":"0.7",
            "eval_metric":"mae"
        },
        "StoppingCondition": {
            "MaxRuntimeInSeconds": 86400
        },
        "InputDataConfig": [
            {
                "ChannelName": "train",
                "DataSource": {
                    "S3DataSource": {
                        "S3DataType": "S3Prefix",
                        "S3Uri": bucket_path + '/train/',
                        "S3DataDistributionType": "FullyReplicated" 
                    }
                },
                "ContentType": "text/csv",
                "CompressionType": "None"
            },
            {
                "ChannelName": "validation",
                "DataSource": {
                    "S3DataSource": {
                        "S3DataType": "S3Prefix",
                        "S3Uri": bucket_path + '/validation/',
                        "S3DataDistributionType": "FullyReplicated"
                    }
                },
                "ContentType": "text/csv",
                "CompressionType": "None"
            }
            ]
        }
        
    tuning_job_name = prefix + strftime("%Y%m%d%H%M%S", gmtime())
        
    event["container"] = container
    event["stage"] = "Training"
    event["status"] = "InProgress"
    event['name'] = tuning_job_name
        
    smclient.create_hyper_parameter_tuning_job(HyperParameterTuningJobName = tuning_job_name,
                                        HyperParameterTuningJobConfig = tuning_job_config,
                                        TrainingJobDefinition = training_job_definition)

    # output
    return event
