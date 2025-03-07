import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Edit, Eye, User as UserIcon, Building2, Mail } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  owner: {
    name: string;
  } | null;
};

type Props = {
  lead: Lead;
};

export function LeadKanbanCard({ lead }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/leads/${lead.id}`}
            className="text-primary-600 hover:text-primary-900"
            onClick={e => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/leads/${lead.id}/edit`}
            className="text-blue-600 hover:text-blue-900"
            onClick={e => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">
          {lead.first_name} {lead.last_name}
        </h4>

        <div className="flex items-center text-sm text-gray-500">
          <Mail className="w-4 h-4 mr-1" />
          {lead.email}
        </div>

        {lead.company && (
          <div className="flex items-center text-sm text-gray-500">
            <Building2 className="w-4 h-4 mr-1" />
            {lead.company}
          </div>
        )}

        {lead.owner ? (
          <div className="flex items-center text-sm text-gray-500">
            <UserIcon className="w-4 h-4 mr-1" />
            {lead.owner.name}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Unassigned</div>
        )}
      </div>
    </motion.div>
  );
}