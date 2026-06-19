import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { timeAgo } from '../utils/time';
import { ArrowLeft, ShieldAlert, Heart, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';

const PostView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRevealed, setIsRevealed] = useState(false);
    
    const [replyContent, setReplyContent] = useState('');
    const [readTime, setReadTime] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // THE INSPIRATION SPARK: Clinically validated active listening starters
    const empathyStarters = [
        "It makes complete sense that you feel...",
        "I hear you. Can I ask how you handled...",
        "I've been in a similar dark place when...",
        "Thank you for trusting us with this. How long have you felt..."
    ];

    const handleSpark = () => {
        const randomStarter = empathyStarters[Math.floor(Math.random() * empathyStarters.length)];
        setReplyContent(randomStarter);
    };

    const fetchPost = async () => {
        try {
            const response = await api.get(`/posts/${id}`);
            setPost(response.data);
            setIsRevealed(!response.data.has_cw);
        } catch (error) {
            console.error("Failed to fetch post:", error);
            navigate('/feed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPost();
    }, [id]);

    useEffect(() => {
        if (!post || post.post_type === 'void') return;
        const timer = setInterval(() => {
            setReadTime(prev => (prev < 8 ? prev + 1 : 8));
        }, 1000);
        return () => clearInterval(timer);
    }, [post]);

    const handleReply = async (e) => {
        e.preventDefault();
        if (readTime < 8 || !replyContent.trim()) return;
        setIsSubmitting(true);
        try {
            await api.post(`/posts/${id}/reply`, {
                content: replyContent,
                read_time: readTime
            });
            setReplyContent('');
            fetchPost(); 
        } catch (error) {
            console.error("Failed to reply:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRateReply = async (replyId, rating) => {
        try {
            await api.post(`/posts/${id}/reply/${replyId}/rate?rating=${rating}`);
            fetchPost(); 
        } catch (error) {
            console.error("Failed to rate reply:", error);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-teal-500 animate-pulse">Accessing Sanctuary Data...</div>;
    if (!post) return null;

    const isOP = post.author_alias === user?.alias;

    return (
        <div className="min-h-screen bg-slate-900 pb-12">
            <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button onClick={() => navigate('/feed')} className="text-slate-400 hover:text-teal-400 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-100 flex-1">Echo Thread</h1>
                </div>
            </nav>

            <main className="max-w-2xl mx-auto px-4 mt-8">
                <div className="bg-slate-800 rounded-xl border border-teal-500/30 p-6 mb-8 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-teal-400 text-lg">{post.author_alias}</span>
                            {isOP && <span className="bg-teal-500/20 text-teal-400 text-xs px-2 py-1 rounded font-bold tracking-wider">YOU</span>}
                        </div>
                        <span className="text-sm text-slate-500">{timeAgo(post.created_at)}</span>
                    </div>

                    {post.has_cw && !isRevealed && (
                        <div onClick={() => setIsRevealed(true)} className="bg-slate-700/50 border border-slate-600 rounded p-4 text-center cursor-pointer hover:bg-slate-700 transition-colors mb-3">
                            <ShieldAlert className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                            <p className="text-sm text-slate-300">Heavy topic detected. Tap to reveal.</p>
                        </div>
                    )}
                    <p className={`text-gray-100 text-lg whitespace-pre-wrap leading-relaxed ${post.has_cw && !isRevealed ? 'blur-sm select-none' : ''}`}>
                        {post.content}
                    </p>
                </div>

                <h2 className="text-slate-400 font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> {post.replies?.length || 0} Replies
                </h2>
                
                <div className="space-y-4 mb-8">
                    {post.replies?.map((reply) => (
                        <div key={reply.reply_id} className={`p-5 rounded-xl border ${reply.is_system ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold ${reply.is_system ? 'text-indigo-400 flex items-center gap-1' : reply.is_OP ? 'text-teal-400' : 'text-gray-300'}`}>
                                        {reply.is_system && <ShieldCheck className="w-4 h-4" />}
                                        {reply.author_alias}
                                    </span>
                                    {reply.is_OP && <span className="bg-teal-500/20 text-teal-400 text-xs px-2 py-1 rounded font-bold">OP</span>}
                                </div>
                                <span className="text-xs text-slate-500">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-gray-200">{reply.content}</p>

                            <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                {reply.empathy_rating ? (
                                    <span className="text-xs font-bold text-teal-400 flex items-center gap-1 bg-teal-500/10 px-2 py-1 rounded">
                                        <Heart className="w-3 h-3" /> Rated as {reply.empathy_rating}
                                    </span>
                                ) : isOP && !reply.is_OP && !reply.is_system ? (
                                    <div className="flex gap-2">
                                        <span className="text-xs text-slate-500 mr-2 flex items-center">Validate:</span>
                                        <button onClick={() => handleRateReply(reply.reply_id, 'heard')} className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-1 rounded transition-colors">+1 Heard</button>
                                        <button onClick={() => handleRateReply(reply.reply_id, 'comforting')} className="text-xs bg-teal-900/50 hover:bg-teal-800/50 text-teal-400 border border-teal-500/30 px-3 py-1 rounded transition-colors">+2 Comforting</button>
                                        <button onClick={() => handleRateReply(reply.reply_id, 'advice')} className="text-xs bg-indigo-900/50 hover:bg-indigo-800/50 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded transition-colors">+3 Advice</button>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-600 italic">Unrated</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {post.post_type === 'echo' && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-lg sticky bottom-4">
                        
                        {/* THE INSPIRATION SPARK WRAPPER */}
                        <div className="relative">
                            <textarea 
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Offer your echo..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pr-12 text-gray-100 focus:outline-none focus:border-teal-500 resize-none h-24 mb-3"
                                maxLength={500}
                            />
                            <button 
                                onClick={handleSpark}
                                title="Need inspiration? Click for an empathy starter."
                                className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-teal-500/20 text-slate-400 hover:text-teal-400 rounded-md transition-colors"
                            >
                                <Sparkles className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className="text-xs text-slate-400">
                                {readTime < 8 ? `Please read. Unlocking in ${8 - readTime}s...` : 'Active Listening enabled.'}
                            </div>
                            <button 
                                onClick={handleReply}
                                disabled={readTime < 8 || !replyContent.trim() || isSubmitting}
                                className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send Echo
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PostView;