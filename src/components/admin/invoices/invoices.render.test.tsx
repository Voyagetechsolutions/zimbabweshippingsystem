import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoicesTab from '@/components/admin/tabs/InvoicesTab';
import InvoicePaymentDialog from './InvoicePaymentDialog';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  shipments: [] as any[],
  setInvoicePaymentStatus: vi.fn(),
  verifyInvoice: vi.fn(),
  removeInvoicePayment: vi.fn(),
  saveRaisedInvoice: vi.fn(),
  raiseInvoice: vi.fn(),
  setInvoiceDeleted: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: mocks.shipments, error: null }) }) }),
    functions: { invoke: vi.fn() },
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/invoiceActions', () => ({
  setInvoicePaymentStatus: mocks.setInvoicePaymentStatus,
  verifyInvoice: mocks.verifyInvoice,
  removeInvoicePayment: mocks.removeInvoicePayment,
  saveRaisedInvoice: mocks.saveRaisedInvoice,
  raiseInvoice: mocks.raiseInvoice,
  setInvoiceDeleted: mocks.setInvoiceDeleted,
  loadDriverInvoices: () => Promise.resolve(new Map([['ship-driver', {
    shipmentId: 'ship-driver', driverId: 'driver-1', stopId: 'stop-1', status: 'issued', createdAt: '2026-09-15T18:42:25Z', notes: null,
  }]])),
  loadStaffNames: () => Promise.resolve(new Map([['driver-1', 'Tinashe Driver']])),
}));

const shipment = (id: string, invoice: Record<string, any> | undefined, sender = 'Rudo Moyo') => ({
  id,
  tracking_number: `TRK-${id}`,
  customer_reference: `REF-${id}`,
  status: 'Booking Confirmed',
  origin: 'United Kingdom',
  destination: 'Zimbabwe',
  user_id: null,
  created_at: '2026-09-10T10:00:00Z',
  updated_at: '2026-09-10T10:00:00Z',
  can_cancel: false,
  can_modify: false,
  metadata: { sender: { name: sender, email: 'rudo@example.com' }, ...(invoice ? { invoice } : {}) },
});

const DRIVER_INVOICE = {
  invoiceNumber: 'INV-DRIVER', issueDate: '2026-09-15', dueDate: '2099-09-29', currency: 'GBP',
  items: [{ item: 'Drum', description: 'Drum', quantity: 1, unitPrice: 875 }],
  payments: [{ amount: 90, method: 'Cash on collection', date: '2026-09-15', recordedBy: 'driver' }],
  driverConfirmedAt: '2026-09-15T18:42:25+00', driverConfirmedBy: 'driver-1', sentAt: '2026-09-15T18:42:25+00',
};

