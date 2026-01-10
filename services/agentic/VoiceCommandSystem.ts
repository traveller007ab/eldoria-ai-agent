export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  timestamp: Date;
  action: VoiceAction | null;
  status: 'recognized' | 'rejected' | 'executed' | 'failed';
}

export interface VoiceAction {
  type: VoiceActionType;
  target?: string;
  payload?: Record<string, unknown>;
  command: string;
}

export type VoiceActionType =
  | 'navigate'
  | 'edit'
  | 'format'
  | 'search'
  | 'cite'
  | 'heading'
  | 'save'
  | 'undo'
  | 'redo'
  | 'dictate'
  | 'help'
  | 'custom';

export interface VoiceRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  timeout: number;
}

export interface VoiceFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  audioCue?: boolean;
}

export interface SpeechSynthesisConfig {
  voice?: string;
  rate: number;
  pitch: number;
  volume: number;
}

export class VoiceCommandSystem {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private commandHistory: VoiceCommand[] = [];
  private onCommandCallbacks: ((command: VoiceCommand) => void)[] = [];
  private onStatusChangeCallbacks: ((status: boolean) => void)[] = [];
  private onFeedbackCallbacks: ((feedback: VoiceFeedback) => void)[] = [];

  private config: VoiceRecognitionConfig = {
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    timeout: 3000
  };

