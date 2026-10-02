"""Offline tests. No AWS credentials or billable calls required."""

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import gpt6_astra_ultrafast_benchmark as bench


class BenchmarkTests(unittest.TestCase):
    def stream_call(self, events):
        stream = Mock()
        stream.response = SimpleNamespace(status_code=200, headers={})
        stream.__iter__ = Mock(return_value=iter(events))
        client = Mock()
        client.responses.create.return_value = stream
        with patch.object(bench.time, "perf_counter", side_effect=range(100)):
            row = bench.invoke(client, "runtime-us", "responses-stream",
                               "ultrafast", "prompt", "high", 8192, "SECRET")
        stream.close.assert_called_once()
        return row

    def terminal(self, status="completed", tier="ultrafast", text="hello"):
        return {"type": "response." + status, "response": {
            "status": status, "service_tier": tier,
            "output": [{"content": [{"type": "output_text", "text": text}]}],
            "usage": {"output_tokens": 2000, "output_tokens_details": {"reasoning_tokens": 0}},
        }}

    def test_metadata_is_not_ttft(self):
        row = self.stream_call([
            {"type": "response.created", "response": {"service_tier": "ultrafast"}},
            {"type": "response.output_text.delta", "delta": "hello"},
            self.terminal(),
        ])
        self.assertEqual(row["first_event_s"], 1)
        self.assertEqual(row["ttft_s"], 2)
        self.assertTrue(row["ok"])
        self.assertEqual(row["tier_state"], "confirmed")

    def test_stream_without_terminal_fails(self):
        row = self.stream_call([{"type": "response.output_text.delta", "delta": "hello"}])
        self.assertFalse(row["ok"])
        self.assertIn("terminal", row["error"]["message"])

    def test_stream_incomplete_is_not_success(self):
        row = self.stream_call([
            {"type": "response.output_text.delta", "delta": "hello"},
            self.terminal(status="incomplete"),
        ])
        self.assertFalse(row["ok"])
        self.assertEqual(row["status"], "incomplete")

    def test_stream_terminal_tier_overrides_metadata(self):
        row = self.stream_call([
            {"type": "response.created", "response": {"service_tier": "ultrafast"}},
            {"type": "response.output_text.delta", "delta": "hello"},
            self.terminal(tier="default"),
        ])
        self.assertEqual(row["tier_state"], "mismatch")
        self.assertEqual(row["observed_tiers"], ["default", "ultrafast"])

    def test_missing_final_tier_remains_unconfirmed(self):
        row = self.stream_call([
            {"type": "response.created", "response": {"service_tier": "ultrafast"}},
            {"type": "response.output_text.delta", "delta": "hello"},
            self.terminal(tier=None),
        ])
        self.assertEqual(row["tier_state"], "unconfirmed")

    def test_cumulative_stream_bug_excluded(self):
        row = self.stream_call([
            {"type": "response.output_text.delta", "delta": "he"},
            {"type": "response.output_text.delta", "delta": "hello"},
            self.terminal(),
        ])
        self.assertFalse(row["ok"])
        self.assertEqual(row["status"], "stream_text_mismatch")

    def test_converse_same_bearer_and_client_closed(self):
        client = Mock()
        client.converse.return_value = {
            "stopReason": "end_turn", "serviceTier": {"type": "default"},
            "ResponseMetadata": {"HTTPStatusCode": 200, "RequestId": "test"},
            "output": {"message": {"content": [{"text": "391"}]}},
        }
        session = Mock()
        session.client.return_value = client
        with patch("boto3.Session", return_value=session):
            row = bench.converse_probe("runtime-us", "default", "SECRET")
        self.assertTrue(row["ok"])
        self.assertEqual(row["tier_state"], "confirmed")
        client.close.assert_called_once()
        event, handler = client.meta.events.register.call_args.args
        self.assertEqual(event, "before-send.bedrock-runtime.Converse")
        request = SimpleNamespace(headers={})
        handler(request)
        self.assertEqual(request.headers["Authorization"], "Bearer SECRET")
        self.assertNotIn("SECRET", str(row))

    def test_routes(self):
        self.assertEqual(bench.base_url("runtime-us"), "https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1")
        self.assertEqual(bench.base_url("mantle-east"), "https://bedrock-mantle.us-east-1.api.aws/openai/v1")

    def test_missing_tier_is_not_confirmation(self):
        self.assertEqual(bench.tier_state("ultrafast", None), "unconfirmed")
        self.assertEqual(bench.tier_state("ultrafast", "default"), "mismatch")
        self.assertEqual(bench.tier_state("ultrafast", "ultrafast"), "confirmed")

    def test_reasoning_excluded_from_visible_decode(self):
        result = bench.metrics({"output_tokens": 5000, "output_tokens_details": {"reasoning_tokens": 3000}}, 100, 60, 80)
        self.assertEqual(result["visible_tokens"], 2000)
        self.assertEqual(result["effective_output_tps"], 50)
        self.assertEqual(result["visible_decode_tps_approx"], 100)

    def test_missing_reasoning_usage_not_assumed_zero(self):
        result = bench.metrics({"output_tokens": 5000}, 100, 60, 80)
        self.assertIsNone(result["visible_tokens"])
        self.assertIsNone(result["visible_decode_tps_approx"])

    def test_single_chunk_has_no_decode_estimate(self):
        result = bench.metrics({"output_tokens": 5, "output_tokens_details": {"reasoning_tokens": 0}}, 1, .5, .5)
        self.assertIsNone(result["visible_decode_tps_approx"])

    def test_chat_usage(self):
        result = bench.metrics({"completion_tokens": 80, "completion_tokens_details": {"reasoning_tokens": 30}}, 2)
        self.assertEqual(result["visible_tokens"], 50)

    def test_portfolio_constraints(self):
        self.assertIsNone(bench.feasible_portfolio(["Z"]))
        self.assertIsNone(bench.feasible_portfolio(["A"]))
        self.assertIsNone(bench.feasible_portfolio(["A", "B", "C", "F", "N"]))

    def test_oracle_and_footer(self):
        import json
        optimum = bench.portfolio_oracle()[0]
        self.assertEqual(optimum, {
            "selected": ["A", "C", "E", "I", "J", "K", "L"],
            "score": 152, "cost": 56, "engineers": 18, "risk": 17,
        })
        self.assertEqual(bench.feasible_portfolio(optimum["selected"]), optimum)
        self.assertTrue(bench.validate_portfolio("Answer\nRESULT_JSON: " + json.dumps(optimum))["passed"])
        self.assertFalse(bench.validate_portfolio("not JSON")["passed"])
        wrong = dict(optimum, score=optimum["score"] + 1)
        self.assertFalse(bench.validate_portfolio("RESULT_JSON: " + json.dumps(wrong))["passed"])

    def sample(self, tier, **kwargs):
        return dict(phase="benchmark", route="runtime-us", workload="portfolio", round=1,
                    requested_tier=tier, tier_state="confirmed", ok=True,
                    visible_tokens=2000, elapsed_s=100 if tier == "default" else 25,
                    ttft_s=60 if tier == "default" else 10, **kwargs)

    def test_matched_pairs_only(self):
        default, fast = self.sample("default"), self.sample("ultrafast")
        summary = bench.summarize([default, fast])
        self.assertEqual(summary["matched_pairs"], 1)
        self.assertAlmostEqual(summary["geomean_elapsed_speedup"], 4)
        self.assertEqual(summary["pairs"][0]["latency_reduction_pct"], 75)
        fast["tier_state"] = "unconfirmed"
        self.assertEqual(bench.summarize([default, fast])["matched_pairs"], 0)

    def test_quality_short_and_incomplete_excluded(self):
        for field, value in [("ok", False), ("visible_tokens", 5), ("quality", {"passed": False})]:
            row = self.sample("ultrafast")
            row[field] = value
            self.assertFalse(bench.eligible(row))

    def test_rounds_not_cross_paired(self):
        first, second = self.sample("default"), self.sample("ultrafast")
        second["round"] = 2
        self.assertEqual(bench.summarize([first, second])["matched_pairs"], 0)

    def test_secret_redacted(self):
        result = bench.error_record(RuntimeError("bad SECRET token"), "SECRET")
        self.assertNotIn("SECRET", result["message"])


if __name__ == "__main__":
    unittest.main()
