"""
Shared helpers for the AWS Agent Registry hands-on lab.

WHY THIS EXISTS
---------------
The lab hits the REAL AWS Agent Registry API (Amazon Bedrock AgentCore, GA
2026-08-31). Two distinct clients are involved:

  * CONTROL PLANE  -> boto3 client "agent-registry-control"
        The authoritative, governed store. Every lifecycle state lives here:
        DRAFT -> PENDING_APPROVAL -> APPROVED / REJECTED -> DEPRECATED.
        Publishers/Curators/Admins operate here (create, submit, approve...).

  * DATA / DISCOVERY PLANE -> boto3 client "bedrock-agentcore"
        The consumer-facing search surface. Only APPROVED records are
        discoverable. Op: SearchRegistryRecords(searchQuery=..., registryIds=[...]).

REQUIREMENTS
------------
  * boto3 >= 1.43  (the base 1.34.x does NOT know these services).
    Run everything with the project venv python:
        /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python

ASYNC BEHAVIOUR (important!)
----------------------------
  * CreateRegistry       -> registry starts in CREATING, must poll to READY.
  * CreateRegistryRecord -> record starts in a CREATING-ish state too.
  * DeleteRegistry       -> a registry stuck in CREATING cannot be deleted;
                            you must wait it out. So we always poll.
"""
import sys
import time
import json
import boto3
from botocore.exceptions import ClientError, BotoCoreError

REGION = "us-east-1"

# A single tag we stamp on everything the lab creates, so teardown can find
# and remove ONLY our resources and never touch anything else in the account.
LAB_TAG_KEY = "created-by"
LAB_TAG_VALUE = "agent-registry-hands-on-lab"

# Deterministic name the lab reuses so scripts are idempotent across runs.
LAB_REGISTRY_NAME = "hands-on-lab-registry"


def _min_boto3():
    """Fail fast with a clear message if boto3 is too old."""
    parts = tuple(int(x) for x in boto3.__version__.split(".")[:2])
    if parts < (1, 43):
        sys.exit(
            f"\nboto3 {boto3.__version__} is too old for Agent Registry.\n"
            "Run with the project venv python:\n"
            "  /home/ubuntu/workplace/duckdb-scenarios-explorer/.venv/bin/python <script>\n"
        )


def control():
    """Control-plane client (authoritative store, all lifecycle ops)."""
    _min_boto3()
    return boto3.Session(region_name=REGION).client("agent-registry-control")


def discovery():
    """
    Data-plane / discovery client (consumer semantic + lexical search over
    APPROVED records).

    IMPORTANT (verified live 2026-09-16): the GA discovery client is
    "agent-registry" with operation search_discoverable_registry_records.
    Do NOT use the old preview client "bedrock-agentcore" /
    search_registry_records -- that is a SEPARATE preview namespace whose data
    store does not contain registries created on the GA control plane, so it
    returns "Registry not found". (The preview namespace is being retired.)
    """
    _min_boto3()
    return boto3.Session(region_name=REGION).client("agent-registry")


def banner(title):
    line = "=" * 70
    print(f"\n{line}\n{title}\n{line}")


def show(label, obj):
    """Pretty-print any API response so the lab is self-documenting."""
    print(f"\n--- {label} ---")
    print(json.dumps(obj, indent=2, default=str, sort_keys=True))


def introspect_input(client, op_name):
    """
    Print the EXACT input member names + which are required for an operation.
    Run this any time you are unsure of a parameter name instead of guessing
    (a wrong param name is what crashed an earlier probe).
    """
    sm = client.meta.service_model
    model = sm.operation_model(op_name)
    ishape = model.input_shape
    members = {m: sh.type_name for m, sh in (ishape.members.items() if ishape else {})}
    required = list(ishape.required_members) if ishape else []
    print(f"\n[introspect] {op_name}")
    print(f"  input members : {members}")
    print(f"  required      : {required}")
    return members, required


def find_lab_registry(ctl):
    """Return the lab registry summary dict if it exists, else None."""
    resp = ctl.list_registries()
    for r in resp.get("registries", []):
        if r.get("name") == LAB_REGISTRY_NAME:
            return r
    return None


def _registry_id(reg):
    """Registries expose their id under one of a few keys across API revisions."""
    for k in ("registryId", "id", "registryArn", "arn"):
        if reg.get(k):
            return reg[k]
    return None


def poll_registry_ready(ctl, registry_id, timeout=600, interval=10):
    """Block until a registry reaches READY (or a terminal non-CREATING state)."""
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        r = ctl.get_registry(registryId=registry_id)
        reg = r.get("registry", r)
        status = reg.get("status") or reg.get("registryStatus")
        if status != last:
            print(f"  registry {registry_id} status: {status}")
            last = status
        if status in ("READY", "ACTIVE", "AVAILABLE"):
            return reg
        if status in ("FAILED", "CREATE_FAILED"):
            raise RuntimeError(f"registry entered terminal failure state: {status}")
        time.sleep(interval)
    raise TimeoutError(f"registry {registry_id} not READY within {timeout}s")


def poll_record_state(ctl, registry_id, record_id, want, timeout=300, interval=8):
    """
    Poll a record until its status is in `want` (a set/list of acceptable
    states), returning the record. Used after create/submit/approve.
    """
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        r = ctl.get_registry_record(registryId=registry_id, recordId=record_id)
        rec = r.get("record", r)
        status = rec.get("status") or rec.get("recordStatus") or rec.get("lifecycleStatus")
        if status != last:
            print(f"  record {record_id} status: {status}")
            last = status
        if status in want:
            return rec
        time.sleep(interval)
    raise TimeoutError(f"record {record_id} did not reach {want} within {timeout}s")


def record_id_of(rec):
    # Prefer the short recordId; the API accepts it for get/submit/update/delete.
    for k in ("recordId", "id", "recordArn", "arn"):
        if rec.get(k):
            return rec[k]
    return None


def list_records(ctl, registry_id):
    """Return the list of record summaries (live key is 'registryRecords')."""
    resp = ctl.list_registry_records(registryId=registry_id)
    return resp.get("registryRecords") or resp.get("records") or []


def status_of(rec):
    return rec.get("status") or rec.get("recordStatus") or rec.get("lifecycleStatus")
