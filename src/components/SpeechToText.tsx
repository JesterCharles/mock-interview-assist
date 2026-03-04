'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, AlertTriangle } from 'lucide-react';

interface SpeechToTextProps {
    onTranscriptChange: (text: string) => void;
    charLimit?: number;
    warningLimit?: number;
    disabled?: boolean;
    hideTranscript?: boolean;
    isFollowUp?: boolean;
}

export default function SpeechToText({
    onTranscriptChange,
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
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            let fullText = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');

            if (fullText.length > charLimit) {
                fullText = fullText.slice(0, charLimit);
                stopRecording();
            }

            setTranscript(fullText);

            // Queue the external change after setting local state
            setTimeout(() => {
                onTranscriptChange(fullText);
            }, 0);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                setError(`Microphone error: ${event.error}`);
                setIsRecording(false);
            }
        };

        recognition.onend = () => {
            // If we manually stopped it or character limit reached, it ends cleanly
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [charLimit, onTranscriptChange, SpeechRecognition]);

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
        setTranscript('');
        onTranscriptChange('');
        try {
            recognitionRef.current?.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Failed to start recording", e);
        }
    };

    const stopRecording = () => {
        recognitionRef.current?.stop();
        setIsRecording(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value.slice(0, charLimit);
        setTranscript(text);
        onTranscriptChange(text);
    };

    const charCount = transcript.length;
    const isWarning = charCount >= warningLimit;
    const isLimit = charCount >= charLimit;

    return (
        <div className="w-full flex flex-col gap-3">
            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

            {!hideTranscript && (
                <div className="relative">
                    <textarea
                        className={`w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:outline-none 
                    ${isLimit ? 'border-red-500 focus:ring-red-200 bg-red-500/10 text-red-200' :
                                isWarning ? 'border-amber-500 focus:ring-amber-200 bg-amber-500/10 text-amber-200' :
                                    'border-slate-600 bg-slate-800/50 text-white focus:ring-indigo-500 focus:border-indigo-500'}`}
                        value={transcript}
                        onChange={handleTextChange}
                        placeholder="Click the microphone to start speaking, or type your answer here..."
                        disabled={disabled}
                    />

                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded bg-black/40 ${isLimit ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-400'}`}>
                            {charCount} / {charLimit}
                        </span>
                    </div>
                </div>
            )}

            {isWarning && !isLimit && (
                <div className="flex items-center gap-2 text-amber-500 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Approaching character limit. Stay concise.
                </div>
            )}

            {isLimit && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Maximum character limit reached.
                </div>
            )}

            <div className={`flex items-center ${hideTranscript ? 'justify-between bg-slate-800/50 p-4 border border-slate-700 border-dashed rounded-xl' : 'gap-3'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleRecording}
                        disabled={disabled || !!error || isLimit}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all shadow-md ${isRecording
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : isFollowUp
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500 animate-pulse ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-4 h-4 fill-current" /> Stop Recording
                            </>
                        ) : (
                            <>
                                <Mic className={`w-4 h-4 ${isFollowUp ? 'text-emerald-100' : ''}`} />
                                {isFollowUp ? 'Click to Record Follow-up' : 'Start Speaking'}
                            </>
                        )}
                    </button>

                    {isRecording && (
                        <span className="flex items-center gap-2 text-red-500 text-sm font-medium animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Recording...
                        </span>
                    )}
                </div>

                {hideTranscript && (
                    <div className={`text-sm font-medium px-3 py-1.5 rounded-lg bg-black/40 ${isLimit ? 'text-red-400 border border-red-500/30' : isWarning ? 'text-amber-400 border border-amber-500/30' : 'text-slate-400'}`}>
                        {charCount} / {charLimit} characters
                    </div>
                )}
            </div>
        </div>
    );
}
