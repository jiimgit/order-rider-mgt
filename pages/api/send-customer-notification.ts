import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    to,
    type,
    orderId,
    customerName,
    pickup,
    delivery,
    deliveryDate,
    deliverySlot,
    price,
    parcelSize,
    remarks,
    riderName,
    riderPhone,
    riderVehicleType,
    trackingUrl
  } = req.body;

  // Validate required fields
  if (!to || !orderId || !type) {
    return res.status(400).json({ error: 'Missing required fields (to, orderId, type)' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Format delivery slot label
    const slotLabels: { [key: string]: string } = {
      '6am-11am': '6am – 11am',
      '12pm-5pm': '12pm – 5pm',
      '6pm-11pm': '6pm – 11pm'
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

    // Vehicle type label
    const vehicleLabels: { [key: string]: string } = {
      'bike': '🏍️ Motorcycle',
      'car': '🚗 Car',
      'van': '🚐 Van',
      'lorry': '🚛 Lorry'
    };
    const vehicleLabel = vehicleLabels[riderVehicleType] || riderVehicleType || 'N/A';

    let subject = '';
    let emailHtml = '';

    if (type === 'accepted') {
      subject = `✅ Your Delivery ${orderId} Has Been Accepted!`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f0f2f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { margin: 0 0 8px 0; font-size: 22px; }
            .header p { margin: 0; opacity: 0.9; font-size: 14px; }
            .content { background: #ffffff; padding: 24px; border-left: 1px solid #e9ecef; border-right: 1px solid #e9ecef; }
            .order-badge { background: #e8f5e9; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
            .order-badge .order-id { font-size: 22px; font-weight: bold; color: #2e7d32; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #495057; font-size: 15px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e9ecef; }
            .detail-row { padding: 8px 0; display: flex; }
            .detail-row .label { font-weight: 600; color: #666; width: 130px; flex-shrink: 0; font-size: 13px; }
            .detail-row .value { color: #333; font-size: 13px; }
            .rider-card { background: linear-gradient(135deg, #e3f2fd, #bbdefb); padding: 16px; border-radius: 8px; margin-bottom: 20px; }
            .rider-card h3 { color: #1565c0; margin: 0 0 12px 0; font-size: 15px; }
            .tracking-btn { display: block; background: linear-gradient(135deg, #4A90D9, #3B7DD8); color: white; text-decoration: none; padding: 14px 20px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Your Delivery Has Been Accepted!</h1>
              <p>A rider has been assigned to your order</p>
            </div>
            
            <div class="content">
              <div class="order-badge">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Order ID</div>
                <div class="order-id">${orderId}</div>
              </div>

              <div class="rider-card">
                <h3>🏍️ Your Rider</h3>
                <div class="detail-row">
                  <span class="label">Name:</span>
                  <span class="value"><strong>${riderName || 'N/A'}</strong></span>
                </div>
                <div class="detail-row">
                  <span class="label">Phone:</span>
                  <span class="value"><a href="tel:${riderPhone}" style="color: #1565c0;">${riderPhone || 'N/A'}</a></span>
                </div>
                <div class="detail-row">
                  <span class="label">Vehicle:</span>
                  <span class="value">${vehicleLabel}</span>
                </div>
              </div>

              <div class="section">
                <h3>📋 Order Details</h3>
                <div class="detail-row">
                  <span class="label">📍 Pickup:</span>
                  <span class="value">${pickup || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">🏠 Drop-off:</span>
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
              </div>

              ${trackingUrl ? `
              <a href="${trackingUrl}" class="tracking-btn">📍 Track Your Delivery Live</a>
              ` : ''}

              <div style="background: #fff8e1; padding: 14px; border-radius: 8px; font-size: 13px; color: #795548;">
                <strong>💡 What's next?</strong><br>
                Your rider will pick up the package and deliver it during your selected time slot. You can contact your rider directly if needed.
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from MoveIt Delivery</p>
              <p>&copy; 2026 The Food Thinker Pte Ltd. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'completed') {
      subject = `✅ Delivery Completed: ${orderId}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f0f2f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2e7d32, #43a047); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { margin: 0 0 8px 0; font-size: 22px; }
            .header p { margin: 0; opacity: 0.9; font-size: 14px; }
            .content { background: #ffffff; padding: 24px; border-left: 1px solid #e9ecef; border-right: 1px solid #e9ecef; }
            .order-badge { background: #e8f5e9; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
            .order-badge .order-id { font-size: 22px; font-weight: bold; color: #2e7d32; }
            .detail-row { padding: 8px 0; display: flex; }
            .detail-row .label { font-weight: 600; color: #666; width: 130px; flex-shrink: 0; font-size: 13px; }
            .detail-row .value { color: #333; font-size: 13px; }
            .footer { background: #f8f9fa; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Delivery Completed!</h1>
              <p>Your package has been delivered successfully</p>
            </div>
            <div class="content">
              <div class="order-badge">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Order ID</div>
                <div class="order-id">${orderId}</div>
              </div>
              <div class="detail-row">
                <span class="label">🏠 Delivered to:</span>
                <span class="value">${delivery || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">🏍️ Rider:</span>
                <span class="value">${riderName || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">💰 Price:</span>
                <span class="value" style="font-weight: bold; color: #28a745;">$${parseFloat(price || 0).toFixed(2)}</span>
              </div>
              ${trackingUrl ? `
              <div style="margin-top: 16px; text-align: center;">
                <a href="${trackingUrl}" style="color: #4A90D9; font-size: 13px;">View Proof of Delivery</a>
              </div>
              ` : ''}
              <div style="margin-top: 20px; background: #e8f5e9; padding: 14px; border-radius: 8px; font-size: 13px; color: #2e7d32; text-align: center;">
                Thank you for using MoveIt Delivery! 🙏
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from MoveIt Delivery</p>
              <p>&copy; 2026 The Food Thinker Pte Ltd. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      return res.status(400).json({ error: 'Invalid notification type. Use: accepted, completed' });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MoveIt Delivery" <noreply@moveit.com>',
      to: to,
      subject: subject,
      html: emailHtml,
    });

    return res.status(200).json({ success: true, message: 'Notification email sent successfully' });
  } catch (error: any) {
    console.error('Customer notification email error:', error);
    return res.status(500).json({ error: 'Failed to send notification email', details: error.message });
  }
}
