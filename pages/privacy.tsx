import Head from 'next/head';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>MoveIt Privacy Policy</title>
        <meta name="description" content="MoveIt Delivery App Privacy Policy" />
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
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <img 
              src="data:image/jpeg;base64,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" 
              alt="MoveIt Logo"
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '18px',
                marginBottom: '15px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
              }}
            />
            <h1 style={{ 
              fontSize: '26px', 
              fontWeight: 'bold', 
              color: '#1e293b',
              marginBottom: '5px'
            }}>
              Privacy Policy
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Last updated: March 2026
            </p>
          </div>

          <div style={{ color: '#374151', fontSize: '15px', lineHeight: '1.7' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
              Information We Collect
            </h2>
            <p style={{ marginBottom: '20px' }}>
              We collect your name, email, phone number, and delivery addresses to provide our delivery services. Location data is used only during active deliveries for real-time tracking.
            </p>

            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
              How We Use Your Information
            </h2>
            <p style={{ marginBottom: '20px' }}>
              Your information is used to process delivery orders, enable tracking, communicate updates, and improve our services. We do not sell your personal data to third parties.
            </p>

            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
              Data Security
            </h2>
            <p style={{ marginBottom: '20px' }}>
              We use industry-standard security measures to protect your data. Payment processing is handled securely through Stripe.
            </p>

            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
              Contact Us
            </h2>
            <p style={{ marginBottom: '10px' }}>
              For privacy-related questions, contact us at:
            </p>
            <a 
              href="mailto:moveitdelivery@ymailzone.com"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #4A90D9, #3B7DD8)',
                color: 'white',
                padding: '12px 30px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Click Email
            </a>
          </div>

          <div style={{
            borderTop: '1px solid #e2e8f0',
            marginTop: '30px',
            paddingTop: '20px',
            textAlign: 'center',
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
