import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, FolderPlus, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';

type Props = {
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
};

type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  is_shared: boolean;
  created_at: string;
  created_by: string;
  organization_id: string;
};

export function ReportFolderList({ selectedFolderId, onSelect }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('report_folders')
        .select('*')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const renderFolder = (folder: Folder) => {
    const children = folders.filter(f => f.parent_id === folder.id);
    const isExpanded = expandedFolders.includes(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center py-2 px-3 rounded-lg cursor-pointer",
            selectedFolderId === folder.id
              ? "bg-primary-50 text-primary-900"
              : "hover:bg-gray-100"
          )}
          onClick={() => onSelect(folder.id)}
        >
          {children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <Folder className="w-5 h-5 mr-2" />
          <span className="text-sm">{folder.name}</span>
        </div>

        {isExpanded && children.length > 0 && (
          <div className="ml-6">
            {children.map(child => renderFolder(child))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-12">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm p-2">
        {error}
      </div>
    );
  }

  const rootFolders = folders.filter(f => !f.parent_id);

  return (
    <div className="space-y-1">
      {rootFolders.map(folder => renderFolder(folder))}
    </div>
  );
}