"""CloudFormation templates for a private GPU origin and public CloudFront API."""
import json


def ref(name):
    return {"Ref": name}


def attr(name, key):
    return {"Fn::GetAtt": [name, key]}


def sub(value):
    return {"Fn::Sub": value}


def edge_template():
    return {
        "AWSTemplateFormatVersion": "2010-09-09",
        "Description": "CosyVoice3 CloudFront rate protection; no model data",
        "Resources": {"WebACL": {
            "Type": "AWS::WAFv2::WebACL",
            "Properties": {
                "Scope": "CLOUDFRONT", "DefaultAction": {"Allow": {}},
                "VisibilityConfig": {"SampledRequestsEnabled": False,
                                     "CloudWatchMetricsEnabled": True, "MetricName": "cosyvoice3"},
                "Rules": [{"Name": "IPRateLimit", "Priority": 0,
                           "Statement": {"RateBasedStatement": {"Limit": 300, "AggregateKeyType": "IP"}},
                           "Action": {"Block": {}},
                           "VisibilityConfig": {"SampledRequestsEnabled": False,
                                                "CloudWatchMetricsEnabled": True,
                                                "MetricName": "cosyvoice3-rate"}}],
            },
        }},
        "Outputs": {"WebACLArn": {"Value": attr("WebACL", "Arn")}},
    }


