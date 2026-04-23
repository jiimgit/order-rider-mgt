import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    to,
    orderId,
    customerName,
    customerPhone,
    pickup,
    delivery,
    deliveryDate,
    deliverySlot,
    price,
    parcelSize,
    remarks
  } = req.body;

  // Validate required fields
  if (!to || !orderId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Format delivery slot label
    const slotLabels: { [key: string]: string } = {
      '6am-11am': '6am – 11am (cut off 9am)',
      '12pm-5pm': '12pm – 5pm (cut off 3pm)',
      '6pm-11pm': '6pm – 11pm (cut off 9pm)'
    };
    const slotLabel = slotLabels[deliverySlot] || deliverySlot || 'Not specified';

    // Format delivery date
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return 'Not specified';
      try {
        const d = new Date(dateStr + 'T00:00:00+08:00');
        return d.toLocaleDateString('en-GB', { 
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' 
        });
      } catch {
        return dateStr;
      }
    };

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4A90D9, #3B7DD8); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }
          .order-id { font-size: 24px; font-weight: bold; color: #4A90D9; }
          .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
          .label { font-weight: bold; width: 140px; color: #666; }
          .value { flex: 1; }
          .footer { background: #e9ecef; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
          .highlight { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 New Delivery Order</h1>
            <p>A new delivery job has been created</p>
          </div>
          
          <div class="content">
            <div class="highlight">
              <p style="margin: 0; text-align: center;">
                <span style="font-size: 14px; color: #856404;">Order ID</span><br>
                <span class="order-id">${orderId}</span>
              </p>
            </div>
            
            <h3>📋 Order Details</h3>
            
            <div class="detail-row">
              <span class="label">👤 Customer:</span>
              <span class="value">${customerName || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">📞 Phone:</span>
              <span class="value">${customerPhone || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">📍 Pickup:</span>
              <span class="value">${pickup || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">🏠 Delivery:</span>
              <span class="value">${delivery || 'N/A'}</span>
            </div>

            <div class="detail-row">
              <span class="label">📅 Date:</span>
              <span class="value">${formatDate(deliveryDate)}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">🕐 Time Slot:</span>
              <span class="value">${slotLabel}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">📦 Parcel Size:</span>
              <span class="value">${parcelSize || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">💰 Price:</span>
              <span class="value" style="font-weight: bold; color: #28a745;">$${parseFloat(price || 0).toFixed(2)}</span>
            </div>
            
            ${remarks ? `
            <div class="detail-row">
              <span class="label">📝 Remarks:</span>
              <span class="value">${remarks}</span>
            </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding: 15px; background: #d4edda; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #155724;">
                <strong>Action Required:</strong> Please assign a rider to this order.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from MoveIt Delivery App</p>
            <p>© 2026 The Food Thinker Pte Ltd. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MoveIt Delivery" <noreply@moveit.com>',
      to: to,
      subject: `🚚 New Order: ${orderId} - ${customerName}`,
      html: emailHtml,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
