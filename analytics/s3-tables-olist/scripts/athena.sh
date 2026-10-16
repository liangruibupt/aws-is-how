#!/usr/bin/env bash
# Usage: athena.sh "<SQL>" [catalog] [database]
# Runs a query in Athena (cn-north-1), waits, prints results as a table.
set -euo pipefail
export AWS_PROFILE=china_ruiliang AWS_REGION=cn-north-1
SQL="$1"; CATALOG="${2:-AwsDataCatalog}"; DB="${3:-default}"
OUT="s3://aws-athena-query-results-876820548815-cn-north-1/s3tables-demo/"
QID=$(aws athena start-query-execution --work-group primary \
  --query-string "$SQL" \
  --query-execution-context "Catalog=$CATALOG,Database=$DB" \
  --result-configuration "OutputLocation=$OUT" --output text --query QueryExecutionId)
while :; do
  ST=$(aws athena get-query-execution --query-execution-id "$QID" --output text \
       --query 'QueryExecution.Status.State')
  [[ "$ST" == QUEUED || "$ST" == RUNNING ]] || break; sleep 2
done
if [[ "$ST" != SUCCEEDED ]]; then
  aws athena get-query-execution --query-execution-id "$QID" --output text \
    --query 'QueryExecution.Status.StateChangeReason' >&2; exit 1
fi
aws athena get-query-results --query-execution-id "$QID" --max-items 50 --output json \
 | python3 -c 'import sys,json
rows=json.load(sys.stdin)["ResultSet"]["Rows"]
for r in rows: print(" | ".join(c.get("VarCharValue","") for c in r["Data"]))'
aws athena get-query-execution --query-execution-id "$QID" --output text \
  --query 'QueryExecution.Statistics.[EngineExecutionTimeInMillis,DataScannedInBytes]' \
  | awk '{printf "-- %s ms, %s bytes scanned\n",$1,$2}'
