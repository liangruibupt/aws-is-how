# China Region ACM get start

## Requesting a Public Certificate
```bash
aws acm request-certificate --domain-name www.example.com \
--validation-method DNS \
--idempotency-token 1234 \
--options CertificateTransparencyLoggingPreference=DISABLED
```