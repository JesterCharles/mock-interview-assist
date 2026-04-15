'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, AlertTriangle } from 'lucide-react';

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
            const sessionText = Array.from(event.results)
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

    const monoLabel: React.CSSProperties = {
        fontFamily: 'var(--font-jetbrains-mono)',
        letterSpacing: '0.08em',
    };

    return (
        <div className="w-full flex flex-col gap-3 animate-fade-in">
            {error && (
                <div className="flex items-center gap-2 text-[var(--danger)] text-sm font-medium bg-[var(--surface)] border border-[var(--danger)] rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {!hideTranscript && (
                <div className="relative">
                    <textarea
                        className={`w-full h-32 p-4 rounded-lg resize-none focus:ring-2 focus:outline-none transition-colors duration-150 bg-[var(--surface-muted)] border text-[var(--ink)] placeholder-[var(--muted)]
                    ${isLimit ? 'border-[var(--danger)] focus:ring-[var(--danger)]/30' :
                                isWarning ? 'border-[var(--warning)] focus:ring-[var(--warning)]/30' :
                                    'border-[var(--border-subtle)] focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]'}`}
                        value={transcript}
                        onChange={handleTextChange}
                        placeholder="Click the microphone to start speaking, or type your answer here..."
                        disabled={disabled}
                    />

                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span
                            className={`text-xs font-medium px-2 py-1 rounded-md bg-[var(--surface)] border border-[var(--border-subtle)] tabular-nums ${isLimit ? 'text-[var(--danger)]' : isWarning ? 'text-[var(--warning)]' : 'text-[var(--muted)]'}`}
                            style={monoLabel}
                        >
                            {charCount} / {charLimit}
                        </span>
                    </div>
                </div>
            )}

            {/* Character bar + warnings for hidden transcript mode */}
            {isWarning && !isLimit && (
                <div className="flex items-center gap-2 text-[var(--warning)] text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Approaching character limit. Stay concise.
                </div>
            )}

            {isLimit && (
                <div className="flex items-center gap-2 text-[var(--danger)] text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Maximum character limit reached.
                </div>
            )}

            <div className={`flex items-center ${hideTranscript ? 'justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4' : 'gap-3'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleRecording}
                        disabled={disabled || !!error || isLimit}
                        className={`${isRecording ? 'btn-secondary-flat' : 'btn-accent-flat'} flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                        aria-pressed={isRecording}
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
                            className="flex items-center gap-1.5 px-3 py-3 rounded-md text-[var(--muted)] hover:text-[var(--danger)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] hover:border-[var(--danger)] transition-colors duration-150 text-xs font-medium disabled:opacity-30"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}

                    {/* Static recording indicator (DESIGN.md D-02, no animation) */}
                    {isRecording && (
                        <span
                            className="inline-flex items-center gap-2 text-[var(--accent)] uppercase"
                            style={{ ...monoLabel, fontSize: 11 }}
                            aria-live="polite"
                        >
                            <span
                                className="inline-block rounded-full bg-[var(--accent)]"
                                style={{ width: 8, height: 8 }}
                            />
                            Recording
                        </span>
                    )}
                </div>

                {/* Character progress bar for hidden transcript — flat accent fill */}
                {hideTranscript && (
                    <div className="flex items-center gap-3 flex-1 ml-4">
                        <div className="flex-1 h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${isLimit ? 'bg-[var(--danger)]' : isWarning ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'}`}
                                style={{ width: `${charPercent}%` }}
                            />
                        </div>
                        <span
                            className={`text-xs font-medium tabular-nums whitespace-nowrap ${isLimit ? 'text-[var(--danger)]' : isWarning ? 'text-[var(--warning)]' : 'text-[var(--muted)]'}`}
                            style={monoLabel}
                        >
                            {charCount}/{charLimit}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
