'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Trash2, AlertTriangle } from 'lucide-react';

interface SpeechToTextProps {
    onTranscriptChange: (text: string) => void;
    onAutoSubmit?: () => void;
    charLimit?: number;
    warningLimit?: number;
    disabled?: boolean;
    hideTranscript?: boolean;
    isFollowUp?: boolean;
}

export default function SpeechToText({
    onTranscriptChange,
    onAutoSubmit,
    charLimit = 1000,
    warningLimit = 800,
    disabled = false,
    hideTranscript = false,
    isFollowUp = false,
}: SpeechToTextProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');

    // @ts-expect-error - SpeechRecognition is not standard TS yet
    const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    const recognitionRef = useRef<any>(null);
    const intentionalStopRef = useRef(false);
    const isRecordingRef = useRef(false);
    // Tracks text captured before pause so resume appends instead of replacing
    const savedTextRef = useRef('');
    const latestTranscriptRef = useRef('');
    const autoSubmitCalledRef = useRef(false);

    // Stable callback refs to avoid stale closures
    const onTranscriptChangeRef = useRef(onTranscriptChange);
    onTranscriptChangeRef.current = onTranscriptChange;
    const onAutoSubmitRef = useRef(onAutoSubmit);
    onAutoSubmitRef.current = onAutoSubmit;
    const charLimitRef = useRef(charLimit);
    charLimitRef.current = charLimit;

    useEffect(() => {
        if (!SpeechRecognition) {
            setError('Speech Recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            // Build text from this recognition session only
            let sessionText = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');

            // Combine with previously saved text from prior sessions
            let fullText = savedTextRef.current;
            if (fullText && sessionText && !fullText.endsWith(' ') && !sessionText.startsWith(' ')) {
                fullText += ' ';
            }
            fullText += sessionText;

            if (fullText.length >= charLimitRef.current) {
                fullText = fullText.slice(0, charLimitRef.current);
                setTranscript(fullText);
                latestTranscriptRef.current = fullText;
                onTranscriptChangeRef.current(fullText);

                // Stop recording and auto-submit
                intentionalStopRef.current = true;
                isRecordingRef.current = false;
                recognition.stop();
                setIsRecording(false);

                // Fire auto-submit once
                if (!autoSubmitCalledRef.current && onAutoSubmitRef.current) {
                    autoSubmitCalledRef.current = true;
                    setTimeout(() => {
                        onAutoSubmitRef.current?.();
                    }, 300);
                }
                return;
            }

            setTranscript(fullText);
            latestTranscriptRef.current = fullText;
            setTimeout(() => {
                onTranscriptChangeRef.current(fullText);
            }, 0);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                setError(`Microphone error: ${event.error}`);
                isRecordingRef.current = false;
                setIsRecording(false);
            }
        };

        recognition.onend = () => {
            savedTextRef.current = latestTranscriptRef.current;
            // Auto-restart if the user did not intentionally stop
            if (!intentionalStopRef.current && isRecordingRef.current) {
                try {
                    setTimeout(() => {
                        if (isRecordingRef.current && !intentionalStopRef.current) {
                            recognition.start();
                        }
                    }, 100);
                } catch (e) {
                    console.warn('Auto-restart failed', e);
                    isRecordingRef.current = false;
                    setIsRecording(false);
                }
            } else {
                isRecordingRef.current = false;
                setIsRecording(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            intentionalStopRef.current = true;
            isRecordingRef.current = false;
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [SpeechRecognition]);

    const toggleRecording = () => {
        if (disabled || error) return;

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        if (transcript.length >= charLimit) return;
        // Save current transcript so new speech appends to it
        savedTextRef.current = transcript;
        latestTranscriptRef.current = transcript;
        intentionalStopRef.current = false;
        isRecordingRef.current = true;
        autoSubmitCalledRef.current = false;
        try {
            recognitionRef.current?.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Failed to start recording", e);
            isRecordingRef.current = false;
        }
    };

    const stopRecording = () => {
        intentionalStopRef.current = true;
        isRecordingRef.current = false;
        recognitionRef.current?.stop();
        setIsRecording(false);
    };

    const clearTranscript = () => {
        if (isRecording) {
            stopRecording();
        }
        savedTextRef.current = '';
        latestTranscriptRef.current = '';
        setTranscript('');
        onTranscriptChange('');
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value.slice(0, charLimit);
        setTranscript(text);
        savedTextRef.current = text;
        latestTranscriptRef.current = text;
        onTranscriptChange(text);
    };

    const charCount = transcript.length;
    const charPercent = Math.min(100, (charCount / charLimit) * 100);
    const isWarning = charCount >= warningLimit;
    const isLimit = charCount >= charLimit;

    return (
        <div className="w-full flex flex-col gap-3 animate-fade-in">
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-medium glass-card p-3 border-red-500/20">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {!hideTranscript && (
                <div className="relative">
                    <textarea
                        className={`w-full h-32 p-4 rounded-xl resize-none focus:ring-2 focus:outline-none transition-all duration-300 bg-white/[0.03] border text-slate-200 placeholder-slate-500
                    ${isLimit ? 'border-red-500/40 focus:ring-red-500/30 bg-red-500/[0.03]' :
                                isWarning ? 'border-amber-500/40 focus:ring-amber-500/30 bg-amber-500/[0.03]' :
                                    'border-white/[0.08] focus:ring-cyan-500/30 focus:border-cyan-500/30'}`}
                        value={transcript}
                        onChange={handleTextChange}
                        placeholder="Click the microphone to start speaking, or type your answer here..."
                        disabled={disabled}
                    />

                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm ${isLimit ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-500'}`}>
                            {charCount} / {charLimit}
                        </span>
                    </div>
                </div>
            )}

            {/* Character bar + warnings for hidden transcript mode */}
            {isWarning && !isLimit && (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Approaching character limit. Stay concise.
                </div>
            )}

            {isLimit && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Maximum character limit reached.
                </div>
            )}

            <div className={`flex items-center ${hideTranscript ? 'justify-between glass-card p-4' : 'gap-3'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleRecording}
                        disabled={disabled || !!error || isLimit}
                        className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${isRecording
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 recording-ring'
                            : isFollowUp
                                ? 'btn-accent shadow-lg'
                                : 'btn-primary shadow-lg'
                            } disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none`}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-4 h-4 fill-current" /> Stop Recording
                            </>
                        ) : (
                            <>
                                <Mic className="w-4 h-4" />
                                {isFollowUp ? 'Record Follow-up' : 'Start Speaking'}
                            </>
                        )}
                    </button>

                    {/* Clear button -- only show when there is text and not recording */}
                    {transcript.length > 0 && !isRecording && (
                        <button
                            onClick={clearTranscript}
                            disabled={disabled}
                            className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-slate-500 hover:text-red-400 bg-white/[0.04] border border-white/[0.06] hover:border-red-500/20 transition-all duration-200 text-xs font-medium disabled:opacity-30"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}

                    {isRecording && (
                        <span className="flex items-center gap-2 text-red-400 text-xs font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Recording...
                        </span>
                    )}
                </div>

                {/* Character progress bar for hidden transcript */}
                {hideTranscript && (
                    <div className="flex items-center gap-3 flex-1 ml-4">
                        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${isLimit ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'progress-gradient'}`}
                                style={{ width: `${charPercent}%` }}
                            />
                        </div>
                        <span className={`text-xs font-mono font-medium tabular-nums whitespace-nowrap ${isLimit ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-500'}`}>
                            {charCount}/{charLimit}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
