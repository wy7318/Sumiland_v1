import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Eye, Package, Calendar, DollarSign, Building2, AlertCircle,
  FileDown, Send, User, Mail, Phone, LayoutGrid, LayoutList
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { KanbanBoard, KanbanCard } from './KanbanBoard';
import { useAuth } from '../../contexts/AuthContext';

type Opportunity = {
  id: string;
  name: string;
  account_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  lead_source: string | null;
  lead_id: string | null;
  type: string | null;
  description: string | null;
  status: string;
  created_at: string;
  organization_id: string;
  account: {
    name: string;
    type: string;
  } | null;
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null;
  owner: {
    name: string;
  } | null;
};

type KanbanOpportunity = Omit<Opportunity, 'stage'> & {
  status: string;
};

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

type ViewMode = 'list' | 'kanban';

function OpportunityCard({ opportunity }: { opportunity: KanbanOpportunity }) {
  return (
    <KanbanCard id={opportunity.id}>
      <div className="space-y-2">
        <h4 className="font-medium">{opportunity.name}</h4>
        
        <div className="flex items-center text-sm text-gray-500">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatCurrency(opportunity.amount)}
          <span className="ml-2">({opportunity.probability}%)</span>
        </div>

        {opportunity.contact && (
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            {opportunity.contact.first_name} {opportunity.contact.last_name}
          </div>
        )}

        {opportunity.account && (
          <div className="flex items-center text-sm text-gray-500">
            <Building2 className="w-4 h-4 mr-1" />
            {opportunity.account.name}
          </div>
        )}

        {opportunity.owner && (
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            {opportunity.owner.name}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Link
            to={`/admin/opportunities/${opportunity.id}`}
            className="text-primary-600 hover:text-primary-900"
            onClick={e => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/opportunities/${opportunity.id}/edit`}
            className="text-blue-600 hover:text-blue-900"
            onClick={e => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </KanbanCard>
  );
}

export function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizations, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);
  const [opportunityStages, setOpportunityStages] = useState<PicklistValue[]>([]);
  const [opportunityTypes, setOpportunityTypes] = useState<PicklistValue[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    fetchPicklists();
    fetchOpportunities();
  }, []);

  const fetchPicklists = async () => {
    try {
      const { data: stageData, error: stageError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_stage')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (stageError) throw stageError;
      setOpportunityStages(stageData || []);

      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_type')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setOpportunityTypes(typeData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          account:vendors(*),
          contact:customers(*),
          owner:profiles!opportunities_owner_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (opportunityId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ 
          stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunityId);

      if (error) throw error;
      await fetchOpportunities();
    } catch (err) {
      console.error('Error updating opportunity stage:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const handleDelete = async (opportunityId: string) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId);

      if (error) throw error;
      await fetchOpportunities();
    } catch (err) {
      console.error('Error deleting opportunity:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete opportunity');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedOpportunities.length) return;

    try {
      if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedOpportunities.length} opportunities?`)) {
          return;
        }

        const { error } = await supabase
          .from('opportunities')
          .delete()
          .in('id', selectedOpportunities);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('opportunities')
          .update({ 
            stage: action,
            updated_at: new Date().toISOString()
          })
          .in('id', selectedOpportunities);

        if (error) throw error;
      }

      await fetchOpportunities();
      setSelectedOpportunities([]);
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform action');
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = 
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.account?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${opp.contact?.first_name} ${opp.contact?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === 'all' || opp.stage === stageFilter;
    const matchesType = typeFilter === 'all' || opp.type === typeFilter;

    return matchesSearch && matchesStage && matchesType;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return (aValue < bValue ? -1 : 1) * multiplier;
  });

  const kanbanOpportunities: KanbanOpportunity[] = sortedOpportunities.map(opp => ({
    ...opp,
    status: opp.stage
  }));

  const getStageStyle = (stage: string) => {
    const stageValue = opportunityStages.find(s => s.value === stage);
    if (!stageValue?.color) return {};
    return {
      backgroundColor: stageValue.color,
      color: stageValue.text_color || '#FFFFFF'
    };
  };

  const getTypeStyle = (type: string | null) => {
    if (!type) return {};
    const typeValue = opportunityTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  if (loading || !opportunityStages.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Opportunities</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban View
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4 mr-2" />
                List View
              </>
            )}
          </button>
          <Link
            to="/admin/opportunities/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Opportunity
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search opportunities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Stages</option>
              {opportunityStages.map(stage => (
                <option key={stage.id} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Types</option>
              {opportunityTypes.map(type => (
                <option key={type.id} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {selectedOpportunities.length > 0 && viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleBulkAction(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Bulk Actions</option>
                  {opportunityStages.map(stage => (
                    <option key={stage.id} value={stage.value}>
                      Move to {stage.label}
                    </option>
                  ))}
                  <option value="delete">Delete Selected</option>
                </select>
                <span className="text-sm text-gray-500">
                  {selectedOpportunities.length} selected
                </span>
              </div>
            )}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedOpportunities.length === filteredOpportunities.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOpportunities(filteredOpportunities.map(o => o.id));
                        } else {
                          setSelectedOpportunities([]);
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Close
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOpportunities.includes(opp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOpportunities(prev => [...prev, opp.id]);
                          } else {
                            setSelectedOpportunities(prev => prev.filter(id => id !== opp.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {opp.name}
                      </div>
                      {opp.type && (
                        <span
                          className="mt-1 inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1"
                          style={getTypeStyle(opp.type)}
                        >
                          {opportunityTypes.find(t => t.value === opp.type)?.label || opp.type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {opp.account ? (
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {opp.account.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {opp.account.type}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No Account</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {opp.contact ? (
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 text-gray-400 mr-1" />
                            {opp.contact.first_name} {opp.contact.last_name}
                          </div>
                          <div className="flex items-center text-sm">
                            <Mail className="w-4 h-4 text-gray-400 mr-1" />
                            <a
                              href={`mailto:${opp.contact.email}`}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              {opp.contact.email}
                            </a>
                          </div>
                          {opp.contact.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="w-4 h-4 text-gray-400 mr-1" />
                              <a
                                href={`tel:${opp.contact.phone}`}
                                className="text-primary-600 hover:text-primary-700"
                              >
                                {opp.contact.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No Contact</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={opp.stage}
                        onChange={(e) => handleStageChange(opp.id, e.target.value)}
                        className="text-sm font-medium rounded-full px-3 py-1"
                        style={getStageStyle(opp.stage)}
                      >
                        {opportunityStages.map(stage => (
                          <option key={stage.id} value={stage.value}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(opp.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {opp.probability}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {opp.expected_close_date ? (
                        new Date(opp.expected_close_date).toLocaleDateString()
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/opportunities/${opp.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          to={`/admin/opportunities/${opp.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(opp.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              <KanbanBoard
                items={kanbanOpportunities}
                statuses={opportunityStages}
                onStatusChange={handleStageChange}
                renderCard={(opportunity) => <OpportunityCard opportunity={opportunity as KanbanOpportunity} />}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}