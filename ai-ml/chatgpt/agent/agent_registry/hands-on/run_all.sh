#!/usr/bin/env bash
#
# run_all.sh - run the whole Agent Registry lab lifecycle in order, using the
# boto3>=1.43 venv python. Pass "teardown" to only clean up.
#
#   ./run_all.sh            # 00 -> 05 (probe, create, publish, submit, approve, search)
#   ./run_all.sh teardown   # 06 only
#   ./run_all.sh all        # 00 -> 06 (full cycle incl. teardown)
#
set -euo pipefail
cd "$(dirname "$0")"

# Set PY to a python with boto3>=1.43 (e.g. an activated venv). Override:
#   PY=/path/to/venv/bin/python ./run_all.sh
PY="${PY:-python3}"
export AWS_PAGER=""

run() { echo; echo ">>> $1"; "$PY" "$1"; }

case "${1:-lifecycle}" in
  teardown)  run 06_teardown.py ;;
  all)
    for s in 00_probe_api.py 01_create_registry.py 02_publish_records.py \
             03_submit_for_approval.py 04_curator_approve.py \
             05_consumer_search.py 06_teardown.py; do run "$s"; done ;;
  *)
    for s in 00_probe_api.py 01_create_registry.py 02_publish_records.py \
             03_submit_for_approval.py 04_curator_approve.py \
             05_consumer_search.py; do run "$s"; done
    echo; echo "Lifecycle done. Run './run_all.sh teardown' to clean up." ;;
esac
