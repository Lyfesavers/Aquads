# Notification System for Aquads

This guide will help you integrate the new notification system into your application.

## Features

- Real-time notifications for new messages, bookings, and status changes
- Notification badge showing unread notification count
- Dropdown menu to view and manage notifications
- API for marking notifications as read

## Backend Components

The notification system consists of:

1. **Notification Model** (`server/models/Notification.js`): Stores notification data
2. **Notification Routes** (`server/routes/notifications.js`): API endpoints for retrieving and managing notifications
3. **Integration with Bookings and Services**: Automatically creates notifications for new messages, bookings, and status updates

## Frontend Components

1. **NotificationBell Component** (`src/components/NotificationBell.js`): The UI component that displays the notification bell and dropdown
2. **NavUtils** (`src/components/NavUtils.js`): Helper functions to easily integrate the notification bell into your navigation

## How to Integrate

### 1. Add the Notification Bell to your Navigation Bar

Find your navigation bar component (likely `NavBar.js` or similar) and import the notification bell:

```jsx
import { addNotificationBell } from './components/NavUtils';

// Inside your NavBar component's render method
<div className="flex items-center">
  {/* Add the notification bell before the user profile */}
  {addNotificationBell(currentUser)}
  
  {/* Your existing user profile or buttons */}
  <UserProfile />
</div>
```

### 2. Make sure the backend routes are registered

In `server/app.js`, ensure the notifications routes are registered:

```javascript
const notificationsRoutes = require('./routes/notifications');

// Add with your other routes
app.use('/api/notifications', notificationsRoutes);
```

### 3. Testing the Notification System

To test if notifications are working:

1. Log in with two different accounts
2. Have one user send a message to the other
3. Check if the receiving user sees a notification badge
4. Click the notification bell to see the notification
5. Click the notification to mark it as read and navigate to the conversation

## Customization

You can customize the notification bell's appearance by modifying the `NotificationBell.js` component. The key styling is done with Tailwind CSS classes.

## Troubleshooting

If notifications aren't appearing:

1. Check the browser console for errors
2. Verify that the notification routes are properly registered
3. Ensure the user is properly authenticated
4. Check the database to see if notifications are being created

## Further Development

Future enhancements could include:

1. Real-time notifications using WebSockets
2. Push notifications for mobile users
3. Email notifications for important events
4. More notification types for different user actions 