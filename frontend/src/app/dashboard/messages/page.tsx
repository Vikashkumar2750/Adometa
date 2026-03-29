'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Search, Send, CheckCheck, Check,
    Clock, Phone, RefreshCw, Loader2, Inbox,
    AlertCircle, Info,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getHeaders() {
    const token = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

interface WebhookEvent {
    id: string;
    eventType: string;
    messageId: string;
    status: string;
    createdAt: string;
    // Raw payload fields we expand:
    from?: string;
    to?: string;
    text?: string;
    type?: string;
}

interface Conversation {
    phone: string;
    name: string;
    messages: WebhookEvent[];
    lastTime: string;
    unreadCount: number;
}

function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString();
}

function extractFromEvent(ev: any): WebhookEvent {
    const p = ev.payload || {};
    const msg = p.messages?.[0];
    const change = p.entry?.[0]?.changes?.[0]?.value;
    const inboundMsg = change?.messages?.[0];
    const statusUpdate = change?.statuses?.[0];

    return {
        id: ev.id,
        eventType: ev.eventType,
        messageId: ev.messageId,
        status: ev.status,
        createdAt: ev.createdAt,
        from: inboundMsg?.from || statusUpdate?.recipient_id || msg?.from || p.from || '',
        to: statusUpdate?.recipient_id || inboundMsg?.to || '',
        text: inboundMsg?.text?.body || inboundMsg?.caption || msg?.text?.body || '',
        type: inboundMsg?.type || ev.eventType,
    };
}

