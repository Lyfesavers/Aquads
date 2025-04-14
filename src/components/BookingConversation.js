import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../services/api';
import logger from '../utils/logger';
import InvoiceModal from './InvoiceModal';
import invoiceService from '../services/invoiceService';
import axios from 'axios';

// Component to render watermarked images using canvas
const WatermarkedImage = ({ sourceUrl, applyWatermark, attachmentName, dataUrl, generateAttachmentUrls }) => {
  const [watermarkedUrl, setWatermarkedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    if (!sourceUrl) {
      setError(true);
      setIsLoading(false);
      return;
    }
    
    // Apply watermark to the image
    applyWatermark(sourceUrl, (result) => {
      if (result) {
        setWatermarkedUrl(result);
        setIsLoading(false);
      } else {
        setError(true);
        setIsLoading(false);
      }
    });
  }, [sourceUrl, applyWatermark]);
  
  // Handle image click to open in new window
  const handleImageClick = () => {
    if (watermarkedUrl) {
      const newWindow = window.open();
      newWindow.document.write(`
        <html>
          <head>
            <title>${attachmentName || 'Watermarked Image'}</title>
            <style>
              body { 
                margin: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh;
                background-color: #0f172a;
                position: relative;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
              .watermark-notice {
                position: absolute;
                bottom: 20px;
                left: 0;
                right: 0;
                text-align: center;
                color: #FCD34D;
                font-size: 18px;
                font-weight: bold;
                background-color: rgba(0,0,0,0.7);
                padding: 12px;
              }
            </style>
          </head>
          <body>
            <img src="${watermarkedUrl}" alt="${attachmentName || 'Watermarked Image'}" />
            <div class="watermark-notice">Draft image with watermark. Original will be available after completion.</div>
          </body>
        </html>
      `);
      newWindow.document.close();
    } else if (dataUrl) {
      // Fallback to data URL if watermarking failed
      applyWatermark(dataUrl, (result) => {
        const newWindow = window.open();
        newWindow.document.write(`
          <html>
            <head>
              <title>${attachmentName || 'Watermarked Image'}</title>
              <style>
                body { 
                  margin: 0; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh;
                  background-color: #0f172a;
                  position: relative;
                }
                img {
                  max-width: 100%;
                  max-height: 100vh;
                  object-fit: contain;
                }
                .watermark-notice {
                  position: absolute;
                  bottom: 20px;
                  left: 0;
                  right: 0;
                  text-align: center;
                  color: #FCD34D;
                  font-size: 18px;
                  font-weight: bold;
                  background-color: rgba(0,0,0,0.7);
                  padding: 12px;
                }
              </style>
            </head>
            <body>
              <img src="${result || dataUrl}" alt="${attachmentName || 'Watermarked Image'}" />
              <div class="watermark-notice">Draft image with watermark. Original will be available after completion.</div>
            </body>
          </html>
        `);
        newWindow.document.close();
      });
    } else {
      // Last resort, try to use the original URL with query param
      const urls = generateAttachmentUrls();
      window.open(urls.queryParam, '_blank');
    }
  };
  
  if (isLoading) {
    return (
      <div className="w-full h-40 flex items-center justify-center bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full p-4 bg-gray-800 rounded-lg text-center border border-red-500">
        <p className="text-red-400">Failed to load watermarked image</p>
        <button 
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
          onClick={() => window.open(sourceUrl, '_blank')}
        >
          Open Original
        </button>
      </div>
    );
  }
  
  return (
    <img 
      src={watermarkedUrl} 
      alt={attachmentName || "Watermarked Attachment"}
      className="max-w-full rounded-lg max-h-60 object-contain cursor-pointer border border-yellow-500 border-2"
      onClick={handleImageClick}
    />
  );
};

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

  // Debug: Log API URL
  console.log('API_URL:', API_URL);
  console.log('Booking ID:', booking?._id);
  
  const isSeller = booking?.sellerId?._id === currentUser?.userId;
  
  // Fetch messages on component mount
  useEffect(() => {
    if (booking && booking._id) {
      console.log('Fetching messages for booking:', booking._id);
      fetchMessages();
      fetchInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?._id]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
    
    // Check if there are any invoice messages without matching invoice data
    const needToFetchInvoices = messages.some(msg => {
      const invoiceMatch = msg.message && typeof msg.message === 'string' && 
        msg.message.match(/Invoice #(INV-\d{4}-\d{4})/);
      
      if (!invoiceMatch) return false;
      
      const invoiceNumber = invoiceMatch[1];
      // If we don't have this invoice in our list, we should fetch invoices
      return !invoices.some(inv => inv.invoiceNumber === invoiceNumber);
    });
    
    if (needToFetchInvoices && booking && booking._id) {
      console.log('Found invoice references in messages but missing invoice data, fetching invoices...');
      fetchInvoices();
    }
  }, [messages, invoices, booking?._id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch invoices for the current booking
  const fetchInvoices = useCallback(async () => {
    if (!booking?._id) return;
    
    try {
      const response = await invoiceService.getInvoicesByBookingId(booking._id);
      setInvoices(response.data || []);
    } catch (error) {
      // 404 is acceptable - just means no invoices yet
      if (error.response && error.response.status === 404) {
        setInvoices([]);
        return;
      }
      console.error('Error fetching invoices:', error);
    }
  }, [booking]);

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
    if (!booking || !booking._id || !currentUser || !currentUser.token) {
      console.error('Missing required data for fetching messages', { 
        bookingId: booking?._id, 
        hasToken: Boolean(currentUser?.token) 
      });
      setError('Unable to load messages: missing booking data');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching messages for booking ID:', booking._id);
      const response = await fetch(`${API_URL}/bookings/${booking._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      console.log('Messages API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Messages received:', data.length);
      
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
      
      console.log('Processed messages:', processedData);
      setMessages(processedData);
    } catch (err) {
      console.error('Error fetching messages:', err);
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
      
      // If there's invoice data, add it as a special field
      if (e.invoiceData) {
        formData.append('invoiceData', JSON.stringify(e.invoiceData));
        formData.append('messageType', 'invoice');
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
      
      // If we have invoice data but the server doesn't support it yet,
      // add it to the message locally
      if (e.invoiceData && !sentMessage.invoiceData) {
        sentMessage.invoiceData = e.invoiceData;
        sentMessage.messageType = 'invoice';
      }
      
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

  // Determine if a message is from the current user
  const isCurrentUserMessage = (sender) => {
    if (!sender || !sender._id || !currentUser) return false;
    return sender._id === currentUser.userId;
  };

  // Gets the sender object from the message (handles both sender and senderId fields)
  const getSender = (msg) => {
    return msg.sender || msg.senderId || null;
  };

  // Format timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Handle creating a new invoice
  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
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
  const handleSendInvoiceMessage = (message, messageData) => {
    // Store both the text message and any extra data (invoice data)
    setNewMessage(message);
    
    // Create a fake event for handleSendMessage
    const event = { preventDefault: () => {} };
    
    // Call handleSendMessage with the message data
    setTimeout(() => {
      if (message === newMessage) {
        // Create a custom event to include the invoice data
        const customEvent = {
          ...event,
          invoiceData: messageData?.invoiceData
        };
        handleSendMessage(customEvent);
      }
    }, 100);
  };

  // View an invoice
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  // Handle sending a message about the invoice
  const handleSendInvoice = async (invoice) => {
    try {
      // Close the modal first
      setShowInvoiceModal(false);
      
      // Send a message about the invoice
      const response = await axios.post(
        `${API_URL}/bookings/${booking._id}/invoices/${invoice._id}/message`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Add the new message to the messages list
      setMessages(prevMessages => [...prevMessages, response.data]);
      
      // Refresh invoices list
      fetchInvoices();
    } catch (error) {
      console.error('Error sending invoice message:', error);
      setError('Failed to send invoice notification. Please try again.');
    }
  };

  // Render message content including any attachments
  const renderMessageContent = (msg) => {
    if (!msg) return null;
    
    // Handle invoice message type
    if (msg.messageType === 'invoice' && msg.invoiceId) {
      const invoiceData = invoices?.find(inv => 
        inv._id === (typeof msg.invoiceId === 'object' ? msg.invoiceId._id : msg.invoiceId)
      ) || msg.invoiceId;
      
      if (invoiceData) {
        return (
          <>
            <p className="text-sm whitespace-pre-wrap mb-2">{msg.message}</p>
            <div className="bg-gray-700 border border-gray-600 rounded p-3">
              <div className="flex justify-between">
                <span className="font-bold">Invoice #{invoiceData.invoiceNumber}</span>
                <span className={
                  invoiceData.status === 'paid' ? 'text-green-400' : 
                  invoiceData.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                }>
                  {invoiceData.status?.toUpperCase()}
                </span>
              </div>
              <div className="mt-1">
                <p>Amount: {
                  new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: invoiceData.currency || 'USD' 
                  }).format(invoiceData.amount)
                }</p>
                <button 
                  onClick={() => handleViewInvoice(invoiceData)}
                  className="mt-2 bg-blue-600 text-white text-sm px-2 py-1 rounded"
                >
                  View Details
                </button>
              </div>
            </div>
          </>
        );
      }
    }
    
    // Helper function to get API base URL without "/api"
    const getBaseUrl = () => {
      return API_URL.replace(/\/api$/, '');
    };
    
    // Helper function to extract filename from attachment URL
    const getFilename = (url) => {
      if (!url) return '';
      return url.split('/').pop();
    };
    
    // Generate all possible URL formats for an attachment
    const generateAttachmentUrls = (attachment) => {
      if (!attachment) return {};
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

    // Check if the message is about an invoice (legacy support for old format)
    // Support multiple message formats for invoice references
    const invoiceRegexPatterns = [
      /Invoice #(INV-\d{4}-\d{4})/,                                // Basic pattern: "Invoice #INV-2504-0007"
      /I've created invoice #(INV-\d{4}-\d{4}) for you/,          // New format intro
      /created invoice #(INV-\d{4}-\d{4})/                         // Alternative shorter pattern
    ];
    
    let invoiceNumberFromMessage = null;
    // Try each pattern until we find a match
    for (const pattern of invoiceRegexPatterns) {
      const match = msg.message && typeof msg.message === 'string' && msg.message.match(pattern);
      if (match) {
        invoiceNumberFromMessage = match[1];
        break;
      }
    }
    
    // Check for invoice data - either from message metadata or from invoices list
    let invoiceData = msg.invoiceData || null;
    
    // If no direct invoice data but we have an invoice number, try to find it in the invoices list
    if (!invoiceData && invoiceNumberFromMessage && invoices && invoices.length > 0) {
      const foundInvoice = invoices.find(inv => inv.invoiceNumber === invoiceNumberFromMessage);
      if (foundInvoice) {
        invoiceData = foundInvoice;
        console.log('Found matching invoice by number:', foundInvoice.invoiceNumber);
      } else {
        console.log('Invoice number found in message but no matching invoice in list:', invoiceNumberFromMessage, 'Available invoices:', invoices.map(inv => inv.invoiceNumber));
      }
    }

    // Debug output to help trace issues
    if (invoiceNumberFromMessage) {
      console.log('Invoice message detected:', {
        messageId: msg._id,
        invoiceNumber: invoiceNumberFromMessage,
        message: msg.message,
        hasDirectData: !!msg.invoiceData,
        foundInList: !!invoiceData,
        invoicesCount: invoices?.length || 0
      });
    }

    return (
      <>
        {msg.message && <p className="text-sm whitespace-pre-wrap mb-2">{msg.message}</p>}
        
        {/* Display invoice card if this message has invoice data or references an invoice */}
        {invoiceData && (
          <div className="mt-3 bg-gray-800 border border-gray-700 rounded-lg p-3 max-w-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-blue-400 font-semibold">Invoice #{invoiceData.invoiceNumber}</h3>
              <div className={`text-xs px-2 py-1 rounded-full ${
                invoiceData.status === 'paid' 
                  ? 'bg-green-900/50 text-green-400' 
                  : invoiceData.status === 'cancelled'
                    ? 'bg-red-900/50 text-red-400'
                    : 'bg-yellow-900/50 text-yellow-400'
              }`}>
                {invoiceData.status?.toUpperCase() || 'PENDING'}
              </div>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Amount:</span>
                <span className="font-medium">{
                  typeof invoiceData.amount === 'number' 
                    ? new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: invoiceData.currency || 'USD' 
                      }).format(invoiceData.amount)
                    : invoiceData.amount
                }</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Due Date:</span>
                <span>{new Date(invoiceData.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => handleViewInvoice(invoiceData)}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm text-center"
              >
                View Details
              </button>
              
              {invoiceData.paymentLink && invoiceData.status !== 'paid' && invoiceData.status !== 'cancelled' && (
                <a
                  href={invoiceData.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm text-center"
                >
                  Pay Now
                </a>
              )}
            </div>
          </div>
        )}
        
        {msg.attachment && msg.attachmentType === 'image' && (
          <div className="mt-2 relative">
            {msg.isWatermarked ? (
              // Use watermarked image renderer for watermarked images
              <WatermarkedImage 
                sourceUrl={generateAttachmentUrls(msg.attachment).queryParam} 
                isDraft={true}
              />
            ) : (
              // Regular image display for non-watermarked or buyer images
              <img 
                src={generateAttachmentUrls(msg.attachment).queryParam} 
                alt="Attachment" 
                className="max-w-full rounded-lg border border-gray-700"
                onError={(e) => {
                  logger.error('Image load error, trying fallback URL');
                  // Try a different URL approach if the first one fails
                  const urls = generateAttachmentUrls(msg.attachment);
                  e.target.src = urls.directEndpoint;
                }}
                onClick={() => {
                  const imageUrl = generateAttachmentUrls(msg.attachment).queryParam;
                  if (imageUrl) {
                    window.open(imageUrl, '_blank');
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
            )}
          </div>
        )}
        
        {msg.attachment && msg.attachmentType === 'file' && (
          <div className="mt-2">
            <a 
              href={generateAttachmentUrls(msg.attachment).queryParam}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span>{msg.attachmentName || 'Download file'}</span>
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
          Conversation: {booking?.serviceId?.title || 'Loading...'}
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
        <div className="text-red-500 text-center my-4">
          <p>{error}</p>
          <button 
            onClick={fetchMessages}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="h-96 overflow-y-auto mb-4 p-2 bg-gray-900 rounded-lg">
            {!messages || messages.length === 0 ? (
              <div className="text-gray-500 text-center my-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => {
                // Check if the message has either sender or senderId
                const sender = getSender(msg);
                if (!msg || !sender) {
                  console.warn('Invalid message object:', msg);
                  return null; // Skip invalid messages
                }
                return (
                  <div 
                    key={msg._id || `msg-${index}`}
                    className={`flex ${isCurrentUserMessage(sender) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-md p-2 rounded-lg bg-gray-700">
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <div className="flex flex-col space-y-2">
            <div className="flex gap-2">
              <textarea
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
              />
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            
            <div className="flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                {/* Show create invoice button for sellers when booking is confirmed */}
                {isSeller && booking?.status === 'confirmed' && (
                  <button
                    onClick={handleCreateInvoice}
                    className="flex items-center px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300"
                    title="Create Invoice"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={(!newMessage || newMessage.trim() === '') && !attachment}
                className={`px-4 py-2 rounded-lg text-white ${
                  (!newMessage || newMessage.trim() === '') && !attachment
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-t-2 border-blue-200 border-solid rounded-full animate-spin"></div>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>

          {/* Invoice Modal */}
          {showInvoiceModal && (
            <InvoiceModal
              show={showInvoiceModal}
              onClose={handleCloseInvoiceModal}
              booking={booking}
              onInvoiceCreated={handleInvoiceCreated}
              userRole={isSeller ? 'seller' : 'buyer'}
              onNotification={setError}
              existingInvoice={selectedInvoice}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BookingConversation;