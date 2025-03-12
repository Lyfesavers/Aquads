import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../services/api';

const BookingConversation = ({ booking, currentUser, onClose, showNotification }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

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
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
      showNotification('Failed to load messages. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/bookings/${booking._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ message: newMessage })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const sentMessage = await response.json();
      setMessages([...messages, sentMessage]);
      setNewMessage('');
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
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-grow bg-gray-700 text-white rounded p-2 resize-none h-20"
              disabled={booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'}
              className={`px-4 py-2 rounded ${
                !newMessage.trim() || booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'completed'
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white self-end`}
            >
              Send
            </button>
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