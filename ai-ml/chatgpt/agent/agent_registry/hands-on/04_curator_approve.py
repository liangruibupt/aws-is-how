#!/usr/bin/env python3
"""
04 - CURATE: APPROVE (or REJECT) records -> PENDING_APPROVAL -> APPROVED

This is the Curator role. UpdateRegistryRecordStatus is the single op that
drives lifecycle transitions. We approve two records and REJECT one, so you
can see both outcomes and confirm that only APPROVED records become
discoverable in script 05.

By default we approve all but the record whose name contains "sentiment"
(rejected, to demonstrate the reject path). Change REJECT_SUBSTRING to taste.

Run (after 03):
    /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python 04_curator_approve.py
"""
from _common import (
    control, banner, show, introspect_input,
    find_lab_registry, _registry_id, poll_record_state, record_id_of,
    list_records,
)

REJECT_SUBSTRING = "sentiment"   # records whose name contains this get REJECTED


def set_status(ctl, rid, rec_id, status, reason):
    """
    Drive a lifecycle transition. Verified live: UpdateRegistryRecordStatus
    requires registryId, recordId, status AND statusReason (an audit string
    that shows up in the record's history / CloudTrail).
    """
    return ctl.update_registry_record_status(
        registryId=rid,
        recordId=rec_id,
        status=status,
        statusReason=reason,
    )


def main():
    ctl = control()

    reg = find_lab_registry(ctl)
    if not reg:
        raise SystemExit("No lab registry found. Run 01 first.")
    rid = _registry_id(reg)
    recs = list_records(ctl, rid)
    if not recs:
        raise SystemExit("No records found. Run 02/03 first.")

    banner("Inspect UpdateRegistryRecordStatus input shape")
    introspect_input(ctl, "UpdateRegistryRecordStatus")

    for rec in recs:
        rec_id = record_id_of(rec)
        name = rec.get("name", "")
        decision = "REJECTED" if REJECT_SUBSTRING in name else "APPROVED"
        reason = ("Rejected by lab curator: demonstrating the reject path"
                  if decision == "REJECTED"
                  else "Approved by lab curator: metadata complete, safe to publish")
        banner(f"Curator decision on {name}: {decision}")
        try:
            resp = set_status(ctl, rid, rec_id, decision, reason)
            show("update_registry_record_status response", resp)
            poll_record_state(ctl, rid, rec_id, want={decision})
        except Exception as e:
            print(f"  (note: {type(e).__name__}: {e})")

    banner("Curation complete - APPROVED records are now discoverable")
    print("  Next: run 05_consumer_search.py to find them via semantic search.")


if __name__ == "__main__":
    main()
