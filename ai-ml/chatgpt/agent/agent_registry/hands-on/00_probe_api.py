#!/usr/bin/env python3
"""
00 - PROBE THE API SURFACE (read-only, creates nothing)

Learn the shape of the Agent Registry API before touching it:
  * confirm both clients exist and respond
  * list the control-plane operations
  * dump the exact input parameters for the operations the lab uses
  * confirm the data-plane search op is present

Run:
    /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python 00_probe_api.py
"""
from _common import control, discovery, banner, introspect_input, show

CONTROL_OPS_WE_USE = [
    "CreateRegistry",
    "CreateRegistryRecord",
    "SubmitRegistryRecordForApproval",
    "UpdateRegistryRecordStatus",
    "GetRegistryRecord",
    "ListRegistryRecords",
    "GetRegistry",
    "DeleteRegistry",
    "DeleteRegistryRecord",
]


def main():
    ctl = control()
    dp = discovery()

    banner("Control-plane operations available")
    ops = list(ctl.meta.service_model.operation_names)
    print(ops)

    banner("Existing registries (should be [] on a clean account)")
    show("list_registries", ctl.list_registries().get("registries", []))

    banner("Exact input shapes for the operations this lab uses")
    for op in CONTROL_OPS_WE_USE:
        introspect_input(ctl, op)

    banner("Data-plane (discovery) search operation")
    has_search = "SearchRegistryRecords" in dp.meta.service_model.operation_names
    print(f"  bedrock-agentcore has SearchRegistryRecords: {has_search}")
    if has_search:
        introspect_input(dp, "SearchRegistryRecords")

    banner("DONE - nothing was created")


if __name__ == "__main__":
    main()
