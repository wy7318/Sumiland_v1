import { Routes, Route } from 'react-router-dom';
import { PurchaseOrderList } from './PurchaseOrderList';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { PurchaseOrderDetails } from './PurchaseOrderDetails';
import { GoodsReceiptForm } from './GoodsReceiptForm';

export const PurchaseOrderRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<PurchaseOrderList />} />
            <Route path="/new" element={<PurchaseOrderForm />} />
            <Route path="/:id" element={<PurchaseOrderDetails />} />
            <Route path="/:id/edit" element={<PurchaseOrderForm />} />
            <Route path="/:id/receive" element={<GoodsReceiptForm />} />
        </Routes>
    );
};