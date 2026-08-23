# Draft DPIA — Zimmy AI, WhatsApp and invoice extraction

Status: **Owner/legal approval required before production use**
Review date: 23 August 2026

## Processing

Zimmy receives website, app or WhatsApp messages to answer enquiries, collect booking information, look up shipment status and route finance questions. Authorised staff may submit invoices to AI to extract fields for a delivery-note draft. Suppliers can include Supabase, Twilio/WhatsApp, OpenAI and Anthropic. Data can include names, phone numbers, addresses, shipment contents, customer references and invoice/payment information.

## Purpose and necessity

The purposes are faster customer support, reduced repetitive booking entry and assisted document transcription. Only the minimum conversation context or document needed for the current task should be sent. A non-AI route remains available through staff handoff. AI is not necessary or authorised for final decisions on disputes, claims, refunds, credit, special prices or legal complaints.

## Main risks and controls

| Risk | Required control | Residual assessment |
|---|---|---|
| Customer believes AI is human | Disclose Zimmy as AI at the first interaction; repeat on request | Low after control |
| Incorrect price, booking or financial action | Confirm contract by staff/system confirmation; human approval for significant changes; source-check invoice extraction | Medium |
| Sensitive or excessive data enters a prompt | Minimise fields, restrict staff access, redact unrelated document content, prohibit secrets/special-category data unless specifically assessed | Medium |
| Customer cannot reach a person | Immediate “agent/human” detection, pause AI and place conversation in staff inbox | Low/medium depending staffing |
| Provider reuse, retention or overseas access | Signed DPA, no-training setting where available, documented subprocessors and lawful transfer safeguard | **High until owner supplies contracts** |
| Prompt injection or customer manipulation | Treat customer/document text as untrusted; tool allowlist; server-side validation; human confirmation for mutations | Medium |
| Conversation retained indefinitely | Close resolved conversations; nightly 24-month closed-chat cleanup; 12-month AI analytics cleanup | Low/medium |
| Unauthorised document disclosure | Private buckets and short-lived signed links; no public invoice URLs | Low after migration deployment |
| Solely automated significant decision | Prohibited in policy and system boundaries; log approval identity | Low after staff training |
| Trial sandbox mistaken for production | Label trial channel internally, use synthetic/authorised test data, complete provider approval and production controls first | Medium |

## Consultation and rights

Customers can request a person, correct booking information, object where legitimate interests are used, request deletion subject to legal exceptions, and complain through the published privacy route. Staff using extraction tools must be trained and can report recurring errors.

## Approval gate

Production approval requires all of the following:

- legal entity and controller details confirmed;
- Twilio/Meta, Supabase, OpenAI and Anthropic agreements reviewed;
- international transfer assessment completed;
- provider model-training settings recorded;
- human handoff staffing and response target approved;
- prompt/tool security test completed;
- retention job and account deletion tested in production; and
- owner and privacy adviser sign below.

Owner: ____________________  Date: __________  Decision: Approve / Reject / Conditions
Privacy/legal reviewer: ____________________  Date: __________
