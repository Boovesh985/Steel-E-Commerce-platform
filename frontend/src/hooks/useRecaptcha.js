/**
 * reCAPTCHA v3 hook — dynamically loads the script and generates tokens.
 *
 * The script is loaded on demand (not statically in index.html) to avoid
 * conflicting with Firebase Phone Auth's RecaptchaVerifier, which also
 * uses window.grecaptcha internally.
 */
import { useCallback, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lf3_lotAAAAACffW5CKYZ5ovs-QV2CiPc3rYSgR';

let loadPromise = null;

function loadRecaptchaScript() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // If already available (e.g. loaded by another path), reuse it
    if (window.grecaptcha && window.grecaptcha.execute) {
      resolve(window.grecaptcha);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // grecaptcha.ready ensures the API is fully loaded
      window.grecaptcha.ready(() => {
        resolve(window.grecaptcha);
      });
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useRecaptcha() {
  const loadingRef = useRef(false);

  const getToken = useCallback(async (action = 'submit') => {
    try {
      // If the script isn't loaded yet and we're not in the middle of
      // Firebase phone auth (which sets up its own grecaptcha), load it
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        if (loadingRef.current) return null;
        loadingRef.current = true;
        try {
          await loadRecaptchaScript();
        } finally {
          loadingRef.current = false;
        }
      }

      const token = await window.grecaptcha.execute(SITE_KEY, { action });
      return token;
    } catch (err) {
      console.error('reCAPTCHA error:', err);
      return null;
    }
  }, []);

  return { getToken };
}
