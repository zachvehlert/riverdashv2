import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import RiverRow from './RiverRow';

export default function RiverTable({ rivers, onReorder, onEdit }) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = rivers.findIndex((r) => r.id === active.id);
      const newIndex = rivers.findIndex((r) => r.id === over.id);
      onReorder(arrayMove(rivers, oldIndex, newIndex));
    }
  }

  if (rivers.length === 0) {
    return (
      <div className="empty-state">
        <p>No rivers added yet.</p>
        <p>Click "Add River" to get started.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <table className="river-table">
        <colgroup>
          <col className="col-drag" />
          <col className="col-river" />
          <col className="col-level" />
          <col className="col-trend" />
          <col className="col-updated" />
          <col className="col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th></th>
            <th>River</th>
            <th>Level</th>
            <th>Trend</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <SortableContext
            items={rivers.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {rivers.map((river) => (
              <RiverRow key={river.id} river={river} onEdit={onEdit} />
            ))}
          </SortableContext>
        </tbody>
      </table>
    </DndContext>
  );
}
