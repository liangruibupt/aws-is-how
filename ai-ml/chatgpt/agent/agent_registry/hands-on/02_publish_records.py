#!/usr/bin/env python3
"""
02 - PUBLISH RECORDS (Publisher role) -> they start as DRAFT

A record is one catalog entry. Record types:
  * CUSTOM : any valid JSON blob (most permissive; great for learning)
  * AGENT  : an A2A agent card
  * MCP    : an MCP server + its tools/resources/prompts
  * SKILL  : Markdown + code

New records begin life in DRAFT. They are NOT discoverable by consumers until
they pass through PENDING_APPROVAL -> APPROVED (scripts 03 + 04).

The descriptor shape (verified live) is:
    descriptors={"custom": {"data": <json string>}}
for CUSTOM records. Other types use their own descriptor key; this script
introspects the input so you can see the accepted shape for your API revision.

Run (after 01):
    /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python 02_publish_records.py
"""
import json
from _common import (
    control, banner, show, introspect_input,
    find_lab_registry, _registry_id, poll_record_state, record_id_of,
)

# Three sample tools a "Publisher" wants in the catalog. We use CUSTOM records
# (the verified-portable type) with a rich JSON payload so semantic search in
# script 05 has real text to match against.
SAMPLE_RECORDS = [
    {
        "name": "invoice-ocr-tool",
        "payload": {
            "title": "Invoice OCR Extraction Tool",
            "summary": "Extracts line items, totals, tax and vendor details "
                       "from scanned invoices and PDF receipts.",
            "capabilities": ["ocr", "document parsing", "invoice", "accounts payable"],
            "owner": "finance-platform-team",
            "endpoint": "arn:aws:example:invoice-ocr",
        },
    },
    {
        "name": "customer-sentiment-agent",
        "payload": {
            "title": "Customer Sentiment Analysis Agent",
            "summary": "Reads support tickets and chat transcripts and returns "
                       "sentiment, urgency and churn-risk scoring.",
            "capabilities": ["nlp", "sentiment", "customer support", "churn"],
            "owner": "cx-ml-team",
            "endpoint": "arn:aws:example:sentiment-agent",
        },
    },
    {
        "name": "s3-cost-explorer-skill",
        "payload": {
            "title": "S3 Storage Cost Explorer Skill",
            "summary": "Analyses S3 bucket storage classes and lifecycle rules "
                       "and recommends cost-saving tiering changes.",
            "capabilities": ["aws", "s3", "cost optimization", "finops"],
            "owner": "cloud-finops-team",
            "endpoint": "arn:aws:example:s3-cost-skill",
        },
    },
]


def create_custom_record(ctl, registry_id, name, payload):
    """Create one CUSTOM record. Returns the record id."""
    data = json.dumps(payload)
    # Verified descriptor shape for CUSTOM records.
    resp = ctl.create_registry_record(
        registryId=registry_id,
        name=name,
        recordType="CUSTOM",
        descriptors={"custom": {"data": data}},
    )
    show(f"create_registry_record ({name})", resp)
    rec = resp.get("record", resp)
    return record_id_of(rec) or resp.get("recordId") or resp.get("id")


def main():
    ctl = control()

    banner("Locate the lab registry")
    reg = find_lab_registry(ctl)
    if not reg:
        raise SystemExit("No lab registry found. Run 01_create_registry.py first.")
    rid = _registry_id(reg)
    print(f"  registry: {rid}")

    banner("Inspect CreateRegistryRecord input shape")
    introspect_input(ctl, "CreateRegistryRecord")

    created = []
    for spec in SAMPLE_RECORDS:
        banner(f"Publish DRAFT record: {spec['name']}")
        rec_id = create_custom_record(ctl, rid, spec["name"], spec["payload"])
        print(f"  created record id: {rec_id}")
        # Records are async too; wait until they settle into DRAFT (or ready-ish).
        try:
            poll_record_state(ctl, rid, rec_id,
                              want={"DRAFT", "READY", "ACTIVE", "AVAILABLE"})
        except Exception as e:
            print(f"  (poll note: {type(e).__name__}: {e})")
        created.append((spec["name"], rec_id))

    banner("Published records (all DRAFT - NOT yet discoverable)")
    for name, rid_ in created:
        print(f"  {name:28s} -> {rid_}")


if __name__ == "__main__":
    main()
