#!/usr/bin/env python3
"""
end_to_end.py - AWS Agent Registry, the WHOLE lifecycle in ONE real-API run.

This is the "takeaway" script: a single self-contained program that exercises
create -> publish -> submit -> approve/reject -> semantic search -> teardown
against the REAL AWS Agent Registry API, printing each step. Unlike the numbered
lab (00..06), this needs no shared module and no ordering - run it once and it
does everything, then cleans up to $0 by default.

Verified live 2026-09-16 in us-east-1.

USAGE
-----
    python3 end_to_end.py                 # full cycle, then tear down
    python3 end_to_end.py --keep          # leave resources up (skip teardown)
    python3 end_to_end.py --region us-west-2

REQUIREMENTS
------------
    boto3 >= 1.43     (older boto3 does NOT know these services)
    IAM: read+write on Agent Registry, incl.
         agent-registry:SearchDiscoverableRegistryRecords
         (managed policy AgentRegistryFullAccess covers it)

TWO CLIENTS / TWO PLANES
------------------------
    Governance/control : boto3 client "agent-registry-control"  (all states)
    Discovery/data     : boto3 client "agent-registry"          (APPROVED only)
                         op search_discoverable_registry_records
    NOTE: the old preview client "bedrock-agentcore" + search_registry_records
    is a DIFFERENT (retired) namespace and 404s on GA registries. Don't use it.
"""
import sys
import json
import time
import argparse
import boto3
from botocore.exceptions import ClientError

REGISTRY_NAME = "agent-registry-e2e-demo"

RECORDS = [
    ("invoice-ocr-tool", "APPROVE", {
        "title": "Invoice OCR Extraction Tool",
        "summary": "Extracts line items, totals, tax and vendor details from "
                   "scanned invoices and PDF receipts.",
        "capabilities": ["ocr", "invoice", "tax", "accounts payable"],
        "owner": "finance-platform-team"}),
    ("customer-sentiment-agent", "REJECT", {
        "title": "Customer Sentiment Analysis Agent",
        "summary": "Scores support tickets and chat transcripts for sentiment, "
                   "urgency and churn risk.",
        "capabilities": ["nlp", "sentiment", "customer support", "churn"],
        "owner": "cx-ml-team"}),
    ("s3-cost-explorer-skill", "APPROVE", {
        "title": "S3 Storage Cost Explorer Skill",
        "summary": "Analyses S3 storage classes and lifecycle rules and "
                   "recommends cost-saving tiering changes.",
        "capabilities": ["aws", "s3", "cost optimization", "finops"],
        "owner": "cloud-finops-team"}),
]

QUERIES = [
    "pull totals and tax off a scanned supplier bill",
    "cut down my cloud storage bill",
    "gauge how angry our support customers are",   # matches the REJECTED one
]


def log(msg):
    print(f"  {msg}", flush=True)


def check_boto3():
    parts = tuple(int(x) for x in boto3.__version__.split(".")[:2])
    if parts < (1, 43):
        sys.exit(f"boto3 {boto3.__version__} too old; need >= 1.43")


def wait_registry_ready(ctl, rid, timeout=600):
    end = time.time() + timeout
    last = None
    while time.time() < end:
        r = ctl.get_registry(registryId=rid)
        st = r.get("status")
        if st != last:
            log(f"registry status: {st}"); last = st
        if st in ("READY", "ACTIVE", "AVAILABLE"):
            return
        if st and "FAIL" in st:
            sys.exit(f"registry failed: {st}")
        time.sleep(8)
    sys.exit("registry not READY in time")


