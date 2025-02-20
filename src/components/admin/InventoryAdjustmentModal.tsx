import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, AlertCircle, Scale, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Product = {
  id: string;
  name: string;
  stock_unit: 'weight' | 'quantity';
  weight_unit: 'kg' | 'g' | 'lb' | 'oz' | null;
  min_stock_level: number;
  max_stock_level: number | null;
};

type Props = {
  product: Product | null;
  onClose: () => void;
  onSave: () => Promise<void>;
};

export function InventoryAdjustmentModal({ product, onClose, onSave }: Props) {
  const [quantity, setQuantity] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Validate input
    if (product.stock_unit === 'quantity') {
      const numericQuantity = parseFloat(quantity);
      if (isNaN(numericQuantity)) {
        setError('Please enter a valid quantity');
        return;
      }
    } else {
      const numericWeight = parseFloat(weight);
      if (isNaN(numericWeight)) {
        setError('Please enter a valid weight');
        return;
      }
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create inventory transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: product.id,
          transaction_type: 'adjustment',
          // For weight-based products
          quantity: product.stock_unit === 'weight' 
            ? null  // Not used for weight-based
            : parseFloat(-quantity),  // Use quantity for quantity-based
          // For weight-based products
          weight: product.stock_unit === 'weight'
            ? parseFloat(-weight)  // Use weight for weight-based
            : null,  // Not used for quantity-based
          weight_unit: product.stock_unit === 'weight'
            ? product.weight_unit
            : null,
          reference_type: 'adjustment',
          notes: reason,
          created_by: userData.user.id
        }]);

      if (transactionError) throw transactionError;

      await onSave();
      onClose();
    } catch (err) {
      console.error('Error creating adjustment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create adjustment');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Inventory Adjustment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <div className="p-2 border rounded-lg bg-gray-50 flex items-center">
              {product.stock_unit === 'quantity' ? (
                <Package className="w-5 h-5 text-gray-400 mr-2" />
              ) : (
                <Scale className="w-5 h-5 text-gray-400 mr-2" />
              )}
              <div>
                <div>{product.name}</div>
                <div className="text-sm text-gray-500">
                  Tracking by: {product.stock_unit === 'quantity' ? 'Units' : `Weight (${product.weight_unit})`}
                </div>
              </div>
            </div>
          </div>

          {product.stock_unit === 'quantity' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Adjustment
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => {
                  // Allow only numbers, decimal point, and minus sign
                  const value = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(value)) {
                    setQuantity(value);
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                placeholder="Enter positive to add, negative to subtract"
              />
              <p className="mt-1 text-sm text-gray-500">
                Unit: pieces
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight Adjustment
              </label>
              <input
                type="text"
                value={weight}
                onChange={(e) => {
                  // Allow only numbers, decimal point, and minus sign
                  const value = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(value)) {
                    setWeight(value);
                  }
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                placeholder="Enter positive to add, negative to subtract"
              />
              <p className="mt-1 text-sm text-gray-500">
                Unit: {product.weight_unit}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Adjustment
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              placeholder="Explain why this adjustment is needed"
              required
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!quantity && !weight) || !reason.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}