const https = require('https');

/**
 * Verify Google reCAPTCHA v3 token
 * @param {string} token - The reCAPTCHA token from the client
 * @returns {Promise<{success: boolean, score?: number, error?: string}>}
 */
const verifyRecaptcha = async (token) => {
  return new Promise((resolve, reject) => {
    if (!token) {
      return resolve({ success: false, error: 'reCAPTCHA token is missing' });
    }

    const secretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY || '6LfccAgsAAAAAKLpN-_60IG2m2nZ203Zfz9z9fuT';
    const postData = `secret=${secretKey}&response=${token}`;

    const options = {
      hostname: 'www.google.com',
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.success) {
            // reCAPTCHA v3 returns a score (0.0 to 1.0)
            // Typically, scores above 0.5 are considered legitimate
            const score = result.score || 0;
            if (score < 0.5) {
              return resolve({
                success: false,
                error: 'reCAPTCHA verification failed: Low score',
                score
              });
            }
            
            resolve({
              success: true,
              score: result.score,
              action: result.action
            });
          } else {
            resolve({
              success: false,
              error: result['error-codes']?.join(', ') || 'reCAPTCHA verification failed'
            });
          }
        } catch (error) {
          reject(new Error('Failed to parse reCAPTCHA response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`reCAPTCHA verification request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
};

module.exports = { verifyRecaptcha };

