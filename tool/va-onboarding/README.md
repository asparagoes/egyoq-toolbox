# Employer / Virtual Assistant Onboarding — Cloudflare email edition

This is the **Cloudflare Worker + Resend edition**, not the previous email delivery method.
It is designed for deployment at:
`https://asparagoes.github.io/egyoq-toolbox/tool/va-onboarding/`

## Deployment — important

1. **Extract the ZIP first.** Do not upload the ZIP as a file to GitHub.
2. Inside your `egyoq-toolbox` GitHub repository, go to **`tool/va-onboarding/`**.
3. Replace **all the files** in that folder with the matching files inside the ZIP's
   `tool/va-onboarding/` folder — especially **`index.html`, `script.js`, `config.js`,
   and `pdf-generator.js`**. Do not create an extra `tool` folder within `va-onboarding`.
4. Commit the changes and wait for GitHub Pages to publish.
5. Open the published URL and hard-refresh (`Ctrl + Shift + R`). On the final review
   screen, confirm the label **"Email delivery: Cloudflare Worker"** appears.

To check the two critical deployed files, visit:
- `https://asparagoes.github.io/egyoq-toolbox/tool/va-onboarding/config.js`
- `https://asparagoes.github.io/egyoq-toolbox/tool/va-onboarding/script.js`

The config must contain `https://va-onboarding-email.aselabucay.workers.dev`.
The script must send to `config.workerEndpoint` using `fetch`.

## How submitting works

- The form renders the existing seven sections and saves answers in browser
  `sessionStorage` during the session.
- The Employer can preview the A4 PDF without sending anything.
- **Submit responses** generates the PDF locally, Base64-encodes it, then uses
  `fetch()` to POST `{ "pdfBase64": "..." }` to your Cloudflare Worker.
- The Worker calls Resend to send an email with the PDF attached to
  `aselabucay@gmail.com`.
- The form stays on the page and only reports acceptance if the Worker responds
  with HTTP success and `{ "success": true }`. Actual email delivery should be
  checked in Gmail.
- If a request fails, the form retains the answers and shows an error.

## Cloudflare configuration

The public Worker URL is already in `config.js`:
`https://va-onboarding-email.aselabucay.workers.dev`

You must set **`RESEND_API_KEY`** as a secret in the Cloudflare Worker dashboard.
The Worker must be deployed with the matching email implementation. In Resend's
restricted test mode, the account needs to be registered with the intended
recipient email; test-sender usage may be subject to restrictions.

**Security:** The example Worker code used in the setup is for testing only.
CORS/Origin checks are *not* authentication. Before giving this URL to the
Employer, add server-side Turnstile verification, rate limiting and replay
protection to the Worker and corresponding client changes. Otherwise people may
be able to abuse its email-sending ability. Do not put API keys in GitHub.

## Files

- `index.html`: page shell, versioned JS/CSS references to avoid stale browser caches.
- `style.css`: existing visual presentation.
- `questions.js`: existing seven-section proposal content.
- `config.js`: public Worker URL and local session key (no secrets).
- `script.js`: navigation, choices, PDF preview, Worker submission.
- `pdf-generator.js`: self-contained offline-capable PDF generator.
- `START_LOCAL_PREVIEW.bat`: local Python HTTP server for testing the layout.
- `README-CLOUDFLARE.md`: short integration checklist.

## Troubleshooting

- **You still see the old email provider:** Verify that you replaced the correct
  `tool/va-onboarding/` files on the branch deployed by GitHub Pages. Open the
  deployed `script.js` URL above, search for `workerEndpoint`, and refresh.
- **Forbidden (403):** The Worker permits requests only from the specified GitHub
  Pages origin. `localhost` testing requires a temporary Worker-side exception.
- **403, CORS error, or 502:** Check Worker logs, the allowed origin, the
  `RESEND_API_KEY` secret, and Resend test-email restrictions.
- **No email attachment:** Verify the actual Gmail message, and check the
  Cloudflare Worker logs and Resend delivery activity.
- **Offline preview:** Opening `index.html` directly (`file://`) supports PDF
  preview but not sending, which requires an HTTP or HTTPS web page.

## Privacy

The form is reachable through a public URL; its `noindex` directive is not
an access-control measure. Avoid entering passwords, tokens, personal banking
numbers, or private login credentials. Share sensitive details via a secure
separately authorized channel.
