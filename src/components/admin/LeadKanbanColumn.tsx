import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  status: PicklistValue;
  leads: Lead[];
};

export function LeadKanbanColumn({ status, leads }: Props) {
  const { setNodeRef } = useDroppable({
    id: status.value,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-50 rounded-lg p-4 flex flex-col h-[calc(100vh-16rem)]"
    >
      <div 
        className="flex items-center justify-between mb-4 pb-2 border-b flex-shrink-0"
        style={{ borderColor: status.color || '#E5E7EB' }}
      >
        <h3 
          className="font-medium"
          style={{ color: status.color || '#374151' }}
        >
          {status.label}
        </h3>
        <span className="text-sm text-gray-500">
          {leads.length}
        </span>
      </div>

      <SortableContext 
        items={leads.map(l => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {leads.map(lead => (
            <LeadKanbanCard
              key={lead.id}
              lead={lead}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}