  private headingCommands: Record<string, string> = {
    'heading one': '# ',
    'heading two': '## ',
    'heading three': '### ',
    'heading four': '#### ',
    'bullet point': '- ',
    'numbered list': '1. ',
    'quote': '> ',
    'code block': '```\n',
    'end code': '```'
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSpeechRecognition();
      this.initializeSpeechSynthesis();
    }
  }

  private initializeSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition ||
                                   (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionClass();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.notifyStatusChange(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notifyStatusChange(false);
      if (this.config.continuous) {
        this.restartRecognition();
      }
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          this.processVoiceResult(result[0].transcript, result[0].confidence);
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.handleRecognitionError(event.error);
    };
  }

  private initializeSpeechSynthesis(): void {
    if (typeof window === 'undefined') return;
    this.synthesis = window.speechSynthesis || null;
  }

  private restartRecognition(): void {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn('Failed to restart recognition:', e);
      }
    }
  }

  private processVoiceResult(transcript: string, confidence: number): void {
    const normalizedTranscript = transcript.trim().toLowerCase();
    const command: VoiceCommand = {
      id: `cmd-${Date.now()}`,
      transcript,
      confidence,
      timestamp: new Date(),
      action: null,
      status: 'rejected'
    };

    const action = this.parseCommand(normalizedTranscript, transcript);
    if (action) {
      command.action = action;
      command.status = 'recognized';
      this.executeCommand(command);
    } else {
      command.status = 'rejected';
      this.provideFeedback({
        type: 'warning',
        message: `Didn't understand: "${transcript}"`,
        audioCue: true
      });
    }

    this.commandHistory.push(command);
    this.notifyCommand(command);
  }

  private parseCommand(normalized: string, original: string): VoiceAction | null {
    if (/^(?:go to|navigate to|open)\s+(.+)/i.test(normalized)) {
      const match = /^(?:go to|navigate to|open)\s+(.+)/i.exec(normalized);
      return { type: 'navigate', target: match?.[1], command: original };
    }

    if (/^(?:create|add|insert)\s+(heading|section|paragraph|bullet|list)/i.test(normalized)) {
      const match = /^(?:create|add|insert)\s+(heading|section|paragraph|bullet|list)/i.exec(normalized);
      const format = this.headingCommands[match?.[1]?.toLowerCase() || ''] || '';
      return { type: 'heading', payload: { format }, command: original };
    }

    if (/^(?:make|bold|italic|underline)\s+(this|text|selection)/i.test(normalized)) {
      const format = normalized.includes('bold') ? '**' :
                     normalized.includes('italic') ? '*' : '<u>';
      return { type: 'format', payload: { format }, command: original };
    }

    if (/^(?:search for|find)\s+(.+)/i.test(normalized)) {
      const match = /^(?:search for|find)\s+(.+)/i.exec(normalized);
      return { type: 'search', payload: { query: match?.[1] }, command: original };
    }

    if (/^(?:add citation|cite)\s+(.+)/i.test(normalized)) {
      const match = /^(?:add citation|cite)\s+(.+)/i.exec(normalized);
      return { type: 'cite', payload: { reference: match?.[1] }, command: original };
    }

    if (/^(?:save|export)/i.test(normalized)) {
      return { type: 'save', command: original };
    }

    if (/^undo$/i.test(normalized)) {
      return { type: 'undo', command: original };
    }

    if (/^redo$/i.test(normalized)) {
      return { type: 'redo', command: original };
    }

    if (/^(?:start dictation|begin dictation)$/i.test(normalized)) {
      return { type: 'dictate', payload: { mode: 'start' }, command: original };
    }

    if (/^(?:stop dictation|end dictation)$/i.test(normalized)) {
      return { type: 'dictate', payload: { mode: 'stop' }, command: original };
    }

    if (/^(?:what can I say|help me|commands)$/i.test(normalized)) {
      return { type: 'help', command: original };
    }

    return { type: 'custom', command: original };
  }

  private executeCommand(command: VoiceCommand): void {
    if (!command.action) return;

    const { type, payload } = command.action;

    switch (type) {
      case 'navigate':
        this.provideFeedback({ type: 'info', message: `Navigating to ${payload?.target}` });
        break;
      case 'heading':
        this.provideFeedback({
          type: 'success',
          message: 'Inserting heading',
          audioCue: true
        });
        break;
      case 'format':
        this.provideFeedback({ type: 'success', message: 'Formatting text', audioCue: true });
        break;
      case 'search':
        this.provideFeedback({ type: 'info', message: `Searching for ${payload?.query}` });
        break;
      case 'cite':
        this.provideFeedback({ type: 'success', message: `Adding citation for ${payload?.reference}`, audioCue: true });
        break;
      case 'save':
        this.provideFeedback({ type: 'success', message: 'Saving document', audioCue: true });
        break;
      case 'undo':
      case 'redo':
        this.provideFeedback({ type: 'info', message: type.charAt(0).toUpperCase() + type.slice(1) });
        break;
      case 'dictate':
        this.provideFeedback({
          type: 'success',
          message: payload?.mode === 'start' ? 'Dictation started' : 'Dictation stopped',
          audioCue: true
        });
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        this.provideFeedback({ type: 'info', message: 'Command received' });
    }

    command.status = 'executed';
  }

  private handleRecognitionError(error: string): void {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'No microphone found. Please check your audio settings.',
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error. Please check your connection.',
      'aborted': 'Speech recognition aborted.',
      'language-not-supported': 'Language not supported.',
      'service-not-allowed': 'Speech recognition service not allowed.'
    };

    this.provideFeedback({
      type: 'error',
      message: errorMessages[error] || `Error: ${error}`,
      audioCue: true
    });
  }

  startListening(): boolean {
    if (!this.recognition) {
      this.provideFeedback({
        type: 'error',
        message: 'Speech recognition not supported',
        audioCue: true
      });
      return false;
    }

    if (this.isListening) return true;

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start recognition:', e);
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    }
    return this.startListening();
  }

  speak(text: string, config?: Partial<SpeechSynthesisConfig>): void {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config?.rate ?? 1;
    utterance.pitch = config?.pitch ?? 1;
    utterance.volume = config?.volume ?? 1;

    if (config?.voice) {
      const voices = this.synthesis.getVoices();
      const voice = voices.find(v => v.name === config.voice);
      if (voice) utterance.voice = voice;
    }

    this.synthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  private provideFeedback(feedback: VoiceFeedback): void {
    if (feedback.audioCue) {
      this.playAudioCue(feedback.type);
    }
    this.notifyFeedback(feedback);
  }

  private playAudioCue(type: VoiceFeedback['type']): void {
    if (typeof window === 'undefined') return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'success':
          oscillator.frequency.value = 800;
          break;
        case 'error':
          oscillator.frequency.value = 300;
          break;
        case 'warning':
          oscillator.frequency.value = 500;
          break;
        default:
          oscillator.frequency.value = 600;
      }

      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.warn('Could not play audio cue:', e);
    }
  }

  private showHelp(): void {
    const helpText = 'Voice commands: Navigate, Add heading, Format text, Search, Add citation, Save, Undo/Redo, Dictate, Help';

    this.provideFeedback({ type: 'info', message: helpText });
    this.speak(helpText);
  }

  onCommand(callback: (command: VoiceCommand) => void): () => void {
    this.onCommandCallbacks.push(callback);
    return () => {
      this.onCommandCallbacks = this.onCommandCallbacks.filter(cb => cb !== callback);
    };
  }

  onStatusChange(callback: (listening: boolean) => void): () => void {
    this.onStatusChangeCallbacks.push(callback);
    return () => {
      this.onStatusChangeCallbacks = this.onStatusChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  onFeedback(callback: (feedback: VoiceFeedback) => void): () => void {
    this.onFeedbackCallbacks.push(callback);
    return () => {
      this.onFeedbackCallbacks = this.onFeedbackCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyCommand(command: VoiceCommand): void {
    this.onCommandCallbacks.forEach(cb => cb(command));
  }

  private notifyStatusChange(listening: boolean): void {
    this.onStatusChangeCallbacks.forEach(cb => cb(listening));
  }

  private notifyFeedback(feedback: VoiceFeedback): void {
    this.onFeedbackCallbacks.forEach(cb => cb(feedback));
  }

  getCommandHistory(): VoiceCommand[] {
    return [...this.commandHistory];
  }

  clearCommandHistory(): void {
    this.commandHistory = [];
  }

  isActive(): boolean {
    return this.isListening;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' &&
           ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) !== undefined;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  updateConfig(config: Partial<VoiceRecognitionConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
  }

  getConfig(): VoiceRecognitionConfig {
    return { ...this.config };
  }

  dictate(text: string): void {
    const command: VoiceCommand = {
      id: `dict-${Date.now()}`,
      transcript: text,
      confidence: 1,
      timestamp: new Date(),
      action: { type: 'dictate', payload: { text }, command: text },
      status: 'executed'
    };

    this.commandHistory.push(command);
    this.notifyCommand(command);
  }
}

export const voiceSystem = new VoiceCommandSystem();
