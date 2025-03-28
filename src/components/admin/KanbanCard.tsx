import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  id: string;
  children: React.ReactNode;
  isDraggingAny?: boolean; // New prop to know if any card is being dragged
};

export function KanbanCard({ id, children, isDraggingAny = false }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    // During dragging of any card, disable pointer events on cards that aren't being dragged
    // This lets the column receive the drop events through the cards
    pointerEvents: isDraggingAny && !isDragging ? 'none' : 'auto' as any,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg shadow p-4 cursor-move touch-none"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}