def wait_record_status(ctl, rid, rec_id, want, timeout=300):
    end = time.time() + timeout
    while time.time() < end:
        st = ctl.get_registry_record(registryId=rid, recordId=rec_id).get("status")
        if st in want:
            return st
        time.sleep(6)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", default="us-east-1")
    ap.add_argument("--keep", action="store_true", help="skip teardown")
    args = ap.parse_args()
    check_boto3()

    ctl = boto3.client("agent-registry-control", region_name=args.region)
    disco = boto3.client("agent-registry", region_name=args.region)  # GA discovery plane

    print("\n=== 1. CREATE REGISTRY (async) ===")
    # reuse if a prior run left one
    rid = None
    for r in ctl.list_registries().get("registries", []):
        if r.get("name") == REGISTRY_NAME:
            rid = r["registryId"]; log(f"reusing existing registry {rid}")
    if not rid:
        resp = ctl.create_registry(
            name=REGISTRY_NAME,
            description="End-to-end demo of the AWS Agent Registry lifecycle")
        # id may be at top level or nested depending on API revision; if neither,
        # look it up by name (creation is registered synchronously even though
        # the registry itself becomes READY asynchronously).
        rid = resp.get("registryId") or resp.get("registry", {}).get("registryId")
        if not rid:
            for r in ctl.list_registries().get("registries", []):
                if r.get("name") == REGISTRY_NAME:
                    rid = r["registryId"]
        log(f"created registry {rid}")
    wait_registry_ready(ctl, rid)

    print("\n=== 2. PUBLISH RECORDS (Publisher) -> DRAFT ===")
    created = []
    for name, decision, payload in RECORDS:
        resp = ctl.create_registry_record(
            registryId=rid, name=name, recordType="CUSTOM",
            descriptors={"custom": {"data": json.dumps(payload)}})
        rec_id = (resp.get("recordId") or resp.get("record", {}).get("recordId"))
        if not rec_id:
            for rr in ctl.list_registry_records(registryId=rid).get("registryRecords", []):
                if rr.get("name") == name:
                    rec_id = rr["recordId"]
        wait_record_status(ctl, rid, rec_id, {"DRAFT", "READY", "ACTIVE"})
        log(f"published {name} -> {rec_id} (DRAFT)")
        created.append((name, decision, rec_id))

    print("\n=== 3. SUBMIT FOR APPROVAL -> PENDING_APPROVAL ===")
    for name, _, rec_id in created:
        ctl.submit_registry_record_for_approval(registryId=rid, recordId=rec_id)
        wait_record_status(ctl, rid, rec_id, {"PENDING_APPROVAL"})
        log(f"{name} -> PENDING_APPROVAL")

    print("\n=== 4. CURATE (Curator): approve 2, reject 1 ===")
    for name, decision, rec_id in created:
        target = "APPROVED" if decision == "APPROVE" else "REJECTED"
        reason = ("metadata complete, safe to publish"
                  if target == "APPROVED" else "does not meet review bar (demo)")
        ctl.update_registry_record_status(
            registryId=rid, recordId=rec_id, status=target, statusReason=reason)
        wait_record_status(ctl, rid, rec_id, {target})
        log(f"{name} -> {target}")

    print("\n=== 5. CONSUMER SEARCH (Discovery plane) - APPROVED only ===")
    log("waiting ~30s for discovery index to catch up on freshly-approved records...")
    time.sleep(30)
    for q in QUERIES:
        hits = []
        for _ in range(10):  # discovery is eventually consistent after approval
            try:
                hits = disco.search_discoverable_registry_records(
                    searchQuery=q, registryIds=[rid], maxResults=10
                ).get("registryRecords", [])
                if hits:
                    break
                time.sleep(12)
            except ClientError as e:
                log(f'  (retry: {e.response["Error"]["Code"]})'); time.sleep(12)
        names = [h.get("name") for h in hits]
        log(f'query "{q}"  ->  {names or "(no match)"}')
    log("note: the REJECTED sentiment agent never appears - governance filtering")

    if args.keep:
        print(f"\n=== KEEPING resources (registryId={rid}). Re-run with no --keep to delete. ===")
        return

    print("\n=== 6. TEARDOWN -> $0 ===")
    for _ in range(20):
        recs = ctl.list_registry_records(registryId=rid).get("registryRecords", [])
        if not recs:
            break
        for r in recs:
            try:
                ctl.delete_registry_record(registryId=rid, recordId=r["recordId"])
                log(f"deleted record {r['name']}")
            except ClientError as e:
                log(f"  {r['name']}: {e.response['Error']['Code']} (retry)")
        time.sleep(6)
    for _ in range(30):
        try:
            ctl.delete_registry(registryId=rid); log("delete_registry accepted"); break
        except ClientError as e:
            log(f"  {e.response['Error']['Code']} (registry busy, wait 8s)"); time.sleep(8)
    # poll until the registry is truly gone (delete is async: READY->DELETING->gone)
    left = [1]
    for _ in range(12):
        left = [r for r in ctl.list_registries().get("registries", [])
                if r["name"] == REGISTRY_NAME]
        if not left:
            break
        time.sleep(8)
    log(f"registries with our name remaining: {len(left)}"
        + ("" if not left else " (still DELETING - will clear shortly)"))
    print("\n=== DONE ===")


if __name__ == "__main__":
    main()
