# EmailJS Contacts Setup for Email Marketing

This guide explains how to enable **Save Contacts** on your EmailJS templates so that every email recipient is automatically added to your contacts list for export and email marketing.

## Prerequisites

The Aquads app already sends these template parameters to EmailJS:

- **`to_email`** – Recipient email (required for Contact Email)
- **`contact_name`** – Display name for the contact (optional)

## Enable Save Contacts for Each Template

For each of your EmailJS templates (Welcome, Booking, Verification, Buyer Acceptance, AquaPay Payment, AquaPay Receipt):

### 1. Open the Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Open your Email Service
3. Open the template you want to configure

### 2. Configure the Contacts Tab

1. Open the **Contacts** tab in the template
2. Check **Save Contacts**
3. Set the contact fields:
   - **Contact Email (required):** `{{to_email}}`
   - **Name (optional):** `{{contact_name}}`
4. Save the template

### 3. Repeat for All Templates

Apply the same settings to these templates:

| Template                | Contact Email   | Contact Name     |
|-------------------------|-----------------|------------------|
| Welcome                 | `{{to_email}}`  | `{{contact_name}}` |
| New Booking             | `{{to_email}}`  | `{{contact_name}}` |
| Verification            | `{{to_email}}`  | `{{contact_name}}` |
| Buyer Acceptance        | `{{to_email}}`  | `{{contact_name}}` |
| AquaPay Payment         | `{{to_email}}`  | `{{contact_name}}` |
| AquaPay Receipt         | `{{to_email}}`  | `{{contact_name}}` |

## Viewing and Exporting Contacts

After enabling Save Contacts:

1. Go to **Contacts** in the EmailJS dashboard
2. Use filters to view contacts by template
3. Click **Export to CSV** to download all contacts for email marketing

## How It Works

- When an email is sent through EmailJS, it checks if a contact with that email already exists
- If not, a new contact is created with the configured fields
- Duplicates are avoided by email address
- Contacts are stored in your EmailJS account and can be exported at any time
