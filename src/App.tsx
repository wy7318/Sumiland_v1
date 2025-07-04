import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { BlogPage } from './components/BlogPage';
import { BlogPost } from './components/BlogPost';
import { Footer } from './components/Footer';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './components/admin/DashboardPage';
import { PostsPage } from './components/admin/PostsPage';
import { NewPostPage } from './components/admin/NewPostPage';
import { EditPostPage } from './components/admin/EditPostPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { AdminPortfolioPage } from './components/admin/AdminPortfolioPage';
import { NewPortfolioPage } from './components/admin/NewPortfolioPage';
import { EditPortfolioPage } from './components/admin/EditPortfolioPage';
import { CasesPage } from './components/admin/CasesPage';
import { CaseDetailPage } from './components/admin/CaseDetailPage';
import { CaseForm } from './components/admin/CaseForm';
import { ProductsPage } from './components/admin/ProductsPage';
import { ProductForm } from './components/admin/ProductForm';
import { CategoriesPage } from './components/admin/CategoriesPage';
import { CustomersPage } from './components/admin/CustomersPage';
import { CustomerForm } from './components/admin/CustomerForm';
import { QuotesPage } from './components/admin/QuotesPage';
import { QuoteForm } from './components/admin/QuoteForm';
import { QuoteDetailPage } from './components/admin/QuoteDetailPage';
import { OrdersPage } from './components/admin/OrdersPage';
import { OrderDetailPage } from './components/admin/OrderDetailPage';
import { OrderForm } from './components/admin/OrderForm';
// import { PurchaseOrdersPage } from './components/admin/PurchaseOrdersPage';
// import { PurchaseOrderForm } from './components/admin/PurchaseOrderForm';
// import { PurchaseOrderDetailPage } from './components/admin/PurchaseOrderDetailPage';
import { VendorsPage } from './components/admin/VendorsPage';
import { VendorForm } from './components/admin/VendorForm';
import { VendorDetailPage } from './components/admin/VendorDetailPage';
// import { InventoryRoutes } from './components/admin/inventory/InventoryRoutes';
import { InventoryAlertsPage } from './components/admin/inventory/InventoryAlertsPage';
import { SettingsPage } from './components/admin/SettingsPage';
import { UserOrganizationsPage } from './components/admin/UserOrganizationsPage';
import { UsersPage } from './components/admin/UsersPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import { AuthProvider } from './contexts/AuthContext';
import { LeadsPage } from './components/admin/LeadsPage';
import { LeadForm } from './components/admin/LeadForm';
import { LeadDetailPage } from './components/admin/LeadDetailPage';
import { CustomerDetailPage } from './components/admin/CustomerDetailPage';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { OrganizationSelector } from './components/OrganizationSelector';
import { OpportunitiesPage } from './components/admin/OpportunitiesPage';
import { OpportunityForm } from './components/admin/OpportunityForm';
import { OpportunityDetailPage } from './components/admin/OpportunityDetailPage';
import { ReportFolderList } from './components/admin/reports/ReportFolderList';
import { TasksPage } from './components/admin/TasksPage';
import { TaskFormPage } from './components/admin/TaskFormPage';
import { FullTaskCalendar } from './components/admin/FullTaskCalendar';
import FAQPage from './components/FAQPage';
import { EmailProvider } from './components/admin/EmailProvider';
import { ReportsPage } from './components/admin/ReportsPage';
import { SearchResultsPage } from './components/admin/search/SearchResultsPage';
import LogicFlowBuilder from './components/admin/LogicFlowBuilder';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
// import {ResetPasswordPage} from './components/ResetPasswordPage';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

import { AuthPage } from './components/AuthPage';
import SetPasswordPage from './components/SetPasswordPage';
import { SalesAssistantPage } from './components/admin/SalesAssistantPage';
import { TimeZoneProvider } from './contexts/TimeZoneContext';
// Inventory components
import InventoryDashboard from './components/admin/inventory/InventoryDashboard';
import InventoryList from './components/admin/inventory/InventoryList';
import ProductDetails from './components/admin/inventory/ProductDetails';
import ReceiveInventory from './components/admin/inventory/ReceiveInventory';
import TransferInventory from './components/admin/inventory/TransferInventory';
import AdjustInventory from './components/admin/inventory/AdjustInventory';
import LowStockReport from './components/admin/inventory/LowStockReport';
import LocationManagement from './components/admin/inventory/LocationManagement';
import LocationDetails from './components/admin/inventory/LocationDetails';
import InventoryTransactions from './components/admin/inventory/InventoryTransactions';
import TransactionDetails from './components/admin/inventory/TransactionDetails';


import { PurchaseOrderList } from './components/admin/purchase/PurchaseOrderList';
import { PurchaseOrderForm } from './components/admin/purchase/PurchaseOrderForm';
import { PurchaseOrderDetails } from './components/admin/purchase/PurchaseOrderDetails';
import { GoodsReceiptForm } from './components/admin/purchase/GoodsReceiptForm';
import { PurchaseOrderStats } from './components/admin/purchase/PurchaseOrderStats';
import { GoodsReceiptDetails } from './components/admin/purchase/GoodsReceiptDetails';

