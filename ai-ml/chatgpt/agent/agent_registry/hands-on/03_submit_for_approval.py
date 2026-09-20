#!/usr/bin/env python3
"""
03 - SUBMIT FOR APPROVAL (Publisher) -> DRAFT -> PENDING_APPROVAL

Once a Publisher is happy with a DRAFT record, they submit it for approval.
This moves the record into PENDING_APPROVAL, where a Curator (script 04) must
approve or reject it. In a real org an EventBridge rule fires here to notify
the approval chain, and CloudTrail records the transition.

Records are still NOT discoverable by consumers in PENDING_APPROVAL.

Run (after 02):
    /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python 03_submit_for_approval.py
"""
from _common import (
    control, banner, show, introspect_input,
    find_lab_registry, _registry_id, poll_record_state, record_id_of,
    list_records, status_of,
)


def main():
    ctl = control()

    banner("Locate the lab registry + its records")
    reg = find_lab_registry(ctl)
    if not reg:
        raise SystemExit("No lab registry found. Run 01 first.")
    rid = _registry_id(reg)

    recs = list_records(ctl, rid)
    if not recs:
        raise SystemExit("No records found. Run 02_publish_records.py first.")
    print(f"  registry {rid} has {len(recs)} record(s)")

    banner("Inspect SubmitRegistryRecordForApproval input shape")
    introspect_input(ctl, "SubmitRegistryRecordForApproval")

    for rec in recs:
        rec_id = record_id_of(rec)
        status = status_of(rec)
        banner(f"Submit for approval: {rec.get('name')} (currently {status})")
        if status in ("PENDING_APPROVAL", "APPROVED"):
            print("  already past DRAFT - skipping")
            continue
        resp = ctl.submit_registry_record_for_approval(registryId=rid, recordId=rec_id)
        show("submit response", resp)
        try:
            poll_record_state(ctl, rid, rec_id, want={"PENDING_APPROVAL"})
        except Exception as e:
            print(f"  (poll note: {type(e).__name__}: {e})")

    banner("All records submitted -> PENDING_APPROVAL (awaiting a Curator)")


if __name__ == "__main__":
    main()
