# CosyVoice Execution Boundaries

- Deploy, build containers, install runtime dependencies, download model weights,
  and run tests or inference only on EC2. Do not run these workloads on the Mac.
- The Mac may edit source and run AWS control scripts that upload artifacts,
  invoke SSM, and retrieve status or results. Do not start a local service.
- Read the ignored `deployment.json` for the existing account, region, and
  instance. Verify AWS account identity before modifying cloud resources.
- Preserve unfinished security-remediation changes. Use `stage_candidate.py`
  to validate a candidate on the existing GPU before promoting it.
- Do not restart the old vulnerable image as a workaround. Promotion requires
  a passing dependency audit with no ignored findings or skipped packages,
  passing contract tests, and successful GPU synthesis.
- Keep tokens, model weights, deployment state, and operational outputs out of
  tracked files. Record remaining blockers honestly; an uploaded artifact or
  successful infrastructure update is not a successful deployment.
- The existing root EBS volume is 150 GiB after an in-place expansion, while its
  original stack declaration remains 100 GiB. Do not apply the new-install
  block-device size from `infra.py` to that existing stack: CloudFormation can
  replace the instance and delete its data. Use `update_service.py`, which keeps
  the existing template, for service-code updates.
