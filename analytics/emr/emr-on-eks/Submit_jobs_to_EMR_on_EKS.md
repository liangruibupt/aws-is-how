# Submit jobs to EMR on EKS

1. Prepare the required info for job submit
```bash
export EMR_EKS_CLUSTER_ID=<virtual-cluster-id>
export EMR_EKS_EXECUTION_ARN=<arn:aws:iam::xxxxx:role/EMR_EKS_Job_Execution_Role>
export S3_BUCKET=<S3Bucket>
```

2. Submit wordcount pySpark job
```bash
aws emr-containers start-job-run \
--virtual-cluster-id ${EMR_EKS_CLUSTER_ID} \
--name wordcount_sample  --region us-east-2 \
--execution-role-arn ${EMR_EKS_EXECUTION_ARN} \
--release-label emr-6.3.0-latest \
--job-driver '{
  "sparkSubmitJobDriver": {
    "entryPoint": "s3://us-east-2.elasticmapreduce/emr-containers/samples/wordcount/scripts/wordcount.py",
    "entryPointArguments": ["s3://'"${S3_BUCKET}"'/emroneks/wordcount_output"],
    "sparkSubmitParameters": "--conf spark.executor.instances=2 --conf spark.executor.memory=2G --conf spark.executor.cores=2 --conf spark.driver.cores=1"
  }
}' \
--configuration-overrides '{
  "monitoringConfiguration": {
    "cloudWatchMonitoringConfiguration": {
      "logGroupName": "/emr-containers/jobs",
      "logStreamNamePrefix": "wordcount"
    },
    "s3MonitoringConfiguration": {
       "logUri": "s3://'"${S3_BUCKET}"'/emroneks/loggings/"
    }
  }
}'
```

4. Running the same job with a different EMR version
```bash
# emr-6.2.0-latest
aws emr-containers start-job-run \
--virtual-cluster-id ${EMR_EKS_CLUSTER_ID} \
--name spark-pi --region us-east-2 \
--execution-role-arn ${EMR_EKS_EXECUTION_ARN} \
--release-label emr-6.2.0-latest \
--job-driver '{
    "sparkSubmitJobDriver": {
        "entryPoint": "s3://aws-data-analytics-workshops/emr-eks-workshop/scripts/pi.py",
        "sparkSubmitParameters": "--conf spark.executor.instances=2 --conf spark.executor.memory=2G --conf spark.executor.cores=2 --conf spark.driver.cores=1"
        }
    }' \
--configuration-overrides '{
  "applicationConfiguration": [
      {
        "classification": "spark-defaults", 
        "properties": {
          "spark.driver.memory":"2G"
         }
      }
    ], 
  "monitoringConfiguration": {
    "cloudWatchMonitoringConfiguration": {
      "logGroupName": "/emr-containers/jobs",
      "logStreamNamePrefix": "spark_pi"
    },
    "s3MonitoringConfiguration": {
       "logUri": "s3://'"${S3_BUCKET}"'/emroneks/loggings/"
    }
  }
}'

# emr-5.33.0-latest
aws emr-containers start-job-run \
--virtual-cluster-id ${EMR_EKS_CLUSTER_ID} \
--name spark-pi --region us-east-2 \
--execution-role-arn ${EMR_EKS_EXECUTION_ARN} \
--release-label emr-5.33.0-latest \
--job-driver '{
    "sparkSubmitJobDriver": {
        "entryPoint": "s3://aws-data-analytics-workshops/emr-eks-workshop/scripts/pi.py",
        "sparkSubmitParameters": "--conf spark.executor.instances=2 --conf spark.executor.memory=2G --conf spark.executor.cores=2 --conf spark.driver.cores=1"
        }
    }' \
--configuration-overrides '{
  "applicationConfiguration": [
      {
        "classification": "spark-defaults", 
        "properties": {
          "spark.driver.memory":"2G"
         }
      }
    ], 
  "monitoringConfiguration": {
    "cloudWatchMonitoringConfiguration": {
      "logGroupName": "/emr-containers/jobs",
      "logStreamNamePrefix": "spark_pi"
    },
    "s3MonitoringConfiguration": {
       "logUri": "s3://'"${S3_BUCKET}"'/emroneks/loggings/"
    }
  }
}'
    
```

![spark_pi_job](images/spark_pi_job.png)

![spark_pi_cloudwatch](images/spark_pi_cloudwatch.png)

# Reference
[emr-on-eks.workshop](https://emr-on-eks.workshop.aws/introduction.html)

[emr-on-eks guide](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/emr-eks.html)