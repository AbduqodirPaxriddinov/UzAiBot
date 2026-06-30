// VOICE ENGINE MANAGER (STT & TTS)
class VoiceEngine {
  constructor(onTranscriptCallback) {
    this.onTranscript = onTranscriptCallback;
    this.isListening = false;
    this.synth = window.speechSynthesis;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'ru-RU'; // Multilingual support auto-detects or defaults

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (this.onTranscript) this.onTranscript(transcript);
      };

      this.recognition.onend = () => {
        this.stopListening();
      };
    } else {
      console.warn('Speech Recognition is not supported in this browser.');
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        document.getElementById('voiceWaveBar')?.classList.remove('hidden');
        document.getElementById('voiceMicBtn')?.classList.add('recording');
      } catch (e) {
        console.error('Mic start error:', e);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      document.getElementById('voiceWaveBar')?.classList.add('hidden');
      document.getElementById('voiceMicBtn')?.classList.remove('recording');
    }
  }

  speak(text) {
    if (!this.synth) return;
    this.synth.cancel(); // Stop active speech

    // Clean markdown symbols before speaking
    const cleanText = text.replace(/[*_#`~]/g, '').substring(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Detect voice language or use Russian/English default
    const voices = this.synth.getVoices();
    const ruVoice = voices.find(v => v.lang.includes('ru') || v.lang.includes('en'));
    if (ruVoice) utterance.voice = ruVoice;

    this.synth.speak(utterance);
  }
}

window.VoiceEngine = VoiceEngine;