// Work Order components
import { WorkOrdersPage } from './components/admin/workorder/WorkOrdersPage';
import { WorkOrderDetailPage } from './components/admin/workorder/WorkOrderDetailPage';
import { WorkOrderForm } from './components/admin/workorder/WorkOrderForm';

import { ToastContainer } from './components/admin/Toast'; // Adjust the import path as needed

import { OrganizationsPage } from './components/admin/OrganizationsPage';


import MenuManagement from './components/admin/restaurant/MenuManagement';
import TagsManagement from './components/admin/restaurant/TagsManagement';
import OptionsManagement from './components/admin/restaurant/OptionsManagement';
import RestaurantSettings from './components/admin/restaurant/RestaurantSettings';
import OnlineOrdering from './components/admin/restaurant/OnlineOrdering';
import BookingsManagement from './components/admin/restaurant/BookingsManagement';


import RestaurantStorePage from './pages/RestaurantStorePage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import RestaurantListPage from './pages/RestaurantListPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
    const { scrollYProgress } = useScroll();

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <Router>
                <AuthProvider>
                  
                    <div className="relative">
                        <motion.div
                            className="fixed top-0 left-0 right-0 h-1 bg-primary-500 origin-left z-50"
                            style={{ scaleX: scrollYProgress }}
                        />
                        <Navigation />
                      <OrganizationProvider>
                        <TimeZoneProvider>

                            <Routes>
                                <Route
                                    path="/debug-fix-org"
                                    element={
                                        <div className="p-8">
                                            <h1 className="text-2xl mb-4">Debug Organization</h1>
                                            <div className="bg-gray-100 p-4 rounded mb-4">
                                                <pre>{JSON.stringify({
                                                    sessionOrg: JSON.parse(sessionStorage.getItem('selectedOrganization') || 'null'),
                                                    pathname: window.location.pathname
                                                }, null, 2)}</pre>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    // Get org directly from storage
                                                    const org = sessionStorage.getItem('selectedOrganization');
                                                    if (org) {
                                                        // Force set in context
                                                        const parsed = JSON.parse(org);
                                                        window.location.href = '/admin';
                                                    } else {
                                                        window.location.href = '/select-organization';
                                                    }
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white rounded"
                                            >
                                                Force Navigation to Admin
                                            </button>
                                        </div>
                                    }
                                />
                                <Route path="/online-order" element={<RestaurantListPage />} />
                                <Route path="/online-order/store/:slug" element={<RestaurantStorePage />} />
                                <Route path="/online-order/store/:slug/track/:orderId" element={<OrderTrackingPage />} />
                                <Route path="*" element={<NotFoundPage />} />



                                <Route path="/" element={<HomePage />} />
                                <Route path="/blog" element={<BlogPage />} />
                                <Route path="/blog/:slug" element={<BlogPost />} />
                                <Route path="/portfolio" element={<PortfolioPage />} />
                                <Route path="/faq" element={<FAQPage />} />
                                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                                {/* <Route path="/reset-password" element={<ResetPasswordPage />} /> */}
                                <Route path="/forgot-password" element={<ForgotPassword />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                                    
                                <Route path="/set-password" element={<SetPasswordPage />} />
                                    
                                    
                                
                                

                                {/* Public Routes */}
                                <Route path="/login" element={
                                    <PublicRoute>
                                        <LoginPage />
                                    </PublicRoute>
                                } />
                                <Route path="/signup" element={
                                    <PublicRoute>
                                        <SignUpPage />
                                    </PublicRoute>
                                } />

                                {/* Organization selection */}
                                <Route
                                    path="/select-organization"
                                    element={
                                        <ProtectedRoute>
                                            <OrganizationSelector />
                                        </ProtectedRoute>
                                    }
                                />

                                {/* Protected Admin  Routes */}
                                <Route
                                    path="/admin/*"
                                    element={
                                        <ProtectedRoute>
                                            <EmailProvider>
                                                <AdminLayout />
                                            </EmailProvider>
                                        </ProtectedRoute>
                                    }
                                >
                                    <Route index element={<DashboardPage />} />
                                    <Route path="posts" element={<PostsPage />} />
                                    <Route path="posts/new" element={<NewPostPage />} />
                                    <Route path="posts/:id/edit" element={<EditPostPage />} />
                                    <Route path="portfolio" element={<AdminPortfolioPage />} />
                                    <Route path="portfolio/new" element={<NewPortfolioPage />} />
                                    <Route path="portfolio/:id/edit" element={<EditPortfolioPage />} />
                                    <Route path="cases" element={<CasesPage />} />
                                    <Route path="cases/new" element={<CaseForm />} />
                                    <Route path="cases/:id" element={<CaseDetailPage />} />
                                    <Route path="cases/:id/edit" element={<CaseForm />} />
                                    <Route path="leads" element={<LeadsPage />} />
                                    <Route path="leads/new" element={<LeadForm />} />
                                    <Route path="leads/:id" element={<LeadDetailPage />} />
                                    <Route path="leads/:id/edit" element={<LeadForm />} />
                                    <Route path="opportunities" element={<OpportunitiesPage />} />
                                    <Route path="opportunities/new" element={<OpportunityForm />} />
                                    <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
                                    <Route path="opportunities/:id/edit" element={<OpportunityForm />} />
                                    <Route path="ReportFolderList" element={<ReportFolderList />} />
                                    <Route path="reports" element={<ReportsPage />} />
                                    
                                        
                                    <Route path="products" element={<ProductsPage />} />
                                    <Route path="products/new" element={<ProductForm />} />
                                    <Route path="products/:id/edit" element={<ProductForm />} />
                                    <Route path="categories" element={<CategoriesPage />} />
                                    <Route path="customers" element={<CustomersPage />} />
                                    <Route path="customers/new" element={<CustomerForm />} />
                                    <Route path="customers/:id" element={<CustomerDetailPage />} />
                                    <Route path="customers/:id/edit" element={<CustomerForm />} />
                                    <Route path="quotes" element={<QuotesPage />} />
                                    <Route path="quotes/new" element={<QuoteForm />} />
                                    <Route path="quotes/:id" element={<QuoteDetailPage />} />
                                    <Route path="quotes/:id/edit" element={<QuoteForm />} />
                                    <Route path="orders" element={<OrdersPage />} />
                                    <Route path="orders/new" element={<OrderForm />} />
                                    <Route path="orders/:id" element={<OrderDetailPage />} />
                                    <Route path="orders/:id/edit" element={<OrderForm />} />
                                    {/* <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                                    <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
                                    <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} /> */}
                                    {/* <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} /> */}
                                    <Route path="purchase-orders" element={<PurchaseOrderList />} />
                                    <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
                                    <Route path="purchase-orders/:id" element={<PurchaseOrderDetails />} />
                                    <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
                                    <Route path="purchase-orders/:id/receive" element={<GoodsReceiptForm />} />
                                    <Route path="goods-receipts/:id" element={<GoodsReceiptDetails />} />
                                    <Route path="vendors" element={<VendorsPage />} />
                                    <Route path="vendors/new" element={<VendorForm />} />
                                    <Route path="vendors/:id" element={<VendorDetailPage />} />
                                    <Route path="vendors/:id/edit" element={<VendorForm />} />
                                    {/* <Route path="inventory" element={<InventoryRoutes />} /> */}
                                    <Route path="inventory/alerts" element={<InventoryAlertsPage />} />
                                    <Route path="user-organizations" element={<UserOrganizationsPage />} />
                                    <Route path="users" element={<UsersPage />} />
                                    <Route path="tasks" element={<TasksPage />} />
                                    <Route path="tasks/new" element={<TaskFormPage />} />
                                    <Route path="tasks/:id/edit" element={<TaskFormPage />} />
                                    <Route path="tasks/calendar" element={<FullTaskCalendar />} />
                                    <Route path="search" element={<SearchResultsPage />} />
                                    <Route path="settings" element={<SettingsPage />} />
                                    <Route path="customflow" element={<LogicFlowBuilder />} />
                                    <Route path="sales-assistant" element={<SalesAssistantPage />} />
                                    <Route path="org-setting" element={<OrganizationsPage />} />

                                    {/* <Route index element={<RestaurantSettings />} /> */}
                                    <Route path="restaurant/settings" element={<RestaurantSettings />} />
                                    <Route path="restaurant/menu" element={<MenuManagement />} />
                                    <Route path="restaurant/tags" element={<TagsManagement />} />
                                    <Route path="restaurant/options" element={<OptionsManagement />} />
                                    <Route path="restaurant/ordering" element={<OnlineOrdering />} />
                                    <Route path="restaurant/bookings" element={<BookingsManagement />} />
                                        

                                        <Route path="work-orders" element={<WorkOrdersPage />} />
                                        <Route path="work-orders/new" element={<WorkOrderForm />} />
                                        <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
                                        <Route path="work-orders/:id/edit" element={<WorkOrderForm />} />

                                        {/* Inventory routes */}
                                        <Route path="inventory">
                                            <Route index element={<InventoryDashboard />} />
                                            <Route path="products" element={<InventoryList />} />
                                            <Route path="products/:productId" element={<ProductDetails />} />
                                            <Route path="receive" element={<ReceiveInventory />} />
                                            <Route path="transfer" element={<TransferInventory />} />
                                            <Route path="transfer/:inventoryId" element={<TransferInventory />} />
                                            <Route path="adjust/:inventoryId" element={<AdjustInventory />} />
                                            <Route path="low-stock" element={<LowStockReport />} />
                                            <Route path="locations" element={<LocationManagement />} />
                                            <Route path="locations/:locationId" element={<LocationDetails />} />
                                            <Route path="transactions" element={<InventoryTransactions />} />
                                            <Route path="transactions/:transactionId" element={<TransactionDetails />} />
                                        </Route>
                                        
                                </Route>
                            </Routes>
                            <ToastContainer />
                        </TimeZoneProvider>
                      </OrganizationProvider>

                        {/* <Footer /> */}
                    </div>
                </AuthProvider>
            </Router>
        </GoogleOAuthProvider>
    );
}

export default App;