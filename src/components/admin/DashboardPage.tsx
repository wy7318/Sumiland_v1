import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, BarChart2, LineChart, PieChart, Star, StarOff, FolderPlus,
  AlertCircle, Settings, Share2, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { ReportBuilder } from './reports/ReportBuilder';
import { ReportViewer } from './reports/ReportViewer';
import { ReportFolderList } from './reports/ReportFolderList';

type Report = {
  id: string;
  name: string;
  description: string | null;
  object_type: string;
  filters: any[];
  grouping: string[];
  sorting: { field: string; direction: 'asc' | 'desc' }[];
  date_range?: {
    field: string;
    start: string | null;
    end: string | null;
  };
  charts: {
    type: 'bar' | 'line' | 'pie';
    title: string;
    x_field: string;
    y_field: string;
    group_by?: string;
    aggregation?: 'count' | 'sum' | 'avg';
  }[];
  is_favorite: boolean;
  is_shared: boolean;
  folder_id: string | null;
  created_at: string;
  created_by: string;
  organization_id: string;
  selected_fields: string[];
  is_template: boolean;
  template_id: string | null;
};

const MODULES = [
  { name: 'Opportunities', table: 'opportunities', icon: '💼', color: 'bg-purple-100 text-purple-800', idField: 'id', nameField: 'name', route: 'opportunities' },
  { name: 'Quotes', table: 'quote_hdr', icon: '📝', color: 'bg-pink-100 text-pink-800', idField: 'quote_id', nameField: 'quote_number', route: 'quotes' },
  { name: 'Orders', table: 'order_hdr', icon: '📦', color: 'bg-red-100 text-red-800', idField: 'order_id', nameField: 'order_number', route: 'orders' },
  { name: 'Cases', table: 'cases', icon: '📋', color: 'bg-blue-100 text-blue-800', idField: 'id', nameField: 'title', route: 'cases' },
  { name: 'Leads', table: 'leads', icon: '📋', color: 'bg-blue-100 text-blue-800', idField: 'id', nameField: 'company', route: 'leads' },
  { name: 'Accounts', table: 'vendors', icon: '🏢', color: 'bg-yellow-100 text-yellow-800', idField: 'id', nameField: 'name', route: 'vendors' },
  { name: 'Customers', table: 'customers', icon: '👤', color: 'bg-green-100 text-green-800', idField: 'customer_id', nameField: 'company', route: 'customers' }
];

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<any>({});
  const [totalsByDay, setTotalsByDay] = useState({
    opportunities: 0,
    quotes: 0,
    orders: 0
  });

  useEffect(() => {
    fetchReports();
  }, [selectedOrganization]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const results: any = {};

    for (const module of MODULES) {
      const { data: records, error } = await supabase
        .from(module.table)
        .select(`${module.idField}, ${module.nameField}, created_at`)
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', `${today}T00:00:00Z`)
        .order('created_at', { ascending: false })
        .limit(5);

      const { count, error: countError } = await supabase
        .from(module.table)
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', `${today}T00:00:00Z`);

      results[module.table] = {
        records: records || [],
        count: count || 0
      };
    }

    // Fetch totals for amount fields
    const [oppTotalRes, quoteTotalRes, orderTotalRes] = await Promise.all([
      supabase.from('opportunities')
        .select('amount')
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', `${today}T00:00:00Z`),
      supabase.from('quote_hdr')
        .select('subtotal')
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', `${today}T00:00:00Z`),
      supabase.from('order_hdr')
        .select('subtotal')
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', `${today}T00:00:00Z`)
    ]);

    const oppTotal = oppTotalRes.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    const quoteTotal = quoteTotalRes.data?.reduce((sum, r) => sum + (r.subtotal || 0), 0) || 0;
    const orderTotal = orderTotalRes.data?.reduce((sum, r) => sum + (r.subtotal || 0), 0) || 0;

    setTotalsByDay({
      opportunities: oppTotal,
      quotes: quoteTotal,
      orders: orderTotal
    });

    setData(results);
    setLoading(false);
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const { error } = await supabase
        .from('reports')
        .update({ is_favorite: !report.is_favorite })
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to update report');
    }
  };

  const handleShareToggle = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const { error } = await supabase
        .from('reports')
        .update({ is_shared: !report.is_shared })
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error toggling share:', err);
      setError(err instanceof Error ? err.message : 'Failed to update report');
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    }
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setShowReportBuilder(true);
  };

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteReports = filteredReports.filter(report => report.is_favorite);
  const otherReports = filteredReports.filter(report => !report.is_favorite);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Key Metrics</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          aria-label="Refresh Metrics"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
        </button>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Show skeleton loaders while loading
          Array.from({ length: MODULES.length }).map((_, index) => (
            <SkeletonLoader key={index} />
          ))
        ) : (
          // Show actual content when data is loaded
          MODULES.map(module => {
            const moduleData = data[module.table] || { records: [], count: 0 };
            const isTopCard = ['Opportunities', 'Quotes', 'Orders'].includes(module.name);

            return (
              <motion.div
                key={module.table}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl shadow p-4 hover:shadow-lg transition-shadow",
                  isTopCard ? "bg-white border border-gray-200" : "bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-2xl ${module.color} px-3 py-1 rounded-full`}>
                    {module.icon}
                  </div>
                  <Link
                    to={`/admin/${module.route}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    View All
                  </Link>
                </div>
                <h2 className="text-lg font-semibold mb-1">{module.name}</h2>
                <div className="mb-4">
                  <p className="text-3xl font-bold text-gray-800">
                    {moduleData.count}
                  </p>
                  {/* Show daily total amount for Opportunities, Quotes, Orders */}
                  {module.name === 'Opportunities' && (
                    <p className="text-sm text-purple-600 font-medium mt-1">
                      Total: ${totalsByDay.opportunities.toLocaleString()}
                    </p>
                  )}
                  {module.name === 'Quotes' && (
                    <p className="text-sm text-pink-600 font-medium mt-1">
                      Total: ${totalsByDay.quotes.toLocaleString()}
                    </p>
                  )}
                  {module.name === 'Orders' && (
                    <p className="text-sm text-red-600 font-medium mt-1">
                      Total: ${totalsByDay.orders.toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {moduleData.records.length > 0 ? (
                    moduleData.records.map((rec: any) => (
                      <Link
                        to={`/admin/${module.route}/${rec[module.idField]}`}
                        key={rec[module.idField]}
                        className="block p-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {rec[module.nameField] || 'No Title'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(rec.created_at).toLocaleString()}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No new records today</p>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => {
            setEditingReport(null);
            setShowReportBuilder(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Report
        </button>

      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Favorite Reports */}
      {favoriteReports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Favorite Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onFavorite={handleFavoriteToggle}
                onShare={handleShareToggle}
                onDelete={handleDelete}
                onSelect={setSelectedReport}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Reports */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onFavorite={handleFavoriteToggle}
              onShare={handleShareToggle}
              onDelete={handleDelete}
              onSelect={setSelectedReport}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>

      {/* Report Builder Modal */}
      {showReportBuilder && (
        <ReportBuilder
          onClose={() => {
            setShowReportBuilder(false);
            setEditingReport(null);
          }}
          onSave={fetchReports}
          editingReport={editingReport}
        />
      )}

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onEdit={() => {
            setSelectedReport(null);
            handleEdit(selectedReport);
          }}
        />
      )}
    </div>
  );
}

type ReportCardProps = {
  report: Report;
  onFavorite: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (report: Report) => void;
  onEdit: (report: Report) => void;
};

function SkeletonLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="h-6 w-24 bg-gray-200 rounded mb-4 animate-pulse"></div>
      <div className="h-8 w-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
      <div className="space-y-2">
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="p-2 rounded-lg">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-24 bg-gray-200 rounded mt-1 animate-pulse"></div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ReportCard({ report, onFavorite, onShare, onDelete, onSelect, onEdit }: ReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium">{report.name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => onFavorite(report.id)}
              className={cn(
                "p-1 rounded-full",
                report.is_favorite
                  ? "text-yellow-500 hover:bg-yellow-50"
                  : "text-gray-400 hover:bg-gray-50"
              )}
            >
              {report.is_favorite ? (
                <Star className="w-5 h-5" />
              ) : (
                <StarOff className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onShare(report.id)}
              className={cn(
                "p-1 rounded-full",
                report.is_shared
                  ? "text-primary-500 hover:bg-primary-50"
                  : "text-gray-400 hover:bg-gray-50"
              )}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {report.description && (
          <p className="text-sm text-gray-600 mb-4">{report.description}</p>
        )}

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Settings className="w-4 h-4 mr-1" />
          {report.object_type}
          {report.charts.length > 0 && (
            <>
              <span className="mx-2">•</span>
              {report.charts.map(chart => {
                switch (chart.type) {
                  case 'bar':
                    return <BarChart2 key={chart.title} className="w-4 h-4 text-primary-500" />;
                  case 'line':
                    return <LineChart key={chart.title} className="w-4 h-4 text-green-500" />;
                  case 'pie':
                    return <PieChart key={chart.title} className="w-4 h-4 text-purple-500" />;
                  default:
                    return null;
                }
              })}
            </>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => onSelect(report)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View Report
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(report)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded-full"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(report.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded-full"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}