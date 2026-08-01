let activeAudioCtx: AudioContext | null = null;

export function stopAllAudio(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch (e) {
      // ignore
    }
    activeAudioCtx = null;
  }
}

export async function playPcmAudio(base64Audio: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      stopAllAudio();
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 16-bit PCM mono audio at 24000Hz from Gemini TTS
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 24000 });
      activeAudioCtx = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);

      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        if (activeAudioCtx === audioCtx) {
          activeAudioCtx = null;
        }
        audioCtx.close();
        resolve();
      };

      source.start();
    } catch (err) {
      console.error('PCM Audio playback error:', err);
      reject(err);
    }
  });
}

export function fallbackWebSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API not available in this environment');
      resolve();
      return;
    }

    try {
      stopAllAudio();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1.0;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const selectVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const preferredVoice =
            voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Google') ||
                  v.name.includes('Natural') ||
                  v.name.includes('Samantha') ||
                  v.name.includes('Daniel') ||
                  v.name.includes('Karen') ||
                  v.name.includes('Alex'))
            ) || voices.find((v) => v.lang.startsWith('en'));

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }
      };

      selectVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = selectVoice;
      }

      let completed = false;
      const finish = () => {
        if (!completed) {
          completed = true;
          resolve();
        }
      };

      utterance.onend = finish;
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis event error:', e);
        finish();
      };

      // Failsafe timer so Promise doesn't hang indefinitely
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationMs = Math.max(5000, wordCount * 500);
      const timer = setTimeout(finish, estimatedDurationMs);

      utterance.onend = () => {
        clearTimeout(timer);
        finish();
      };

      setTimeout(() => {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 50);
    } catch (err) {
      console.error('SpeechSynthesis exception:', err);
      resolve();
    }
  });
}


