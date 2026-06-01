import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightweight wrapper around the browser SpeechRecognition API.
 * Falls back gracefully when the API is unavailable (supported === false).
 */
export function useVoiceInput(onTranscript: (text: string) => void, lang = 'en-US') {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang;
    rec.onresult = (event: any) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) chunk += event.results[i][0].transcript + ' ';
      }
      if (chunk.trim()) onTranscript(chunk.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, [lang, onTranscript]);

  const start = useCallback(() => {
    try { recognitionRef.current?.start(); setListening(true); } catch {}
  }, []);
  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}