import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RouteBuilder from './RouteBuilder';
import RunDetailView from './RunDetailView';
import type { BuilderData } from '@/lib/dispatch';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  loadBuilderData: vi.fn(),
  saveRoute: vi.fn(),
  loadRunDetail: vi.fn(),
  reorderStop: vi.fn(),
  removeStop: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const channel: any = {};
  channel.on = () => channel;
  channel.subscribe = () => channel;
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('./DispatchMap', () => ({ default: () => <div data-testid="map" /> }));
vi.mock('@/lib/dispatch', () => ({
  loadBuilderData: mocks.loadBuilderData,
  saveRoute: mocks.saveRoute,
  loadRunDetail: mocks.loadRunDetail,
  reorderStop: mocks.reorderStop,
  removeStop: mocks.removeStop,
  cancelRun: vi.fn(),
  markCustomerInformed: vi.fn(),
  reassignRunDriver: vi.fn(),
  reinstateRun: vi.fn(),
  updateRunDetails: vi.fn(),
  updateStopWindow: vi.fn(),
}));

const DATE = '2026-09-15';
const sender = (firstName: string, lastName: string) => ({ sender: { firstName, lastName, address: '1 High St', city: 'Northampton', postcode: 'NN1 1AA', country: 'United Kingdom', phone: '07123 456789' } });
const shipment = (id: string, first: string, last: string) => ({
  id, tracking_number: `TRK-${id}`, customer_reference: null, status: 'Booking Confirmed', collection_status: 'Awaiting Collection',
  collection_schedule_id: null, collection_run_id: null, pickup_latitude: null, pickup_longitude: null, metadata: sender(first, last),
});
const driver = (id: string, name: string) => ({
  id, full_name: name, email: null, phone_number: null, driver_type: 'pickup', role: 'customer', is_admin: true,
  on_leave: false, staff_active: true, vehicle_label: null,
});

function builderData(): BuilderData {
  return {
    shipments: [shipment('s1', 'Rudo', 'Moyo'), shipment('s2', 'Farai', 'Ncube'), shipment('s3', 'Tendai', 'Dube')],
    schedules: [{ id: 'sch', route: 'NORTHAMPTON ROUTE', pickup_date: DATE }],
    drivers: [driver('d1', 'Tinashe Driver'), driver('d2', 'Other Driver')],
    slots: {
      s1: {
        shipment_id: 's1', user_id: null, collection_date: DATE, route: null, requested_start: '09:00:00', requested_end: '11:00:00',
        requested_flexible: false, requested_at: '2026-09-13T10:00:00Z', dispatch_start: null, dispatch_end: null, dispatch_set_at: null,
        change_reason: null, customer_informed_at: null, customer_informed_via: null, reminder_sent_at: null,
      },
    },
    openStops: [
      { stopId: 'st2', runId: 'r-other', shipmentId: 's2', status: 'planned', windowStart: null, windowEnd: null },
      { stopId: 'st3', runId: 'r-other', shipmentId: 's3', status: 'en_route', windowStart: null, windowEnd: null },
    ],
    runs: [{
      id: 'r-other', driver_id: 'd2', status: 'planned', run_date: DATE, run_type: 'pickup', route_name: 'LEEDS',
      vehicle_label: null, scheduled_start: null, scheduled_end: null, started_at: null, completed_at: null,
    }],
    run: null,
    closedStops: [],
  };
}

const rowButton = (name: string) => screen.getByText(name).closest('button') as HTMLButtonElement;

