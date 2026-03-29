'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Plus, Send, Paperclip, X, ChevronRight,
    Clock, CheckCheck, Check, AlertCircle, Loader2,
    HeadphonesIcon, Image, FileText, Tag, ArrowLeft,
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import { DashboardLayout } from '@/components/dashboard-layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const WS_BASE = API_BASE.replace('/api', '');

function getHeaders() {
    const token = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

interface Ticket {
    id: string; subject: string; status: string; priority: string;
    message_count: number; last_message_at: string; created_at: string;
    first_reply_at: string | null;
}
interface Message {
    id: string; sender_name: string; sender_role: 'user' | 'agent';
    content: string; is_read: boolean; created_at: string;
    attachments?: { filename: string; url: string; mime: string; size: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    open: { label: 'Open', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    waiting_user: { label: 'Awaiting You', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: 'text-slate-500' },
    normal: { label: 'Normal', color: 'text-blue-600' },
    high: { label: 'High', color: 'text-orange-600' },
    urgent: { label: 'Urgent', color: 'text-red-600' },
};

function formatTime(d: string) {
    const dt = new Date(d);
    const now = new Date();
    const diff = (now.getTime() - dt.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return dt.toLocaleDateString();
}

// ──────────────────────────────────────────────────────────────────────────────
export default function SupportPage() {
    const [view, setView] = useState<'list' | 'ticket' | 'new'>('list');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [agentTyping, setAgentTyping] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimer = useRef<any>(null);

    // ── New Ticket Form ──
    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [newPriority, setNewPriority] = useState('normal');
    const [creating, setCreating] = useState(false);

    // ── Load tickets ──
    const loadTickets = useCallback(async () => {
        setLoading(true);
        try {
            const r = await axios.get(`${API_BASE}/support/tickets`, { headers: getHeaders() });
            setTickets(r.data.data || []);
        } catch { toast.error('Failed to load tickets'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    // ── Open a ticket ──
    const openTicket = useCallback(async (t: Ticket) => {
        setActiveTicket(t);
        setMsgLoading(true);
        setView('ticket');
        try {
            const r = await axios.get(`${API_BASE}/support/tickets/${t.id}`, { headers: getHeaders() });
            setMessages(r.data.messages || []);
        } catch { toast.error('Failed to load messages'); }
        finally { setMsgLoading(false); }

        // Connect WebSocket
        const token = Cookies.get('token') || localStorage.getItem('token');
        const sock = io(`${WS_BASE}/support`, { auth: { token } });
        socketRef.current = sock;

        sock.on('connect', () => {
            sock.emit('join_ticket', { ticketId: t.id });
        });
        sock.on('new_message', (msg: Message) => {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            setAgentTyping(false);
        });
        sock.on('typing', (data: any) => {
            if (data.isTyping) { setAgentTyping(true); }
            else setAgentTyping(false);
        });
    }, []);

    const closeTicket = useCallback(() => {
        socketRef.current?.disconnect();
        socketRef.current = null;
        setView('list');
        setActiveTicket(null);
        setMessages([]);
        loadTickets();
    }, [loadTickets]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, agentTyping]);

    // ── Typing indicator ──
    const handleTextChange = (v: string) => {
        setText(v);
        if (!socketRef.current || !activeTicket) return;
        if (!isTyping) { setIsTyping(true); socketRef.current.emit('typing', { ticketId: activeTicket.id, isTyping: true }); }
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => {
            setIsTyping(false);
            socketRef.current?.emit('typing', { ticketId: activeTicket!.id, isTyping: false });
        }, 1500);
    };

    // ── Send message ──
    const sendMessage = async () => {
        if ((!text.trim() && files.length === 0) || !activeTicket || sending) return;
        setSending(true);
        try {
            const formData = new FormData();
            formData.append('content', text.trim());
            files.forEach(f => formData.append('attachments', f));
            const token = Cookies.get('token') || localStorage.getItem('token');
            const r = await axios.post(
                `${API_BASE}/support/tickets/${activeTicket.id}/messages`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setMessages(prev => [...prev, r.data]);
            setText(''); setFiles([]);
        } catch { toast.error('Failed to send message'); }
        finally { setSending(false); }
    };

    // ── Create new ticket ──
    const createTicket = async () => {
        if (!newSubject.trim() || !newMessage.trim() || creating) return;
        setCreating(true);
        try {
            const r = await axios.post(
                `${API_BASE}/support/tickets`,
                { subject: newSubject.trim(), message: newMessage.trim(), priority: newPriority },
                { headers: getHeaders() },
            );
            toast.success('Ticket created! You\'ll receive a confirmation email.');
            setNewSubject(''); setNewMessage(''); setNewPriority('normal');
            await loadTickets();
            openTicket(r.data);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to create ticket';
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally { setCreating(false); }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        if (files.length + selected.length > 5) { toast.error('Max 5 files per message'); return; }
        setFiles(prev => [...prev, ...selected]);
        e.target.value = '';
    };

    // ─── RENDER ─────────────────────────────────────────────────────────────
    return (
        <DashboardLayout allowedRoles={['TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER']}>
            <Toaster position="top-right" />
            <div className="h-full flex flex-col">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {view !== 'list' && (
                            <button onClick={view === 'ticket' ? closeTicket : () => setView('list')}
                                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <HeadphonesIcon className="w-6 h-6 text-violet-600" />
                                {view === 'list' ? 'Support Center' : view === 'new' ? 'New Support Ticket' : activeTicket?.subject}
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {view === 'list' ? 'Chat with our team — we usually respond in under 2 hours' :
                                    view === 'new' ? 'Describe your issue and we\'ll get back to you promptly' :
                                        `Ticket #${activeTicket?.id.slice(0, 8)} · ${STATUS_CONFIG[activeTicket?.status || 'open']?.label}`}
                            </p>
                        </div>
                    </div>
                    {view === 'list' && (
                        <button onClick={() => setView('new')}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> New Ticket
                        </button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {/* ── TICKET LIST ── */}
                    {view === 'list' && (
                        <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {loading ? (
                                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
                            ) : tickets.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
                                    <HeadphonesIcon className="w-12 h-12 text-violet-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-800">No support tickets yet</h3>
                                    <p className="text-slate-500 text-sm mt-2 mb-6">Need help? Create a ticket and our team will assist you.</p>
                                    <button onClick={() => setView('new')}
                                        className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-700 transition-colors">
                                        Create Your First Ticket
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {tickets.map(t => {
                                        const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                                        const pr = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.normal;
                                        return (
                                            <motion.button key={t.id} onClick={() => openTicket(t)}
                                                whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.998 }}
                                                className="w-full bg-white rounded-2xl border border-slate-100 p-5 text-left hover:border-violet-200 hover:shadow-md transition-all shadow-sm group">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                                                            <span className={`text-xs font-medium ${pr.color}`}>{pr.label}</span>
                                                        </div>
                                                        <h3 className="font-semibold text-slate-900 truncate text-base">{t.subject}</h3>
                                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{t.message_count} messages</span>
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(t.last_message_at || t.created_at)}</span>
                                                            {!t.first_reply_at && t.status === 'open' && <span className="text-amber-500 font-medium">Awaiting agent</span>}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors mt-1 flex-shrink-0" />
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── NEW TICKET ── */}
                    {view === 'new' && (
                        <motion.div key="new" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject *</label>
                                    <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                                        placeholder="Brief summary of your issue..."
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['low', 'normal', 'high', 'urgent'] as const).map(p => (
                                            <button key={p} onClick={() => setNewPriority(p)}
                                                className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${newPriority === p
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                                    }`}>
                                                {PRIORITY_CONFIG[p].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Describe your issue *</label>
                                    <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                                        rows={6} placeholder="Please describe your issue in detail — what you expected vs what happened, any error messages, etc."
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none" />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setView('list')}
                                        className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={createTicket} disabled={!newSubject.trim() || !newMessage.trim() || creating}
                                        className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                        {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Ticket'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── CHAT VIEW ── */}
                    {view === 'ticket' && activeTicket && (
                        <motion.div key="ticket" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col" style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>

                            {/* Ticket status bar */}
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const st = STATUS_CONFIG[activeTicket.status] || STATUS_CONFIG.open; return (
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                                        );
                                    })()}
                                    <span className="text-xs text-slate-400">#{activeTicket.id.slice(0, 8)}</span>
                                </div>
                                {activeTicket.status !== 'closed' && (
                                    <button onClick={async () => {
                                        await axios.post(`${API_BASE}/support/tickets/${activeTicket.id}/close`, {}, { headers: getHeaders() });
                                        toast.success('Ticket closed');
                                        closeTicket();
                                    }} className="text-xs text-slate-500 hover:text-red-500 transition-colors font-medium">
                                        Close ticket
                                    </button>
                                )}
                            </div>

                            {/* Messages area */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {msgLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-slate-400 py-8 text-sm">No messages yet</div>
                                ) : (
                                    messages.map(m => (
                                        <div key={m.id} className={`flex ${m.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] ${m.sender_role === 'user' ? 'order-2' : ''}`}>
                                                <div className={`text-xs mb-1 ${m.sender_role === 'user' ? 'text-right text-slate-400' : 'text-slate-500'}`}>
                                                    {m.sender_role === 'agent' && <span className="font-medium text-violet-600">Support Agent · </span>}
                                                    {formatTime(m.created_at)}
                                                </div>
                                                {m.content && (
                                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.sender_role === 'user'
                                                        ? 'bg-violet-600 text-white rounded-br-sm'
                                                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                                                        }`}>
                                                        {m.content}
                                                    </div>
                                                )}
                                                {/* Attachments */}
                                                {(m.attachments || []).map((a, i) => (
                                                    <a key={i} href={`${WS_BASE}${a.url}`} target="_blank" rel="noreferrer"
                                                        className={`flex items-center gap-2 mt-1 px-3 py-2 rounded-xl text-xs font-medium border transition-colors hover:opacity-80 ${m.sender_role === 'user' ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'
                                                            }`}>
                                                        {a.mime.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                                        {a.filename}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {/* Agent typing indicator */}
                                {agentTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                                    style={{ animationDelay: `${i * 150}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* File previews */}
                            {files.length > 0 && (
                                <div className="px-5 py-2 border-t border-slate-100 flex gap-2 flex-wrap">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-700">
                                            {f.type.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                            <span className="max-w-[120px] truncate">{f.name}</span>
                                            <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Input area */}
                            {activeTicket.status !== 'closed' ? (
                                <div className="p-4 border-t border-slate-100">
                                    <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all p-3">
                                        <textarea value={text} onChange={e => handleTextChange(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                                            rows={2} className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none" />
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt" onChange={handleFileChange} className="hidden" />
                                            <button onClick={() => fileInputRef.current?.click()}
                                                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors">
                                                <Paperclip className="w-4 h-4" />
                                            </button>
                                            <button onClick={sendMessage} disabled={(!text.trim() && files.length === 0) || sending}
                                                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white p-2 rounded-xl transition-colors">
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 border-t border-slate-100 text-center text-sm text-slate-400 bg-slate-50 rounded-b-2xl">
                                    This ticket is closed. <button onClick={() => setView('new')} className="text-violet-600 hover:underline font-medium">Open a new ticket</button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
