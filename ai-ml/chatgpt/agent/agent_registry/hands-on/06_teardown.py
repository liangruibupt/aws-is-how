#!/usr/bin/env python3
"""
06 - TEARDOWN - delete every lab record, then the lab registry -> $0 residual

Deletion order matters: you must delete all records in a registry before the
registry itself. And a resource stuck in a CREATING/DELETING state cannot be
acted on yet, so we poll/retry. This script only touches the lab registry
(by its deterministic name), never anything else in the account.

Run:
    /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python 06_teardown.py
"""
import time
from botocore.exceptions import ClientError
from _common import (
    control, banner, find_lab_registry, _registry_id, record_id_of,
)


def main():
    ctl = control()

    reg = find_lab_registry(ctl)
    if not reg:
        banner("Nothing to tear down - no lab registry present. Clean.")
        return
    rid = _registry_id(reg)
    print(f"  lab registry: {rid}")

    banner("Step 1 - delete all records (re-list each pass to survive eventual consistency)")
    # A single list_registry_records call can transiently return [] even when
    # records exist, which would wrongly skip deletion and leave the registry
    # un-deletable (ConflictException forever). So we loop, re-listing until
    # the registry is genuinely empty.
    from _common import list_records
    for _pass in range(20):
        recs = list_records(ctl, rid)
        if not recs:
            print("  registry is empty" if _pass else "  (0 records on first list)")
            break
        print(f"  {len(recs)} record(s) this pass")
        for rec in recs:
            rec_id = record_id_of(rec)
            name = rec.get("name")
            try:
                ctl.delete_registry_record(registryId=rid, recordId=rec_id)
                print(f"  deleted record {name} ({rec_id})")
            except ClientError as e:
                code = e.response["Error"]["Code"]
                print(f"  {name}: {code}; will retry next pass")
        time.sleep(6)

    banner("Step 2 - delete the registry (retry while CREATING/in-use)")
    for attempt in range(45):
        try:
            ctl.delete_registry(registryId=rid)
            print(f"  delete_registry accepted for {rid}")
            break
        except ClientError as e:
            code = e.response["Error"]["Code"]
            print(f"  {code}; registry not deletable yet, waiting 10s ({attempt+1}/45)")
            time.sleep(10)

    banner("Step 3 - confirm zero residual")
    remaining = ctl.list_registries().get("registries", [])
    still = [r for r in remaining if _registry_id(r) == rid]
    if still:
        print("  WARNING: registry still present (may be DELETING). Re-run shortly.")
    else:
        print(f"  registries remaining: {len(remaining)} (lab registry gone)")
    banner("Teardown complete")


if __name__ == "__main__":
    main()
