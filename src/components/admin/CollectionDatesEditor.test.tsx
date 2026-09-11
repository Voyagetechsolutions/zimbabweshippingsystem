import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();
const toast = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

import CollectionDatesEditor from './CollectionDatesEditor';

const september = {
  id: 'date-sep', date: '2026-09-19', label: 'September 19th, 2026', published: true,
  periodId: 'per-sep', period: 'September 2026', past: false, booked: 5,
};
const october = {
  id: 'date-oct', date: '2026-10-17', label: 'October 17th, 2026', published: true,
  periodId: 'per-oct', period: 'October 2026 Consignment', past: false, booked: 0,
};

const london = {
  scheduleId: 'sched-london', route: 'LONDON ROUTE', country: 'England',
  headlineDate: 'October 17th, 2026', dates: [september, october],
};
const nottingham = {
  scheduleId: 'sched-notts', route: 'NOTTINGHAM ROUTE', country: 'England',
  headlineDate: null, dates: [],
};
const dublin = {
  scheduleId: 'sched-dublin', route: 'DUBLIN CITY', country: 'Ireland',
  headlineDate: 'November 4th, 2026', dates: [],
};

const periods = [
  { id: 'per-oct', name: 'October 2026 Consignment' },
  { id: 'per-sep', name: 'September 2026' },
];

/** The chained period query the component issues alongside the calendar RPC. */
const periodQuery = () => ({
  select: () => ({ is: () => ({ order: async () => ({ data: periods, error: null }) }) }),
});

describe('CollectionDatesEditor', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    toast.mockReset();
    rpc.mockImplementation(async (name: string) => (
      name === 'route_collection_calendar'
        ? { data: [london, nottingham, dublin], error: null }
        : { data: null, error: null }
    ));
    from.mockImplementation(periodQuery);
  });

  it('lists every date a route runs, not just the latest', async () => {
    render(<CollectionDatesEditor />);
    expect(await screen.findByText('LONDON ROUTE')).toBeInTheDocument();
    // The whole point: September survived October being published.
    expect(screen.getByText('September 19th, 2026')).toBeInTheDocument();
    expect(screen.getByText('October 17th, 2026')).toBeInTheDocument();
    expect(screen.getByText('2 collections a customer can choose')).toBeInTheDocument();
  });

  // A route with no upcoming date is the one needing attention, so it has to be
  // visible and counted rather than filtered out of the list.
  it('names the routes a customer would see no date for', async () => {
    render(<CollectionDatesEditor />);
    expect(await screen.findByText('NOTTINGHAM ROUTE')).toBeInTheDocument();
    expect(screen.getByText(/customers see no date for this area/)).toBeInTheDocument();
    expect(screen.getByText('1 route with no upcoming date')).toBeInTheDocument();
  });

  it('keeps Ireland out of the UK list', async () => {
    render(<CollectionDatesEditor />);
    await screen.findByText('LONDON ROUTE');
    expect(screen.queryByText('DUBLIN CITY')).not.toBeInTheDocument();
  });

  it('adds a date against the consignment it belongs to', async () => {
    render(<CollectionDatesEditor />);
    await screen.findByText('LONDON ROUTE');
    fireEvent.click(screen.getAllByRole('button', { name: /add a date/i })[0]);

    fireEvent.change(await screen.findByLabelText('Collection day'), {
      target: { value: '2026-11-14' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('set_route_collection_date', {
      p_schedule_id: 'sched-london',
      // Defaults to the most recently created period, which is the one the
      // office is working on.
      p_period_id: 'per-oct',
      p_pickup_on: '2026-11-14',
      p_published: true,
      p_note: null,
    }));
  });

  // Deleting a collection people are booked on is how somebody is left standing
  // outside with their drums, so the warning has to say so before they confirm.
  it('warns that a booked date cannot simply be removed', async () => {
    render(<CollectionDatesEditor />);
    await screen.findByText('LONDON ROUTE');
    fireEvent.click(screen.getByRole('button', { name: 'Remove September 19th, 2026 from LONDON ROUTE' }));
    expect(await screen.findByText(/5 shipment\(s\) are already booked for this day/)).toBeInTheDocument();
  });

  it('does not warn about bookings when there are none', async () => {
    render(<CollectionDatesEditor />);
    await screen.findByText('LONDON ROUTE');
    fireEvent.click(screen.getByRole('button', { name: 'Remove October 17th, 2026 from LONDON ROUTE' }));
    expect(await screen.findByText(/would no longer collect on/)).toBeInTheDocument();
    expect(screen.queryByText(/already booked for this day/)).not.toBeInTheDocument();
  });
});
