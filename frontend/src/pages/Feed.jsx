import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { timeAgo } from '../utils/time';
// BUG FIX: Added 'Info' to prevent the white screen crash on the Check-In Modal
import { LogOut, Send, EyeOff, MessageSquare, ShieldAlert, Heart, Coffee, X, Info } from 'lucide-react';

const Feed = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // STATES
    const [content, setContent] = useState('');
    const [postType, setPostType] = useState('echo');
    const [crisisAlert, setCrisisAlert] = useState(false);
    const [hasCw, setHasCw] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showPassport, setShowPassport] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [weatherClass, setWeatherClass] = useState('bg-slate-900');

    // 24-HOUR CHECK-IN LOGIC
    useEffect(() => {
        const lastHeavyLoad = localStorage.getItem('echo_heavy_load');
        if (lastHeavyLoad) {
            const timePassed = Date.now() - parseInt(lastHeavyLoad);
            // Testing: Set to 10 seconds (10000ms). Production: 24 hours (86400000ms)
            if (timePassed > 10000) { 
                setShowCheckInModal(true);
                localStorage.removeItem('echo_heavy_load');
            }
        }
    }, []);

    const fetchFeed = async () => {
        try {
            const response = await api.get('/posts/feed');
            const fetchedPosts = response.data;
            setPosts(fetchedPosts);

            if (fetchedPosts.length > 0) {
                const recentPosts = fetchedPosts.slice(0, 20);
                const voidCount = recentPosts.filter(p => p.post_type === 'void').length;
                const voidRatio = voidCount / recentPosts.length;

                if (voidRatio > 0.6) {
                    setWeatherClass('bg-slate-900 shadow-[inset_0_0_150px_rgba(49,46,129,0.15)]'); 
                } else {
                    setWeatherClass('bg-slate-900 shadow-[inset_0_0_150px_rgba(20,184,166,0.05)]'); 
                }
            }
        } catch (error) {
            console.error("Failed to fetch feed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    // CRISIS INTERCEPTOR
    const handleContentChange = (e) => {
        const text = e.target.value;
        setContent(text);
        const crisisWords = ['suicide', 'kill myself', 'end it', 'give up', 'no reason to live'];
        setCrisisAlert(crisisWords.some(word => text.toLowerCase().includes(word)));
    };

    const handleScream = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        
        setIsSubmitting(true);
        try {
            await api.post('/posts/', {
                content,
                post_type: postType,
                tags: [],
                has_cw: hasCw
            });
            
            if (postType === 'void' && hasCw) {
                localStorage.setItem('echo_heavy_load', Date.now().toString());
            }

            setContent('');
            setHasCw(false);
            setCrisisAlert(false);
            fetchFeed(); 
        } catch (error) {
            console.error("Failed to post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const PostCard = ({ post }) => {
        const [isRevealed, setIsRevealed] = useState(!post.has_cw);
        const [relatesCount, setRelatesCount] = useState(post.relates?.length || 0);
        const [hasResonated, setHasResonated] = useState(post.relates?.includes(user?.alias));
        const isOP = post.author_alias === user?.alias;

        const handleResonate = async (e) => {
            e.stopPropagation();
            try {
                setHasResonated(!hasResonated);
                setRelatesCount(prev => hasResonated ? prev - 1 : prev + 1);
                await api.post(`/posts/${post._id || post.id}/relate`);
            } catch (error) {
                setHasResonated(!hasResonated);
                setRelatesCount(prev => hasResonated ? prev + 1 : prev - 1);
            }
        };

        // ECHO FADE ALGORITHM
        let textOpacity = 1;
        if (post.post_type === 'void') {
            const now = new Date();
            const past = new Date(post.created_at.endsWith('Z') ? post.created_at : post.created_at + 'Z');
            const ageInSeconds = (now - past) / 1000;
            textOpacity = Math.max(0.2, 1 - (ageInSeconds / 86400));
        }

        // INNOVATION: THE GUARDIAN FLARE
        // If the current user reading the feed is a Guardian, and the post is a heavy Void post...
        const isGuardian = user?.empathy_score >= 150;
        const isActiveCrisis = post.post_type === 'void' && post.has_cw;
        
        // ...apply the subtle golden pulse. Otherwise, use the standard border.
        const borderPulse = isGuardian && isActiveCrisis 
            ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)] animate-pulse' 
            : post.post_type === 'void' 
                ? 'border-slate-800 border-dashed' 
                : 'border-slate-700 hover:border-teal-500/50';

        return (
            <div 
                onClick={() => {
                    if (!post.has_cw || isRevealed) {
                        const targetId = post._id || post.id;
                        navigate(`/post/${targetId}`);
                    }
                }}
                className={`p-5 mb-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all ${post.post_type === 'void' ? 'bg-slate-900' : 'bg-slate-800'} ${borderPulse}`}
            >
                <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-teal-400">{post.author_alias}</span>
                    <div className="flex items-center gap-3">
                        {/* If Guardian Flare is active, show a small beacon icon next to the time */}
                        {isGuardian && isActiveCrisis && (
                            <span className="text-yellow-500 flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
                                Flare Active
                            </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">{timeAgo(post.created_at)}</span>
                        <span className="text-xs text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded">
                            {post.post_type}
                        </span>
                    </div>
                </div>

                {post.has_cw && !isRevealed && (
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsRevealed(true);
                        }}
                        className="bg-slate-700/50 border border-slate-600 rounded p-4 text-center hover:bg-slate-700 transition-colors mb-3"
                    >
                        <ShieldAlert className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-300">Heavy topic detected. Tap to reveal.</p>
                    </div>
                )}

                <p 
                    style={{ opacity: textOpacity }} 
                    className={`text-gray-100 whitespace-pre-wrap transition-all duration-300 ${post.has_cw && !isRevealed ? 'blur-sm select-none' : ''}`}
                >
                    {post.content}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-6 text-slate-400 text-sm">
                    {post.post_type === 'echo' ? (
                        <span className="flex items-center gap-1 group-hover:text-teal-400 transition-colors">
                            <MessageSquare className="w-4 h-4" />
                            {post.replies?.length || 0} Replies
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-slate-600" title="The Void accepts no replies.">
                            <EyeOff className="w-4 h-4" />
                            Silenced
                        </span>
                    )}

                    <button 
                        onClick={handleResonate}
                        className={`flex items-center gap-1 transition-colors ${hasResonated ? 'text-rose-500' : 'hover:text-rose-400'}`}
                        title="I feel this too."
                    >
                        <Heart className={`w-4 h-4 ${hasResonated ? 'fill-rose-500' : ''}`} />
                        {isOP ? (
                            <span>{relatesCount} {relatesCount === 1 ? 'person feels' : 'people feel'} this</span>
                        ) : (
                            <span>{hasResonated ? 'Resonated' : 'I feel this too'}</span>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen pb-12 transition-all duration-1000 ${weatherClass}`}>
            <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <span className="text-teal-500">Echo</span>Room
                    </h1>
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-slate-400 hidden sm:flex items-center gap-2">
                            Identity: 
                            <button 
                                onClick={() => setShowPassport(true)}
                                className="text-teal-400 hover:text-teal-300 font-bold bg-teal-500/10 px-3 py-1 rounded-md transition-colors border border-teal-500/20"
                            >
                                {user?.alias}
                            </button>
                        </span>
                        <button 
                            onClick={() => setShowSupportModal(true)} 
                            className="text-teal-500 hover:text-teal-400 transition-colors flex items-center gap-1 text-sm font-bold bg-teal-500/10 px-3 py-1.5 rounded-full"
                        >
                            <Coffee className="w-4 h-4" /> Support
                        </button>
                        <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors" title="Leave Sanctuary">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-2xl mx-auto px-4 mt-8">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-8 shadow-lg relative z-20">
                    {/* CRISIS INTERCEPTOR UI */}
                    {crisisAlert && (
                        <div className="mb-4 bg-red-900/20 border border-red-500/50 rounded-lg p-4 animate-pulse">
                            <p className="text-red-400 font-bold text-sm mb-1 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> You are not alone.
                            </p>
                            <p className="text-red-200/80 text-xs leading-relaxed">
                                We hear how heavy this is. If you are in crisis, please step out of the Void and call a local helpline immediately. We need you here.
                            </p>
                        </div>
                    )}

                    <textarea 
                        value={content}
                        onChange={handleContentChange}
                        placeholder="What is weighing on your mind?"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-gray-100 focus:outline-none focus:border-teal-500 resize-none h-32 mb-4"
                        maxLength={500}
                    />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setPostType('echo')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${postType === 'echo' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                                >
                                    Start an Echo
                                </button>
                                <button 
                                    onClick={() => setPostType('void')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${postType === 'void' ? 'bg-slate-700 text-gray-100 border border-slate-500' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                                >
                                    Scream into the Void
                                </button>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer mt-2">
                                <input 
                                    type="checkbox" 
                                    checked={hasCw}
                                    onChange={(e) => setHasCw(e.target.checked)}
                                    className="rounded border-slate-600 text-teal-500 focus:ring-teal-500 bg-slate-900"
                                />
                                Apply Content Warning (Heavy Topic)
                            </label>
                        </div>
                        <button 
                            onClick={handleScream}
                            disabled={!content.trim() || isSubmitting || crisisAlert}
                            className={`flex items-center gap-2 font-bold py-2 px-6 rounded-lg transition-colors w-full sm:w-auto justify-center ${crisisAlert ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-400 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                        >
                            <Send className="w-4 h-4" />
                            Release
                        </button>
                    </div>
                </div>

                <div className="space-y-4 relative z-20">
                    {loading ? (
                        <div className="text-center text-teal-500 py-8 animate-pulse">Syncing with the Sanctuary...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">The room is quiet. Be the first to speak.</div>
                    ) : (
                        posts.map(post => <PostCard key={post._id || post.id} post={post} />)
                    )}
                </div>
            </main>

            {/* 24-HOUR CHECK-IN MODAL */}
            {showCheckInModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-teal-500/30 rounded-xl max-w-sm w-full p-6 relative shadow-2xl text-center">
                        <div className="bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
                            <Info className="w-6 h-6 text-teal-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-100 mb-3">Checking In</h2>
                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                            You carried something heavy yesterday. We just wanted to make sure you were doing okay today. You don't have to reply.
                        </p>
                        <button 
                            onClick={() => setShowCheckInModal(false)} 
                            className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            I'm still here.
                        </button>
                    </div>
                </div>
            )}

            {/* SUPPORT MODAL */}
            {showSupportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-teal-500/30 rounded-xl max-w-md w-full p-6 relative shadow-2xl">
                        <button 
                            onClick={() => setShowSupportModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="text-center mb-6">
                            <div className="bg-teal-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Heart className="w-8 h-8 text-teal-400 fill-teal-400/20" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-100 mb-2">Keep the Sanctuary Online</h2>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                EchoRoom is an independent, ad-free space built for comrades to find real support. We don't sell data, and we don't run ads. 
                            </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
                            <p className="text-sm text-slate-300 mb-3">
                                It takes active server resources to keep the Void secure and the Echoes flowing in real-time. If this platform has helped you or someone you know, consider chipping in to pay for the cloud hosting.
                            </p>
                        </div>

                        <a 
                            href="https://buymeacoffee.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            <Coffee className="w-5 h-5" />
                            Buy the Developer a Coffee
                        </a>
                        
                        <button 
                            onClick={() => setShowSupportModal(false)}
                            className="w-full mt-3 text-slate-400 hover:text-gray-200 text-sm py-2 transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            )}

            {/* EMPATHY PASSPORT MODAL */}
            {showPassport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl max-w-sm w-full p-0 relative shadow-2xl overflow-hidden">
                        <div className="bg-slate-900 p-6 border-b border-slate-700 relative">
                            <button 
                                onClick={() => setShowPassport(false)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <p className="text-teal-500 text-xs font-bold tracking-widest uppercase mb-1">Sanctuary Identity</p>
                            <h2 className="text-2xl font-bold text-gray-100">{user?.alias}</h2>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Current Tier</p>
                                    <p className="text-lg font-bold text-teal-400">{user?.tier || 'Novice Listener'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Validation Points</p>
                                    <p className="text-2xl font-bold text-gray-100">{user?.empathy_score || 0}</p>
                                </div>
                            </div>

                            <div className="mb-2">
                                <div className="flex justify-between text-xs text-slate-400 mb-2">
                                    <span>Impact Level</span>
                                    <span>Next Tier: {user?.empathy_score >= 150 ? 'Max Level' : user?.empathy_score >= 50 ? '150 pts' : user?.empathy_score >= 15 ? '50 pts' : '15 pts'}</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2">
                                    <div 
                                        className="bg-teal-500 h-2 rounded-full transition-all duration-1000" 
                                        style={{ 
                                            width: `${Math.min(100, ((user?.empathy_score || 0) / (user?.empathy_score >= 50 ? 150 : user?.empathy_score >= 15 ? 50 : 15)) * 100)}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 italic text-center mt-6">
                                Points are awarded when you actively listen and validate others in the Sanctuary.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Feed;