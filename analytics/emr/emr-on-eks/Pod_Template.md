# Pod Template

You can specify the spark properties spark.kubernetes.driver.podTemplateFile and spark.kubernetes.executor.podTemplateFile to point to the pod template files in Amazon S3. 

We will run a use case where we want the Driver Pod to be always created on an ON-DEMAND instance 

```yaml
apiVersion: v1
kind: Pod
spec:
  nodeSelector:
    eks.amazonaws.com/capacityType: ON_DEMAND
```

while executor pods to launch on SPOT instances
```yaml
apiVersion: v1
kind: Pod
spec:
  nodeSelector:
    eks.amazonaws.com/capacityType: SPOT
```

1. Case 1: Specify in SparkSubmitParameters
```bash
aws emr-containers start-job-run \
--virtual-cluster-id ${EMR_EKS_CLUSTER_ID} \
--name spark-pi-pod-template --region us-east-2 \
--execution-role-arn ${EMR_EKS_EXECUTION_ARN} \
--release-label emr-5.33.0-latest \
--job-driver '{
    "sparkSubmitJobDriver": {
        "entryPoint": "s3://aws-data-analytics-workshops/emr-eks-workshop/scripts/pi.py",
        "sparkSubmitParameters": "--conf spark.kubernetes.driver.podTemplateFile=s3://aws-data-analytics-workshops/emr-eks-workshop/scripts/driver_template.yaml --conf spark.kubernetes.executor.podTemplateFile=s3://aws-data-analytics-workshops/emr-eks-workshop/scripts/executor_template.yaml --conf spark.executor.instances=2 --conf spark.executor.memory=2G --conf spark.executor.cores=2 --conf spark.driver.cores=1"
        }
    }'
```

2. Case 2: Specify in ApplicationConfiguration
```bash
aws emr-containers start-job-run \
--virtual-cluster-id ${EMR_EKS_CLUSTER_ID} \
--name spark-pi-pod-template --region us-east-2 \
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
          "spark.driver.memory":"2G",
          "spark.kubernetes.driver.podTemplateFile":"s3://aws-data-analytics-workshops/emr-eks-workshop/scripts/driver_template.yaml",
          "spark.kubernetes.executor.podTemplateFile":"s3://aws-data-analytics-workshops/emr-eks-workshop/scripts/executor_template.yaml"
         }
      }
    ]   
}'
```   

# Reference
[emr-on-eks.workshop](https://emr-on-eks.workshop.aws/introduction.html)

[emr-on-eks guide](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/emr-eks.html)

