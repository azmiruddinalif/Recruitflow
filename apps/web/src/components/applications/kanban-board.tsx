'use client';

import * as React from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical } from 'lucide-react';
import type { ApplicationStatus } from '@recruitflow/types';
import { APPLICATION_PIPELINE_STAGES } from '@recruitflow/shared';
import type {
  ApplicationRecord,
  CandidateRecord,
  JobRecord,
} from '@/stores/recruitflow-store';
import { AIMatchBadge } from '@/components/shared/ai-match-badge';
import { formatDate, getApplicationStageStyle, getInitials } from '@/lib/utils';

type ReorderUpdate = { applicationId: string; status: ApplicationStatus; stageOrder: number };

interface KanbanBoardProps {
  applications: ApplicationRecord[];
  candidates: CandidateRecord[];
  jobs: JobRecord[];
  onInspectMatch: (app: ApplicationRecord) => void;
  onReorder: (updates: ReorderUpdate[]) => Promise<void>;
  onMoveStage: (applicationId: string, nextStatus: ApplicationStatus) => Promise<void>;
}

function sortByStage(apps: ApplicationRecord[], status: ApplicationStatus) {
  return apps
    .filter((a) => a.status === status)
    .slice()
    .sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0));
}

const FORWARD_STAGE_ORDER: ApplicationStatus[] = [
  'NEW',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'ASSESSMENT',
  'OFFER',
  'HIRED',
];

function getNextStage(current: ApplicationStatus): ApplicationStatus | null {
  const idx = FORWARD_STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= FORWARD_STAGE_ORDER.length - 1) return null;
  return FORWARD_STAGE_ORDER[idx + 1] ?? null;
}

