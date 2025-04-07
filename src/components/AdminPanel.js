import React, { useState, useEffect } from 'react';

const AdminPanel = () => {
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pending verifications
        const verificationResponse = await fetch('/api/twitter-raids/verifications/pending', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Fetch suspicious activity data
        const suspiciousResponse = await fetch('/api/twitter-raids/suspicious', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (verificationResponse.ok && suspiciousResponse.ok) {
          const verificationData = await verificationResponse.json();
          const suspiciousData = await suspiciousResponse.json();
          
          setPendingVerifications(verificationData.pendingVerifications);
          setSuspiciousActivity(suspiciousData.suspiciousActivities);
        } else {
          setError('Failed to fetch admin data. Make sure you have admin privileges.');
        }
      } catch (err) {
        setError('An error occurred while fetching data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // ... existing code for handleVerification ...
  
  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <section className="pending-verifications">
            <h3>Pending Verifications</h3>
            {pendingVerifications.length === 0 ? (
              <p>No pending verifications at this time.</p>
            ) : (
              // ... existing verification table code ...
            )}
          </section>
          
          <section className="suspicious-activity">
            <h3>Suspicious Activity</h3>
            {!suspiciousActivity ? (
              <p>No suspicious activity detected.</p>
            ) : (
              <div>
                {/* Multiple accounts per IP */}
                <div className="suspicious-section">
                  <h4>Multiple Accounts Per IP Address</h4>
                  {Object.keys(suspiciousActivity.multipleAccountsPerIP).length === 0 ? (
                    <p>No instances of multiple accounts using the same IP.</p>
                  ) : (
                    <div>
                      {Object.entries(suspiciousActivity.multipleAccountsPerIP).map(([ip, completions]) => (
                        <div key={ip} className="ip-group">
                          <h5>IP Address: {ip}</h5>
                          <table>
                            <thead>
                              <tr>
                                <th>Username</th>
                                <th>Raid</th>
                                <th>Completed At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {completions.map((completion, idx) => (
                                <tr key={idx}>
                                  <td>{completion.username}</td>
                                  <td>{completion.title}</td>
                                  <td>{new Date(completion.timestamp).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Rapid completions */}
                <div className="suspicious-section">
                  <h4>Rapid Completions (< 5 seconds apart)</h4>
                  {suspiciousActivity.rapidCompletions.length === 0 ? (
                    <p>No instances of suspiciously rapid completions.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Raid</th>
                          <th>User 1</th>
                          <th>User 2</th>
                          <th>Time Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspiciousActivity.rapidCompletions.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.title}</td>
                            <td>{item.user1.username} ({new Date(item.user1.timestamp).toLocaleTimeString()})</td>
                            <td>{item.user2.username} ({new Date(item.user2.timestamp).toLocaleTimeString()})</td>
                            <td>{item.timeDiff}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminPanel; 