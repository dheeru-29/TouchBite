import { useCallback, useEffect, useRef, useState } from 'react';
import { detectWakeWord, extractCommandAfterWakeWord } from './voiceWakeWord';
import { playSiriActivationSound, playSiriDeactivationSound } from '../utils/audioChime';

export const VOICE_STATES = {
  IDLE: 'IDLE', WAKE_LISTENING: 'WAKE_LISTENING', COMMAND_LISTENING: 'COMMAND_LISTENING', PROCESSING: 'PROCESSING', SPEAKING: 'SPEAKING', ERROR: 'ERROR',
};

export const useVoiceAssistant = (onCommandRecognized) => {
  const recognitionRef = useRef(null);
  const callbackRef = useRef(onCommandRecognized);
  const mountedRef = useRef(true);
  const stateRef = useRef(VOICE_STATES.IDLE);
  const modeRef = useRef(null);
  const pendingModeRef = useRef(null);
  const recognitionActiveRef = useRef(false);
  const restartTimerRef = useRef(null);
  const wakeBufferRef = useRef('');
  const wakeDetectedRef = useRef(false);
  const commandBufferRef = useRef('');
  const commandSubmitTimerRef = useRef(null);
  
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  callbackRef.current = onCommandRecognized;

  const setState = useCallback((nextState) => {
    // Trigger sound effects based on voice state transitions
    if (stateRef.current !== VOICE_STATES.COMMAND_LISTENING && nextState === VOICE_STATES.COMMAND_LISTENING) {
      playSiriActivationSound();
    } else if (stateRef.current === VOICE_STATES.PROCESSING && nextState === VOICE_STATES.SPEAKING) {
      playSiriDeactivationSound();
    } else if (stateRef.current === VOICE_STATES.COMMAND_LISTENING && nextState === VOICE_STATES.WAKE_LISTENING) {
      playSiriDeactivationSound(); 
    }
    
    stateRef.current = nextState;
    if (mountedRef.current) setVoiceState(nextState);
  }, []);

  const startRecognition = useCallback((mode) => {
    const recognition = recognitionRef.current;
    if (!recognition || !mountedRef.current) return;
    modeRef.current = mode;
    try { recognition.start(); } catch (error) {
      if (error.name !== 'InvalidStateError') setState(VOICE_STATES.ERROR);
    }
  }, [setState]);

  const requestRecognition = useCallback((mode) => {
    const recognition = recognitionRef.current;
    if (!recognition || !mountedRef.current) return;
    pendingModeRef.current = mode;
    if (recognitionActiveRef.current) {
      try { recognition.stop(); } catch { }
      return;
    }
    pendingModeRef.current = null;
    startRecognition(mode);
  }, [startRecognition]);

  const submitCommand = useCallback(() => {
    const command = commandBufferRef.current.trim();
    clearTimeout(commandSubmitTimerRef.current);
    commandBufferRef.current = '';
    if (!command || !mountedRef.current) return;
    setState(VOICE_STATES.PROCESSING);
    Promise.resolve(callbackRef.current?.(command)).catch(() => {});
  }, [setState]);

  const scheduleWakeListening = useCallback(() => {
    clearTimeout(restartTimerRef.current);
    if (!mountedRef.current || stateRef.current === VOICE_STATES.SPEAKING || stateRef.current === VOICE_STATES.PROCESSING) return;
    restartTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current && stateRef.current === VOICE_STATES.WAKE_LISTENING) requestRecognition('wake');
    }, 150);
  }, [requestRecognition]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState(VOICE_STATES.ERROR);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    setIsSupported(true);

    recognition.onstart = () => {
      recognitionActiveRef.current = true;
      setState(modeRef.current === 'wake' ? VOICE_STATES.WAKE_LISTENING : VOICE_STATES.COMMAND_LISTENING);
    };

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) finalText += event.results[index][0]?.transcript || '';
        else interimText += event.results[index][0]?.transcript || '';
      }
      const visibleText = (finalText || interimText).trim();
      if (mountedRef.current) setTranscript(visibleText);

      if (modeRef.current === 'wake') {
        const candidateText = `${wakeBufferRef.current} ${visibleText}`.trim();
        if (finalText.trim()) wakeBufferRef.current = `${wakeBufferRef.current} ${finalText.trim()}`.trim();
        if (detectWakeWord(candidateText)) wakeDetectedRef.current = true;
        if (!wakeDetectedRef.current || !finalText.trim()) return;
        
        const command = extractCommandAfterWakeWord(candidateText);
        recognition.stop();
        wakeBufferRef.current = '';
        wakeDetectedRef.current = false;
        setTranscript('');
        
        setState(command ? VOICE_STATES.PROCESSING : VOICE_STATES.COMMAND_LISTENING);
        if (command) Promise.resolve(callbackRef.current?.(command)).catch(() => {});
        else requestRecognition('command');
        return;
      }

      if (finalText.trim()) {
        commandBufferRef.current = `${commandBufferRef.current} ${finalText.trim()}`.trim();
        if (mountedRef.current) setTranscript(commandBufferRef.current);
        clearTimeout(commandSubmitTimerRef.current);
        commandSubmitTimerRef.current = window.setTimeout(() => {
          recognition.stop();
          submitCommand();
        }, 900);
      }
    };

    recognition.onend = () => {
      recognitionActiveRef.current = false;
      if (pendingModeRef.current) {
        const nextMode = pendingModeRef.current;
        pendingModeRef.current = null;
        startRecognition(nextMode);
        return;
      }
      if (mountedRef.current && stateRef.current === VOICE_STATES.COMMAND_LISTENING && modeRef.current === 'command') {
        requestRecognition('command');
        return;
      }
      if (mountedRef.current && stateRef.current === VOICE_STATES.WAKE_LISTENING && modeRef.current === 'wake') {
        scheduleWakeListening();
      }
    };

    setState(VOICE_STATES.WAKE_LISTENING);
    requestRecognition('wake');

    return () => {
      mountedRef.current = false;
      clearTimeout(restartTimerRef.current);
      clearTimeout(commandSubmitTimerRef.current);
      try { recognition.abort(); } catch { }
      recognitionRef.current = null;
    };
  }, [requestRecognition, scheduleWakeListening, setState, startRecognition, submitCommand]);

  const stopRecognition = useCallback(() => {
    clearTimeout(restartTimerRef.current);
    pendingModeRef.current = null;
    modeRef.current = null;
    try { recognitionRef.current?.stop(); } catch { }
  }, []);

  const pauseForSpeech = useCallback(() => {
    stopRecognition();
    setState(VOICE_STATES.SPEAKING);
  }, [setState, stopRecognition]);

  const resumeWakeListening = useCallback(() => {
    if (!mountedRef.current || !isSupported) return;
    setTranscript('');
    setState(VOICE_STATES.WAKE_LISTENING);
    modeRef.current = 'wake';
    requestRecognition('wake');
  }, [isSupported, setState, requestRecognition]);

  const startListening = useCallback(() => {
    stopRecognition();
    setTranscript('');
    commandBufferRef.current = '';
    wakeBufferRef.current = '';
    wakeDetectedRef.current = false;
    setState(VOICE_STATES.COMMAND_LISTENING);
    modeRef.current = 'command';
    requestRecognition('command');
  }, [setState, requestRecognition, stopRecognition]);

  return { voiceState, transcript, isSupported, pauseForSpeech, resumeWakeListening, startListening };
};

export default useVoiceAssistant;