"""Fast API-contract tests with no model download or local GPU inference."""
import importlib.util
import json
import os
from pathlib import Path
import queue
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from infra import service_template


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        with patch.dict(os.environ, {"API_TOKEN": "test-token-"+"a"*40}):
            spec = importlib.util.spec_from_file_location("tested_cosyvoice_app", Path(__file__).with_name("app.py"))
            self.module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.module)
        self.module.DATA = Path(self.temp.name)
        (self.module.DATA/"voices").mkdir()
        (self.module.DATA/"voices/demo.json").write_text(json.dumps({"name": "Test reference"}))
        with self.module.database() as db:
            db.execute("CREATE TABLE jobs(id TEXT PRIMARY KEY,state TEXT,created REAL,detail TEXT)")
        self.module.READY = True
        self.client = TestClient(self.module.app)
        self.auth = {"Authorization": "Bearer "+self.module.TOKEN}

    def tearDown(self):
        self.client.close()
        self.temp.cleanup()

    def test_health_is_minimal_and_uncached(self):
        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ready"})
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_authentication_required(self):
        self.assertEqual(self.client.get("/v1/voices").status_code, 401)
        self.assertEqual(self.client.get("/v1/voices", headers={"Authorization": "Bearer wrong"}).status_code, 401)
        self.assertEqual(self.client.get("/v1/voices", headers=self.auth).status_code, 200)

    def test_invalid_payloads_and_voice_paths(self):
        for payload in [{"text": "x"*1001}, {"text": "hello", "voice": "../../private"},
                        {"text": "hello", "speed": 4}, {"text": "hello", "format": "exe"}]:
            self.assertEqual(self.client.post("/v1/jobs", headers=self.auth, json=payload).status_code, 422)
        self.assertEqual(self.client.post("/v1/jobs", headers=self.auth,
                                         json={"text": "hello", "voice": "missing"}).status_code, 404)

    def test_queue_is_bounded(self):
        self.module.JOBS = queue.Queue(maxsize=1)
        payload = {"text": "hello", "voice": "demo"}
        response = self.client.post("/v1/jobs", headers=self.auth, json=payload)
        self.assertEqual(response.status_code, 202)
        job_id = response.json()["id"]
        self.assertEqual(self.client.get(f"/v1/jobs/{job_id}", headers=self.auth).json()["status"], "queued")
        self.assertEqual(self.client.post("/v1/jobs", headers=self.auth, json=payload).status_code, 429)
        self.assertEqual(self.client.get(f"/v1/jobs/{job_id}/audio", headers=self.auth).status_code, 409)

    def test_oversized_request_rejected(self):
        response = self.client.post("/v1/jobs", headers={**self.auth, "Content-Length": "11000000"},
                                    content=b"{}")
        self.assertEqual(response.status_code, 413)

    def test_private_infrastructure(self):
        template = service_template()
        resources = template["Resources"]
        self.assertEqual(resources["ALB"]["Properties"]["Scheme"], "internal")
        gpu = resources["GPU"]["Properties"]
        self.assertFalse(gpu["NetworkInterfaces"][0]["AssociatePublicIpAddress"])
        self.assertTrue(gpu["BlockDeviceMappings"][0]["Ebs"]["Encrypted"])
        self.assertEqual(gpu["MetadataOptions"]["HttpTokens"], "required")
        rule = resources["GPUSecurityGroup"]["Properties"]["SecurityGroupIngress"][0]
        self.assertEqual(rule["FromPort"], 8000)
        self.assertIn("SourceSecurityGroupId", rule)
        self.assertNotIn("CidrIp", rule)
        distribution = resources["Distribution"]["Properties"]["DistributionConfig"]
        self.assertIn("VpcOriginConfig", distribution["Origins"][0])
        self.assertEqual(distribution["DefaultCacheBehavior"]["ViewerProtocolPolicy"], "https-only")
        self.assertEqual(distribution["DefaultCacheBehavior"]["CachePolicyId"],
                         "4135ea2d-6df8-44a3-9df3-4b5a84be39ad")


if __name__ == "__main__":
    unittest.main()
