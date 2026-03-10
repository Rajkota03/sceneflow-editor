import React, { useState } from 'react';
import { Film, Mail, Lock, User, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import '../styles/auth.css';

export default function AuthPage() {
    const [mode, setMode] = useState('login'); // login | signup | magic
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [magicSent, setMagicSent] = useState(false);

    const { signIn, signUp, signInMagicLink, loading, error, clearError } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();

        if (mode === 'magic') {
            const result = await signInMagicLink(email);
            if (result?.success) setMagicSent(true);
            return;
        }

        if (mode === 'signup') {
            await signUp(email, password, displayName);
        } else {
            await signIn(email, password);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-ambient" />

            <div className="auth-card">
                <div className="auth-logo">
                    <Film size={28} />
                    <span>SceneFlow</span>
                </div>

                <h2 className="auth-title">
                    {mode === 'signup' ? 'Create your account' :
                        mode === 'magic' ? 'Magic link sign in' :
                            'Welcome back'}
                </h2>
                <p className="auth-subtitle">
                    {mode === 'signup' ? 'Start writing your next screenplay' :
                        mode === 'magic' ? "We'll email you a sign-in link" :
                            'Continue your screenplay'}
                </p>

                {magicSent ? (
                    <div className="auth-magic-sent">
                        <Mail size={32} />
                        <p>Check your inbox for a magic link!</p>
                        <button onClick={() => { setMagicSent(false); setMode('login'); }}>
                            Back to login
                        </button>
                    </div>
                ) : (
                    <form className="auth-form" onSubmit={handleSubmit}>
                        {mode === 'signup' && (
                            <div className="auth-field">
                                <User size={16} />
                                <input
                                    type="text"
                                    placeholder="Display name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    autoComplete="name"
                                />
                            </div>
                        )}

                        <div className="auth-field">
                            <Mail size={16} />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        {mode !== 'magic' && (
                            <div className="auth-field">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                />
                            </div>
                        )}

                        {error && <div className="auth-error">{error}</div>}

                        <button className="auth-submit" type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                            {mode === 'signup' ? 'Create Account' :
                                mode === 'magic' ? 'Send Magic Link' :
                                    'Sign In'}
                        </button>
                    </form>
                )}

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <div className="auth-alt">
                    {mode === 'login' && (
                        <>
                            <button onClick={() => { clearError(); setMode('magic'); }}>
                                <Sparkles size={14} /> Sign in with magic link
                            </button>
                            <p>
                                Don't have an account?{' '}
                                <button className="auth-link" onClick={() => { clearError(); setMode('signup'); }}>
                                    Sign up
                                </button>
                            </p>
                        </>
                    )}
                    {mode === 'signup' && (
                        <p>
                            Already have an account?{' '}
                            <button className="auth-link" onClick={() => { clearError(); setMode('login'); }}>
                                Sign in
                            </button>
                        </p>
                    )}
                    {mode === 'magic' && (
                        <p>
                            Prefer password?{' '}
                            <button className="auth-link" onClick={() => { clearError(); setMode('login'); }}>
                                Sign in with password
                            </button>
                        </p>
                    )}
                </div>

                <p className="auth-skip">
                    <button onClick={() => useAuthStore.getState().clearError()}>
                        Continue without account →
                    </button>
                </p>
            </div>
        </div>
    );
}
