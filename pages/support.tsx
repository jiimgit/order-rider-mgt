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
        background: 'linear-gradient(135deg, #4A90D9 0%, #5B9DE0 50%, #6AABE8 100%)',
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
          <img 
            src="data:image/jpeg;base64,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" 
            alt="MoveIt Logo"
            style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '22px',
              marginBottom: '20px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }}
          />
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
                background: 'linear-gradient(135deg, #4A90D9, #3B7DD8)',
                color: 'white',
                padding: '14px 40px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              Click Email
            </a>
            <p style={{ 
              color: '#64748b', 
              fontSize: '14px',
              marginTop: '15px'
            }}>
              We will respond within 2 to 3 working days
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
