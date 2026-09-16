#!/usr/bin/env python3
"""Deploy viz/index.html to public HTTPS via private S3 + CloudFront + OAC."""
import json, time, boto3
from botocore.exceptions import ClientError

REGION = "us-east-1"
ACCOUNT = boto3.client("sts", region_name=REGION).get_caller_identity()["Account"]
BUCKET = f"agent-registry-viz-{ACCOUNT}"
SRC = "../viz/index.html"  # relative to this deploy/ dir; override as needed

s3 = boto3.client("s3", region_name=REGION)
cf = boto3.client("cloudfront")

# 1. bucket (private, us-east-1 => no LocationConstraint)
try:
    s3.create_bucket(Bucket=BUCKET)
    print("created bucket", BUCKET)
except ClientError as e:
    code = e.response["Error"]["Code"]
    if code in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
        print("bucket exists", BUCKET)
    else:
        raise
s3.put_public_access_block(
    Bucket=BUCKET,
    PublicAccessBlockConfiguration=dict(
        BlockPublicAcls=True, IgnorePublicAcls=True,
        BlockPublicPolicy=True, RestrictPublicBuckets=True))

# 2. upload
with open(SRC, "rb") as f:
    s3.put_object(Bucket=BUCKET, Key="index.html", Body=f.read(),
                  ContentType="text/html; charset=utf-8", CacheControl="no-cache")
print("uploaded index.html")

# 3. OAC (reuse if present)
oac_name = f"agent-registry-viz-oac"
oac_id = None
for item in cf.list_origin_access_controls().get("OriginAccessControlList", {}).get("Items", []):
    if item["Name"] == oac_name:
        oac_id = item["Id"]
if not oac_id:
    r = cf.create_origin_access_control(OriginAccessControlConfig=dict(
        Name=oac_name, SigningProtocol="sigv4", SigningBehavior="always",
        OriginAccessControlOriginType="s3"))
    oac_id = r["OriginAccessControl"]["Id"]
    print("created OAC", oac_id)
else:
    print("reuse OAC", oac_id)

# 4. distribution (create if none tagged for this bucket)
origin_domain = f"{BUCKET}.s3.{REGION}.amazonaws.com"
caller_ref = f"agent-registry-viz-{int(time.time())}"
dist_config = dict(
    CallerReference=caller_ref,
    Comment="agent-registry-viz",
    Enabled=True,
    DefaultRootObject="index.html",
    Origins=dict(Quantity=1, Items=[dict(
        Id="s3origin", DomainName=origin_domain,
        OriginAccessControlId=oac_id,
        S3OriginConfig=dict(OriginAccessIdentity=""),
        CustomHeaders=dict(Quantity=0))]),
    DefaultCacheBehavior=dict(
        TargetOriginId="s3origin",
        ViewerProtocolPolicy="redirect-to-https",
        CachePolicyId="4135ea2d-6df8-44a3-9df3-4b5a84be39ad",  # CachingDisabled
        Compress=True,
        AllowedMethods=dict(Quantity=2, Items=["GET", "HEAD"],
                            CachedMethods=dict(Quantity=2, Items=["GET", "HEAD"]))),
    PriceClass="PriceClass_100",
)
r = cf.create_distribution(DistributionConfig=dist_config)
dist_id = r["Distribution"]["Id"]
domain = r["Distribution"]["DomainName"]
arn = r["Distribution"]["ARN"]
print("created distribution", dist_id, domain)

# 5. bucket policy: allow only this distribution via OAC
policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "AllowCloudFrontOAC",
        "Effect": "Allow",
        "Principal": {"Service": "cloudfront.amazonaws.com"},
        "Action": "s3:GetObject",
        "Resource": f"arn:aws:s3:::{BUCKET}/*",
        "Condition": {"StringEquals": {"AWS:SourceArn": arn}},
    }],
}
s3.put_bucket_policy(Bucket=BUCKET, Policy=json.dumps(policy))
print("bucket policy set")

print("\nPUBLIC_URL=https://%s/" % domain)
print("DIST_ID=%s" % dist_id)
print("BUCKET=%s" % BUCKET)
