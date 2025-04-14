import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../services/api';
import logger from '../utils/logger';
import InvoiceModal from './InvoiceModal';
import invoiceService from '../services/invoiceService';

const BookingConversation = ({ booking, currentUser, onClose, showNotification }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isSeller = booking?.sellerId?._id === currentUser?.userId;

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages();
    if (isSeller || (booking?.buyerId?._id === currentUser?.userId)) {
      fetchInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking._id]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch invoices for the current booking
  const fetchInvoices = async () => {
    try {
      const invoiceData = await invoiceService.getInvoicesByBookingId(booking._id);
      setInvoices(invoiceData);
    } catch (err) {
      logger.error('Error fetching invoices:', err);
      // Don't show notification for this to avoid cluttering the UI
    }
  };

  // Function to verify image URL exists
  const verifyImage = async (url) => {
    try {
      logger.log('Verifying image URL:', url);
      const response = await fetch(url, { method: 'HEAD' });
      logger.log('Image verification response:', response.status, response.statusText);
      return response.ok;
    } catch (error) {
      logger.error('Error verifying image:', error);
      return false;
    }
  };

  // Update the fetchMessages function to check image URLs
  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/bookings/${booking._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      
      // Process attachment URLs to ensure they are properly formatted
      const processedData = data.map(msg => {
        if (msg.attachment) {
          // If the attachment starts with a slash, it's a relative path
          if (msg.attachment.startsWith('/')) {
            // Extract the base API URL without the '/api' part
            const baseUrl = API_URL.replace(/\/api$/, '');
            // Create full URL
            msg.attachmentFullUrl = `${baseUrl}${msg.attachment}`;
            logger.log('Processed attachment URL:', msg.attachmentFullUrl);
          } else {
            // URL is already absolute
            msg.attachmentFullUrl = msg.attachment;
          }
        }
        return msg;
      });
      
      setMessages(processedData);
    } catch (err) {
      logger.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
      showNotification('Failed to load messages. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showNotification('File size exceeds 10MB limit', 'error');
        return;
      }
      
      setAttachment(file);
      showNotification(`File selected: ${file.name}`, 'info');
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !attachment) return;
    
    try {
      // Create form data to send files
      const formData = new FormData();
      if (newMessage.trim()) {
        formData.append('message', newMessage);
      }
      
      if (attachment) {
        formData.append('attachment', attachment);
      }
      
      const response = await fetch(`${API_URL}/bookings/${booking._id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const sentMessage = await response.json();
      setMessages([...messages, sentMessage]);
      setNewMessage('');
      setAttachment(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      logger.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      showNotification('Failed to send message. Please try again.', 'error');
    }
  };

  // Handle creating a new invoice
  const handleCreateInvoice = () => {
    setShowInvoiceModal(true);
  };

  // Handle closing the invoice modal
  const handleCloseInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  };

  // Handle invoice creation success
  const handleInvoiceCreated = (invoice) => {
    // Add the new invoice to the list
    setInvoices(prev => [invoice, ...prev]);
    // Close the modal
    setShowInvoiceModal(false);
  };

  // Handle sending a message from the invoice modal
  const handleSendInvoiceMessage = (message) => {
    // Set the message and immediately send it
    setNewMessage(message);
    const event = { preventDefault: () => {} };
    // Call handleSendMessage with a fake event
    setTimeout(() => {
      if (message === newMessage) {
        handleSendMessage(event);
      }
    }, 100);
  };

  // View an invoice
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  // Determine if a message is from the current user
  const isCurrentUserMessage = (senderId) => {
    return senderId._id === currentUser.userId;
  };

  // Format timestamp
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Render message content including any attachments
  const renderMessageContent = (msg) => {
    // Helper function to get API base URL without "/api"
    const getBaseUrl = () => {
      return API_URL.replace(/\/api$/, '');
    };
    
    // Helper function to extract filename from attachment URL
    const getFilename = (url) => {
      return url.split('/').pop();
    };
    
    // Generate all possible URL formats for an attachment
    const generateAttachmentUrls = (attachment) => {
      const filename = getFilename(attachment);
      const baseUrl = getBaseUrl();
      
      return {
        original: attachment,
        relative: `/uploads/bookings/${filename}`,
        fullRelative: `${baseUrl}/uploads/bookings/${filename}`,
        apiEndpoint: `${API_URL}/bookings/uploads/${filename}`,
        directEndpoint: `${baseUrl}/uploads/bookings/${filename}`,
        queryParam: `${API_URL}/bookings/file?filename=${filename}&bookingId=${booking._id}`
      };
    };
    
    // Choose best image URL to display
    const getBestImageUrl = () => {
      // If we have a data URL, use it as the most reliable source
      if (msg.dataUrl) {
        logger.log('Using embedded data URL for image');
        return msg.dataUrl;
      }
      
      if (!msg.attachment) return null;
      
      // If we've already processed the URL during fetch
      if (msg.attachmentFullUrl) {
        return msg.attachmentFullUrl;
      }
      
      // Otherwise generate the best URL based on the attachment
      const urls = generateAttachmentUrls(msg.attachment);
      // Try the query parameter endpoint first as it's most likely to work
      return urls.queryParam;
    };

    // Check if the message is about an invoice
    const invoiceMatch = msg.message && typeof msg.message === 'string' && msg.message.match(/Invoice #(INV-\d{4}-\d{4})/);
    const invoiceNumberFromMessage = invoiceMatch ? invoiceMatch[1] : null;
    const invoiceFromMessage = invoiceNumberFromMessage ? 
      invoices.find(inv => inv.invoiceNumber === invoiceNumberFromMessage) : null;

    return (
      <>
        {msg.message && <p className="text-sm whitespace-pre-wrap mb-2">{msg.message}</p>}
        
        {/* If this is an invoice message and we found the invoice, show a button to view it */}
        {invoiceFromMessage && (
          <div className="mt-2">
            <button
              onClick={() => handleViewInvoice(invoiceFromMessage)}
              className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-sm"
            >
              View Invoice #{invoiceFromMessage.invoiceNumber}
            </button>
          </div>
        )}
        
        {msg.attachment && msg.attachmentType === 'image' && (
          <div className="mt-2 relative">
            <img 
              src={getBestImageUrl()} 
              alt={msg.attachmentName || "Attachment"}
              className={`max-w-full rounded-lg max-h-60 object-contain cursor-pointer border ${
                msg.isWatermarked ? 'border-yellow-500' : 'border-gray-700'
              }`}
              onClick={() => {
                // For data URLs, open in a new window directly
                if (msg.dataUrl) {
                  const newWindow = window.open();
                  newWindow.document.write(`
                    <html>
                      <head>
                        <title>${msg.attachmentName || 'Image'}</title>
                        <style>
                          body { 
                            margin: 0; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh;
                            background-color: #0f172a;
                          }
                          img {
                            max-width: 100%;
                            max-height: 100vh;
                            object-fit: contain;
                          }
                        </style>
                      </head>
                      <body>
                        <img src="${msg.dataUrl}" alt="${msg.attachmentName || 'Image'}" />
                      </body>
                    </html>
                  `);
                } else {
                  window.open(getBestImageUrl(), '_blank');
                }
              }}
            />
          </div>
        )}
        
        {msg.attachment && msg.attachmentType === 'file' && (
          <div className="mt-2">
            <a 
              href={getBestImageUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-blue-400 hover:text-blue-300"
            >
              <span className="mr-2">📎</span>
              {msg.attachmentName || getFilename(msg.attachment)}
            </a>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
        <h3 className="text-xl text-blue-400 font-semibold">
          Conversation: {booking.serviceId.title}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✖
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center my-4">{error}</div>
      ) : (
        <>
          <div className="h-96 overflow-y-auto mb-4 p-2 bg-gray-900 rounded-lg">
            {messages.length === 0 ? (
              <div className="text-gray-400 text-center py-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`mb-4 ${
                    isCurrentUserMessage(msg.sender) ? 'ml-auto' : 'mr-auto'
                  } max-w-[75%] ${
                    isCurrentUserMessage(msg.sender) ? 'bg-blue-800 text-white' : 'bg-gray-700 text-gray-100'
                  } p-3 rounded-lg`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-xs">
                      {msg.sender.username}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                  {renderMessageContent(msg)}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Add invoice button for sellers when booking is confirmed */}
          {isSeller && booking.status === 'confirmed' && (
            <div className="mb-3">
              <button
                onClick={handleCreateInvoice}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center"
              >
                <span className="mr-1">📝</span> Create Invoice
              </button>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="space-y-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
            />
            
            {/* Show selected attachment if any */}
            {attachment && (
              <div className="flex items-center bg-gray-700 rounded-lg p-2">
                <span className="text-sm text-gray-300 flex-grow truncate mr-2">
                  {attachment.name}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="flex-grow bg-gray-700 text-white rounded p-2 resize-none h-20"
                disabled={booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
              />
              
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                  disabled={booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
                >
                  📎
                </button>
                
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !attachment) || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
                  className={`px-4 py-2 rounded ${
                    (!newMessage.trim() && !attachment) || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  Send
                </button>
              </div>
            </div>
          </form>
          
          {(booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed') && (
            <div className="text-amber-500 text-sm mt-2 text-center">
              This conversation is now locked because the booking is {booking.status}.
            </div>
          )}
        </>
      )}
      
      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          booking={booking}
          existingInvoice={selectedInvoice}
          onClose={handleCloseInvoiceModal}
          showNotification={showNotification}
          currentUser={currentUser}
          isSeller={isSeller}
          onInvoiceCreated={handleInvoiceCreated}
          onSendMessage={handleSendInvoiceMessage}
        />
      )}
    </div>
  );
};

export default BookingConversation; 