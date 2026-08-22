import React, { useEffect, useState } from 'react';
import { loadLogoDataUri } from '@/lib/deliveryNote/logo';
import type { DeliveryNoteDraft } from '@/lib/deliveryNote/types';

// The printed delivery note, matching the house template already in production
// use. Styles are inline rather than in a stylesheet because this same DOM is
// captured by html2canvas and copied into a bare print window, neither of which
// carries the app's CSS with it.

const BLUE = '#1a73c1';
const STAMP_RED = '#c8102e';

interface Props {
  draft: DeliveryNoteDraft;
}

function addressLines(address: string): string[] {
  return (address || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

const Party: React.FC<{
  label: string;
  name: string;
  phone: string;
  address: string;
  city?: string;
  divider?: boolean;
}> = ({ label, name, phone, address, city, divider }) => (
  <div
    style={{
      width: '48%',
      ...(divider ? { paddingLeft: '24px', borderLeft: '1px solid #ccc' } : {}),
    }}
  >
    <h3
      style={{
        fontSize: '12px',
        color: BLUE,
        fontWeight: 'bold',
        margin: '0 0 6px',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </h3>
    <div style={{ fontSize: '13px', lineHeight: 1.65 }}>
      <div style={{ fontWeight: 'bold' }}>{name || '—'}</div>
      {addressLines(address).map((line, i) => <div key={i}>{line}</div>)}
      {city && <div>{city}</div>}
      {phone && <div>{phone}</div>}
    </div>
  </div>
);

/**
 * Renders one note at a fixed 900px width. The caller is responsible for
 * scaling it into a page; see renderNotePdf.
 */
const DeliveryNoteDocument = React.forwardRef<HTMLDivElement, Props>(({ draft }, ref) => {
  const [logo, setLogo] = useState('');
  useEffect(() => { loadLogoDataUri().then(setLogo); }, []);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        width: '900px',
        padding: '40px 48px 30px',
        color: '#1a1a1a',
        background: '#fff',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '130px',
            height: '130px',
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {logo && (
            <img
              src={logo}
              alt="Zimbabwe Shipping"
              style={{ maxWidth: '130px', maxHeight: '130px', objectFit: 'contain' }}
            />
          )}
        </div>
        <div style={{ textAlign: 'right', paddingTop: '10px' }}>
          <h1 style={{ fontSize: '32px', color: '#222', margin: 0, letterSpacing: '0.5px' }}>
            DELIVERY NOTE
          </h1>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px' }}>
            Delivery Note #: {draft.reference || '—'}
          </div>
          {draft.date && (
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
              Date: {draft.date}
            </div>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #222', margin: '8px 0 22px' }} />

      {/* Parties */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '26px' }}>
        <Party
          label="SHIPPER"
          name={draft.shipper.name}
          phone={draft.shipper.phone}
          address={draft.shipper.address}
        />
        <Party
          divider
          label="RECIPIENT"
          name={draft.recipient.name}
          phone={draft.recipient.phone}
          address={draft.recipient.address}
          city={draft.recipient.city}
        />
      </div>

      {/* Goods manifest — no prices anywhere on a delivery note */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {[
              ['#', '40px'],
              ['Item', '150px'],
              ['Description', 'auto'],
              ['Qty', '60px'],
              ['UOM', '80px'],
            ].map(([label, width]) => (
              <th
                key={label}
                style={{
                  background: BLUE,
                  color: '#fff',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  textAlign: 'left',
                  width: width === 'auto' ? undefined : width,
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {draft.rows.map((row, index) => (
            <tr key={index} style={{ background: index % 2 === 1 ? '#f7f8fa' : 'transparent' }}>
              <td style={{ padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                {index + 1}
              </td>
              <td style={{ padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid #eee', verticalAlign: 'top', fontWeight: 'bold' }}>
                {row.item}
              </td>
              <td style={{ padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'pre-line' }}>
                {row.description}
              </td>
              <td style={{ padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                {row.qty}
              </td>
              <td style={{ padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                {row.uom}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Stamp band. Reserved whether or not it prints, so a paid and an unpaid
          note of the same length come out the same height. */}
      <div style={{ minHeight: '74px', display: 'flex', alignItems: 'center', paddingTop: '18px' }}>
        {draft.paid && (
          <div
            style={{
              border: `3px solid ${STAMP_RED}`,
              color: STAMP_RED,
              fontSize: '30px',
              fontWeight: 'bold',
              padding: '6px 26px',
              transform: 'rotate(-6deg)',
              borderRadius: '8px',
              letterSpacing: '2px',
            }}
          >
            PAID
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid #ddd',
          marginTop: '10px',
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11.5px',
          color: '#888',
        }}
      >
        <span>Zimbabwe Shipping / Tshakmo Removals</span>
        <span>Invoice: {draft.invoiceNumber || '—'}</span>
      </div>
    </div>
  );
});

DeliveryNoteDocument.displayName = 'DeliveryNoteDocument';

export default DeliveryNoteDocument;
