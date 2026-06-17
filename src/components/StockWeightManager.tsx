'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

interface Product {
  _id: string;
  name: string;
  stock: number;
  weight: number;
}

export default function StockWeightManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ stock: 0, weight: 0 });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product._id);
    setEditData({ stock: product.stock, weight: product.weight });
  };

  const handleSave = async (productId: string) => {
    try {
      await apiClient.put(`/products/${productId}`, editData);
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  if (loading) return <div className="p-4">Loading products...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Manage Stock & Weight</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Product Name</th>
              <th className="border p-2 text-left">Stock</th>
              <th className="border p-2 text-left">Weight (kg)</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="border p-2">{product.name}</td>
                <td className="border p-2">
                  {editingId === product._id ? (
                    <input
                      type="number"
                      value={editData.stock}
                      onChange={e => setEditData({ ...editData, stock: parseInt(e.target.value) })}
                      className="border rounded px-2 py-1 w-24"
                    />
                  ) : (
                    product.stock
                  )}
                </td>
                <td className="border p-2">
                  {editingId === product._id ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editData.weight}
                      onChange={e => setEditData({ ...editData, weight: parseFloat(e.target.value) })}
                      className="border rounded px-2 py-1 w-24"
                    />
                  ) : (
                    product.weight
                  )}
                </td>
                <td className="border p-2">
                  {editingId === product._id ? (
                    <>
                      <button
                        onClick={() => handleSave(product._id)}
                        className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-gray-400 text-white px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(product)}
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