def service_template():
    resources = {}

    def add(name, kind, properties, **extra):
        resources[name] = {"Type": "AWS::"+kind, "Properties": properties, **extra}
        return ref(name)

    tags = [{"Key": "Project", "Value": "CosyVoice3"}]
    vpc = add("VPC", "EC2::VPC", {"CidrBlock": "10.83.0.0/16", "EnableDnsSupport": True,
                                 "EnableDnsHostnames": True, "Tags": tags})
    gateway = add("InternetGateway", "EC2::InternetGateway", {"Tags": tags})
    add("GatewayAttachment", "EC2::VPCGatewayAttachment", {"VpcId": vpc, "InternetGatewayId": gateway})
    public = add("PublicSubnet", "EC2::Subnet", {"VpcId": vpc, "CidrBlock": "10.83.0.0/24",
        "AvailabilityZone": ref("ZoneA"), "MapPublicIpOnLaunch": False, "Tags": tags})
    private_a = add("PrivateA", "EC2::Subnet", {"VpcId": vpc, "CidrBlock": "10.83.10.0/24",
        "AvailabilityZone": ref("ZoneA"), "MapPublicIpOnLaunch": False, "Tags": tags})
    private_b = add("PrivateB", "EC2::Subnet", {"VpcId": vpc, "CidrBlock": "10.83.11.0/24",
        "AvailabilityZone": ref("ZoneB"), "MapPublicIpOnLaunch": False, "Tags": tags})
    public_rt = add("PublicRoutes", "EC2::RouteTable", {"VpcId": vpc, "Tags": tags})
    add("PublicRouteAssociation", "EC2::SubnetRouteTableAssociation", {"SubnetId": public, "RouteTableId": public_rt})
    add("InternetRoute", "EC2::Route", {"RouteTableId": public_rt, "DestinationCidrBlock": "0.0.0.0/0",
                                      "GatewayId": gateway}, DependsOn="GatewayAttachment")
    eip = add("NATEIP", "EC2::EIP", {"Domain": "vpc", "Tags": tags}, DependsOn="GatewayAttachment")
    nat = add("NAT", "EC2::NatGateway", {"AllocationId": attr("NATEIP", "AllocationId"),
                                        "SubnetId": public, "ConnectivityType": "public", "Tags": tags})
    private_rt = add("PrivateRoutes", "EC2::RouteTable", {"VpcId": vpc, "Tags": tags})
    for label, subnet in [("A", private_a), ("B", private_b)]:
        add("PrivateAssociation"+label, "EC2::SubnetRouteTableAssociation",
            {"SubnetId": subnet, "RouteTableId": private_rt})
    add("NATRoute", "EC2::Route", {"RouteTableId": private_rt,
                                   "DestinationCidrBlock": "0.0.0.0/0", "NatGatewayId": nat})
    alb_sg = add("ALBSecurityGroup", "EC2::SecurityGroup",
        {"GroupDescription": "Only CloudFront VPC origin may reach private ALB", "VpcId": vpc, "Tags": tags})
    gpu_sg = add("GPUSecurityGroup", "EC2::SecurityGroup",
        {"GroupDescription": "Only private ALB may reach GPU API; no SSH", "VpcId": vpc, "Tags": tags,
         "SecurityGroupIngress": [{"IpProtocol": "tcp", "FromPort": 8000, "ToPort": 8000,
                                    "SourceSecurityGroupId": alb_sg}]})
    add("OriginIngress", "EC2::SecurityGroupIngress", {
        "GroupId": alb_sg, "IpProtocol": "tcp", "FromPort": 80, "ToPort": 80,
        "SourceSecurityGroupId": {"Fn::If": ["HasCloudFrontSG", ref("CloudFrontSG"), ref("AWS::NoValue")]},
        "SourcePrefixListId": {"Fn::If": ["HasCloudFrontSG", ref("AWS::NoValue"), ref("CloudFrontPrefix")]},
    })
    secret = add("APISecret", "SecretsManager::Secret",
                 {"Description": "CosyVoice3 single-user API token; retrieve with AWS profile",
                  "GenerateSecretString": {"PasswordLength": 48, "ExcludePunctuation": True},
                  "Tags": tags})
    role = add("InstanceRole", "IAM::Role", {
        "AssumeRolePolicyDocument": {"Version": "2012-10-17", "Statement": [{
            "Effect": "Allow", "Principal": {"Service": "ec2.amazonaws.com"}, "Action": "sts:AssumeRole"}]},
        "ManagedPolicyArns": ["arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"],
        "Policies": [{"PolicyName": "ReadDeploymentAndOwnToken", "PolicyDocument": {
            "Version": "2012-10-17", "Statement": [
                {"Effect": "Allow", "Action": ["s3:GetObject"],
                 "Resource": sub("arn:aws:s3:::${ArtifactBucket}/release/*")},
                {"Effect": "Allow", "Action": ["secretsmanager:GetSecretValue"], "Resource": secret},
            ]}}],
        "Tags": tags,
    })
    profile = add("InstanceProfile", "IAM::InstanceProfile", {"Roles": [role]})
    user_data = """#!/bin/bash
set -euo pipefail
exec >>/var/log/cosyvoice-bootstrap.log 2>&1
export DEBIAN_FRONTEND=noninteractive
if ! command -v aws; then
  apt-get update
  apt-get install -y awscli
fi
mkdir -p /opt/cosyvoice/release
aws --region ${AWS::Region} s3 cp s3://${ArtifactBucket}/${ArtifactKey} /opt/cosyvoice/release.tgz
echo '${ArtifactSHA}  /opt/cosyvoice/release.tgz' | sha256sum -c -
tar --no-same-owner -xzf /opt/cosyvoice/release.tgz -C /opt/cosyvoice/release
export COSYVOICE_SECRET_ARN='${APISecret}'
bash /opt/cosyvoice/release/bootstrap.sh
"""
    gpu = add("GPU", "EC2::Instance", {
        "ImageId": ref("ImageId"), "InstanceType": "g4dn.xlarge", "IamInstanceProfile": profile,
        "NetworkInterfaces": [{"DeviceIndex": "0", "SubnetId": private_a, "AssociatePublicIpAddress": False,
                               "GroupSet": [gpu_sg], "DeleteOnTermination": True}],
        "MetadataOptions": {"HttpTokens": "required", "HttpEndpoint": "enabled", "HttpPutResponseHopLimit": 1},
        "BlockDeviceMappings": [{"DeviceName": "/dev/sda1",
                                "Ebs": {"VolumeSize": 100, "VolumeType": "gp3", "Encrypted": True,
                                        "DeleteOnTermination": True}}],
        "UserData": {"Fn::Base64": sub(user_data)},
        "Tags": tags+[{"Key": "Name", "Value": "cosyvoice3-private-gpu"}],
    }, DependsOn="NATRoute")
    alb = add("ALB", "ElasticLoadBalancingV2::LoadBalancer", {
        "Scheme": "internal", "Type": "application", "IpAddressType": "ipv4",
        "Subnets": [private_a, private_b], "SecurityGroups": [alb_sg],
        "LoadBalancerAttributes": [{"Key": "routing.http.drop_invalid_header_fields.enabled", "Value": "true"},
                                   {"Key": "idle_timeout.timeout_seconds", "Value": "60"}], "Tags": tags,
    })
    target = add("TargetGroup", "ElasticLoadBalancingV2::TargetGroup", {
        "VpcId": vpc, "Protocol": "HTTP", "Port": 8000, "TargetType": "instance",
        "HealthCheckPath": "/healthz", "HealthCheckIntervalSeconds": 30,
        "HealthyThresholdCount": 2, "UnhealthyThresholdCount": 3, "Matcher": {"HttpCode": "200"},
        "Targets": [{"Id": gpu, "Port": 8000}], "Tags": tags,
    })
    add("Listener", "ElasticLoadBalancingV2::Listener",
        {"LoadBalancerArn": alb, "Port": 80, "Protocol": "HTTP",
         "DefaultActions": [{"Type": "forward", "TargetGroupArn": target}]})
    add("VpcOrigin", "CloudFront::VpcOrigin", {
        "VpcOriginEndpointConfig": {"Arn": alb, "Name": "cosyvoice3-private-alb",
                                    "HTTPPort": 80, "HTTPSPort": 443,
                                    "OriginProtocolPolicy": "http-only", "OriginSSLProtocols": ["TLSv1.2"]},
        "Tags": tags,
    }, DependsOn=["Listener", "GatewayAttachment"])
    add("Distribution", "CloudFront::Distribution", {"DistributionConfig": {
        "Enabled": True, "Comment": "CosyVoice3 authenticated API via private VPC origin",
        "HttpVersion": "http2and3", "IPV6Enabled": True, "PriceClass": "PriceClass_All",
        "WebACLId": ref("WebACLArn"),
        "ViewerCertificate": {"CloudFrontDefaultCertificate": True},
        "Origins": [{"Id": "private-alb", "DomainName": attr("ALB", "DNSName"),
                     "VpcOriginConfig": {"VpcOriginId": attr("VpcOrigin", "Id"),
                                         "OriginReadTimeout": 60, "OriginKeepaliveTimeout": 5}}],
        "DefaultCacheBehavior": {
            "TargetOriginId": "private-alb", "ViewerProtocolPolicy": "https-only",
            "AllowedMethods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "CachedMethods": ["GET", "HEAD"], "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
            "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e2966ac", "Compress": True,
        },
        "CustomErrorResponses": [{"ErrorCode": code, "ErrorCachingMinTTL": 0}
                                 for code in [400, 403, 404, 500, 502, 503, 504]],
    }, "Tags": tags})
    return {
        "AWSTemplateFormatVersion": "2010-09-09",
        "Description": "CosyVoice3: CloudFront VPC origin -> internal ALB -> private GPU EC2",
        "Parameters": {
            "ArtifactBucket": {"Type": "String"}, "ArtifactKey": {"Type": "String"},
            "ArtifactSHA": {"Type": "String"}, "WebACLArn": {"Type": "String"},
            "ImageId": {"Type": "AWS::EC2::Image::Id", "Default": "ami-07e48b17b73736ba3"},
            "ZoneA": {"Type": "AWS::EC2::AvailabilityZone::Name", "Default": "us-west-2a"},
            "ZoneB": {"Type": "AWS::EC2::AvailabilityZone::Name", "Default": "us-west-2b"},
            "CloudFrontPrefix": {"Type": "String", "Default": "pl-82a045eb"},
            "CloudFrontSG": {"Type": "String", "Default": ""},
        },
        "Conditions": {"HasCloudFrontSG": {"Fn::Not": [{"Fn::Equals": [ref("CloudFrontSG"), ""]}]}},
        "Resources": resources,
        "Outputs": {name: {"Value": value} for name, value in {
            "VpcId": vpc, "InstanceId": gpu, "ALBArn": alb, "ALBDNS": attr("ALB", "DNSName"),
            "ALBSecurityGroup": alb_sg, "GPUSecurityGroup": gpu_sg, "TargetGroupArn": target,
            "SecretArn": secret, "VpcOriginId": attr("VpcOrigin", "Id"),
            "DistributionId": ref("Distribution"), "DomainName": attr("Distribution", "DomainName"),
            "PrivateRouteTable": private_rt,
        }.items()},
    }


if __name__ == "__main__":
    import sys
    print(json.dumps(edge_template() if "--edge" in sys.argv else service_template(), indent=2))
