/**
 * Google reCAPTCHA v3 utility
 * Executes reCAPTCHA and returns the token
 */
export const executeRecaptcha = async () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.grecaptcha) {
      reject(new Error('reCAPTCHA not loaded'));
      return;
    }

    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute('6LfccAgsAAAAADwDI1gYxAoFI7xo5OAMDdxaEvGV', { action: 'submit' })
        .then((token) => {
          resolve(token);
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
};

