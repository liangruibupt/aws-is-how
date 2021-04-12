# AWS DevOps Management Observability workshop

1. Provide timely and effective monitoring and response.
2. Gain insights for the application, development, and operations.

The fully hands on lab guide can be found in https://reinvent2019.aws-management.tools/mgt306/en/introduction.html and source code can be found in https://github.com/aws-samples/reinvent2018-dev303-code

Workshop Modules for AWS DevOps observability capabilities

1. Configure an EKS micro-service application with Observability capability
- [Configure an EKS micro-service application](Configure-EKS-and-micro-service-application.md)
- [Configure the Observability](Configure-Observability.md)
- [Distributed Tracing with AWS X-Ray](Installing-X-Ray.md)
2. Use CloudWatch ServiceLens to identify service and operational issues
- [CloudWatch ServiceLens](CloudWatch-ServiceLens.md)
3. Create a Cross-Account, Cross-Region Dashboard
- [CloudWatch Cross-Account, Cross-Region Dashboard](Cross-account-shared-dashboard.md)
4. Create Sythentic Canary tests
- [Sythentic Canary tests](Sythentic-Canary-tests.md)
5. Create Contributor Insight Rules to identify “top contributors”
- [Contributor Insights](devops/managed-platform/Contributor-Insights.md)
6. Create custom metrics from Lambda functions with Embedded Metric Format
- [Create Embedded Metric Format in Lambda](Embedded-Metric-Format.md)
7. X-Ray and Serverless 
[Lambda and X-Ray](https://reinvent2019.aws-management.tools/mgt306/en/xray.html)
8. CloudWatch Logs Insights
[CloudWatch Logs Insights]()

# Cleanup
```bash
# Cleaning up microservices
cd reinvent2018-dev303-code/
kubectl delete -f deploy/monitoring
kubectl delete -f deploy/tracing
kubectl delete -f deploy/services
kubectl delete -f deploy/eks

# Cleaning up Metrics collection with Prometheus
helm delete prometheus
helm del --purge prometheus
helm delete grafana
helm del --purge grafana
helm delete kube-prometheus-stack
helm del --purge kube-prometheus-stack
kubectl delete crd alertmanagers.monitoring.coreos.com
kubectl delete crd podmonitors.monitoring.coreos.com
kubectl delete crd prometheuses.monitoring.coreos.com
kubectl delete crd prometheusrules.monitoring.coreos.com
kubectl delete crd servicemonitors.monitoring.coreos.com
kubectl delete crd thanosrulers.monitoring.coreos.com

# Delete any services that have an associated EXTERNAL-IP value
kubectl get svc --all-namespaces
kubectl delete svc service-name

# Delete the cluster and its associated nodes
aws iam detach-role-policy --role-name $NodeInstanceRole --policy-arn $AmazonSQSFullAccess_ARN  --region=eu-west-1
aws iam detach-role-policy --role-name $NodeInstanceRole --policy-arn $AmazonDynamoDBFullAccess_ARN  --region=eu-west-1
aws iam detach-role-policy --role-name $NodeInstanceRole --policy-arn $CloudWatchLogsFullAccess_ARN  --region=eu-west-1
eksctl delete cluster --name observability-workshop --region eu-west-1

# Cleanup the ServiceLens resources

# Delete the VPC FLow logs
aws ec2 delete-flow-logs --flow-log-ids FlowLogId --region eu-west-1

# Delete the Contributor Insights Rule

# Delete the CloudWatch embedded metric lambda function
aws lambda delete-function --function-name emfTestFunction --region eu-west-1

# Delete the Sythentic Canary tests

# Delete logs insight 
aws lambda delete-function --function-name LogGenerator --region eu-west-1

# Delete the CloudWatch log groups
aws logs delete-log-group --log-group-name /aws/lambda/emfTestFunction --region eu-west-1
aws logs delete-log-group --log-group-name /aws/containerinsights/observability-workshop/application --region eu-west-1
aws logs delete-log-group --log-group-name /aws/containerinsights/observability-workshop/host --region eu-west-1
aws logs delete-log-group --log-group-name /aws/containerinsights/observability-workshop/dataplane --region eu-west-1
aws logs delete-log-group --log-group-name /aws/containerinsights/observability-workshop/performance --region eu-west-1
aws logs delete-log-group --log-group-name workshop-flow-logs --region eu-west-1
aws logs delete-log-group --log-group-name /aws/lambda/LogGenerator --region eu-west-1
aws logs delete-log-group --log-group-name /aws/lambda/cwsyn-* --region eu-west-1
```
# Reference

[Help guide](https://ako.aws-management.tools/tko372759/en/cw/introduction/createeks.html)
