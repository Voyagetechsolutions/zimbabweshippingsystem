import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DriverCollectionsPanel from './DriverCollectionsPanel';
import { runStopToCollection } from '@/lib/driverRunMerge';

const mocks = vi.hoisted(() => ({
  loadRouteDay: vi.fn(),
  loadMyRunStops: vi.fn(),
  startRun: vi.fn(),
  transitionStop: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const channel: any = {};
  channel.on = () => channel;
  channel.subscribe = () => channel;
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'driver-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useBusinessConfiguration', () => ({
  useBusinessConfiguration: () => ({ config: { operations: { failedStopReasons: [{ id: 'not_home', label: 'Not home' }] } } }),
}));
vi.mock('./DriverHandoverPanel', () => ({ default: () => <div>handover</div> }));
vi.mock('@/lib/driverOps', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/driverOps')>()),
  loadRouteDay: mocks.loadRouteDay,
  loadMyRunStops: mocks.loadMyRunStops,
  startRun: mocks.startRun,
  transitionStop: mocks.transitionStop,
  currentPosition: () => Promise.resolve(null),
}));

const RUN = { id: 'run-1', status: 'planned', route_name: 'HAND BUILT' };

describe('DriverCollectionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startRun.mockResolvedValue(undefined);
    mocks.transitionStop.mockResolvedValue(undefined);
    // The live feed returns no route list at all, which used to blank the panel.
    mocks.loadRouteDay.mockResolvedValue({
      date: '2026-09-15',
      routes: [],
      collections: [{
        shipmentId: 'feed-1', trackingNumber: 'T-F', customerReference: null, customerName: 'Feed Customer', phone: null,
        address: '9 Low Rd', city: 'Leeds', postcode: 'LS1', route: 'LEEDS', goodsDescription: null, collectionStatus: 'Awaiting Collection',
        latitude: null, longitude: null, stopId: null, claimId: null, claimStatus: 'available', claimedBy: null, claimedByName: null, claimedAt: null,
      }],
    });
    const row = {
      id: 'stop-a', run_id: 'run-1', shipment_id: 'ship-a', stop_order: 1, status: 'planned', address: '1 High St, Northampton',
      latitude: null, longitude: null, recipient_name: 'Rudo Moyo', time_window_start: '2026-09-15T08:00:00Z', time_window_end: '2026-09-15T10:00:00Z',
      special_instructions: null, failure_reason: null, shipment: { metadata: {}, tracking_number: 'T-A', status: 'Booking Confirmed' },
    };
    mocks.loadMyRunStops.mockResolvedValue({
      runs: [RUN],
      stops: [{ ...runStopToCollection(row, RUN, 'driver-1'), failureReason: null }],
    });
  });

  it('shows the dispatched run first, then the rest of the route', async () => {
    render(<DriverCollectionsPanel onDuty />);
    await screen.findByText('Rudo Moyo');
    expect(screen.queryByText(/No collection route today/i)).not.toBeInTheDocument();
    expect(screen.getByText('Your run · HAND BUILT')).toBeInTheDocument();
    expect(screen.getByText('From dispatch')).toBeInTheDocument();
    expect(screen.getByText(/Customer available/)).toBeInTheDocument();
    expect(screen.getByText('Feed Customer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim' })).toBeInTheDocument();
    // A dispatched stop has no claim behind it, so there is nothing to release.
    expect(screen.queryByRole('button', { name: 'Release' })).not.toBeInTheDocument();
  });

  it('starts the planned run before setting off to the first stop', async () => {
    render(<DriverCollectionsPanel onDuty />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start journey' }));
    await waitFor(() => expect(mocks.transitionStop).toHaveBeenCalledWith('stop-a', 'en_route'));
    expect(mocks.startRun).toHaveBeenCalledWith('run-1');
    expect(mocks.startRun.mock.invocationCallOrder[0]).toBeLessThan(mocks.transitionStop.mock.invocationCallOrder[0]);
  });

  it('does not read a failed load as an empty day', async () => {
    mocks.loadRouteDay.mockRejectedValue(new Error('network down'));
    mocks.loadMyRunStops.mockRejectedValue(new Error('network down'));
    render(<DriverCollectionsPanel onDuty />);
    expect(await screen.findByText(/Couldn’t load today’s collections/)).toBeInTheDocument();
    expect(screen.queryByText(/No collections today/)).not.toBeInTheDocument();
  });
});
