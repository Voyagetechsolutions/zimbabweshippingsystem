import { useCallback, useState } from 'react';
import DispatchBoard from '../runs/DispatchBoard';
import RunDetailView from '../runs/RunDetailView';
import RouteBuilder from '../runs/RouteBuilder';
import CollectionGroupsView from '../runs/CollectionGroupsView';
import { isoDay } from '@/lib/dispatchCore';

// Runs & Dispatch: the staff app's Runs tab on the website.
//
// Four screens, kept as a stack so Back returns to wherever dispatch came
// from: the board, a run, the run builder (create or edit), and collection
// groups. Every one writes the same driver_runs / driver_run_stops rows the
// phone app does, which is what puts a run on the driver's dashboard.

type View =
  | { kind: 'board' }
  | { kind: 'groups' }
  | { kind: 'run'; runId: string }
  | { kind: 'build'; date: string; runId?: string | null; collectionRunId?: string | null; routeName?: string | null };

export default function DriverRunsTab() {
  const [date, setDate] = useState(() => isoDay());
  const [stack, setStack] = useState<View[]>([{ kind: 'board' }]);
  const view = stack[stack.length - 1];

  const top = () => { if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0 }); };
  const open = useCallback((next: View) => { setStack((s) => [...s, next]); top(); }, []);
  const back = useCallback(() => { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); top(); }, []);
  const replace = useCallback((next: View) => { setStack((s) => [...s.slice(0, -1), next]); top(); }, []);

  switch (view.kind) {
    case 'run':
      return (
        <RunDetailView
          key={view.runId}
          runId={view.runId}
          onBack={back}
          onOpenRun={(runId) => replace({ kind: 'run', runId })}
          onEditStops={(run) => open({ kind: 'build', date: run.run_date, runId: run.id, routeName: run.route_name })}
        />
      );
    case 'build':
      return (
        <RouteBuilder
          key={`${view.runId || 'new'}-${view.collectionRunId || 'all'}`}
          date={view.date}
          runId={view.runId}
          collectionRunId={view.collectionRunId}
          routeName={view.routeName}
          onBack={back}
          onSaved={(runId, editing) => (editing ? back() : replace({ kind: 'run', runId }))}
        />
      );
    case 'groups':
      return (
        <CollectionGroupsView
          onBack={back}
          onOpenRun={(runId) => open({ kind: 'run', runId })}
          onOpenGroup={(group) => open({ kind: 'build', date: group.date, collectionRunId: group.collectionRunId, routeName: group.route })}
          onBuild={(day) => open({ kind: 'build', date: day })}
        />
      );
    default:
      return (
        <DispatchBoard
          date={date}
          onDateChange={setDate}
          onOpenRun={(runId) => open({ kind: 'run', runId })}
          onBuild={(day) => open({ kind: 'build', date: day })}
          onOpenGroups={() => open({ kind: 'groups' })}
        />
      );
  }
}
