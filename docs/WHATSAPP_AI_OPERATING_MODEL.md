# WhatsApp AI operating model

## Purpose

The WhatsApp AI is the default first responder for Zimbabwe Shipping's booking,
enquiry and finance numbers. It is not a menu bot and it is not limited to
single-turn answers. It keeps the conversation, looks up live business data and
uses explicit system tools to complete work.

The customer gets a human when they ask for an agent. The AI may also escalate
an exceptional or high-risk case, but ordinary bookings and enquiries should
not wait for staff.

## One agent, several numbers

Every configured WhatsApp number sends its inbound webhook to the same
orchestrator. The destination number supplies the initial department context:

- **Booking** — quote, route and collection-date questions; collect the booking;
  validate the parties, addresses, goods and payment method; create the booking;
  return the customer reference and tracking number.
- **Enquiries** — answer service questions, find a shipment, explain status and
  collection/delivery expectations, capture a request and send documents.
- **Finance** — explain balances, send invoices and delivery notes, receive
  payment proofs, record promises to pay and create follow-up work.

Department context is a starting point, not a cage. A customer can begin on the
enquiry number and complete a booking without being sent elsewhere.

## Conversation and memory

Store every inbound and outbound message in a conversation ledger. The AI gets:

1. a rolling conversation summary;
2. the most recent messages verbatim;
3. matched customer, shipment, invoice and follow-up records;
4. the result of each tool action it has taken.

Long-term facts are stored as structured customer or booking data, never hidden
only in an AI summary. Every inbound provider message ID is idempotent so a
retried webhook cannot create a second booking or payment task.

## Tools the AI may use

- search schedules, routes, catalogue and prices;
- find customers and shipments by phone, customer reference or tracking number;
- calculate and validate a booking;
- create a booking after the customer confirms the final summary;
- resend an invoice, delivery note, QR code or tracking link;
- record an enquiry or staff handoff;
- receive and attach a payment proof;
- create a promise-to-pay or follow-up task;
- prepare a payment match, invoice correction or document correction for review.

The AI must report tool results, not invent successful actions. A reply saying a
booking was created is sent only after the booking tool returns its stored ID.

## Approval boundaries

The AI can complete routine, reversible customer-service work. It prepares a
proposal for actions that change the books or remove history.

Always require staff approval for:

- marking an invoice paid or reconciling money;
- refunds, credits and write-offs;
- changing a price after an invoice was issued;
- deleting/voiding a financial or delivery document;
- resolving conflicting payment evidence;
- exceptional compensation or legal complaints.

## Handoff

"Agent", "human", "person" and equivalent requests immediately set the
conversation to `human_requested`. The AI acknowledges the handoff, stops
ordinary automated replies and puts the conversation in the correct staff
queue with its summary, customer match and unfinished action.

Staff can return a conversation to the AI after replying. A visible owner and
mode (`ai`, `human_requested`, `human_active`) prevent the AI and a person from
replying at the same time.

## Provider boundary

The orchestrator should use a small provider adapter. Twilio webhooks and Meta
Cloud API webhooks are converted into the same internal message shape; outbound
messages use the matching adapter. This keeps the AI, conversation memory and
business tools independent of the phone-number provider.

Provider signatures must be validated before a message is accepted. Media is
downloaded server-side into private storage and scanned/validated before AI or
staff use it. Approved WhatsApp templates are used whenever the provider does
not permit a free-form outbound message.

## Delivery sequence

1. Canonical customer reference and dashboard switching.
2. Conversation/message ledger and human handoff queue.
3. Signed inbound webhook for one test number.
4. Enquiry and lookup tools.
5. End-to-end booking tool with final customer confirmation.
6. Finance document and follow-up tools.
7. Payment-proof extraction and staff approval proposals.
8. Additional WhatsApp numbers routed through the same orchestrator.

