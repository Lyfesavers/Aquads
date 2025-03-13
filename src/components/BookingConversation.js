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
      
      // Check if image attachments are valid
      for (const msg of data) {
        if (msg.attachment && msg.attachmentType === 'image') {
          console.log('Found image attachment:', msg.attachment);
          // We'll verify in the UI component instead of here
        }
      }
      
      setMessages(data);
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
    return (
      <>
        {msg.message && <p className="text-sm whitespace-pre-wrap mb-2">{msg.message}</p>}
        
        {msg.attachment && msg.attachmentType === 'image' && (
          <div className="mt-2">
            <img 
              src={msg.attachment} 
              alt={msg.attachmentName || "Attachment"}
              className="max-w-full rounded-lg max-h-60 object-contain cursor-pointer border border-gray-700" 
              onClick={() => {
                // Try various URL formats if the direct one doesn't work
                const filename = msg.attachment.split('/').pop();
                const alternateUrl = `${API_URL}/uploads/bookings/${filename}`;
                console.log('Opening image, alternate URL:', alternateUrl);
                window.open(alternateUrl, '_blank');
              }}
              onError={(e) => {
                console.error("Image failed to load:", msg.attachment);
                // Try to fix the URL
                const filename = msg.attachment.split('/').pop();
                const alternateUrl = `${API_URL}/uploads/bookings/${filename}`;
                console.log('Trying alternate image URL:', alternateUrl);
                
                // Only change src if we haven't already tried
                if (e.target.src !== alternateUrl && e.target.src !== 'https://via.placeholder.com/150?text=Image+Not+Found') {
                  e.target.src = alternateUrl;
                } else if (e.target.src === alternateUrl) {
                  // If alternate URL also fails, use placeholder
                  e.target.src = 'https://via.placeholder.com/150?text=Image+Not+Found';
                  e.target.className = 'max-w-full rounded-lg max-h-40 object-contain opacity-60 border border-red-500';
                }
              }}
            />
            <div className="text-xs mt-1 text-gray-300">
              {msg.attachmentName || "Image attachment"}
              <a 
                href={msg.attachment} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:text-blue-300"
                onClick={(e) => {
                  e.preventDefault();
                  // Try to use the API endpoint directly
                  const filename = msg.attachment.split('/').pop();
                  const directUrl = `${API_URL}/uploads/bookings/${filename}`;
                  window.open(directUrl, '_blank');
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
              href={msg.attachment} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-blue-400 hover:text-blue-300"
              download={msg.attachmentName}
              onClick={(e) => {
                e.preventDefault();
                // Try to use the direct API endpoint
                const filename = msg.attachment.split('/').pop();
                const directUrl = `${API_URL}/uploads/bookings/${filename}`;
                window.open(directUrl, '_blank');
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