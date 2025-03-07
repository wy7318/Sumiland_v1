import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

type BaseItem = {
  id: string;
  status: string;
};

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  color: string | null;
  text_color: string | null;
};

type Props<T extends BaseItem> = {
  items: T[];
  statuses: PicklistValue[];
  onStatusChange: (itemId: string, newStatus: string) => Promise<void>;
  renderCard: (item: T) => React.ReactNode;
};

export function KanbanBoard<T extends BaseItem>({ 
  items, 
  statuses, 
  onStatusChange,
  renderCard 
}: Props<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = items.find(item => item.id === activeId);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeItem = items.find(item => item.id === active.id);
    const overId = over.id;

    // If dropping onto a status column
    if (statuses.some(s => s.value === overId)) {
      const newStatus = overId as string;
      if (activeItem && activeItem.status !== newStatus) {
        await onStatusChange(activeItem.id, newStatus);
      }
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {statuses.map(status => (
          <KanbanColumn
            key={status.value}
            status={status}
            items={items.filter(item => item.status === status.value)}
            renderCard={renderCard}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="transform rotate-3 shadow-2xl">
            {renderCard(activeItem)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export { KanbanCard };