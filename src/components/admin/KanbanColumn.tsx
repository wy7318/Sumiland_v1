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

export function KanbanColumn<T extends BaseItem>({ status, items, renderCard }: Props<T>) {
  const { setNodeRef } = useDroppable({
    id: status.value,
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-50 rounded-lg p-4"
      style={{ minHeight: '24rem' }}
    >
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

      <SortableContext 
        items={items.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id}>
              {renderCard(item)}
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}