describe('InvoicesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.shipments = [
      shipment('ship-driver', DRIVER_INVOICE),
      // Priced by the booking but never raised: no number.
      shipment('ship-booking', { items: [{ description: 'Drum', quantity: 2, unitPrice: 280 }], currency: 'GBP' }, 'Farai Ncube'),
      shipment('ship-paid', {
        invoiceNumber: 'INV-PAID', issueDate: '2026-09-01', dueDate: '2026-09-15', currency: 'GBP',
        items: [{ item: 'Drum', description: 'Drum', quantity: 1, unitPrice: 300 }],
        payments: [{ id: 'p1', amount: 300, method: 'bank_transfer', date: '2026-09-02' }],
      }, 'Tendai Dube'),
    ];
    mocks.setInvoicePaymentStatus.mockImplementation(async (_id: string, status: string, details: any) => ({
      ...DRIVER_INVOICE,
      payments: status === 'unpaid' ? [] : [...DRIVER_INVOICE.payments, { id: 'new', amount: details.amount ?? 785, method: details.method }],
    }));
    mocks.verifyInvoice.mockResolvedValue({ ...DRIVER_INVOICE, verifiedAt: '2026-09-16T10:00:00+00', verifiedBy: 'admin-1' });
  });

  it('marks driver invoices, stamps payment state and keeps unraised bookings out', async () => {
    render(<InvoicesTab />);
    const driverRow = (await screen.findByText('INV-DRIVER')).closest('tr')!;
    expect(within(driverRow).getByText(/Driver · to verify/)).toBeInTheDocument();
    expect(within(driverRow).getByText('Partially paid')).toBeInTheDocument();

    const paidRow = screen.getByText('INV-PAID').closest('tr')!;
    expect(within(paidRow).getByText('Paid')).toBeInTheDocument();
    expect(within(paidRow).queryByText(/Driver ·/)).not.toBeInTheDocument();

    const bookingRow = screen.getByText('Farai Ncube').closest('tr')!;
    expect(within(bookingRow).getByText('Not raised')).toBeInTheDocument();

    expect(screen.getByText(/1 driver invoice waiting to be verified/)).toBeInTheDocument();
  });

  it('records a part payment from the Mark as menu', async () => {
    const user = userEvent.setup();
    render(<InvoicesTab />);
    const driverRow = (await screen.findByText('INV-DRIVER')).closest('tr')!;

    await user.click(within(driverRow).getByRole('button', { name: /mark as/i }));
    await user.click(await screen.findByRole('menuitem', { name: /partially paid/i }));

    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByLabelText(/amount received/i);
    fireEvent.change(amount, { target: { value: '900' } });
    expect(within(dialog).getByText(/choose Fully paid instead/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Record part payment' })).toBeDisabled();

    fireEvent.change(amount, { target: { value: '100' } });
    expect(within(dialog).getByText(/Leaves £685.00 owing/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Record part payment' }));

    await waitFor(() => expect(mocks.setInvoicePaymentStatus).toHaveBeenCalledWith(
      'ship-driver', 'partial', expect.objectContaining({ amount: 100 }),
    ));
  });

  it('verifies a driver invoice from its review', async () => {
    const user = userEvent.setup();
    render(<InvoicesTab />);
    const driverRow = (await screen.findByText('INV-DRIVER')).closest('tr')!;
    await user.click(within(driverRow).getByRole('button', { name: /^verify$/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Tinashe Driver')).toBeInTheDocument();
    expect(within(dialog).getByText(/taken by the driver/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /verify invoice/i }));

    await waitFor(() => expect(mocks.verifyInvoice).toHaveBeenCalledWith('ship-driver', true, ''));
    await waitFor(() => expect(within(screen.getByText('INV-DRIVER').closest('tr')!).getByText(/Driver · verified/)).toBeInTheDocument());
  });
});

describe('InvoicePaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setInvoicePaymentStatus.mockResolvedValue({ ...DRIVER_INVOICE, payments: [] });
  });

  it('warns that Not paid removes the driver’s cash too', async () => {
    const onSaved = vi.fn();
    render(
      <InvoicePaymentDialog
        open
        shipment={shipment('ship-driver', DRIVER_INVOICE) as any}
        initialMode="unpaid"
        onOpenChange={vi.fn()}
        onSaved={onSaved}
      />,
    );
    expect(screen.getByText(/including money the driver recorded at collection/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark not paid' }));
    await waitFor(() => expect(mocks.setInvoicePaymentStatus).toHaveBeenCalledWith('ship-driver', 'unpaid', expect.any(Object)));
    expect(onSaved).toHaveBeenCalledWith('ship-driver', expect.objectContaining({ payments: [] }));
  });

  it('records the remaining balance when marked fully paid', async () => {
    render(
      <InvoicePaymentDialog
        open
        shipment={shipment('ship-driver', DRIVER_INVOICE) as any}
        initialMode="paid"
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText(/received — the remaining balance/)).toHaveTextContent('Records £785.00 received');
    fireEvent.click(screen.getByRole('button', { name: 'Mark fully paid' }));
    await waitFor(() => expect(mocks.setInvoicePaymentStatus).toHaveBeenCalledWith('ship-driver', 'paid', expect.objectContaining({ method: 'bank_transfer' })));
  });
});