function KanbanCard({
  app,
  candidateName,
  candidateTitle,
  jobTitle,
  onInspectMatch,
  onChangeStatus,
  onAdvance,
  rootRef,
  rootStyle,
  dragAttributes,
  dragListeners,
  isDragging,
}: {
  app: ApplicationRecord;
  candidateName: string;
  candidateTitle?: string;
  jobTitle?: string;
  onInspectMatch: () => void;
  onChangeStatus?: (status: ApplicationStatus) => void;
  onAdvance?: () => void;
  rootRef?: (node: HTMLElement | null) => void;
  rootStyle?: React.CSSProperties;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
}) {
  const nextStage = getNextStage(app.status);
  const isDraggable = Boolean(dragListeners);

  return (
    <div
      ref={rootRef}
      style={rootStyle}
      aria-label={isDraggable ? `${candidateName}'s application, currently in ${app.status} stage` : undefined}
      {...dragAttributes}
      {...dragListeners}
      className={`rounded-xl border bg-white p-3.5 shadow-sm transition-all duration-150 ${
        isDraggable
          ? 'cursor-grab touch-none select-none active:cursor-grabbing kanban-card-enter hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
          : ''
      } border-[#E2E8F0] ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isDraggable ? <GripVertical className="h-4 w-4 shrink-0 text-slate-300" /> : null}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-[#4F46E5]">
            {getInitials(candidateName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">
              {candidateName}
            </p>
            <p className="truncate text-[11px] text-slate-500">{candidateTitle}</p>
          </div>
        </div>

        <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <AIMatchBadge score={app.aiMatch.overallScore} onClick={onInspectMatch} />
        </div>
      </div>

      <div className="mt-2.5 rounded-md bg-[#F8FAFC] px-2.5 py-1.5">
        <p className="text-[11px] font-medium text-slate-800 line-clamp-1">
          {jobTitle ?? 'Job Requisition'}
        </p>
        <p className="text-[10px] text-slate-400 font-mono">
          App ID: {app.id} · {formatDate(app.appliedAt)}
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {app.aiMatch.matchingSkills.slice(0, 3).map((sk) => (
          <span
            key={sk}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
          >
            {sk}
          </span>
        ))}
      </div>

      {onChangeStatus ? (
        <div
          className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <select
            aria-label={`Change stage for application ${app.id}`}
            value={app.status}
            onChange={(e) => onChangeStatus(e.target.value as ApplicationStatus)}
            className="h-8 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 text-[11px] font-medium text-slate-700 focus:border-[#4F46E5] focus:outline-none"
          >
            {APPLICATION_PIPELINE_STAGES.map((s) => (
              <option key={s.status} value={s.status}>
                {s.label}
              </option>
            ))}
          </select>

          {nextStage && onAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              className="inline-flex h-8 items-center gap-0.5 rounded-md bg-[#EEF2FF] px-2.5 text-[11px] font-semibold text-[#4F46E5] transition-colors hover:bg-indigo-100"
            >
              <span>Advance</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SortableKanbanCard(props: {
  app: ApplicationRecord;
  candidateName: string;
  candidateTitle?: string;
  jobTitle?: string;
  onInspectMatch: () => void;
  onChangeStatus: (status: ApplicationStatus) => void;
  onAdvance: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.app.id,
  });

  return (
    <KanbanCard
      {...props}
      rootRef={setNodeRef}
      rootStyle={{ transform: CSS.Transform.toString(transform), transition }}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
    />
  );
}

function KanbanColumn({
  status,
  label,
  apps,
  candidates,
  jobs,
  onInspectMatch,
  onMoveStage,
}: {
  status: ApplicationStatus;
  label: string;
  apps: ApplicationRecord[];
  candidates: CandidateRecord[];
  jobs: JobRecord[];
  onInspectMatch: (app: ApplicationRecord) => void;
  onMoveStage: (applicationId: string, nextStatus: ApplicationStatus) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const stageStyle = getApplicationStageStyle(status);

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[86vw] max-w-[320px] min-h-0 shrink-0 snap-center flex-col rounded-xl border p-3 transition-colors duration-150 sm:w-[295px] ${
        isOver
          ? 'border-[#4F46E5] bg-[#EEF2FF]/50 ring-2 ring-[#4F46E5]/20'
          : 'border-[#E2E8F0] bg-[#F1F5F9]/75'
      }`}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stageStyle.dot}`} />
          <span className="text-xs font-semibold text-slate-900">{label}</span>
        </div>
        <span className="rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
          {apps.length}
        </span>
      </div>

      <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          {apps.length === 0 ? (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/50 text-[11px] text-slate-400">
              No applications in {label}
            </div>
          ) : (
            apps.map((app) => {
              const candidate = candidates.find((c) => c.id === app.candidateId);
              const job = jobs.find((j) => j.id === app.jobId);
              const nextStage = getNextStage(app.status);
              return (
                <SortableKanbanCard
                  key={app.id}
                  app={app}
                  candidateName={candidate?.fullName ?? 'Candidate'}
                  candidateTitle={candidate?.currentTitle}
                  jobTitle={job?.title}
                  onInspectMatch={() => onInspectMatch(app)}
                  onChangeStatus={(nextStatus) => {
                    void onMoveStage(app.id, nextStatus);
                  }}
                  onAdvance={() => {
                    if (nextStage) void onMoveStage(app.id, nextStage);
                  }}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  applications,
  candidates,
  jobs,
  onInspectMatch,
  onReorder,
  onMoveStage,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    // Mouse/trackpad: a small drag threshold so plain clicks (badges, selects,
    // the Advance button) never get mistaken for the start of a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: require a brief press-and-hold before a drag starts, Trello-style,
    // so a normal vertical swipe still scrolls the column instead of lifting
    // the card out from under the user's finger.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = React.useMemo(
    () =>
      APPLICATION_PIPELINE_STAGES.map((stage) => ({
        status: stage.status,
        label: stage.label,
        apps: sortByStage(applications, stage.status),
      })),
    [applications],
  );

  const activeApp = activeId ? applications.find((a) => a.id === activeId) ?? null : null;

  const stageStatuses = React.useMemo(
    () => new Set<string>(APPLICATION_PIPELINE_STAGES.map((s) => s.status)),
    [],
  );

  function findColumnOf(id: string): ApplicationStatus | null {
    if (stageStatuses.has(id)) return id as ApplicationStatus;
    const app = applications.find((a) => a.id === id);
    return app ? app.status : null;
  }

  // Resolves a dnd-kit over/active pair to "which column, and at which index
  // within it" the card would land at right now, so the drop lands wherever
  // the pointer actually was — never just wherever the nearest card's id
  // happens to sort first.
  function resolveDropTarget(
    activeRect: { top: number; height: number } | null,
    over: { id: string | number; rect: { top: number; height: number } } | null,
  ): { status: ApplicationStatus; index: number } | null {
    if (!over) return null;
    const overId = String(over.id);
    const destinationStatus = findColumnOf(overId);
    if (!destinationStatus) return null;

    const destApps = sortByStage(applications, destinationStatus);

    // Hovering the column itself (empty column, or no card collision found):
    // the only sensible place is the end of the list.
    if (stageStatuses.has(overId)) {
      return { status: destinationStatus, index: destApps.length };
    }

    const overIndex = destApps.findIndex((a) => a.id === overId);
    if (overIndex === -1) {
      return { status: destinationStatus, index: destApps.length };
    }

    // Insert before the hovered card, unless the dragged card's current
    // center has already passed below the hovered card's center — then
    // insert after it instead. This is what makes the drop land wherever the
    // pointer actually is, rather than always snapping to the top of
    // whichever card the collision detection names.
    let index = overIndex;
    if (activeRect) {
      const activeCenterY = activeRect.top + activeRect.height / 2;
      const overCenterY = over.rect.top + over.rect.height / 2;
      if (activeCenterY > overCenterY) index = overIndex + 1;
    }

    return { status: destinationStatus, index };
  }

  // Columns are droppable containers AND hold their own sortable cards (also
  // droppable), so their rects overlap. Plain `closestCorners` resolves this
  // unreliably once a column has more than one card. We instead: (1) prefer
  // whatever droppable the pointer is literally inside, falling back to rect
  // intersection; (2) if that resolves to a column rather than a card, drill
  // down to the closest card center within that column so reordering between
  // specific cards stays precise. A ref remembers the last valid target so a
  // brief gap between measurements never drops the drag.
  //
  // Note: we deliberately do NOT migrate the active card between columns'
  // local arrays in `onDragOver` (the pattern dnd-kit's own docs show for
  // multi-container boards). dnd-kit binds its move/end listeners directly to
  // the DOM node under the pointer at drag start, with no native pointer
  // capture; each column here renders its own `.map()` over a separate array,
  // so migrating the active item into another column's array mid-drag makes
  // React unmount that node from one column's tree and mount a new one in the
  // other's — severing the only listener that would ever see the rest of the
  // gesture, and freezing the drag. Resolving the drop target entirely in
  // `onDragEnd`, as below, avoids touching the active node's column mid-drag.
  const lastOverId = React.useRef<string | null>(null);

  const collisionDetectionStrategy: CollisionDetection = React.useCallback(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null && stageStatuses.has(String(overId))) {
        const columnStatus = overId as ApplicationStatus;
        const columnCardIds = new Set(
          sortByStage(applications, columnStatus)
            .filter((a) => a.id !== args.active.id)
            .map((a) => a.id),
        );

        if (columnCardIds.size > 0) {
          const cardCollisions = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((container) =>
              columnCardIds.has(String(container.id)),
            ),
          });
          const closestCardId = getFirstCollision(cardCollisions, 'id');
          if (closestCardId != null) {
            overId = closestCardId;
          }
        }
      }

      if (overId != null) {
        lastOverId.current = String(overId);
        return [{ id: overId }];
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [applications, stageStatuses],
  );

  function handleDragStart(event: DragStartEvent) {
    lastOverId.current = null;
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    lastOverId.current = null;
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeCardId = String(active.id);
    const sourceStatus = findColumnOf(activeCardId);
    const activeRect = active.rect.current.translated ?? active.rect.current.initial;
    const target = resolveDropTarget(activeRect, over);
    if (!sourceStatus || !target) {
      setActiveId(null);
      return;
    }

    const { status: destinationStatus, index: rawIndex } = target;

    const sourceApps = sortByStage(applications, sourceStatus);
    const movedApp = sourceApps.find((a) => a.id === activeCardId);
    if (!movedApp) {
      setActiveId(null);
      return;
    }

    const destApps = sortByStage(applications, destinationStatus).filter(
      (a) => a.id !== activeCardId,
    );

    // `rawIndex` was computed against the full (still active-card-included)
    // column, matching what the placeholder preview showed. Splicing into
    // `destApps`, which has that same card already removed, needs the index
    // shifted down by one whenever the card's own original slot was ahead of
    // the drop point — otherwise every same-column drag would land one slot
    // later than where it was previewed.
    const activeOriginalIndex = sourceApps.findIndex((a) => a.id === activeCardId);
    const insertAt =
      sourceStatus === destinationStatus && activeOriginalIndex !== -1 && activeOriginalIndex < rawIndex
        ? rawIndex - 1
        : rawIndex;

    const newDestApps = [...destApps];
    newDestApps.splice(Math.min(insertAt, newDestApps.length), 0, movedApp);

    const updates: ReorderUpdate[] = [];

    newDestApps.forEach((app, index) => {
      if (app.stageOrder !== index || app.status !== destinationStatus) {
        updates.push({ applicationId: app.id, status: destinationStatus, stageOrder: index });
      }
    });

    if (sourceStatus !== destinationStatus) {
      sourceApps
        .filter((a) => a.id !== activeCardId)
        .forEach((app, index) => {
          if (app.stageOrder !== index) {
            updates.push({ applicationId: app.id, status: sourceStatus, stageOrder: index });
          }
        });
    }

    if (updates.length === 0) {
      setActiveId(null);
      return;
    }

    // Fire the optimistic board update and clear the overlay in the same
    // synchronous tick (before the `await` below), so React batches them into
    // one commit: the real card already reflects its new position by the
    // time the overlay disappears, instead of the overlay's drop animation
    // (now disabled) or a stray render finding the card still in its old
    // spot and visually "snapping back".
    const reorderPromise = onReorder(updates);
    setActiveId(null);
    await reorderPromise;
  }

  return (
    <DndContext
      id="applications-kanban-board"
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        lastOverId.current = null;
      }}
    >
      <div className="flex h-full snap-x snap-mandatory items-stretch gap-4 overflow-x-auto pb-1">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            apps={col.apps}
            candidates={candidates}
            jobs={jobs}
            onInspectMatch={onInspectMatch}
            onMoveStage={onMoveStage}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeApp ? (
          <div className="w-[270px] rotate-2 scale-105 cursor-grabbing rounded-xl shadow-2xl shadow-slate-900/25">
            <KanbanCard
              app={activeApp}
              candidateName={
                candidates.find((c) => c.id === activeApp.candidateId)?.fullName ?? 'Candidate'
              }
              candidateTitle={candidates.find((c) => c.id === activeApp.candidateId)?.currentTitle}
              jobTitle={jobs.find((j) => j.id === activeApp.jobId)?.title}
              onInspectMatch={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
