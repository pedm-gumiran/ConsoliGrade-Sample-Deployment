import { useCallback } from 'react';

export default function useSpeechSynthesis() {
  const speak = useCallback((text, options = {}) => {
    if (!window.speechSynthesis) {
      console.warn('Speech Synthesis not supported in this browser');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Allow customization
    utterance.rate = options.rate || 1;     // speed (0.1–10)
    utterance.pitch = options.pitch || 1;   // pitch (0–2)
    utterance.volume = options.volume || 1; // volume (0–1)
    utterance.lang = options.lang || 'en-US';

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, cancel };
}
