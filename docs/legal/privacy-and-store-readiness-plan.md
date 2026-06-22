# FieldSolo Privacy & Store-Readiness Plan

**Status:** Documentation only — no app or backend changes are included in this file.  
**Prepared:** June 21, 2026

## Goal

Publish the privacy policy at `https://fieldsolo.com/privacy` when the marketing site is available, then implement the controls and store disclosures below before submitting FieldSolo to the Apple App Store or Google Play.

FieldSolo is operated by **Veltri Ventures LLC**. The service is for adults aged 18 and older. FieldSolo will honor privacy requests for all users nationwide, regardless of state of residence. Privacy contact: [privacy@fieldsolo.com](mailto:privacy@fieldsolo.com).

## Current data-practice inventory

The current mobile app stores and processes:

- Account and profile data: email, first and last name, trade selection, account ID, and authentication/session information.
- User-provided job records: job/customer names, service address, job type, notes, materials, work-session dates and times, payment status, revenue, costs, collected amounts, and earnings calculations.
- Analytics and diagnostics when PostHog is enabled: interaction events, app/session identifiers, app version, platform, and operational error information. The current analytics code must be reviewed before production because its optional rich-debug mode can include email or error content.
- The current app does **not** request camera, microphone, photo-library, location, calendar, notification, payment, or contact permissions.

The policy also anticipates optional future user-selected features: photos, video, audio/voice recordings, transcriptions, documents, invoices, receipts, screenshots, exports, integrations, team sharing, subscriptions, AI-assisted capture, and aggregated/de-identified benchmarking. Do not ship one of these features until its collection, sharing, permissions, retention, deletion, and store disclosures have been reviewed.

## Required implementation before release

### Consent and in-app access

- Add a required, unchecked signup checkbox: “I agree to the Privacy Policy,” linked to `https://fieldsolo.com/privacy`.
- Store a durable, versioned acceptance record with user ID, policy version, server timestamp, and source; require reacceptance after a material policy update.
- Block authenticated app use until an existing user accepts the current required policy version.
- Add accessible Privacy Policy and Privacy Choices links to sign-in/sign-up and Profile.
- Add a public account-deletion route at `https://fieldsolo.com/delete-account` before release. Until the website exists, support verifiable deletion requests through `privacy@fieldsolo.com`.

### Analytics and data minimization

- Do not create, persist, or transmit a PostHog anonymous ID, screen view, account identifier, or diagnostic event before the user has granted analytics consent.
- On withdrawal, stop future collection, clear the local analytics ID, and reset the analytics identity.
- Keep production analytics minimized: event name, platform, app version, coarse error category, and other non-content properties only. Remove raw email, free-text error details, customer data, job descriptions, note text, and material descriptions.
- Document PostHog’s current processing/deletion configuration before enabling it in a production build.

### Account and content deletion

- Keep the existing in-app account-deletion control.
- Before uploading files is enabled, extend deletion to remove all user-owned Storage objects as well as their metadata, revoke sessions, and send any applicable deletion/anonymization request to analytics providers.
- Delete active account/content systems within 30 days and expire encrypted backup copies within 90 days, subject only to limited retention for law, security, fraud prevention, dispute resolution, or enforcement.
- Test database cascade deletion, Storage cleanup, analytics cleanup, and the public deletion-request workflow.

### Roadmap launch gates

| Feature | Required privacy work before release |
| --- | --- |
| Photos, video, documents, screenshots | Just-in-time permission rationale, Storage object RLS/delete coverage, policy and store-disclosure update |
| Audio and transcription | Explicit recording consent, visible recording state, transcription retention/deletion design, policy and store-disclosure update |
| AI assistance | Per-action opt-in, provider/input disclosure at the action, contract prohibiting raw-content training of general-purpose models, policy and store-disclosure update |
| Teams, exports, integrations | Role/access model, sharing and revocation controls, integration-specific authorization and notice, policy and store-disclosure update |
| Payments/subscriptions | Selected processor review, payment-data-flow review, policy and store-disclosure update |

## Store-submission checklist

### Apple App Store

- Enter the public privacy-policy URL in App Store Connect and make the same policy easily available in the app.
- Complete the App Privacy label from the shipping build and every enabled third-party SDK. Expected categories to review: Name, Email Address, User ID, user-provided content, other financial information, Product Interaction, Diagnostics, and any SDK-collected device ID.
- Mark data as not used for tracking only if it is not linked with third-party data for advertising/measurement and is not shared with a data broker.
- Use only purposes that are true for the release: App Functionality, Account Management, Analytics, Security/Fraud/Compliance, and Developer Communications as applicable.

### Google Play

- Enter the public privacy-policy URL in Play Console and show the policy in the app.
- Complete the Data Safety form for every app version and region distributed through Play, including optional PostHog when enabled.
- Enter `https://fieldsolo.com/delete-account` as the public account-deletion request URL; retain the in-app deletion path.
- Confirm HTTPS/TLS data-in-transit handling, each data category, its purpose, sharing, optionality, and deletion mechanism.

## Nationwide privacy operations

- Publish a privacy-choices page when the website is live for access, correction, deletion, portability, analytics withdrawal, authorized-agent requests, and appeals.
- Verify the requestor before disclosing, exporting, correcting, or deleting account data.
- Do not sell personal information or share it for cross-context behavioral advertising. If either practice changes, add a dedicated opt-out mechanism before it begins.
- Obtain legal review before launch and again before reaching state-law thresholds, processing sensitive data, adding targeted advertising, or changing data-sharing practices. A strong nationwide policy does not itself determine which state privacy statutes apply.

## Verification plan

- Add UI tests for checkbox-required signup, policy links, policy version upgrades, consent withdrawal, Profile links, and account-deletion states.
- Add backend tests for consent-record RLS, authenticated public deletion requests, account/data cascades, Storage cleanup, analytics deletion, and retention jobs.
- Before each release, compare the shipped binary, app permissions, enabled environment variables, vendors, policy, Apple App Privacy answers, and Google Data Safety answers. Re-run this review whenever a new SDK, permission, media feature, AI provider, integration, payment provider, or team-sharing feature is introduced.

