'use client';

import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import {
    User, Mail, Lock, Save, Camera, Eye, EyeOff,
    CheckCircle2, Loader2, Shield, AlertCircle, Key,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function PasswordStrengthBar({ password }: { password: string }) {
    const checks = [
        { ok: password.length >= 8 },
        { ok: /[A-Z]/.test(password) },
        { ok: /[a-z]/.test(password) },
        { ok: /\d/.test(password) },
        { ok: /[@$!%*?&]/.test(password) },
    ];
    const score = checks.filter(c => c.ok).length;
    const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
    const labels = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    if (!password) return null;
    return (
        <div className="mt-2">
            <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-gray-200 dark:bg-gray-600'}`} />
                ))}
                <span className={`text-xs font-semibold ml-1 ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {labels[score]}
                </span>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();

    const [name, setName] = useState(user?.name || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Name is required');
        setSavingProfile(true);
        try {
            const { data } = await api.patch('/auth/profile', { name: name.trim() });
            // Update auth store
            if (user) setUser({ ...user, name: data.name });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 3000);
            toast.success('Profile updated!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword) return toast.error('Current password is required');
        if (!newPassword) return toast.error('New password is required');
        if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword))
            return toast.error('Password needs uppercase, lowercase, number, and special character');

        setSavingPassword(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            toast.success('Password changed successfully!');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setSavingPassword(false);
        }
    };

    const getRoleColor = (role?: string) => {
        const map: Record<string, string> = {
            SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            TENANT_ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            TENANT_MARKETER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            TENANT_VIEWER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        };
        return map[role || ''] || 'bg-gray-100 text-gray-700';
    };

    return (
        <DashboardLayout>
            <Toaster position="top-right" />
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your account information and security settings</p>
                </div>

                {/* Avatar + Info Card */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-5 mb-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-lg">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{user?.email}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getRoleColor(user?.role)}`}>
                                    <Shield className="w-3 h-3" />
                                    {user?.role?.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profile form */}
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={savingProfile}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50">
                                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                    profileSaved ? <CheckCircle2 className="w-4 h-4 text-green-300" /> :
                                        <Save className="w-4 h-4" />}
                                {savingProfile ? 'Saving…' : profileSaved ? 'Saved!' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Change Password Card */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
                            <p className="text-xs text-gray-500">Use a strong password with uppercase, number & special character</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Min 8 chars, uppercase, number, special"
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <PasswordStrengthBar password={newPassword} />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition ${confirmPassword && newPassword !== confirmPassword
                                        ? 'border-red-300 focus:ring-red-300'
                                        : confirmPassword && newPassword === confirmPassword
                                            ? 'border-green-300 focus:ring-green-300'
                                            : 'border-gray-200 dark:border-gray-600 focus:ring-blue-500'
                                        }`}
                                />
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Passwords do not match</p>
                            )}
                            {confirmPassword && newPassword === confirmPassword && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>
                            )}
                        </div>

                        <div className="flex justify-end pt-1">
                            <button type="submit" disabled={savingPassword}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50">
                                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                {savingPassword ? 'Changing…' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Security info */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Security Tips</p>
                            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1.5 space-y-1">
                                <li>• Use a unique password not used on other sites</li>
                                <li>• Keep your email secure — it's your account recovery method</li>
                                <li>• Log out from shared/public computers after each session</li>
                                <li>• Never share your credentials with anyone, including support staff</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
