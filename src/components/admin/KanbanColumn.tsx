import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

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
  status: PicklistValue;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
};

export function KanbanColumn<T extends BaseItem>({
  status,
  items,
  renderCard
}: Props<T>) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.value,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-50 rounded-lg p-4 flex flex-col h-[calc(100vh-16rem)] w-[280px] flex-shrink-0"
      style={{
        boxShadow: isOver ? 'inset 0 0 0 2px rgba(99, 102, 241, 0.8)' : undefined,
        background: isOver ? '#F3F4F6' : undefined,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between mb-4 pb-2 border-b"
        style={{ borderColor: status.color || '#E5E7EB' }}
      >
        <h3
          className="font-medium"
          style={{ color: status.color || '#374151' }}
        >
          {status.label}
        </h3>
        <span className="text-sm text-gray-500">
          {items.length}
        </span>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4 min-h-[120px] pb-4">
            {items.map((item) => (
              <div key={`${status.value}-${item.id}`}>
                {renderCard(item)}
              </div>
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}