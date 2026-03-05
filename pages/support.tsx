import Head from 'next/head';

export default function Support() {
  return (
    <>
      <Head>
        <title>MoveIt Support</title>
        <meta name="description" content="MoveIt Delivery App Support" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚚</div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#1e293b',
            marginBottom: '10px'
          }}>
            MoveIt Support
          </h1>
          <p style={{ 
            color: '#64748b', 
            marginBottom: '30px',
            fontSize: '16px'
          }}>
            We're here to help! Contact us for any questions or issues.
          </p>
          
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '25px'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '15px'
            }}>
              📧 Email Support
            </h2>
            <a 
              href="mailto:moveitdelivery@ymailzone.com"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
                color: 'white',
                padding: '12px 30px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              moveitdelivery@ymailzone.com
            </a>
            <p style={{ 
              color: '#64748b', 
              fontSize: '14px',
              marginTop: '15px'
            }}>
              We typically respond within 24-48 hours
            </p>
          </div>

          <div style={{
            background: '#f0fdf4',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '25px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#166534',
              marginBottom: '10px'
            }}>
              📱 App Features
            </h3>
            <ul style={{ 
              textAlign: 'left', 
              color: '#166534',
              fontSize: '14px',
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              <li style={{ marginBottom: '8px' }}>✓ Book instant deliveries</li>
              <li style={{ marginBottom: '8px' }}>✓ Real-time GPS tracking</li>
              <li style={{ marginBottom: '8px' }}>✓ Secure PayNow payments</li>
              <li>✓ Photo proof of delivery</li>
            </ul>
          </div>

          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '20px',
            color: '#94a3b8',
            fontSize: '13px'
          }}>
            <p>MoveIt Delivery App</p>
            <p>© 2026 All rights reserved</p>
          </div>
        </div>
      </div>
    </>
  );
}
