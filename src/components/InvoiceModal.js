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
    paymentLink: '',
    paymentMethod: 'external'
  });

  const sellerAquaPay = currentUser?.aquaPay || booking?.sellerId?.aquaPay;
  const sellerHasWallets = sellerAquaPay?.wallets && (
    sellerAquaPay.wallets.solana || sellerAquaPay.wallets.ethereum
  );
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
    if (formData.paymentMethod === 'crypto_escrow') {
      return true;
    }
    
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

      const invoiceData = {
        bookingId: booking._id,
        dueDate: formData.dueDate,
        description: formData.description || `Invoice for ${booking?.serviceId?.title || 'service'}`,
        items: itemsWithAmount,
        notes: formData.notes || '',
        templateId: formData.templateId || 'default',
        paymentLink: formData.paymentMethod === 'crypto_escrow' ? '' : formData.paymentLink,
        paymentMethod: formData.paymentMethod || 'external',
        amount: totalAmount,
        currency: formData.paymentMethod === 'crypto_escrow' ? 'USDC' : (booking.currency || 'USD'),
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, paymentMethod: 'external' })}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
              formData.paymentMethod === 'external'
                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            💳 External Link
          </button>
          <button
            type="button"
            onClick={() => {
              if (sellerHasWallets) {
                setFormData({ ...formData, paymentMethod: 'crypto_escrow', paymentLink: '' });
              }
            }}
            disabled={!sellerHasWallets}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
              formData.paymentMethod === 'crypto_escrow'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                : sellerHasWallets
                  ? 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            🛡️ Crypto (Escrow)
          </button>
        </div>

        {formData.paymentMethod === 'crypto_escrow' ? (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 text-sm mt-0.5">🛡️</span>
              <div>
                <p className="text-emerald-300 text-sm font-medium">Escrow Protected Payment</p>
                <p className="text-emerald-400/70 text-xs mt-1">
                  A secure escrow payment link will be auto-generated. Buyer deposits USDC which is held until they approve the work. 1.25% platform fee applies.
                </p>
              </div>
            </div>
            {booking?.escrowId && (
              <div className="mt-2 pt-2 border-t border-emerald-700/30">
                <p className="text-amber-400 text-xs">This booking already has an active escrow.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment Link (required)</label>
            <input
              type="url"
              name="paymentLink"
              value={formData.paymentLink}
              onChange={handleInputChange}
              placeholder="https://paypal.me/yourusername or other payment link"
              className={`w-full px-3 py-2.5 bg-gray-700 border ${
                errorMessage ? 'border-red-500' : 'border-gray-600'
              } rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors`}
              required
            />
            {errorMessage && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
            
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-2">Create payment links:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.open('https://www.paypal.com/paypalme/', '_blank')}
                  className="px-3 py-1 text-xs rounded-full border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                >
                  💳 PayPal.me
                </button>
                <button
                  type="button"
                  onClick={() => window.open('https://dashboard.stripe.com/payment-links', '_blank')}
                  className="px-3 py-1 text-xs rounded-full border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors"
                >
                  💰 Stripe Links
                </button>
              </div>
            </div>
            
            <p className="mt-1 text-xs text-gray-400">
              Enter the link where the buyer can make payment (PayPal, Stripe, etc.)
            </p>
          </>
        )}

        {!sellerHasWallets && formData.paymentMethod !== 'crypto_escrow' && (
          <p className="mt-2 text-xs text-amber-400/70">
            Set up AquaPay wallets in your profile to enable escrow-protected crypto payments.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Items</label>
        
        {/* Desktop table - hidden on small screens */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-700">
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Qty</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Price</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Amount</th>
                <th className="py-2.5 px-4 w-14"></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index} className="border-t border-gray-700">
                  <td className="py-2.5 px-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none"
                      required
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none"
                      min="1"
                      required
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 outline-none"
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td className="py-2.5 px-4 text-gray-300 font-medium">
                    {(item.quantity * item.price).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
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
                <td colSpan="5" className="py-2.5 px-4">
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                  >
                    + Add Item
                  </button>
                </td>
              </tr>
              <tr className="border-t border-gray-700 bg-gray-700">
                <td colSpan="3" className="py-3 px-4 text-right font-semibold text-gray-300">Total:</td>
                <td className="py-3 px-4 font-semibold text-white text-lg">{calculateTotal().toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile card layout - shown only on small screens */}
        <div className="sm:hidden space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="bg-gray-750 border border-gray-700 rounded-lg p-3 space-y-2.5" style={{ backgroundColor: 'rgb(42, 47, 55)' }}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-400 uppercase">Item {index + 1}</span>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 text-xs"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                    className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Price</label>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                    className="w-full px-2.5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Amount</label>
                  <div className="w-full px-2.5 py-2 bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 text-sm font-medium">
                    {(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addItem}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            + Add Item
          </button>
          
          <div className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
            <span className="font-semibold text-gray-300">Total:</span>
            <span className="font-semibold text-white text-lg">{calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="3"
          className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-y"
        ></textarea>
      </div>

      <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center font-medium transition-colors"
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map(template => (
          <div 
            key={template.id}
            className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
              formData.templateId === template.id ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setFormData({...formData, templateId: template.id})}
          >
            <div className="h-8 w-full" style={{ backgroundColor: template.color }}></div>
            <div className="p-3 sm:p-4 bg-gray-800">
              <h4 className="font-medium text-gray-200 mb-2">{template.name}</h4>
              {renderTemplatePreview(template.id)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {/* Colored header bar */}
        <div className="h-2 w-full" style={{ backgroundColor: template.color }}></div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">INVOICE</h2>
              <p className="text-gray-400 text-sm sm:text-base">#{invoice.invoiceNumber}</p>
            </div>
            <div className="sm:text-right flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
              <span className={`${statusColor} text-white px-3 py-1 rounded-full text-xs uppercase font-bold inline-block`}>
                {invoice.status}
              </span>
              <div className="flex flex-row sm:flex-col gap-2 sm:gap-0 text-xs sm:text-sm text-gray-400 sm:mt-2">
                <p>Created: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                <p>Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          {/* Description */}
          <div className="mt-5 sm:mt-6">
            <h3 className="text-gray-300 font-medium mb-2 text-sm uppercase tracking-wider">Description</h3>
            <p className="text-white bg-gray-700/50 p-3 sm:p-4 rounded-lg border border-gray-600/50">{invoice.description}</p>
          </div>
          
          {/* Items - Desktop table */}
          <div className="mt-5 sm:mt-6">
            <h3 className="text-gray-300 font-medium mb-2 text-sm uppercase tracking-wider">Items</h3>
            
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-20">Qty</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-28">Price</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-t border-gray-700">
                      <td className="py-3 px-4 text-gray-300">{item.description}</td>
                      <td className="py-3 px-4 text-gray-300">{item.quantity}</td>
                      <td className="py-3 px-4 text-gray-300">{item.price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-300 font-medium">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-600 bg-gray-700">
                    <td colSpan="3" className="py-3 px-4 text-right font-semibold text-gray-300">Total:</td>
                    <td className="py-3 px-4 font-bold text-white text-lg">{invoice.amount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Items - Mobile card layout */}
            <div className="sm:hidden space-y-2">
              {invoice.items.map((item, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                  <p className="text-white font-medium text-sm mb-2">{item.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block">Qty</span>
                      <span className="text-gray-200">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Price</span>
                      <span className="text-gray-200">{item.price.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Amount</span>
                      <span className="text-white font-medium">{item.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold text-gray-300">Total:</span>
                <span className="font-bold text-white text-lg">{invoice.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Notes */}
          {invoice.notes && (
            <div className="mt-5 sm:mt-6">
              <h3 className="text-gray-300 font-medium mb-2 text-sm uppercase tracking-wider">Notes</h3>
              <p className="text-gray-300 bg-gray-700/50 p-3 sm:p-4 rounded-lg border border-gray-600/50">{invoice.notes}</p>
            </div>
          )}
          
          {/* Payment Actions */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3 justify-between">
            <div className="order-2 sm:order-1">
              {invoice.status === 'pending' && isSeller && (
                <button
                  onClick={() => handleStatusUpdate('cancelled')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel Invoice
                </button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
              {invoice.status === 'pending' && (
                <>
                  {isSeller && (
                    <button
                      onClick={() => handleStatusUpdate('paid')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      disabled={loading}
                    >
                      Mark as Paid
                    </button>
                  )}
                  
                  <button
                    onClick={handlePaymentClick}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    disabled={loading}
                  >
                    Pay Now
                  </button>
                </>
              )}
              
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl flex flex-col" style={{ maxHeight: 'calc(100vh - 1rem)', height: 'auto' }}>
        {/* Sticky header */}
        <div className="border-b border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg sm:text-xl text-blue-400 font-semibold truncate mr-4">
            {viewMode ? `Invoice #${invoice?.invoiceNumber}` : 'Create Invoice'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors">
            ✖
          </button>
        </div>
        
        {/* Scrollable body */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 min-h-0">
          {viewMode ? (
            renderInvoiceView()
          ) : (
            <>
              <div className="mb-6">
                <div className="flex border-b border-gray-700">
                  <button
                    className={`px-3 sm:px-4 py-2 text-sm sm:text-base transition-colors ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('details')}
                  >
                    Invoice Details
                  </button>
                  <button
                    className={`px-3 sm:px-4 py-2 text-sm sm:text-base transition-colors ${activeTab === 'template' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
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