function groupIntoConversations(events: WebhookEvent[]): Conversation[] {
    const map = new Map<string, Conversation>();
    for (const ev of events) {
        const key = ev.from || 'unknown';
        if (!map.has(key)) {
            map.set(key, {
                phone: key,
                name: key === 'unknown' ? 'Unknown' : `+${key}`,
                messages: [],
                lastTime: ev.createdAt,
                unreadCount: 0,
            });
        }
        const conv = map.get(key)!;
        conv.messages.push(ev);
        if (new Date(ev.createdAt) > new Date(conv.lastTime)) {
            conv.lastTime = ev.createdAt;
        }
        if (ev.eventType === 'message_received') conv.unreadCount += 1;
    }
    return Array.from(map.values()).sort(
        (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    );
}

export default function MessagesPage() {
    const [events, setEvents] = useState<WebhookEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await axios.get(
                `${API_BASE}/whatsapp/webhook/events?eventType=message_received&limit=200`,
                { headers: getHeaders() }
            );
            const raw = res.data?.data || [];
            setEvents(raw.map(extractFromEvent));
        } catch (e: any) {
            const msg = e?.response?.data?.message || 'Failed to load messages';
            if (e?.response?.status === 403) {
                setError('You need TENANT_ADMIN role to access messages.');
            } else if (e?.response?.status === 404 || e?.response?.status === 401) {
                setError('Connect your WhatsApp account first to receive messages.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selected, events]);

    const sendReply = async () => {
        if (!replyText.trim() || !selected) return;
        setSending(true);
        const text = replyText.trim();
        setReplyText('');
        try {
            await axios.post(`${API_BASE}/whatsapp/send-text`, {
                to: selected.phone,
                text,
            }, { headers: getHeaders() });
            // Optimistically add outgoing message
            const newMsg: WebhookEvent = {
                id: `local-${Date.now()}`,
                eventType: 'message_sent',
                messageId: '',
                status: 'sent',
                createdAt: new Date().toISOString(),
                from: '',
                to: selected.phone,
                text,
                type: 'text',
            };
            setEvents(prev => [...prev, newMsg]);
            setSelected(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
            toast.success('Message sent!');
        } catch (e: any) {
            const msg = e?.response?.data?.message || 'Failed to send message';
            toast.error(msg);
            setReplyText(text); // restore on failure
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendReply();
        }
    };

    const conversations = groupIntoConversations(events);
    const filtered = conversations.filter(c =>
        c.phone.includes(search) || c.name.toLowerCase().includes(search.toLowerCase())
    );

    // Select first conversation on load
    useEffect(() => {
        if (!selected && filtered.length > 0) setSelected(filtered[0]);
    }, [filtered.length]);

    const statusIcon = (s: string) => {
        if (s === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
        if (s === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
        if (s === 'sent') return <Check className="w-3.5 h-3.5 text-gray-400" />;
        return null;
    };

    return (
        <DashboardLayout>
            <Toaster position="top-right" />
            <div
                className="h-full flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                style={{ height: 'calc(100vh - 120px)' }}
            >
                {/* Left: Conversation List */}
                <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-blue-600" /> Messages
                            </h2>
                            <button onClick={load} disabled={loading}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Refresh">
                                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by phone…"
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-3/4" />
                                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : error ? (
                            <div className="p-6 text-center text-sm text-gray-400 space-y-2">
                                <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />
                                <p>{error}</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-400 space-y-2">
                                <Inbox className="w-8 h-8 mx-auto opacity-40 mb-2" />
                                <p>No incoming messages yet</p>
                                <p className="text-xs">Messages received from your WhatsApp number will appear here</p>
                            </div>
                        ) : (
                            filtered.map(conv => (
                                <button
                                    key={conv.phone}
                                    onClick={() => setSelected(conv)}
                                    className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selected?.phone === conv.phone
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600'
                                        : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {conv.phone[0] || '?'}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">{conv.name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />{conv.phone}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-xs text-gray-400">{formatTime(conv.lastTime)}</span>
                                            {conv.unreadCount > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate pl-11">
                                        {conv.messages[conv.messages.length - 1]?.text || conv.messages[conv.messages.length - 1]?.eventType || '—'}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Chat */}
                <div className="flex-1 flex flex-col">
                    {selected ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {selected.phone[0] || '?'}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">{selected.name}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />{selected.phone}
                                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full font-medium">
                                            {selected.messages.length} messages
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50 dark:bg-gray-900">
                                <AnimatePresence>
                                    {selected.messages.map((msg, i) => {
                                        const isIncoming = msg.eventType === 'message_received';
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}
                                            >
                                                <div className={`max-w-xs rounded-2xl px-4 py-3 shadow-sm ${isIncoming
                                                    ? 'bg-white dark:bg-gray-800 rounded-tl-none border border-gray-100 dark:border-gray-700'
                                                    : 'bg-gradient-to-br from-blue-600 to-purple-600 rounded-tr-none'
                                                    }`}>
                                                    {msg.text ? (
                                                        <p className={`text-sm ${isIncoming ? 'text-gray-800 dark:text-gray-200' : 'text-white'}`}>
                                                            {msg.text}
                                                        </p>
                                                    ) : (
                                                        <p className={`text-xs italic ${isIncoming ? 'text-gray-400' : 'text-blue-200'}`}>
                                                            [{msg.type || msg.eventType}]
                                                        </p>
                                                    )}
                                                    <div className={`flex items-center gap-1 mt-1 ${isIncoming ? '' : 'justify-end'}`}>
                                                        <span className={`text-xs ${isIncoming ? 'text-gray-400' : 'text-blue-200'}`}>
                                                            {formatTime(msg.createdAt)}
                                                        </span>
                                                        {!isIncoming && statusIcon(msg.status)}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                <div ref={bottomRef} />
                            </div>

                            {/* Reply Box */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-2.5">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type a message… (Enter to send)"
                                            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={sendReply}
                                        disabled={sending || !replyText.trim()}
                                        className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl text-white hover:opacity-90 disabled:opacity-40 transition-all shadow-md"
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Replies only work within 24-hour WhatsApp conversation window.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <MessageSquare className="w-16 h-16 opacity-20" />
                            {loading ? (
                                <><Loader2 className="w-6 h-6 animate-spin" /><p className="text-sm">Loading messages…</p></>
                            ) : (
                                <><p className="text-sm font-medium">Select a conversation</p>
                                    <p className="text-xs">Incoming WhatsApp messages will appear here once your number is connected</p></>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
