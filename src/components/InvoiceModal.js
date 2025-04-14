import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import invoiceService from '../services/invoiceService';

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
      // Calculate total for each item
      const itemsWithAmount = formData.items.map(item => ({
        ...item,
        amount: (item.quantity || 0) * (item.price || 0)
      }));

      const response = await invoiceService.createInvoice({
        ...formData,
        items: itemsWithAmount
      });
      
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
      showNotification(error.message || 'Failed to create invoice', 'error');
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
        
        <div className="my-4">
          <div className="h-3 w-full bg-gray-700 rounded mb-2"></div>
          <div className="h-3 w-3/4 bg-gray-700 rounded"></div>
        </div>
        
        <div className="border-t border-gray-700 my-3"></div>
        
        <div className="flex justify-between mb-2">
          <div className="h-3 w-32 bg-gray-700 rounded"></div>
          <div className="h-3 w-16 bg-gray-700 rounded"></div>
        </div>
        
        <div 
          className="h-8 w-full rounded flex items-center justify-center mt-3" 
          style={{ backgroundColor: color }}
        >
          <div className="h-3 w-24 bg-white bg-opacity-20 rounded"></div>
        </div>
      </div>
    );
  };

  // Invoice details form
  const renderInvoiceForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Due Date</label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm font-medium">Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block mb-1 text-sm font-medium">Payment Link <span className="text-red-400">*</span></label>
        <input
          type="url"
          name="paymentLink"
          placeholder="https://your-payment-provider.com/pay/..."
          value={formData.paymentLink}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 bg-gray-800 border ${errorMessage ? 'border-red-500' : 'border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          required
        />
        {errorMessage && (
          <p className="text-red-400 text-sm mt-1">{errorMessage}</p>
        )}
        <p className="text-gray-400 text-sm mt-1">
          Enter the link to your payment portal/gateway (e.g., PayPal, Stripe, etc.)
        </p>
      </div>
      
      <div>
        <label className="block mb-2 text-sm font-medium">Items</label>
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-2 bg-gray-800 p-3 rounded-md">
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-full md:w-24">
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-full md:w-32">
                <input
                  type="number"
                  placeholder="Price"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-full md:w-32 bg-gray-700 px-3 py-2 rounded-md">
                {((item.quantity || 0) * (item.price || 0)).toFixed(2)} {booking?.currency || 'USDC'}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="px-3 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center"
          >
            <span className="mr-1">+</span> Add Item
          </button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <div className="bg-gray-800 p-3 rounded-md w-full md:w-64">
          <div className="flex justify-between text-lg">
            <span>Total:</span>
            <span className="font-bold">{calculateTotal().toFixed(2)} {booking?.currency || 'USDC'}</span>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block mb-1 text-sm font-medium">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
        ></textarea>
      </div>
      
      <div className="border-t border-gray-700 pt-4 mt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );

  // Template selection tab
  const renderTemplateSelection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map(template => (
          <div key={template.id}>
            <div 
              className={`cursor-pointer p-2 rounded-md border-2 ${formData.templateId === template.id ? 'border-blue-500' : 'border-gray-700'}`}
              onClick={() => setFormData({...formData, templateId: template.id})}
            >
              {renderTemplatePreview(template.id)}
              <div className="mt-2 text-center">
                <div className="font-medium">{template.name}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-700 pt-4 mt-4">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Render invoice view
  const renderInvoiceView = () => {
    if (!invoice) return <div>Loading invoice...</div>;
    
    const template = TEMPLATES.find(t => t.id === invoice.templateId) || TEMPLATES[0];
    const isPaid = invoice.status === 'paid';
    const isCancelled = invoice.status === 'cancelled';
    const isSellerViewing = currentUser?.userId === invoice.sellerId;
    const isBuyerViewing = currentUser?.userId === invoice.buyerId;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</h2>
            <p className="text-gray-400">
              {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium
              ${invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' : 
                invoice.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 
                'bg-yellow-500/20 text-yellow-400'}`}
            >
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">From</h3>
            <p>{booking?.sellerId?.username || 'Seller'}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">To</h3>
            <p>{booking?.buyerName || 'Buyer'}</p>
            {booking?.buyerId?.email && <p className="text-gray-400">{booking.buyerId.email}</p>}
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-300 mb-3">Items</h3>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-700">
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-700">
                <tr>
                  <td colSpan="3" className="px-4 py-3 text-right font-semibold">Total</td>
                  <td className="px-4 py-3 text-right font-bold">{invoice.amount.toFixed(2)} {invoice.currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        {invoice.notes && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Notes</h3>
            <p className="text-gray-400">{invoice.notes}</p>
          </div>
        )}
        
        {invoice.dueDate && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Due Date</h3>
            <p className="text-gray-400">{new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
        )}
        
        {invoice.paymentLink && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Payment Details</h3>
            <p className="text-gray-400 break-words">
              <a 
                href={invoice.paymentLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {invoice.paymentLink}
              </a>
            </p>
          </div>
        )}
        
        {/* Payment actions */}
        <div className="border-t border-gray-700 pt-6 mt-6">
          {!isPaid && !isCancelled && isBuyerViewing && (
            <button
              onClick={handlePaymentClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-semibold text-lg transition-colors"
              disabled={loading}
            >
              Pay Now
            </button>
          )}
          
          {!isPaid && !isCancelled && isSellerViewing && (
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              className="w-full bg-red-600/30 hover:bg-red-600/40 text-white py-2 px-4 rounded-md transition-colors mt-3"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Cancel Invoice'}
            </button>
          )}
          
          {isPaid && (
            <div className="bg-green-500/20 text-green-400 p-4 rounded-lg text-center">
              <p className="font-semibold">Payment Completed!</p>
              <p className="text-sm">
                Paid on {new Date(invoice.paidAt).toLocaleDateString()} at {new Date(invoice.paidAt).toLocaleTimeString()}
              </p>
            </div>
          )}
          
          {isCancelled && (
            <div className="bg-red-500/20 text-red-400 p-4 rounded-lg text-center">
              <p className="font-semibold">Invoice Cancelled</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-4xl">
      <div className="text-white">
        {viewMode ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Invoice</h2>
            {renderInvoiceView()}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Create Invoice</h2>
            
            <div className="mb-4">
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab('template')}
                  className={`px-4 py-2 ${activeTab === 'template' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                >
                  Select Template
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                >
                  Invoice Details
                </button>
              </div>
            </div>
            
            {activeTab === 'template' ? renderTemplateSelection() : renderInvoiceForm()}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default InvoiceModal; 