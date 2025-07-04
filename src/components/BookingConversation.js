import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../services/api';
import logger from '../utils/logger';
import InvoiceModal from './InvoiceModal';
import invoiceService from '../services/invoiceService';

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
  const [showReplyTemplates, setShowReplyTemplates] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Seller check
  const isSeller = booking?.sellerId?._id === currentUser?.userId;
  
  // Reply templates for freelancers
  const replyTemplates = [
    {
      title: "Project Clarification",
      message: "Thanks for your booking! To get started, could you please provide:\n\n1. Your specific goals and expectations\n2. Your preferred timeline\n3. Any reference materials or examples\n4. Your budget range for any additional features\n\nThis will help me deliver exactly what you need!"
    },
    {
      title: "Timeline & Availability",
      message: "Hi! I'm excited to work on this project with you. \n\nI can start immediately and typically complete projects like this in [X] days. Are there any specific deadlines I should be aware of?\n\nI'll keep you updated throughout the process and deliver high-quality work that meets your expectations."
    },
    {
      title: "Technical Requirements",
      message: "Hello! To ensure I deliver the best results, I need to understand your technical requirements:\n\n1. What platforms/technologies are you using?\n2. Do you have any specific formats or standards to follow?\n3. Are there any integrations needed?\n4. What's your current setup/infrastructure?\n\nLooking forward to working together!"
    },
    {
      title: "Content & Resources",
      message: "Thanks for choosing my services! To get started, please share:\n\n1. Any existing content, files, or assets\n2. Brand guidelines or style preferences\n3. Access to relevant accounts/platforms (if needed)\n4. Contact information for stakeholders\n\nI'll review everything and create a detailed project plan for you."
    },
    {
      title: "Budget & Scope",
      message: "Hello! I'm ready to begin your project. Let's discuss:\n\n1. The exact scope of work you need\n2. Any additional features beyond the basic service\n3. Your budget for potential add-ons\n4. Payment schedule preferences\n\nThis ensures we're aligned on deliverables and there are no surprises later."
    },
    {
      title: "Next Steps",
      message: "Great! I'm excited to work with you. Here's what happens next:\n\n1. I'll review your requirements thoroughly\n2. Create a detailed project timeline\n3. Send you a comprehensive proposal\n4. Start work once everything is confirmed\n\nFeel free to ask any questions - I'm here to help make this project a success!"
    },
    {
      title: "Booking Closure",
      message: "Hello,\n\nI hope this message finds you well. Due to the lack of response or missing project details needed to move forward, I'll be closing this booking request.\n\nIf you're still interested in working together and have legitimate project requirements, please feel free to create a new booking with detailed information about your needs.\n\nI'm always happy to help with genuine projects and look forward to potential future collaborations.\n\nBest regards"
    }
  ];

  // Function to insert template into message input
  const insertTemplate = (template) => {
    setNewMessage(template.message);
    setShowReplyTemplates(false);
  };

  // Fetch messages on component mount and set up polling
  useEffect(() => {
    if (booking && booking._id) {
      fetchMessages();
      fetchInvoices();
      
      // Set up polling every 15 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages(false); // false means don't show loading indicator
        fetchInvoices();
      }, 15000);
    }
    
    // Clean up interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?._id]);

  // Manual scroll function (kept for reference but not used automatically)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch invoices for the current booking
  const fetchInvoices = async () => {
    if (!booking || !booking._id) {
      return;
    }
    
    try {
      // Use a try-catch to handle 404 errors gracefully
      try {
        const invoiceData = await invoiceService.getInvoicesByBookingId(booking._id);
        setInvoices(invoiceData || []);
      } catch (apiError) {
        // If the endpoint returns 404, we'll just set empty invoices
        if (apiError.response && apiError.response.status === 404) {
          setInvoices([]);
        } else {
          // For other errors, rethrow to be caught by the outer try-catch
          throw apiError;
        }
      }
    } catch (err) {
      setInvoices([]);
      // Don't show notification for this to avoid cluttering the UI
    }
  };

  // Function to verify image URL exists
  const verifyImage = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Update the fetchMessages function to check image URLs
  const fetchMessages = async (showLoader = true) => {
    if (!booking || !booking._id || !currentUser || !currentUser.token) {
      setError('Unable to load messages: missing booking data');
      setLoading(false);
      return;
    }
    
    try {
      if (showLoader) setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/bookings/${booking._id}/messages`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
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
          } else {
            // URL is already absolute
            msg.attachmentFullUrl = msg.attachment;
          }
        }
        return msg;
      });
      
      setMessages(processedData);
    } catch (err) {
      setError('Failed to load messages. Please try again.');
      if (showLoader) showNotification('Failed to load messages. Please try again.', 'error');
    } finally {
      if (showLoader) setLoading(false);
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
        // Try to parse error response for detailed error message
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Failed to send message' };
        }
        
        // Create an error object that includes the response data
        const error = new Error(errorData.error || 'Failed to send message');
        error.responseData = errorData;
        throw error;
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
      // Handle different types of errors
      if (err.responseData) {
        const errorData = err.responseData;
        if (errorData.blockedContent) {
          // Show specific error for blocked content
          setError(errorData.error);
          showNotification(errorData.error, 'error');
        } else {
          setError(errorData.error || 'Failed to send message. Please try again.');
          showNotification(errorData.error || 'Failed to send message. Please try again.', 'error');
        }
      } else {
        setError(err.message || 'Failed to send message. Please try again.');
        showNotification(err.message || 'Failed to send message. Please try again.', 'error');
      }
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

  // Render message content including any attachments
  const renderMessageContent = (msg) => {
    if (!msg) return null;
    
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
    
    // Choose best image URL to display
    const getBestImageUrl = () => {
      // If we have a data URL, use it as the most reliable source
      if (msg.dataUrl) {
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

    // Add watermark to image and return a new data URL
    const applyWatermarkToImage = (imageUrl, callback) => {
      // Create temporary image to load the source
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Enable CORS for the image
      
      img.onload = () => {
        // Create canvas to draw the watermarked image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Apply watermark text
        ctx.font = `bold ${Math.max(40, img.width / 10)}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Save context state
        ctx.save();
        
        // Move to center and rotate
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6); // ~30 degrees
        
        // Draw large watermark text
        ctx.fillText('WATERMARK', 0, 0);
        
        // Draw secondary watermark text
        ctx.font = `bold ${Math.max(30, img.width / 15)}px Arial`;
        ctx.fillText('DRAFT - DO NOT USE', 0, Math.max(50, img.height / 10));
        
        // Add "corner" watermark
        ctx.restore();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'; // Gold color
        ctx.fillRect(canvas.width - 120, 0, 120, 35);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('DRAFT', canvas.width - 60, 20);
        
        // Convert canvas to data URL and return via callback
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        callback(watermarkedDataUrl);
      };
      
      img.onerror = () => {
        callback(null); // Return null to indicate failure
      };
      
      // Start loading the image
      img.src = imageUrl;
    };

    // Check if the message is about an invoice
    const invoicePatterns = [
      /Invoice #(INV-\d{4}-\d{4})/i,
      /invoice #(INV-\d{4}-\d{4})/i,
      /created invoice #(INV-\d{4}-\d{4})/i,
      /(INV-\d{4}-\d{4})/i
    ];
    
    let invoiceNumberFromMessage = null;
    // Try each pattern until we find a match
    for (const pattern of invoicePatterns) {
      const match = msg.message && typeof msg.message === 'string' && msg.message.match(pattern);
      if (match) {
        invoiceNumberFromMessage = match[1];
        break;
      }
    }
    
    // Find the invoice in our list
    const invoiceFromMessage = invoiceNumberFromMessage && invoices && invoices.length > 0 ? 
      invoices.find(inv => inv.invoiceNumber === invoiceNumberFromMessage) : null;

    // Safe formatting function for currency that handles non-standard currency codes
    const formatCurrency = (amount, currencyCode) => {
      if (amount === undefined || amount === null) return '';
      
      // Check if it's a standard currency code (ISO 4217)
      const standardCurrencyCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];
      
      try {
        if (standardCurrencyCodes.includes(currencyCode)) {
          return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: currencyCode
          }).format(amount);
        } else {
          // For crypto or non-standard currencies, use a simpler format
          return `${amount.toFixed(2)} ${currencyCode}`;
        }
      } catch (error) {
        return `${amount} ${currencyCode}`;
      }
    };

    return (
      <>
        {msg.message && <p className="text-sm whitespace-pre-wrap mb-2">{msg.message}</p>}
        
        {/* If this is an invoice message and we found the invoice, show it properly */}
        {invoiceFromMessage && (
          <div className="mt-2 border border-gray-600 bg-gray-800 p-3 rounded-lg">
            <div className="flex justify-between mb-2">
              <h3 className="font-medium text-blue-400">Invoice #{invoiceFromMessage.invoiceNumber}</h3>
              <span className={
                invoiceFromMessage.status === 'paid' ? 'text-green-400' : 
                invoiceFromMessage.status === 'cancelled' ? 'text-red-400' : 
                'text-yellow-400'
              }>
                {invoiceFromMessage.status?.toUpperCase() || 'PENDING'}
              </span>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount:</span>
                <span>{formatCurrency(
                  invoiceFromMessage.amount, 
                  invoiceFromMessage.currency
                )}</span>
              </div>
              {invoiceFromMessage.dueDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Due Date:</span>
                  <span>{new Date(invoiceFromMessage.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {invoiceFromMessage.description && (
                <div className="text-sm mt-1">
                  <span className="text-gray-400">Service: </span>
                  <span>{invoiceFromMessage.description}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleViewInvoice(invoiceFromMessage)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                View Details
              </button>
              
              {invoiceFromMessage.paymentLink && invoiceFromMessage.status !== 'paid' && invoiceFromMessage.status !== 'cancelled' && (
                <a
                  href={invoiceFromMessage.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
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
                sourceUrl={getBestImageUrl()} 
                applyWatermark={applyWatermarkToImage}
                attachmentName={msg.attachmentName || "Attachment"}
                dataUrl={msg.dataUrl}
                generateAttachmentUrls={() => generateAttachmentUrls(msg.attachment)}
              />
            ) : (
              // Use regular image for non-watermarked images
              <img 
                src={getBestImageUrl()} 
                alt={msg.attachmentName || "Attachment"}
                className="max-w-full rounded-lg max-h-60 object-contain cursor-pointer border border-gray-700"
                onClick={() => {
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
                    newWindow.document.close();
                    return;
                  }
                  
                  const urls = generateAttachmentUrls(msg.attachment);
                  window.open(urls.queryParam, '_blank');
                }}
              />
            )}
            
            <div className="text-xs mt-1 text-gray-300 flex justify-between items-center">
              <span>{msg.attachmentName || "Image attachment"}</span>
              <div className="flex items-center">
                {msg.isWatermarked && (
                  <span className="text-yellow-400 font-semibold text-xs mr-2">
                    Watermarked preview
                  </span>
                )}
                <a 
                  href="#"
                  className="ml-2 text-blue-400 hover:text-blue-300"
                  onClick={(e) => {
                    e.preventDefault();
                    
                    if (msg.isWatermarked) {
                      // For watermarked images, we need to apply the watermark to the full-size image
                      applyWatermarkToImage(getBestImageUrl(), (watermarkedDataUrl) => {
                        if (watermarkedDataUrl) {
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
                                <img src="${watermarkedDataUrl}" alt="${msg.attachmentName || 'Image'}" />
                                <div class="watermark-notice">Draft image with watermark. Original will be available after completion.</div>
                              </body>
                            </html>
                          `);
                          newWindow.document.close();
                        }
                      });
                      return;
                    }
                    
                    // Handle non-watermarked images normally
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
                      newWindow.document.close();
                      return;
                    }
                    
                    // Otherwise try URL approach
                    const urls = generateAttachmentUrls(msg.attachment);
                    logger.log('Opening image with most reliable method');
                    // Try the query parameter endpoint as it's most reliable
                    window.open(urls.queryParam, '_blank');
                  }}
                >
                  (View full image)
                </a>
              </div>
            </div>
          </div>
        )}
        
        {msg.attachment && msg.attachmentType === 'file' && (
          <div className="mt-2 bg-gray-800 p-2 rounded-lg border border-gray-700">
            <a 
              href="#"
              className="flex items-center text-blue-400 hover:text-blue-300"
              onClick={(e) => {
                e.preventDefault();
                const urls = generateAttachmentUrls(msg.attachment);
                window.open(urls.directEndpoint, '_blank');
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                  className={`mb-3 flex ${isCurrentUserMessage(sender) ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs sm:max-w-sm md:max-w-md rounded-lg px-4 py-2 ${
                      isCurrentUserMessage(sender) 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-700 text-white rounded-bl-none'
                    } ${msg.isInitialRequirements ? 'border-l-4 border-yellow-500' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">
                        {sender.username || 'Unknown'}
                        {msg.isInitialRequirements && ' (Initial Requirements)'}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                    {renderMessageContent(msg)}
                  </div>
                </div>
              );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
          />
          
          {/* Reply Templates Section for Sellers */}
          {isSeller && (
            <div className="mb-4">
              <button
                onClick={() => setShowReplyTemplates(!showReplyTemplates)}
                className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm mb-2"
              >
                <span className="mr-2">📝</span>
                {showReplyTemplates ? 'Hide' : 'Show'} Reply Templates
              </button>
              
              {showReplyTemplates && (
                <div className="bg-gray-700 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
                  <h4 className="text-white font-semibold mb-3">Quick Reply Templates</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {replyTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => insertTemplate(template)}
                        className="text-left p-3 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white border border-gray-500 hover:border-gray-400 transition-colors"
                      >
                        <div className="font-medium text-blue-400 mb-1">{template.title}</div>
                        <div className="text-xs text-gray-300 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {template.message.substring(0, 100)}...
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    💡 Click any template to insert it into your message box, then customize as needed.
                  </div>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="space-y-3">
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
                disabled={!booking || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
              />
              
              <div className="flex flex-col gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                  disabled={!booking || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
                >
                  📎
                </button>
                
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !attachment) || !booking || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
                  className={`px-4 py-2 rounded ${
                    (!newMessage.trim() && !attachment) || !booking || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  Send
                </button>
              </div>
            </div>
          </form>
          
          {/* Add invoice button for sellers when booking is confirmed */}
          {isSeller && booking && booking.status === 'confirmed' && (
            <div className="mb-3">
              <button
                onClick={handleCreateInvoice}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center"
              >
                <span className="mr-1">📝</span> Create Invoice
              </button>
            </div>
          )}
          
          {booking && (booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed') && (
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