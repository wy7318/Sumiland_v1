import { Routes, Route, Navigate } from 'react-router-dom';
import { InventoryDashboard } from './InventoryDashboard';
import { InventoryList } from './InventoryList';
import { ReceiveInventory } from './ReceiveInventory';
import { TransferInventory } from './TransferInventory';
import { AdjustInventory } from './AdjustInventory';
import { InventoryTransactions } from './InventoryTransactions';
import { LocationManagement } from './LocationManagement';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

// Individual location details component (placeholder)
const LocationDetails = () => <div>Location Details</div>;

// Individual transaction details component (placeholder)
const TransactionDetails = () => <div>Transaction Details</div>;

// Individual product details component (placeholder)
const ProductDetails = () => <div>Product Details</div>;

// Low stock report component (placeholder)
const LowStockReport = () => <div>Low Stock Report</div>;

export const InventoryRoutes = () => {
    const { user } = useAuth();
    const { selectedOrganization } = useOrganization();

    // If not authenticated or no organization selected, redirect to login
    if (!user || !selectedOrganization) {
        return <Navigate to="/login" />;
    }

    return (
        <Routes>
            {/* Dashboard */}
            <Route path="/" element={<InventoryDashboard />} />

            {/* Inventory List and Actions */}
            <Route path="/products" element={<InventoryList />} />
            <Route path="/products/:productId" element={<ProductDetails />} />
            <Route path="/receive" element={<ReceiveInventory />} />
            <Route path="/transfer" element={<TransferInventory />} />
            <Route path="/transfer/:inventoryId" element={<TransferInventory />} />
            <Route path="/adjust/:inventoryId" element={<AdjustInventory />} />
            <Route path="/low-stock" element={<LowStockReport />} />

            {/* Locations */}
            <Route path="/locations" element={<LocationManagement />} />
            <Route path="/locations/:locationId" element={<LocationDetails />} />

            {/* Transactions */}
            <Route path="/transactions" element={<InventoryTransactions />} />
            <Route path="/transactions/:transactionId" element={<TransactionDetails />} />

            {/* Catch-all redirect to inventory dashboard */}
            <Route path="*" element={<Navigate to="/admin/inventory" replace />} />
        </Routes>
    );
};

export default InventoryRoutes;