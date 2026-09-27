"""Fast API-contract tests with no model download or local GPU inference."""
import importlib.util
import json
import os
from pathlib import Path
import queue
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from inference_config import REQUIRED, filter_config, load_hyperpyyaml
from infra import service_template


class InferenceConfigTests(unittest.TestCase):
    def setUp(self):
        self.config = "\n".join(f"{key}: null" for key in sorted(REQUIRED)) + "\n"

    def test_training_constructors_are_removed_before_instantiation(self):
        config = self.config + "train_conf: !apply:builtins.eval ['1 / 0']\n"
        loaded = load_hyperpyyaml(config)
        self.assertEqual(set(loaded), REQUIRED)

    def test_inference_tags_survive_filtering_without_execution(self):
        config = self.config.replace("llm: null", "llm: !apply:builtins.eval ['1 / 0']")
        self.assertIn("!apply:builtins.eval", filter_config(config))

    def test_missing_and_duplicate_keys_are_rejected(self):
        for config in [self.config.replace("llm: null\n", ""), self.config + "llm: null\n"]:
            with self.subTest(config=config), self.assertRaises(ValueError):
                filter_config(config)

    def test_non_mapping_is_rejected(self):
        for config in ["", "[]", "null", "- value"]:
            with self.subTest(config=config), self.assertRaises(ValueError):
                filter_config(config)


class CachedAttentionTests(unittest.TestCase):
    def setUp(self):
        import torch
        from cosyvoice.llm.llm import Qwen2Encoder
        self.torch = torch
        self.encoder = Qwen2Encoder.__new__(Qwen2Encoder)
        torch.nn.Module.__init__(self.encoder)
        self.encoder.model = Mock()

    def check_mask(self, cached, current, mask):
        xs = self.torch.zeros((1, current, 4))
        cache = Mock(get_seq_length=Mock(return_value=cached)) if cached else None
        self.encoder.model.return_value = SimpleNamespace(hidden_states=[xs], past_key_values=cache)
        self.encoder.forward_one_step(xs, mask, cache)
        return self.encoder.model.call_args.kwargs["attention_mask"]

    def test_prefill_mask_is_preserved(self):
        mask = self.torch.tril(self.torch.ones((1, 3, 3), dtype=self.torch.bool))
        result = self.check_mask(0, 3, mask)
        self.assertTrue(self.torch.equal(result, mask[:, -1, :]))

    def test_cached_prefix_is_included(self):
        mask = self.torch.ones((1, 1, 1), dtype=self.torch.bool)
        result = self.check_mask(7, 1, mask)
        self.assertEqual(tuple(result.shape), (1, 8))
        self.assertTrue(result.all())

    def test_existing_full_cache_mask_is_preserved(self):
        mask = self.torch.ones((1, 1, 8), dtype=self.torch.bool)
        mask[:, :, 2] = False
        result = self.check_mask(7, 1, mask)
        self.assertTrue(self.torch.equal(result, mask[:, -1, :]))


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

    def test_non_ascii_authentication_is_rejected(self):
        response = self.client.get("/v1/voices", headers=[(b"authorization", b"Bearer \xff")])
        self.assertEqual(response.status_code, 401)

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
        self.assertEqual(gpu["BlockDeviceMappings"][0]["Ebs"]["VolumeSize"], 150)
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
