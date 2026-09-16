#!/usr/bin/env python3
"""
05 - CONSUMER SEARCH (Discovery plane) - find APPROVED records by meaning

This is the payoff. A Consumer who has never heard of "invoice-ocr-tool"
describes what they NEED in natural language, and the discovery plane returns
matching APPROVED records. Records in DRAFT / PENDING_APPROVAL / REJECTED do
NOT appear here - that is the whole governance point.

VERIFIED LIVE 2026-09-16:
  Discovery client : "agent-registry"   (the GA namespace)
  Operation        : search_discoverable_registry_records(searchQuery=..., registryIds=[...])
  registryIds      : accepts the bare 12-16 char registry id OR the full
                     arn:aws:agent-registry:...:registry/<id> ARN.

  Do NOT use the old preview client "bedrock-agentcore" + search_registry_records
  -- that is a separate, being-retired preview namespace and returns
  "Registry not found" for a GA-namespace registry.

  After approval, discovery indexing is eventually consistent (seconds, up to
  a couple of minutes) - so we retry a few times before giving up.

Run (after 04):
    /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python 05_consumer_search.py
"""
import time
from _common import (
    control, discovery, banner, show, introspect_input,
    find_lab_registry, _registry_id,
)

# Natural-language queries a consumer might type - note none use the exact
# record names, so a hit proves semantic (meaning-based) matching. The last
# query has NO match on purpose, to show governance filtering.
QUERIES = [
    "I need to pull totals and tax off a scanned supplier bill",
    "help me cut down my cloud storage bill",
    "something to gauge how angry our support customers are",  # this one was REJECTED
    "tool to send SMS text messages",                          # no such record at all
]


def search_once(dp, rid, query):
    resp = dp.search_discoverable_registry_records(
        searchQuery=query, registryIds=[rid], maxResults=10)
    return resp.get("registryRecords", [])


def main():
    ctl = control()
    dp = discovery()

    reg = find_lab_registry(ctl)
    if not reg:
        raise SystemExit("No lab registry found. Run the earlier scripts first.")
    rid = _registry_id(reg)
    print(f"  searching within registry: {rid}")

    banner("Inspect SearchDiscoverableRegistryRecords input shape")
    introspect_input(dp, "SearchDiscoverableRegistryRecords")

    for q in QUERIES:
        banner(f'Consumer query: "{q}"')
        results = []
        # retry a few times to ride out discovery-index eventual consistency
        for attempt in range(6):
            try:
                results = search_once(dp, rid, q)
                break
            except Exception as e:
                print(f"  (attempt {attempt+1}: {type(e).__name__}: {str(e)[:80]})")
                time.sleep(10)
        if not results:
            print("  (no matches - expected for the REJECTED record and the "
                  "nonexistent one: governance is filtering them out)")
        for r in results:
            name = r.get("name") or r.get("displayName") or "?"
            rtype = r.get("recordType", "")
            status = r.get("status", "")
            score = r.get("score") or r.get("relevanceScore") or ""
            print(f"  MATCH: {name}  [{rtype}/{status}]"
                  + (f"  score={score}" if score else ""))

    banner("Search demo complete - only APPROVED records were discoverable")


if __name__ == "__main__":
    main()
