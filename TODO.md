# TODO (deferred before exposing dashpod to the public internet)

- [ ] **Second factor / SSO** — login is one shared password + shared-storage throttle. Put dashpod behind a VPN, Cloudflare Access, Vercel Deployment Protection or an SSO proxy, or add TOTP.
- [ ] **Encrypt `nodes.yaml` at rest** — agent API keys are stored in plaintext. Accepted for now provided the S3 bucket is private (no public URL/ACL, tight IAM); revisit with KMS/app-key encryption.
- [ ] **Pin agent certificates** — https agents with self-signed certs are accepted without verification (encrypted, but identity isn't checked). Add per-node CA/fingerprint pinning.
- [ ] **UI check in a browser** — pages haven't been exercised under the CSP, and session-expiry-mid-page behaviour is unverified.
- [ ] S3 listing doesn't follow pagination (>1000 container configs per node).
