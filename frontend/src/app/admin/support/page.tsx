'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HeadphonesIcon, MessageSquare, Clock, CheckCircle, XCircle,
    Loader2, Send, Paperclip, X, Image, FileText, ArrowLeft,
    Users, AlertTriangle, BarChart3, Filter,
} from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const WS_BASE = API_BASE.replace('/api', '');

function getHeaders() {
    const token = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    waiting_user: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
};

function formatTime(d: string) {
    if (!d) return '';
    const dt = new Date(d);
    const diff = (Date.now() - dt.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString();
}

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [statusFilter, setStatusFilter] = useState('open');
    const [files, setFiles] = useState<File[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [ticketsRes, statsRes] = await Promise.all([
                axios.get(`${API_BASE}/admin/support/tickets?status=${statusFilter}&limit=50`, { headers: getHeaders() }),
                axios.get(`${API_BASE}/admin/support/stats`, { headers: getHeaders() }),
            ]);
            setTickets(ticketsRes.data.data || []);
            setStats(statsRes.data);
        } catch { toast.error('Failed to load support data'); }
        finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const openTicket = useCallback(async (t: any) => {
        setActiveTicket(t);
        setMsgLoading(true);
        try {
            const r = await axios.get(`${API_BASE}/admin/support/tickets/${t.id}`, { headers: getHeaders() });
            setMessages(r.data.messages || []);
        } catch { toast.error('Failed to load messages'); }
        finally { setMsgLoading(false); }

        // WebSocket
        const token = Cookies.get('token') || localStorage.getItem('token');
        const sock = io(`${WS_BASE}/support`, { auth: { token } });
        socketRef.current = sock;
        sock.on('connect', () => sock.emit('join_ticket', { ticketId: t.id }));
        sock.on('new_message', (msg: any) => {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        });
        sock.on('new_ticket', () => { loadData(); toast('📨 New support ticket received!', { icon: '🔔' }); });
    }, [loadData]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const closeTicketView = () => {
        socketRef.current?.disconnect();
        setActiveTicket(null);
        setMessages([]);
        loadData();
    };

    const sendReply = async () => {
        if ((!text.trim() && files.length === 0) || !activeTicket || sending) return;
        setSending(true);
        try {
            const formData = new FormData();
            formData.append('content', text.trim());
            files.forEach(f => formData.append('attachments', f));
            const token = Cookies.get('token') || localStorage.getItem('token');
            const r = await axios.post(
                `${API_BASE}/admin/support/tickets/${activeTicket.id}/messages`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setMessages(prev => [...prev, r.data]);
            setText(''); setFiles([]);
        } catch { toast.error('Failed to send reply'); }
        finally { setSending(false); }
    };

    const updateStatus = async (ticketId: string, status: string) => {
        await axios.patch(`${API_BASE}/admin/support/tickets/${ticketId}/status`, { status }, { headers: getHeaders() });
        toast.success(`Ticket marked as ${status}`);
        setActiveTicket((prev: any) => ({ ...prev, status }));
        loadData();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Toaster position="top-right" />
            <div className="flex h-screen">

                {/* ── Ticket list sidebar ──────────────────────────────── */}
                <div className="w-80 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <HeadphonesIcon className="w-5 h-5 text-violet-600" /> Support
                        </h2>
                        {/* Stats */}
                        {stats && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                {[
                                    { label: 'Open', value: stats.open, color: 'text-blue-600' },
                                    { label: 'In Progress', value: stats.inProgress, color: 'text-purple-600' },
                                    { label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
                                    { label: 'Total', value: stats.total, color: 'text-slate-700' },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-50 rounded-xl p-2 text-center">
                                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                                        <div className="text-xs text-slate-500">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Status filter */}
                        <div className="flex gap-1 mt-3 bg-slate-100 rounded-xl p-1">
                            {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${statusFilter === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {s === 'in_progress' ? 'Active' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No tickets</div>
                        ) : (
                            tickets.map(t => (
                                <button key={t.id} onClick={() => openTicket(t)}
                                    className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${activeTicket?.id === t.id ? 'bg-violet-50 border-l-4 border-l-violet-500' : ''}`}>
                                    <div className="flex items-start justify-between mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {t.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-slate-400">{formatTime(t.last_message_at || t.created_at)}</span>
                                    </div>
                                    <div className="font-semibold text-sm text-slate-800 truncate">{t.subject}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 truncate">{t.user_name} · {t.user_email}</div>
                                    {!t.first_reply_at && t.status === 'open' && (
                                        <div className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Needs response
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Chat area ──────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col">
                    {!activeTicket ? (
                        <div className="flex-1 flex items-center justify-center text-center">
                            <div>
                                <HeadphonesIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 text-lg font-medium">Select a ticket to start replying</p>
                                <p className="text-slate-400 text-sm mt-1">Tickets older than 5 min without a reply trigger an email alert</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Ticket header */}
                            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">{activeTicket.subject}</h3>
                                    <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-500">
                                        <span>{activeTicket.user_name} · {activeTicket.user_email}</span>
                                        <span>#{activeTicket.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {['in_progress', 'waiting_user', 'resolved', 'closed'].map(s => (
                                        <button key={s} onClick={() => updateStatus(activeTicket.id, s)}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${activeTicket.status === s
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}>
                                            {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                                {msgLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
                                ) : messages.map(m => (
                                    <div key={m.id} className={`flex ${m.sender_role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                        <div className="max-w-[70%]">
                                            <div className={`text-xs mb-1 ${m.sender_role === 'agent' ? 'text-right text-slate-400' : 'text-slate-500'}`}>
                                                {m.sender_role === 'user' && <span className="font-medium text-slate-700">{m.sender_name} · </span>}
                                                {formatTime(m.created_at)}
                                            </div>
                                            {m.content && (
                                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.sender_role === 'agent'
                                                        ? 'bg-violet-600 text-white rounded-br-sm'
                                                        : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100 shadow-sm'
                                                    }`}>
                                                    {m.content}
                                                </div>
                                            )}
                                            {(m.attachments || []).map((a: any, i: number) => (
                                                <a key={i} href={`${WS_BASE}${a.url}`} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:border-violet-300 transition-colors">
                                                    {a.mime.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                                    {a.filename}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* File previews */}
                            {files.length > 0 && (
                                <div className="px-6 py-2 bg-white border-t border-slate-100 flex gap-2 flex-wrap">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-700">
                                            {f.type.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                            <span className="max-w-[120px] truncate">{f.name}</span>
                                            <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3 hover:text-red-500" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reply box */}
                            {activeTicket.status !== 'closed' ? (
                                <div className="bg-white border-t border-slate-200 p-4">
                                    <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all p-3">
                                        <textarea value={text} onChange={e => setText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                                            placeholder="Type agent reply... (Enter to send)"
                                            rows={2} className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none" />
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt"
                                                onChange={e => { setFiles(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = ''; }}
                                                className="hidden" />
                                            <button onClick={() => fileInputRef.current?.click()}
                                                className="p-2 text-slate-400 hover:text-violet-600 rounded-xl transition-colors">
                                                <Paperclip className="w-4 h-4" />
                                            </button>
                                            <button onClick={sendReply} disabled={(!text.trim() && files.length === 0) || sending}
                                                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white p-2 rounded-xl transition-colors">
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border-t p-4 text-center text-sm text-slate-400">Ticket is closed</div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
