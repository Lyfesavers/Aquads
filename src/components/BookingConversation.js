import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../services/api';

const BookingConversation = ({ booking, currentUser, onClose, showNotification }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking._id]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to verify image URL exists
  const verifyImage = async (url) => {
    try {
      console.log('Verifying image URL:', url);
      const response = await fetch(url, { method: 'HEAD' });
      console.log('Image verification response:', response.status, response.statusText);
      return response.ok;
    } catch (error) {
      console.error('Error verifying image:', error);
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
            console.log('Processed attachment URL:', msg.attachmentFullUrl);
          } else {
            // URL is already absolute
            msg.attachmentFullUrl = msg.attachment;
          }
        }
        return msg;
      });
      
      setMessages(processedData);
    } catch (err) {
      console.error('Error fetching messages:', err);
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
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      showNotification('Failed to send message. Please try again.', 'error');
    }
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
        queryParam: `${API_URL}/bookings/file?filename=${filename}`
      };
    };
    
    // Choose best image URL to display
    const getBestImageUrl = () => {
      // If we have a data URL, use it as the most reliable source
      if (msg.dataUrl) {
        console.log('Using embedded data URL for image');
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

    return (
      <>
        {msg.message && <p className="text-sm whitespace-pre-wrap mb-2">{msg.message}</p>}
        
        {msg.attachment && msg.attachmentType === 'image' && (
          <div className="mt-2">
            <img 
              src={getBestImageUrl()} 
              alt={msg.attachmentName || "Attachment"}
              className="max-w-full rounded-lg max-h-60 object-contain cursor-pointer border border-gray-700" 
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
                  newWindow.document.close();
                  return;
                }
                
                // Otherwise try URL approach
                const urls = generateAttachmentUrls(msg.attachment);
                console.log('Opening image with most reliable method');
                // Try the query parameter endpoint as it's most reliable
                window.open(urls.queryParam, '_blank');
              }}
              onError={(e) => {
                console.error("Image failed to load:", e.target.src);
                
                // If we have a data URL and aren't already using it, switch to it
                if (msg.dataUrl && e.target.src !== msg.dataUrl) {
                  console.log('Switching to embedded data URL');
                  e.target.src = msg.dataUrl;
                  return;
                }
                
                // Otherwise try different URL formats in sequence
                const urls = generateAttachmentUrls(msg.attachment);
                const urlsToTry = [
                  urls.queryParam,
                  urls.fullRelative,
                  urls.directEndpoint,
                  urls.apiEndpoint
                ];
                
                // Find which URL we're currently using
                const currentIndex = urlsToTry.indexOf(e.target.src);
                
                // Try next URL if we haven't tried them all
                if (currentIndex < urlsToTry.length - 1) {
                  const nextUrl = urlsToTry[currentIndex + 1];
                  console.log(`Trying alternate URL (${currentIndex + 2}/${urlsToTry.length}):`, nextUrl);
                  e.target.src = nextUrl;
                } else {
                  // We've tried all URLs, use placeholder
                  console.log('All URLs failed, using placeholder');
                  e.target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                  e.target.className = 'max-w-full rounded-lg max-h-40 object-contain opacity-60 border border-red-500';
                }
              }}
            />
            <div className="text-xs mt-1 text-gray-300">
              {msg.attachmentName || "Image attachment"}
              <a 
                href="#"
                className="ml-2 text-blue-400 hover:text-blue-300"
                onClick={(e) => {
                  e.preventDefault();
                  
                  // If we have a data URL, use it directly
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
                  console.log('Opening image with most reliable method');
                  // Try the query parameter endpoint as it's most reliable
                  window.open(urls.queryParam, '_blank');
                }}
              >
                (View full image)
              </a>
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
              <div className="text-gray-500 text-center my-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={msg._id || `msg-${index}`}
                  className={`mb-3 flex ${isCurrentUserMessage(msg.senderId) ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs sm:max-w-sm md:max-w-md rounded-lg px-4 py-2 ${
                      isCurrentUserMessage(msg.senderId) 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-700 text-white rounded-bl-none'
                    } ${msg.isInitialRequirements ? 'border-l-4 border-yellow-500' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">
                        {msg.senderId.username}
                        {msg.isInitialRequirements && ' (Initial Requirements)'}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                    {renderMessageContent(msg)}
                  </div>
                </div>
              ))
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
                disabled={booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
              />
              
              <div className="flex flex-col gap-2 justify-end">
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
    </div>
  );
};

export default BookingConversation; 