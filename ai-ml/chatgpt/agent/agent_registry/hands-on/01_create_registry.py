#!/usr/bin/env python3
"""
01 - CREATE A REGISTRY (governance-plane container)

A "registry" is the top-level catalog that holds records (Agents / MCP servers
/ Skills / Custom). You publish records INTO a registry, and consumers search
WITHIN one or more registries.

Key things this script demonstrates:
  * CreateRegistry is ASYNC: the registry starts in CREATING and must be
    polled until READY before you can add records or delete it.
  * Idempotency: if the lab registry already exists we reuse it instead of
    erroring, so you can re-run the lab freely.
  * Tagging: we stamp created-by=agent-registry-hands-on-lab so teardown
    only removes what the lab made.

Run:
    /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python 01_create_registry.py
"""
from _common import (
    control, banner, show, introspect_input,
    find_lab_registry, poll_registry_ready, _registry_id,
    LAB_REGISTRY_NAME, LAB_TAG_KEY, LAB_TAG_VALUE,
)


def main():
    ctl = control()

    banner("Step 1 - is there already a lab registry? (idempotent re-run)")
    existing = find_lab_registry(ctl)
    if existing:
        rid = _registry_id(existing)
        print(f"  found existing lab registry: {rid}")
        reg = poll_registry_ready(ctl, rid)
        show("registry (reused)", reg)
        print(f"\nREGISTRY_ID={rid}")
        return

    banner("Step 2 - inspect CreateRegistry input before calling it")
    members, required = introspect_input(ctl, "CreateRegistry")

    banner("Step 3 - CreateRegistry (async -> CREATING)")
    kwargs = {"name": LAB_REGISTRY_NAME,
              "description": "Hands-on lab registry for learning AWS Agent Registry"}
    # tags shape varies; try the common dict form, fall back to no tags.
    try:
        resp = ctl.create_registry(tags={LAB_TAG_KEY: LAB_TAG_VALUE}, **kwargs)
    except Exception as e:
        print(f"  create with tags failed ({type(e).__name__}); retrying untagged")
        resp = ctl.create_registry(**kwargs)
    show("create_registry response", resp)

    reg = resp.get("registry", resp)
    rid = _registry_id(reg)
    if not rid:
        # some revisions only return the id at top level
        rid = resp.get("registryId") or resp.get("id")

    banner("Step 4 - poll until READY")
    reg = poll_registry_ready(ctl, rid)
    show("registry (READY)", reg)
    print(f"\nREGISTRY_ID={rid}")


if __name__ == "__main__":
    main()
