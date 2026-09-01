import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { OWNER_VERIFIED_REGISTRATION } from '@/config/legal';
import { useBusinessConfiguration } from '@/hooks/useBusinessConfiguration';

const BusinessInformation = () => {
  const registration = OWNER_VERIFIED_REGISTRATION;
  const {config}=useBusinessConfiguration();const business:any=config.company;

  return (
    <>
      <Helmet>
        <title>Business and Customer Information | Zimbabwe Shipping Services</title>
        <meta name="description" content="Public business, contact, booking, cancellation, insurance and complaints information for Zimbabwe Shipping Services." />
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-10 min-h-screen">
        <article className="prose max-w-4xl mx-auto">
          <h1>Business and Customer Information</h1>
          <p><strong>Last updated: 23 August 2026</strong></p>

          <h2>Business and contact details</h2>
          <dl>
            <dt>Trading name</dt><dd>{business.tradingName}</dd>
            {registration.registeredLegalName && <><dt>Registered legal name</dt><dd>{registration.registeredLegalName}</dd></>}
            {registration.companyNumber && <><dt>Company number</dt><dd>{registration.companyNumber}</dd></>}
            {registration.vatNumber && <><dt>VAT number</dt><dd>{registration.vatNumber}</dd></>}
            <dt>Founder and director</dt><dd>{business.founderAndDirector}</dd>
            <dt>Operating address</dt><dd>{business.operatingAddress.map((line) => <span className="block" key={line}>{line}</span>)}</dd>
            <dt>Email</dt><dd><a href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a></dd>
            <dt>UK bookings and enquiries</dt><dd><a href={`tel:${String(business.ukPhone||'').replace(/\s/g,'')}`}>{business.ukPhone}</a></dd>
            <dt>Ireland bookings and enquiries</dt><dd><a href={`tel:${String(business.irelandPhone||'').replace(/\s/g,'')}`}>{business.irelandPhone}</a></dd>
            <dt>Accounts office</dt><dd><a href={`tel:${String(business.accountsPhone||'').replace(/\s/g,'')}`}>{business.accountsPhone}</a></dd>
          </dl>

          <h2>How the booking contract is made</h2>
          <p>
            Sending details through the website, app, WhatsApp or Zimmy is a booking request. A contract
            starts only when Zimbabwe Shipping Services sends a booking confirmation showing the accepted
            service, route, price and payment arrangements. Check that confirmation and report errors before collection.
          </p>

          <h2>Prices and additional charges</h2>
          <p>
            Standard advertised prices appear on our <Link to="/pricing">Pricing page</Link>. Custom or
            unusually sized goods require a written quote. Known additional charges, including any selected
            pay-on-arrival premium, special packaging, storage, customs/destination charge or failed-service
            charge, must be communicated before they become payable. Customs duties and taxes imposed by
            authorities are not included unless the booking confirmation expressly says otherwise.
          </p>

          <h2>Cancellation and changes</h2>
          <p>
            Contact us as soon as possible. We currently accept cancellation or modification requests up to
            24 hours before the scheduled collection. If work has started, collection is less than 24 hours
            away, or we have incurred an unavoidable third-party cost, we will explain any amount that cannot
            be refunded before completing the cancellation. Mandatory consumer cancellation and refund rights
            are not restricted.
          </p>

          <h2>Insurance and responsibility for cover</h2>
          <p>
            Zimbabwe Shipping Services does not currently advertise or promise shipment insurance. Customers
            should arrange adequate independent cover for the full declared value and route. If a future booking
            includes verified cover, that cover, limit, excess and exclusions must be stated expressly in the
            written booking confirmation before the contract is made.
          </p>

          <h2>Claims and complaints</h2>
          <p>
            Report loss, damage, delay, incorrect charges or service concerns promptly to{' '}
            <a href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a> with the booking reference, photographs
            and relevant evidence. We will acknowledge and investigate fairly. Data-protection concerns use
            our <Link to="/privacy-complaint">Privacy Complaints procedure</Link>. See our{' '}
            <Link to="/terms-and-conditions">Terms and Conditions</Link>,{' '}
            <Link to="/privacy-policy">Privacy Notice</Link> and{' '}
            <Link to="/shipping-guidelines">Shipping Guidelines</Link> before booking.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
};

export default BusinessInformation;
