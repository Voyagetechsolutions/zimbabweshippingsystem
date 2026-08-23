import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PrivacyComplaint = () => (
  <>
    <Helmet><title>Privacy Complaints | Zimbabwe Shipping Services</title></Helmet>
    <Navbar />
    <main className="container mx-auto px-4 py-10 min-h-screen">
      <article className="prose max-w-3xl mx-auto">
        <h1>Privacy complaints and requests</h1>
        <p>
          Email <a href="mailto:info@zimbabweshipping.com?subject=Privacy%20complaint">info@zimbabweshipping.com</a>
          {' '}with the subject <strong>Privacy complaint</strong>, or write to Zimbabwe Shipping Services,
          Pastures Lodge Farm, Chelveston Road, Wellingborough NN9 6AA, United Kingdom.
        </p>
        <h2>What to include</h2>
        <ul>
          <li>your name and a safe way to contact you;</li>
          <li>the booking, tracking or customer reference, if relevant;</li>
          <li>what happened, when it happened and the outcome you want; and</li>
          <li>relevant messages, without unnecessary identity documents.</li>
        </ul>
        <h2>What happens next</h2>
        <p>
          We acknowledge a data-protection complaint within 30 days, investigate without undue delay,
          keep you informed where more time is reasonably needed, and explain the outcome and action taken.
          We may request proportionate information to verify identity before releasing personal data.
        </p>
        <p>
          You may also complain to the UK Information Commissioner's Office, Ireland's Data Protection
          Commission, or Zimbabwe's responsible data protection authority. You do not have to complete
          our process first where the law permits a direct regulator complaint.
        </p>
      </article>
    </main>
    <Footer />
  </>
);

export default PrivacyComplaint;
