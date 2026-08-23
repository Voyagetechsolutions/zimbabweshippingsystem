import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => (
  <>
    <Helmet>
      <title>Privacy Notice | Zimbabwe Shipping Services</title>
      <meta name="description" content="How Zimbabwe Shipping Services uses and protects customer, recipient, website, app, staff and WhatsApp information." />
    </Helmet>
    <Navbar />
    <main className="container mx-auto px-4 py-10 min-h-screen">
      <article className="prose max-w-4xl mx-auto">
        <h1>Privacy Notice</h1>
        <p><strong>Last updated: 23 August 2026</strong></p>
        <p>
          This notice explains how the business trading as <strong>Zimbabwe Shipping Services</strong>
          ("we", "us") uses personal information through our websites, customer app, staff app,
          bookings, deliveries, payments, support channels and WhatsApp services. We act as the data
          controller for this information. Our operating address is Pastures Lodge Farm, Chelveston
          Road, Wellingborough NN9 6AA, United Kingdom. Contact us at{' '}
          <a href="mailto:info@zimbabweshipping.com">info@zimbabweshipping.com</a>.
        </p>

        <h2>Information we use</h2>
        <ul>
          <li>Names, email addresses, telephone numbers, account and authentication information.</li>
          <li>Collection and delivery addresses, recipient details, shipment contents, dimensions, photographs, signatures and tracking events.</li>
          <li>Quotes, invoices, payment status and payment evidence. Card details are handled by our payment provider and are not stored by us.</li>
          <li>Support requests, reviews, WhatsApp messages and conversations with Zimmy, our AI assistant.</li>
          <li>Technical and security information such as IP address, device/browser data and audit records.</li>
          <li>For authorised staff and drivers: work account, assigned routes, collection/delivery evidence and location used while carrying out an active job. We do not request background location.</li>
        </ul>
        <p>
          A person booking a shipment may give us a recipient's information. The booking customer must
          tell the recipient that their information will be used for delivery and direct them to this notice.
        </p>

        <h2>Why we use it and our lawful bases</h2>
        <ul>
          <li><strong>Contract:</strong> to quote, book, collect, transport, deliver, track, invoice and provide customer support.</li>
          <li><strong>Legal obligation:</strong> for customs, tax, accounting, sanctions, safety, employment and regulatory records.</li>
          <li><strong>Legitimate interests:</strong> to prevent fraud, secure our systems, improve operations, handle complaints and maintain business records, where those interests do not override individual rights.</li>
          <li><strong>Consent:</strong> for optional electronic marketing and permissions where consent is required. Consent can be withdrawn at any time without affecting earlier lawful processing.</li>
        </ul>

        <h2>AI and WhatsApp</h2>
        <p>
          Zimmy is an AI assistant. It can answer enquiries, collect booking details, provide shipment
          information and route finance questions. Messages may be processed by AI providers to generate
          a response. Invoice-reading tools may extract information from documents uploaded by authorised
          staff. AI output can be wrong: a staff member reviews financial changes, refunds, disputes and
          other significant decisions. Ask for a person at any time by writing “agent” or “human”. We do
          not rely solely on AI to make a decision that produces legal or similarly significant effects.
        </p>

        <h2>Who receives information</h2>
        <p>We do not sell personal information. We disclose only what is necessary to:</p>
        <ul>
          <li>delivery, freight, customs and logistics partners involved in a shipment;</li>
          <li>Supabase for hosting, authentication, databases and private file storage;</li>
          <li>Twilio and WhatsApp/Meta for customer messaging;</li>
          <li>OpenAI and, for authorised document extraction, Anthropic for AI processing;</li>
          <li>Stripe or PayPal for payments, and Apple or Google for sign-in where selected;</li>
          <li>postcode/address providers used to complete an address; and</li>
          <li>professional advisers, insurers, regulators, courts or law-enforcement bodies where lawfully required.</li>
        </ul>

        <h2>International transfers</h2>
        <p>
          Shipping necessarily involves information moving between the United Kingdom, Ireland and
          Zimbabwe. Some technology providers may process information in other countries. Where required,
          we use an adequacy decision, approved contractual clauses, the UK International Data Transfer
          Addendum/Agreement, or another lawful safeguard. Contact us for information about the safeguard
          relevant to your data.
        </p>

        <h2>Retention</h2>
        <ul>
          <li>account and saved-address data: while the account is active, then deleted or anonymised following a valid request;</li>
          <li>shipment, invoice, payment and customs records: normally up to seven years after the relevant financial year, where required for tax, claims or legal records;</li>
          <li>support and WhatsApp conversations: normally 24 months after the matter closes;</li>
          <li>AI chat analytics not forming part of a booking or dispute: normally 12 months;</li>
          <li>unsuccessful quote requests: normally 24 months;</li>
          <li>driver proof photographs: normally removed within 48 hours after verified delivery unless needed for an active claim; and</li>
          <li>security and audit records: normally up to 24 months, or longer where required to investigate an incident.</li>
        </ul>
        <p>We may retain records longer during a legal claim, customs enquiry, payment dispute or preservation obligation. Required records are restricted or anonymised where possible.</p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may ask for access, correction, deletion, restriction,
          objection, portability, or information about automated processing. You may withdraw consent
          and complain to a regulator. We may need to verify your identity and some rights have legal
          exceptions. Account holders may start deletion from the app or our{' '}
          <Link to="/delete-account">account-deletion page</Link>.
        </p>
        <p>
          Send a request or privacy complaint to{' '}
          <a href="mailto:info@zimbabweshipping.com?subject=Data%20protection%20request">info@zimbabweshipping.com</a>
          {' '}or use our <Link to="/privacy-complaint">privacy complaint procedure</Link>. We acknowledge
          complaints within 30 days and provide the result of our investigation without undue delay.
          You can also complain to the UK Information Commissioner's Office, Ireland's Data Protection
          Commission, or Zimbabwe's data protection authority, as applicable.
        </p>

        <h2>Cookies and device storage</h2>
        <p>
          The website and apps use necessary browser or device storage for sign-in sessions, security,
          booking drafts, theme, notification preferences, offline work and chat continuity. Vercel may
          receive limited performance information used to keep the website reliable. We do not currently
          use advertising cookies. If non-essential analytics or marketing storage is introduced, we will
          explain it and request consent where required before it is used.
        </p>

        <h2>Security, children and changes</h2>
        <p>
          We use access controls, role separation, encryption in transit, private document storage,
          logging and staff controls. No system is completely secure; report suspected misuse promptly.
          Our services are not directed to children. A parent or guardian must make a booking involving
          a child's information. We will post material notice changes here and will not use information
          for a materially incompatible purpose without an appropriate lawful basis and notice.
        </p>
      </article>
    </main>
    <Footer />
  </>
);

export default PrivacyPolicy;
