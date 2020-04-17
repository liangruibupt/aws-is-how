# Direct Connect Monitoring

[Overview guide](https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-overview.html)

[VIF monitoring](http://thebetternetwork.com/aws/aws-direct-connect-virtual-interface-monitoring/)

参考代码
```python
import boto3
def lambda_handler(event, context):
  client = boto3.client('directconnect')
  responsedx = client.describe_virtual_interfaces()
  for v in responsedx['virtualInterfaces']:
    vifid = (v['virtualInterfaceId'])
    for bgppeer in v['bgpPeers']:
      ConnectionState = bgppeer['bgpStatus']
      if ConnectionState == "up":
        statevalue = 1
      else:
        statevalue = 0
    print ("VIF :",vifid,"state is :",statevalue)
    client2 = boto3.client('cloudwatch')
    responsecw = client2.put_metric_data(
    Namespace="DirectConnectVif",
    MetricData=[
      {
          'MetricName' : "VirtualInterfaceState",
          'Dimensions' : [
              {
                  'Name' : "VirtualInterfaceId",
                  'Value' : vifid
                  },
              ],
            'Value' :  statevalue  
              }]
          )
  return "VirtualInterfaceState successfully published"
```


这个是[DX的全面状态指标](https://github.com/awslabs/aws-dx-monitor),建议可以用上，包括告警都创建了

[Data Dog 模式](https://www.datadoghq.com/blog/monitor-aws-health-status/)

