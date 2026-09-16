# Agent Registry Viz — CloudFront Deploy Record

Deployed 2026-09-16, account 747411437379, us-east-1.

## Live resources
- **Public URL:** https://d1tkjy3i73sic6.cloudfront.net/
- **CloudFront distribution:** `E14PTNKUY8HB26` (domain `d1tkjy3i73sic6.cloudfront.net`)
- **Origin Access Control (OAC):** `E19OY9PJ7NVK0T` (name `agent-registry-viz-oac`)
- **S3 bucket (private):** `agent-registry-viz-747411437379` — all public access blocked;
  bucket policy allows `s3:GetObject` only from the CloudFront distribution ARN via OAC.
- Object: `index.html` (the self-contained viz SPA).
- PriceClass_100, CachingDisabled, redirect-to-https, DefaultRootObject=index.html.

Provisioning: first deploy takes ~10–15 min to go live globally (URL returns a
DNS / "can't be reached" error until CloudFront finishes its first deployment).

## Update the content later
```
aws s3api put-object --bucket agent-registry-viz-747411437379 --key index.html \
  --body index.html --content-type "text/html; charset=utf-8" --cache-control no-cache
aws cloudfront create-invalidation --distribution-id E14PTNKUY8HB26 --paths "/index.html" "/"
```

## Teardown (reverse order) — $0
1. Disable the distribution: get-distribution-config, set Enabled=false, update-distribution (needs IfMatch ETag).
2. Wait until Status=Deployed, then `cloudfront delete-distribution --id E14PTNKUY8HB26 --if-match <ETag>`.
3. `cloudfront delete-origin-access-control --id E19OY9PJ7NVK0T --if-match <ETag>`.
4. Empty + delete the bucket: `s3 rm s3://agent-registry-viz-747411437379 --recursive`, then `s3api delete-bucket`.
   (Note: `aws s3 rb`/bucket delete and CloudFront disable/delete may be guardrail-sensitive; use boto3 or hand to user.)
