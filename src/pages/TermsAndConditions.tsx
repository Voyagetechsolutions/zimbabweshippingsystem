import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const TermsAndConditions = () => (
  <>
    <Helmet>
      <title>Terms and Conditions | Zimbabwe Shipping Services</title>
      <meta name="description" content="Terms for bookings and shipping services supplied by Zimbabwe Shipping Services." />
    </Helmet>
    <Navbar />
    <main className="container mx-auto px-4 py-10 min-h-screen">
      <article className="prose max-w-4xl mx-auto">
        <h1>Terms and Conditions</h1>
        <p><strong>Last updated: 23 August 2026</strong></p>
        <p>
          These terms apply to collection and shipping services supplied by the business identified as
          the supplier on your booking confirmation or invoice, trading as Zimbabwe Shipping Services
          from Pastures Lodge Farm, Chelveston Road, Wellingborough NN9 6AA, United Kingdom. Email{' '}
          <a href="mailto:info@zimbabweshipping.com">info@zimbabweshipping.com</a> or call +44 7584 100552.
          Your confirmation identifies the service, route, price and any additional terms agreed with you.
          Please save a copy of it and these terms.
        </p>
        <h2>1. Booking and contract</h2>
        <p>
          Information entered online or given to Zimmy is a request, not acceptance. A contract starts
          when we send a booking confirmation. Check it promptly and tell us about errors before
          collection. The person booking confirms they are at least 18, are authorised to send the goods,
          and may give us the recipient's information. AI-generated answers do not change the confirmed
          price or these terms unless a member of staff confirms the change in writing.
        </p>
        <h2>2. Services, prices and payment</h2>
        <p>
          We provide the collection, transport, customs-assistance and delivery services described in the
          confirmation. Before the contract is made, we will show the total price we can calculate,
          payment timing, collection arrangements and known additional charges. Customs duties, taxes,
          storage, inspection and exceptional destination charges are payable by the person stated in the
          confirmation. We will not add an optional charge without agreement.
        </p>
        <h2>3. Customer responsibilities</h2>
        <p>
          You must give complete sender, recipient, contents, value and contact information; package goods
          safely unless packaging is part of the confirmed service; be available at collection; and comply
          with export, import, customs and sanctions rules. Do not send illegal, dangerous, flammable,
          explosive, inadequately packaged, prohibited or undeclared goods. We may inspect or refuse goods
          where reasonably necessary for safety or legal compliance.
        </p>
        <h2>4. Collection, delivery and delays</h2>
        <p>
          Transit dates are estimates unless the confirmation expressly guarantees a date. Customs,
          inspections, weather, port disruption and events outside reasonable control can cause delay.
          We will provide material updates and take reasonable steps to reduce disruption. If collection
          or delivery fails because access or customer information is inadequate, a reasonable, disclosed
          rebooking or storage charge may apply.
        </p>
        <h2>5. Cancellation and changes</h2>
        <p>
          Ask to cancel or modify by email, telephone or WhatsApp and include the booking reference. We
          currently accept requests up to 24 hours before scheduled collection. If performance has started,
          collection is less than 24 hours away, or we incurred an unavoidable third-party cost, we will
          explain the work and amount that cannot be refunded. Statutory cancellation and refund rights
          remain unaffected. We obtain any consent required by law before beginning during a cancellation period.
        </p>
        <h2>6. Loss, damage, insurance and claims</h2>
        <p>
          Report visible loss or damage promptly and preserve packaging, photographs, value evidence and
          delivery records. Zimbabwe Shipping Services does not currently advertise or promise shipment
          insurance. Customers should arrange adequate independent cover for the full declared value and
          route. Cover applies only if a written booking confirmation expressly states its verified limit,
          excess and exclusions before contract. Nothing excludes liability that cannot lawfully be excluded,
          including death or personal injury caused by negligence, fraud, or mandatory consumer rights.
          Any other limitation applies only where fair, transparent, lawful and disclosed before contract.
        </p>
        <h2>7. Complaints, refunds and disputes</h2>
        <p>
          Email <a href="mailto:info@zimbabweshipping.com">info@zimbabweshipping.com</a> with your reference
          and desired resolution. We will acknowledge and investigate fairly. An agreed refund is returned
          through the original payment method unless another lawful method is agreed. These terms do not
          restrict chargeback rights, statutory remedies or access to a court. Mandatory consumer law and
          jurisdiction protections of the country where you live continue to apply.
        </p>
        <h2>8. Privacy and communications</h2>
        <p>
          Our <Link to="/privacy-policy">Privacy Notice</Link> explains use of customer and recipient data,
          AI and WhatsApp. Operational booking messages are not marketing. Electronic marketing is sent
          only where permitted and includes a way to opt out.
        </p>
        <h2>9. Changes to these terms</h2>
        <p>
          The version accepted with a booking governs it. We may update terms for future bookings, but will
          not use a later version to remove existing rights or materially change an accepted service without
          agreement or a lawful reason.
        </p>
      </article>
    </main>
    <Footer />
  </>
);

export default TermsAndConditions;
