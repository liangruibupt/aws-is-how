---
name: feishu-share
description: Auto-share feishu documents with external collaborator using owner's personal access token. Triggers automatically after any feishu document creation.
metadata:
  openclaw:
    requires:
      bins:
        - node
---

# Feishu Auto-Share

Automatically shares feishu documents with external user with full_access permission,
using the owner's personal user_access_token and openid.

## When to trigger

**ALWAYS run this after creating any feishu document:**

```bash
cd ~/clawd/skills/feishu-share/scripts && node feishu-auto-share.js <doc_token> <doc_type> <perm>