import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { BlogPage } from './components/BlogPage';
import { BlogPost } from './components/BlogPost';
import { Footer } from './components/Footer';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { AdminLayout } from './components/admin/AdminLayout';
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
import { PurchaseOrdersPage } from './components/admin/PurchaseOrdersPage';
import { PurchaseOrderForm } from './components/admin/PurchaseOrderForm';
import { PurchaseOrderDetailPage } from './components/admin/PurchaseOrderDetailPage';
import { VendorsPage } from './components/admin/VendorsPage';
import { VendorForm } from './components/admin/VendorForm';
import { VendorDetailPage } from './components/admin/VendorDetailPage';
import { InventoryPage } from './components/admin/InventoryPage';
import { InventoryAlertsPage } from './components/admin/InventoryAlertsPage';
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

function App() {
    const { scrollYProgress } = useScroll();

    return (
        <Router>
            <AuthProvider>
              
                <div className="relative">
                    <motion.div
                        className="fixed top-0 left-0 right-0 h-1 bg-primary-500 origin-left z-50"
                        style={{ scaleX: scrollYProgress }}
                    />
                    <Navigation />
                  <OrganizationProvider>

                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/:slug" element={<BlogPost />} />
                        <Route path="/portfolio" element={<PortfolioPage />} />

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

                        {/* Protected Admin Routes */}
                        <Route
                            path="/admin/*"
                            element={
                                <ProtectedRoute>
                                    <AdminLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<PostsPage />} />
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
                            <Route path="orders/:id" element={<OrderDetailPage />} />
                            <Route path="orders/:id/edit" element={<OrderForm />} />
                            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                            <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
                            <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                            <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
                            <Route path="vendors" element={<VendorsPage />} />
                            <Route path="vendors/new" element={<VendorForm />} />
                            <Route path="vendors/:id" element={<VendorDetailPage />} />
                            <Route path="vendors/:id/edit" element={<VendorForm />} />
                            <Route path="inventory" element={<InventoryPage />} />
                            <Route path="inventory/alerts" element={<InventoryAlertsPage />} />
                            <Route path="user-organizations" element={<UserOrganizationsPage />} />
                            <Route path="users" element={<UsersPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Routes>
                  </OrganizationProvider>

                    <Footer />
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;