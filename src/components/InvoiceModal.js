import React, { useState, useEffect } from 'react';
import invoiceService from '../services/invoiceService';
import { formatCurrency } from '../utils/formatters';

// Invoice templates
const TEMPLATES = [
  { id: 'default', name: 'Simple', color: '#3b82f6' },
  { id: 'professional', name: 'Professional', color: '#10b981' },
  { id: 'modern', name: 'Modern', color: '#8b5cf6' },
];

const InvoiceModal = ({
  booking,
  onClose,
  showNotification,
  isSeller,
  currentUser,
  existingInvoice = null,
  onInvoiceCreated = () => {},
  onSendMessage = null,
}) => {
  const [formData, setFormData] = useState({
    bookingId: booking?._id || '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: booking?.serviceId?.title || 'Service', quantity: 1, price: booking?.price || 0 }],
    description: `Invoice for ${booking?.serviceId?.title || 'service'}`,
    notes: 'Thank you for your business!',
    templateId: 'default',
    paymentLink: ''
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(!!existingInvoice);
  const [invoice, setInvoice] = useState(existingInvoice);
  const [activeTab, setActiveTab] = useState('details');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (booking) {
      setFormData(prev => ({
        ...prev,
        bookingId: booking._id,
        description: `Invoice for ${booking.serviceId?.title || 'service'}`,
        items: [{
          description: booking.serviceId?.title || 'Service',
          quantity: 1,
          price: booking.price || 0,
          amount: booking.price || 0
        }],
      }));
    }
  }, [booking]);

  useEffect(() => {
    if (existingInvoice) {
      setInvoice(existingInvoice);
      setViewMode(true);
    }
  }, [existingInvoice]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error if payment link field is being updated
    if (name === 'paymentLink' && errorMessage) {
      setErrorMessage('');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    
    // Update amount automatically
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].quantity = updatedItems[index].quantity || 0;
      updatedItems[index].price = updatedItems[index].price || 0;
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].price;
    }
    
    setFormData({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, price: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const amount = (item.quantity || 0) * (item.price || 0);
      return sum + amount;
    }, 0);
  };

  const validateForm = () => {
    if (!formData.paymentLink) {
      setErrorMessage('Payment link is required');
      return false;
    }
    
    if (!formData.paymentLink.startsWith('http://') && !formData.paymentLink.startsWith('https://')) {
      setErrorMessage('Payment link must be a valid URL starting with http:// or https://');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      // Ensure booking is available
      if (!booking || !booking._id) {
        throw new Error('Booking information is missing');
      }

      // Calculate total for each item
      const itemsWithAmount = formData.items.map(item => ({
        ...item,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        amount: Number(item.quantity || 0) * Number(item.price || 0),
      }));

      // Calculate total amount
      const totalAmount = itemsWithAmount.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Create payload with all required fields
      const invoiceData = {
        bookingId: booking._id,
        dueDate: formData.dueDate,
        description: formData.description || `Invoice for ${booking?.serviceId?.title || 'service'}`,
        items: itemsWithAmount,
        notes: formData.notes || '',
        templateId: formData.templateId || 'default',
        paymentLink: formData.paymentLink,
        // Include calculated amount
        amount: totalAmount,
        // Include currency if available from booking
        currency: booking.currency || 'USD',
      };

      const response = await invoiceService.createInvoice(invoiceData);
      
      setInvoice(response);
      setViewMode(true);
      showNotification('Invoice created successfully!', 'success');
      onInvoiceCreated(response);
      
      // If onSendMessage is provided, send a message about the invoice
      if (onSendMessage) {
        const message = `I've created invoice #${response.invoiceNumber} for you. You can view the invoice and make payment through the provided payment link.`;
        onSendMessage(message);
      }
    } catch (error) {
      // Enhanced error reporting
      let errorMsg = 'Failed to create invoice';
      
      if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMsg = error.response.data.message;
        } else if (error.response.data.error) {
          errorMsg = error.response.data.error;
        }
      }
      
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!invoice) return;
    setLoading(true);

    try {
      const updatedInvoice = await invoiceService.updateInvoiceStatus(invoice._id, status);
      setInvoice(updatedInvoice);
      showNotification(`Invoice marked as ${status}`, 'success');
      
      // If onSendMessage is provided, send a message about the status update
      if (onSendMessage) {
        const message = `Invoice #${invoice.invoiceNumber} has been marked as ${status}.`;
        onSendMessage(message);
      }
    } catch (error) {
      showNotification(error.message || `Failed to update invoice to ${status}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePaymentClick = () => {
    if (invoice && invoice.paymentLink) {
      window.open(invoice.paymentLink, '_blank');
    }
  };

  // Render invoice template preview based on the selected template
  const renderTemplatePreview = (templateId) => {
    const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
    const color = template.color;
    
    return (
      <div className="border border-gray-700 rounded-md p-4 bg-gray-900">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div 
              className="h-6 w-20 mb-2 rounded" 
              style={{ backgroundColor: color }}
            ></div>
            <div className="h-3 w-32 bg-gray-600 rounded mb-1"></div>
            <div className="h-3 w-24 bg-gray-700 rounded"></div>
          </div>
          <div className="text-right">
            <div className="h-4 w-16 bg-gray-600 rounded mb-1 ml-auto"></div>
            <div className="h-3 w-24 bg-gray-700 rounded"></div>
          </div>
        </div>
        <div className="border-t border-gray-700 my-3"></div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-700 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-700 rounded"></div>
        </div>
        <div className="border-t border-gray-700 my-3"></div>
        <div className="flex justify-end">
          <div className="h-6 w-24 rounded" style={{ backgroundColor: color }}></div>
        </div>
      </div>
    );
  };

  // Render invoice form
  const renderInvoiceForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Payment Link (required)</label>
        <input
          type="url"
          name="paymentLink"
          value={formData.paymentLink}
          onChange={handleInputChange}
          placeholder="https://paypal.me/yourusername or other payment link"
          className={`w-full px-3 py-2 bg-gray-700 border ${
            errorMessage ? 'border-red-500' : 'border-gray-600'
          } rounded text-white`}
          required
        />
        {errorMessage && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
        
        {/* Payment Provider Helper Buttons */}
        <div className="mt-2">
          <p className="text-xs text-gray-400 mb-2">Quick select payment provider:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFormData({...formData, paymentLink: 'https://paypal.me/yourusername'})}
              className="px-3 py-1 text-xs rounded-full border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
            >
              💳 PayPal
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, paymentLink: 'https://buy.stripe.com/your-payment-link'})}
              className="px-3 py-1 text-xs rounded-full border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors"
            >
              💰 Stripe
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, paymentLink: 'https://nowpayments.io/payment/your-invoice-link'})}
              className="px-3 py-1 text-xs rounded-full border border-green-500 text-green-400 hover:bg-green-500 hover:text-white transition-colors"
            >
              ₿ NOWPayments
            </button>
          </div>
        </div>
        
        <p className="mt-1 text-xs text-gray-400">
          Enter the link where the buyer can make payment (PayPal, Stripe, etc.)
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Items</label>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700 rounded-md">
            <thead>
              <tr className="bg-gray-700">
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-300">Description</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 w-24">Qty</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 w-28">Price</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 w-28">Amount</th>
                <th className="py-2 px-4 w-14"></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index} className="border-t border-gray-700">
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                      required
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                      min="1"
                      required
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td className="py-2 px-4 text-gray-300">
                    {(item.quantity * item.price).toFixed(2)}
                  </td>
                  <td className="py-2 px-4">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700">
                <td colSpan="5" className="py-2 px-4">
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    + Add Item
                  </button>
                </td>
              </tr>
              <tr className="border-t border-gray-700 bg-gray-700">
                <td colSpan="3" className="py-2 px-4 text-right font-medium text-gray-300">Total:</td>
                <td className="py-2 px-4 font-medium text-white">{calculateTotal().toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="3"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
        ></textarea>
      </div>

      <div className="mt-4 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="mr-2 animate-spin">◌</span>
              Processing...
            </>
          ) : (
            'Create Invoice'
          )}
        </button>
      </div>
    </form>
  );
  
  // Render template selection tab
  const renderTemplateSelection = () => (
    <div className="space-y-4">
      <p className="text-gray-300 mb-4">Choose a template for your invoice:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map(template => (
          <div 
            key={template.id}
            className={`cursor-pointer rounded-lg overflow-hidden border-2 ${
              formData.templateId === template.id ? 'border-blue-500' : 'border-gray-700'
            }`}
            onClick={() => setFormData({...formData, templateId: template.id})}
          >
            <div className="h-8 w-full" style={{ backgroundColor: template.color }}></div>
            <div className="p-3 bg-gray-800">
              <h4 className="font-medium text-gray-200">{template.name}</h4>
              {renderTemplatePreview(template.id)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Save Template
        </button>
      </div>
    </div>
  );
  
  // Render invoice preview/view
  const renderInvoiceView = () => {
    if (!invoice) return null;
    
    const template = TEMPLATES.find(t => t.id === invoice.templateId) || TEMPLATES[0];
    const statusColor = invoice.status === 'paid' 
      ? 'bg-green-500' 
      : invoice.status === 'cancelled' 
        ? 'bg-red-500' 
        : 'bg-yellow-500';
    
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="h-2 w-full" style={{ backgroundColor: template.color }}></div>
        
        <div className="p-6">
          <div className="flex justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">INVOICE</h2>
              <p className="text-gray-400 text-sm">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <span className={`${statusColor} text-white px-3 py-1 rounded-full text-xs uppercase font-bold`}>
                {invoice.status}
              </span>
              <p className="text-gray-400 text-sm mt-2">
                Created: {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
              <p className="text-gray-400 text-sm">
                Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-gray-300 font-medium mb-2">Description</h3>
            <p className="text-white bg-gray-700 p-3 rounded">{invoice.description}</p>
          </div>
          
          {/* Items */}
          <div className="mt-6">
            <h3 className="text-gray-300 font-medium mb-2">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 border border-gray-700 rounded-md">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-300">Description</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 w-16">Qty</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 w-24">Price</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-t border-gray-700">
                      <td className="py-2 px-4 text-gray-300">{item.description}</td>
                      <td className="py-2 px-4 text-gray-300">{item.quantity}</td>
                      <td className="py-2 px-4 text-gray-300">{item.price.toFixed(2)}</td>
                      <td className="py-2 px-4 text-gray-300">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700 bg-gray-700">
                    <td colSpan="3" className="py-2 px-4 text-right font-medium text-gray-300">Total:</td>
                    <td className="py-2 px-4 font-medium text-white">{invoice.amount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6">
              <h3 className="text-gray-300 font-medium mb-2">Notes</h3>
              <p className="text-gray-300 bg-gray-700 p-3 rounded">{invoice.notes}</p>
            </div>
          )}
          
          {/* Payment Actions */}
          <div className="mt-6 flex flex-col md:flex-row gap-3 justify-between">
            <div>
              {invoice.status === 'pending' && isSeller && (
                <button
                  onClick={() => handleStatusUpdate('cancelled')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                  disabled={loading}
                >
                  Cancel Invoice
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              {invoice.status === 'pending' && (
                <>
                  {isSeller && (
                    <button
                      onClick={() => handleStatusUpdate('paid')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                      disabled={loading}
                    >
                      Mark as Paid
                    </button>
                  )}
                  
                  <button
                    onClick={handlePaymentClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    disabled={loading}
                  >
                    Pay Now
                  </button>
                </>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl text-blue-400 font-semibold">
            {viewMode ? `Invoice #${invoice?.invoiceNumber}` : 'Create Invoice'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✖
          </button>
        </div>
        
        <div className="p-6">
          {viewMode ? (
            renderInvoiceView()
          ) : (
            <>
              <div className="mb-6">
                <div className="flex border-b border-gray-700">
                  <button
                    className={`px-4 py-2 ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                    onClick={() => setActiveTab('details')}
                  >
                    Invoice Details
                  </button>
                  <button
                    className={`px-4 py-2 ${activeTab === 'template' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                    onClick={() => setActiveTab('template')}
                  >
                    Template
                  </button>
                </div>
              </div>
              
              {activeTab === 'details' ? renderInvoiceForm() : renderTemplateSelection()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal; 