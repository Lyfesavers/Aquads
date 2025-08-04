import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { API_URL } from '../services/api';

const AdminDiscountCodes = ({ currentUser }) => {
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    maxDiscount: '',
    applicableTo: ['listing', 'bump', 'addons'],
    usageLimit: '',
    validFrom: '',
    validUntil: ''
  });

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const fetchDiscountCodes = async () => {
    try {
      const response = await fetch(`${API_URL}/discount-codes`, {
        headers: {
          'Authorization': `Bearer ${currentUser?.token || localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDiscountCodes(data);
      } else if (response.status === 401) {
        // Clear invalid token and show alert
        localStorage.removeItem('token');
        alert('Your session has expired. Please log in again.');
        setDiscountCodes([]);
      } else {
        console.error('Failed to fetch discount codes');
      }
    } catch (error) {
      console.error('Error fetching discount codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        validFrom: formData.validFrom || new Date().toISOString(),
        validUntil: formData.validUntil || null
      };

      const url = editingCode 
        ? `${API_URL}/discount-codes/${editingCode._id}`
        : `${API_URL}/discount-codes`;
      
      const method = editingCode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setEditingCode(null);
        resetForm();
        fetchDiscountCodes();
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        alert('Your session has expired. Please log in again.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save discount code');
      }
    } catch (error) {
      console.error('Error saving discount code:', error);
      alert('Failed to save discount code');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount code?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/discount-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser?.token || localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchDiscountCodes();
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        alert('Your session has expired. Please log in again.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete discount code');
      }
    } catch (error) {
      console.error('Error deleting discount code:', error);
      alert('Failed to delete discount code');
    }
  };

  const handleEdit = (code) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description,
      discountType: code.discountType,
      discountValue: code.discountValue.toString(),
      maxDiscount: code.maxDiscount ? code.maxDiscount.toString() : '',
      applicableTo: code.applicableTo,
      usageLimit: code.usageLimit ? code.usageLimit.toString() : '',
      validFrom: code.validFrom ? new Date(code.validFrom).toISOString().split('T')[0] : '',
      validUntil: code.validUntil ? new Date(code.validUntil).toISOString().split('T')[0] : ''
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      maxDiscount: '',
      applicableTo: ['listing', 'bump', 'addons'],
      usageLimit: '',
      validFrom: '',
      validUntil: ''
    });
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = e.target.checked;
      setFormData(prev => ({
        ...prev,
        applicableTo: checked 
          ? [...prev.applicableTo, value]
          : prev.applicableTo.filter(item => item !== value)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No expiration';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (code) => {
    if (!code.isActive) return <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">Inactive</span>;
    if (code.validUntil && new Date() > new Date(code.validUntil)) return <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">Expired</span>;
    if (code.usageLimit && code.usedCount >= code.usageLimit) return <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">Used Up</span>;
    return <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Active</span>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading discount codes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Discount Codes Management</h2>
        <button
          onClick={() => {
            setEditingCode(null);
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2"
        >
          <FaPlus />
          <span>Create New Code</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-700 text-gray-300">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Usage</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {discountCodes.map((code) => (
                <tr key={code._id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="px-6 py-4 font-mono">{code.code}</td>
                  <td className="px-6 py-4">{code.description}</td>
                  <td className="px-6 py-4 capitalize">{code.discountType}</td>
                  <td className="px-6 py-4">
                    {code.discountType === 'percentage' ? `${code.discountValue}%` : `$${code.discountValue}`}
                    {code.maxDiscount && code.discountType === 'percentage' && (
                      <span className="text-xs text-gray-400 block">Max: ${code.maxDiscount}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {code.usedCount} / {code.usageLimit || '∞'}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(code)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(code)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(code._id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingCode ? 'Edit Discount Code' : 'Create New Discount Code'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discount Type *
                  </label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                    min="0"
                    max={formData.discountType === 'percentage' ? "100" : undefined}
                    step="0.01"
                  />
                </div>

                {formData.discountType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Discount Amount
                    </label>
                    <input
                      type="number"
                      name="maxDiscount"
                      value={formData.maxDiscount}
                      onChange={handleChange}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    name="usageLimit"
                    value={formData.usageLimit}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valid From
                  </label>
                  <input
                    type="date"
                    name="validFrom"
                    value={formData.validFrom}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    name="validUntil"
                    value={formData.validUntil}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Applicable To
                </label>
                <div className="space-y-2">
                  {['listing', 'bump', 'addons'].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="applicableTo"
                        value={type}
                        checked={formData.applicableTo.includes(type)}
                        onChange={handleChange}
                        className="rounded"
                      />
                      <span className="text-gray-300 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {editingCode ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscountCodes; 