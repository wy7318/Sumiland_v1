import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadKanbanCard } from './LeadKanbanCard';

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  status: string;
  lead_source: string | null;
  owner: {
    name: string;
  } | null;
};

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  color: string | null;
  text_color: string | null;
};

type Props = {
  leads: Lead[];
  statuses: PicklistValue[];
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>;
};

export function LeadKanbanBoard({ leads, statuses, onStatusChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeLead = leads.find(l => l.id === activeId);

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

    const activeLead = leads.find(l => l.id === active.id);
    const overId = over.id;

    // If dropping onto a status column
    if (statuses.some(s => s.value === overId)) {
      const newStatus = overId as string;
      if (activeLead && activeLead.status !== newStatus) {
        await onStatusChange(activeLead.id, newStatus);
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
          <LeadKanbanColumn
            key={status.value}
            status={status}
            leads={leads.filter(l => l.status === status.value)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="transform rotate-3 shadow-2xl">
            <LeadKanbanCard lead={activeLead} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}