import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeliveryNoteRegister from './DeliveryNoteRegister';

const listRegister = vi.fn();

vi.mock('@/lib/deliveryNote/ledger', () => ({
  listRegister: (...args: unknown[]) => listRegister(...args),
  amendRegisterEntry: vi.fn(),
  voidRegisterEntry: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const entry = {
  id: 'note-1', reference: 'TAT10261234', invoice_number: 'INV-1', load_suffix: null,
  shipper_name: 'Tatenda Moyo', shipper_phone: '+447700001234', shipper_address: '1 Main Road',
  recipient_name: 'Nana Mlilo', recipient_phone: '+263771111111', recipient_address: '12 Dollar Avenue',
  recipient_city: 'Bulawayo', item_fingerprint: 'box:1', paid: false, balance_due: 10,
  unpaid_hold: true, delivery_mode: 'door_to_door', note_date: '2026-08-22', pdf_filename: null,
  items: [{ item: 'BOX', description: 'Clothes', qty: '1', uom: 'box' }], confirmed_by: 'admin-1',
  created_at: '2026-08-22T09:00:00Z', revision: 1, amended_at: null, amended_by: null,
  last_change_reason: null, voided_at: null, voided_by: null, void_reason: null,
};

describe('DeliveryNoteRegister admin actions', () => {
  beforeEach(() => { listRegister.mockReset(); listRegister.mockResolvedValue([entry]); });

  it('shows edit and delete actions for an active note', async () => {
    render(<DeliveryNoteRegister />);
    expect(await screen.findByText('TAT10261234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('opens the full correction editor', async () => {
    render(<DeliveryNoteRegister />);
    fireEvent.click(await screen.findByRole('button', { name: /edit/i }));
    expect(screen.getByRole('heading', { name: 'Edit delivery note' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tatenda Moyo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What changed and why?')).toBeInTheDocument();
  });

  it('requires a reason before deletion', async () => {
    render(<DeliveryNoteRegister />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(screen.getByText(/Delete delivery note TAT10261234/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete note' })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Reason for deletion (required)'), { target: { value: 'Issued in error' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete note' })).toBeEnabled());
  });
});
