/**
 * Helper to submit lead data to a Google Form in the background.
 * 
 * To set this up:
 * 1. Create a Google Form with fields for: Full Name, WhatsApp Number, Location, Product Interested.
 * 2. Get the form's "formResponse" URL.
 * 3. Get the "entry.xxxxxx" IDs for each field by inspecting the form's source code or using pre-filled link.
 */

export const googleFormConfig = {
  // Replace these placeholders with your real Google Form values in .env
  actionUrl: import.meta.env.VITE_GOOGLE_FORM_ACTION_URL || '',
  entries: {
    fullName: import.meta.env.VITE_GOOGLE_FORM_ENTRY_FULL_NAME || '',
    whatsappNumber: import.meta.env.VITE_GOOGLE_FORM_ENTRY_WHATSAPP_NUMBER || '',
    location: import.meta.env.VITE_GOOGLE_FORM_ENTRY_LOCATION || '',
    productInterested: import.meta.env.VITE_GOOGLE_FORM_ENTRY_PRODUCT_INTERESTED || '',
  },
};

interface LeadData {
  fullName: string;
  whatsappNumber: string;
  location: string;
  productInterested: string;
}

export async function submitLeadToGoogleForm(data: LeadData): Promise<boolean> {
  const { actionUrl, entries } = googleFormConfig;

  if (!actionUrl || !entries.fullName) {
    console.warn('Google Form integration not fully configured. Check your environment variables.');
    // For development/debugging purposes, we return true if config is missing but we're in dev
    // return true; 
  }

  try {
    const formData = new URLSearchParams();
    formData.append(entries.fullName, data.fullName);
    formData.append(entries.whatsappNumber, data.whatsappNumber);
    formData.append(entries.location, data.location);
    formData.append(entries.productInterested, data.productInterested);

    // Using no-cors mode as Google Forms doesn't return CORS headers
    await fetch(actionUrl, {
      method: 'POST',
      body: formData,
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return true;
  } catch (error) {
    console.error('Error submitting lead to Google Form:', error);
    return false;
  }
}