describe('RouteBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadBuilderData.mockResolvedValue(builderData());
    mocks.saveRoute.mockResolvedValue({ runId: 'run-new', added: 1, transferred: 0, removed: 0, windowsChanged: 0, blocked: [], movedCustomers: [], warnings: [] });
  });

  it('creates a run with the customer’s own window adopted', async () => {
    const onSaved = vi.fn();
    render(<RouteBuilder date={DATE} onBack={vi.fn()} onSaved={onSaved} />);

    await screen.findByText('Rudo Moyo');
    expect(rowButton('Tendai Dube')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Route name'), { target: { value: 'northampton' } });
    fireEvent.click(screen.getByText('Tinashe Driver'));
    fireEvent.click(rowButton('Rudo Moyo'));
    expect(screen.getByLabelText('Window start')).toHaveValue('09:00');
    expect(screen.getByLabelText('Window end')).toHaveValue('11:00');

    fireEvent.click(screen.getByRole('button', { name: /create run/i }));
    await waitFor(() => expect(mocks.saveRoute).toHaveBeenCalledTimes(1));
    expect(mocks.saveRoute.mock.calls[0][0]).toMatchObject({
      date: DATE, driverId: 'd1', routeName: 'NORTHAMPTON', picks: { s1: { from: '09:00', to: '11:00' } },
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('run-new', false));
  });

  it('asks before moving a collection off another driver’s run', async () => {
    render(<RouteBuilder date={DATE} onBack={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByText('Farai Ncube');

    fireEvent.change(screen.getByLabelText('Route name'), { target: { value: 'LEEDS' } });
    fireEvent.click(screen.getByText('Tinashe Driver'));
    fireEvent.click(rowButton('Farai Ncube'));
    expect(screen.getByText(/Saving moves this stop off Other Driver's run/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create run/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/will move off another driver's run/)).toBeInTheDocument();
    expect(mocks.saveRoute).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /create run/i }));
    await waitFor(() => expect(mocks.saveRoute).toHaveBeenCalledTimes(1));
  });

  it('refuses a half-entered window', async () => {
    render(<RouteBuilder date={DATE} onBack={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByText('Rudo Moyo');
    fireEvent.change(screen.getByLabelText('Route name'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('Tinashe Driver'));
    fireEvent.click(rowButton('Rudo Moyo'));
    fireEvent.change(screen.getByLabelText('Window end'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /create run/i }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(mocks.saveRoute).not.toHaveBeenCalled();
  });
});

describe('RunDetailView', () => {
  const stop = (id: string, order: number, name: string, status = 'planned') => ({
    id, run_id: 'run-1', shipment_id: `ship-${id}`, status, stop_order: order, stop_type: 'collection', latitude: null, longitude: null,
    address: '1 High St', completed_at: null, failure_reason: null, failure_note: null, time_window_start: null, time_window_end: null,
    recipient_name: name, shipment: shipment(`ship-${id}`, name.split(' ')[0], name.split(' ')[1]),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reorderStop.mockResolvedValue(true);
    mocks.removeStop.mockResolvedValue(undefined);
    mocks.loadRunDetail.mockResolvedValue({
      run: {
        id: 'run-1', driver_id: 'd1', status: 'planned', run_date: DATE, run_type: 'pickup', route_name: 'HAND BUILT',
        vehicle_label: null, scheduled_start: null, scheduled_end: null, started_at: null, completed_at: null,
      },
      driver: driver('d1', 'Tinashe Driver'),
      drivers: [driver('d1', 'Tinashe Driver')],
      stops: [stop('a', 1, 'Rudo Moyo'), stop('b', 2, 'Farai Ncube')],
      slots: {
        'ship-a': {
          shipment_id: 'ship-a', user_id: null, collection_date: DATE, route: null, requested_start: '09:00:00', requested_end: '11:00:00',
          requested_flexible: false, requested_at: '2026-09-13T10:00:00Z', dispatch_start: '13:00:00', dispatch_end: '15:00:00',
          dispatch_set_at: '2026-09-14T10:00:00Z', change_reason: null, customer_informed_at: null, customer_informed_via: null, reminder_sent_at: null,
        },
      },
    });
  });

  it('shows the owed call, reorders and removes stops', async () => {
    render(<RunDetailView runId="run-1" onBack={vi.fn()} onEditStops={vi.fn()} onOpenRun={vi.fn()} />);
    await screen.findByText('1 customer still to be told');
    expect(screen.getByRole('link', { name: /whatsapp customer/i })).toHaveAttribute('href', expect.stringContaining('https://wa.me/447123456789'));

    fireEvent.click(screen.getAllByTitle('Move down')[0]);
    await waitFor(() => expect(mocks.reorderStop).toHaveBeenCalledWith('a', 'down'));

    fireEvent.click(screen.getAllByTitle('Remove from run')[1]);
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(mocks.removeStop).toHaveBeenCalledWith('b'));
  });

  it('opens the builder to edit the run’s collections', async () => {
    const onEditStops = vi.fn();
    render(<RunDetailView runId="run-1" onBack={vi.fn()} onEditStops={onEditStops} onOpenRun={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /add or remove collections/i }));
    expect(onEditStops).toHaveBeenCalledWith(expect.objectContaining({ id: 'run-1' }));
  });
});
