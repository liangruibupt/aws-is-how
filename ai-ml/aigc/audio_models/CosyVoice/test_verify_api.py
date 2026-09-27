"""Verifier regression tests; executed inside the EC2 image build."""
import hashlib
import io
import unittest
from unittest.mock import patch
import wave

import httpx

import verify_api


class VerifierTests(unittest.TestCase):
    def setUp(self):
        self.pcm = b"\x00\x10" * 48000
        audio = io.BytesIO()
        with wave.open(audio, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(self.pcm)
        self.wav = audio.getvalue()
        self.output_format = None
        self.bad_checksum = False
        self.unauthorized_status = 401
        self.readiness_status = 200
        self.requested_formats = []

    def handle(self, request):
        headers = {"Cache-Control": "no-store"}
        path = request.url.path
        if path == "/healthz":
            return httpx.Response(self.readiness_status, json={"status": "ready"}, headers=headers)
        if "authorization" not in request.headers:
            return httpx.Response(self.unauthorized_status, json={}, headers=headers)
        if path == "/v1/voices":
            return httpx.Response(200, json={"voices": [{"id": "upstream-demo"}]})
        if request.method == "POST":
            import json
            self.output_format = json.loads(request.content)["format"]
            self.requested_formats.append(self.output_format)
            return httpx.Response(202, json={"id": self.output_format})
        content = self.wav if self.output_format == "wav" else b"test-mp3"
        if path.endswith("/audio"):
            return httpx.Response(200, content=content)
        digest = "bad" if self.bad_checksum else hashlib.sha256(content).hexdigest()
        return httpx.Response(200, json={
            "id": self.output_format, "status": "completed", "sample_rate": 24000,
            "sha256": digest,
        })

    def run_verifier(self):
        client = httpx.Client(base_url="https://test.invalid", transport=httpx.MockTransport(self.handle))
        with patch.dict("os.environ", {"VERIFY_ENDPOINT": "https://test.invalid", "API_TOKEN": "test"}), \
                patch.object(verify_api.httpx, "Client", return_value=client), \
                patch.object(verify_api.subprocess, "run") as decode:
            decode.return_value.stdout = self.pcm
            result = verify_api.verify()
            decode.assert_called_once()
            return result

    def test_both_formats_are_verified(self):
        result = self.run_verifier()
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(self.requested_formats, ["wav", "mp3"])
        for audio in result["audio"].values():
            self.assertEqual(audio["audioSeconds"], 2)
            self.assertGreater(audio["rms"], .001)

    def test_bad_audio_checksum_fails(self):
        self.bad_checksum = True
        with self.assertRaises(AssertionError):
            self.run_verifier()

    def test_missing_authentication_rejection_fails(self):
        self.unauthorized_status = 200
        with self.assertRaises(AssertionError):
            self.run_verifier()

    def test_unexpected_readiness_status_fails(self):
        self.readiness_status = 403
        with self.assertRaisesRegex(RuntimeError, "403"):
            self.run_verifier()


if __name__ == "__main__":
    unittest.main()
