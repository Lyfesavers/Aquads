# Buyer Acceptance Email Setup Guide

## Overview
This setup adds email notifications for buyers when sellers accept their booking requests. The system uses your existing EmailJS configuration and triggers emails automatically when booking status changes.

## What's Been Implemented

### 1. Email Service Function
- Added `sendBuyerAcceptanceEmail` function to `src/services/emailService.js`
- This function handles sending emails to buyers when their booking is accepted

### 2. Frontend Integration
- Modified `src/components/BookingManagement.js` to send emails directly
- When a seller accepts a booking, the email is sent immediately after successful status update
- Uses the same simple pattern as existing booking creation and welcome emails

## Required Environment Variables

Add these environment variables to your Netlify deployment:

### New Required Variable
```
REACT_APP_EMAILJS_BUYER_ACCEPTANCE_TEMPLATE=your_template_id_here
```

### Existing Variables (verify these are set)
```
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
REACT_APP_FRONTEND_URL=https://aquads.xyz
```

## EmailJS Template Setup

Create a new email template in your EmailJS dashboard with the following template variables:

### Template Variables
- `{{to_email}}` - Buyer's email address
- `{{buyerUsername}}` - Buyer's username
- `{{serviceTitle}}` - Service title
- `{{bookingId}}` - Booking ID
- `{{price}}` - Service price
- `{{currency}}` - Currency (e.g., USDC)
- `{{sellerUsername}}` - Seller's username
- `{{requirements}}` - Booking requirements
- `{{dashboard_link}}` - Direct link to booking in dashboard

### Sample Email Template
```html
<p>Hi {{buyerUsername}},</p>

<p>Great news! Your booking request has been accepted by {{sellerUsername}}!</p>

<p><strong>Service:</strong> {{serviceTitle}}</p>
<p><strong>Price:</strong> {{price}} {{currency}}</p>
<p><strong>Booking ID:</strong> {{bookingId}}</p>

<p><strong>Requirements:</strong></p>
<p>{{requirements}}</p>

<p><strong>Next Steps:</strong></p>
<p>Please log in to your dashboard and accept the booking to confirm and start the job.</p>

<p><a href="{{dashboard_link}}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking</a></p>

<p>Best regards,<br>
The Aquads Team</p>
```

## How It Works

1. **Buyer creates booking** → Status: 'pending'
2. **Seller accepts booking** → Status: 'accepted_by_seller'
3. **System triggers email** → Email sent to buyer with acceptance notification
4. **Buyer receives email** → Notified to return and confirm the booking
5. **Buyer accepts** → Status: 'accepted_by_buyer' → Both parties accepted → Status: 'confirmed'

## Testing

1. Create a booking as a buyer
2. Accept the booking as a seller
3. Check that the buyer receives an email notification
4. Verify the email contains correct booking details and dashboard link

## Notes

- Emails are sent directly from the frontend after successful booking acceptance
- Uses the same simple pattern as your existing booking and welcome emails
- No complex server-side triggers or notification processing required
- Works with your existing EmailJS configuration 