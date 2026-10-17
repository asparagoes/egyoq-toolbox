# REPLACE EXISTING GITHUB FILES — NO EXTRA FOLDERS

Do not upload this ZIP itself. Extract it first.

1. Visit https://github.com/asparagoes/egyoq-toolbox/tree/main/tool/va-onboarding
2. Select Add file → Upload files.
3. Drag the EXTRACTED FILES themselves into GitHub, not their enclosing folder. GitHub must show each file replacing an existing file under `tool/va-onboarding/`.
4. Commit changes. If GitHub refuses to replace, edit individual files or use GitHub Desktop to overwrite matching files and commit.
5. Open https://asparagoes.github.io/egyoq-toolbox/tool/va-onboarding/?v=20261018b, then Ctrl+Shift+R.
6. Top of page MUST read: `Cloudflare email v20261018b`. If not, the published site is still old or your changes went to the wrong folder/branch.
7. Check the final review screen for: `Email delivery: Cloudflare Worker`.

Technical verification:
- https://asparagoes.github.io/egyoq-toolbox/tool/va-onboarding/config.js must include workerEndpoint and URL https://va-onboarding-email.aselabucay.workers.dev
- https://asparagoes.github.io/egyoq-toolbox/tool/va-onboarding/script.js must include fetch(endpoint and submitResponses, and MUST NOT include formsubmit.co.
- Worker email delivery has not been verified live. Test with dummy answers and inspect Gmail.
- Important: Do NOT give this publicly accessible form to Jad until the Worker has server-side Turnstile and rate-limiting; previous minimal Worker implementation is for testing only.
