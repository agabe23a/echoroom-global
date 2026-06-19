import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

const Login = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [alias, setAlias] = useState('');
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegistering) {
                await register(alias, passcode);
                // Immediately log them in after registering
                await login(alias, passcode); 
            } else {
                await login(alias, passcode);
            }
            navigate('/feed'); // Send them to the sanctuary
        } catch (err) {
            setError(err.response?.data?.detail || 'Authentication failed. Try again.');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-900 px-4">
            <div className="w-full max-w-md bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-teal-500/10 p-4 rounded-full mb-4 border border-teal-500/20">
                        <Lock className="w-8 h-8 text-teal-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-100">EchoRoom</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {isRegistering ? 'Generate your anonymous identity.' : 'Enter the sanctuary.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">Alias</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-teal-500 transition-colors"
                            placeholder="e.g. MidnightWanderer"
                            value={alias}
                            onChange={(e) => setAlias(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">Passcode</label>
                        <input 
                            type="password" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-teal-500 transition-colors"
                            placeholder="••••••••"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors mt-6"
                    >
                        {isRegistering ? 'Generate Identity' : 'Enter'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-slate-400 hover:text-teal-400 text-sm transition-colors"
                    >
                        {isRegistering ? 'Already have an alias? Login.' : 'Need an identity? Create one.'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;