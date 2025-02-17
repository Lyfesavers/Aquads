import { FaCrown } from 'react-icons/fa';

const handlePremiumUpgrade = async (serviceId) => {
  try {
    const confirmed = window.confirm(
      'Premium upgrade costs 1000 USDC. Please make the payment and provide the transaction ID. Continue?'
    );
    
    if (!confirmed) return;
    
    const paymentId = prompt('Enter your USDC payment transaction ID:');
    if (!paymentId) return;
    
    const response = await fetch(`${API_URL}/services/${serviceId}/premium-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({ paymentId })
    });

    if (!response.ok) throw new Error('Failed to request premium status');
    
    showNotification('Premium request submitted successfully', 'success');
  } catch (error) {
    console.error('Error requesting premium:', error);
    showNotification('Failed to request premium status', 'error');
  }
};

{!service.isPremium && (
  <button
    onClick={() => handlePremiumUpgrade(service._id)}
    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
  >
    <FaCrown />
    Upgrade to Premium
  </button>
)} 