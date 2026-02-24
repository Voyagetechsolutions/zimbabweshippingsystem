import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Star,
    Search,
    RefreshCw,
    User,
    Hash,
    Calendar,
    MessageSquare,
    Package,
    ChevronDown,
    ChevronUp,
    Settings2,
    ClipboardList,
} from 'lucide-react';
import CustomQuestionsManager from './CustomQuestionsManager';

interface ServiceReview {
    id: string;
    created_at: string;
    full_name: string;
    customer_reference_number: string;
    overall_experience: number;
    overall_customer_service: number;
    satisfaction_bookings_customer_service: number;
    satisfaction_collections_uk: number;
    satisfaction_accounts: number;
    satisfaction_deliveries: number;
    parcel_arrived_as_anticipated: string;
    has_additional_comments: boolean;
    additional_comments: string | null;
    custom_answers: Record<string, string> | null;
}

interface CustomQuestion {
    id: string;
    question_text: string;
}

const Stars3 = ({ count }: { count: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3].map((i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i <= count ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        ))}
        <span className="ml-1.5 text-xs text-gray-500">{count}/3</span>
    </div>
);

const ServiceReviewsTab: React.FC = () => {
    const { toast } = useToast();
    const [reviews, setReviews] = useState<ServiceReview[]>([]);
    const [allQuestions, setAllQuestions] = useState<CustomQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [view, setView] = useState<'reviews' | 'questions'>('reviews');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [reviewsRes, questionsRes] = await Promise.all([
                (supabase.from('service_reviews' as any).select('*').order('created_at', { ascending: false }) as any),
                (supabase.from('feedback_custom_questions' as any).select('id, question_text') as any),
            ]);
            if (reviewsRes.error) throw reviewsRes.error;
            setReviews((reviewsRes.data as ServiceReview[]) || []);
            setAllQuestions((questionsRes.data as CustomQuestion[]) || []);
        } catch {
            toast({ title: 'Error', description: 'Failed to load reviews.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = reviews.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return r.full_name.toLowerCase().includes(q) || r.customer_reference_number.toLowerCase().includes(q);
    });

    const avg = (field: keyof ServiceReview) => {
        if (reviews.length === 0) return '0.0';
        return (reviews.reduce((s, r) => s + (r[field] as number), 0) / reviews.length).toFixed(1);
    };

    const pct = (pred: (r: ServiceReview) => boolean) => {
        if (reviews.length === 0) return '0';
        return ((reviews.filter(pred).length / reviews.length) * 100).toFixed(0);
    };

    const getQuestionText = (id: string) => allQuestions.find((q) => q.id === id)?.question_text ?? id;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Service Reviews</h2>
                    <p className="text-gray-500 text-sm mt-1">Customer feedback ({reviews.length} total)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant={view === 'reviews' ? 'default' : 'outline'} size="sm" onClick={() => setView('reviews')}>
                        <ClipboardList className="h-4 w-4 mr-1" /> Reviews
                    </Button>
                    <Button variant={view === 'questions' ? 'default' : 'outline'} size="sm" onClick={() => setView('questions')}>
                        <Settings2 className="h-4 w-4 mr-1" /> Manage Questions
                    </Button>
                </div>
            </div>

            {/* ─── Questions Manager View ─── */}
            {view === 'questions' && <CustomQuestionsManager />}

            {/* ─── Reviews View ─── */}
            {view === 'reviews' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-purple-600">{reviews.length}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Total Reviews</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-yellow-600">{avg('overall_experience')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Avg Experience</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-blue-600">{avg('overall_customer_service')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Avg Service</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-3 text-center">
                            <p className="text-xl font-bold text-green-600">{pct((r) => r.parcel_arrived_as_anticipated === 'yes')}%</p>
                            <p className="text-xs text-gray-500 mt-0.5">Arrived as Expected</p>
                        </CardContent></Card>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Search by name or reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-purple-600" /></div>
                    ) : filtered.length === 0 ? (
                        <Card><CardContent className="p-12 text-center text-gray-400">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            {searchQuery ? 'No reviews match your search.' : 'No reviews yet.'}
                        </CardContent></Card>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((r) => {
                                const open = expandedId === r.id;
                                return (
                                    <Card key={r.id} className="overflow-hidden">
                                        <button onClick={() => setExpandedId(open ? null : r.id)} className="w-full text-left">
                                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                                        <User className="h-5 w-5 text-purple-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 truncate">{r.full_name}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1"><Hash className="h-3 w-3" />{r.customer_reference_number}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <Stars3 count={r.overall_experience} />
                                                    <Badge variant={r.parcel_arrived_as_anticipated === 'yes' ? 'default' : r.parcel_arrived_as_anticipated === 'partially' ? 'secondary' : 'destructive'} className="text-xs">
                                                        <Package className="h-3 w-3 mr-1" />
                                                        {r.parcel_arrived_as_anticipated === 'yes' ? 'As Expected' : r.parcel_arrived_as_anticipated === 'partially' ? 'Partial' : 'Not as Expected'}
                                                    </Badge>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.created_at).toLocaleDateString()}</span>
                                                    {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                                </div>
                                            </CardContent>
                                        </button>

                                        {open && (
                                            <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                                                {/* Overall ratings */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-0.5">Overall Experience</p>
                                                        <Stars3 count={r.overall_experience} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-0.5">Overall Customer Service</p>
                                                        <Stars3 count={r.overall_customer_service} />
                                                    </div>
                                                </div>

                                                {/* Satisfaction grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {[
                                                        { label: 'Bookings & Service', v: r.satisfaction_bookings_customer_service },
                                                        { label: 'Collections (UK)', v: r.satisfaction_collections_uk },
                                                        { label: 'Accounts', v: r.satisfaction_accounts },
                                                        { label: 'Deliveries', v: r.satisfaction_deliveries },
                                                    ].map((s) => (
                                                        <div key={s.label}>
                                                            <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
                                                            <Stars3 count={s.v} />
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Comments */}
                                                {r.has_additional_comments && r.additional_comments && (
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                        <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Comments</p>
                                                        <p className="text-sm text-gray-700">{r.additional_comments}</p>
                                                    </div>
                                                )}

                                                {/* Custom answers */}
                                                {r.custom_answers && Object.keys(r.custom_answers).length > 0 && (
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                                                        <p className="text-xs font-medium text-gray-500">Custom Answers</p>
                                                        {Object.entries(r.custom_answers).map(([qId, ans]) => (
                                                            <div key={qId} className="text-sm">
                                                                <span className="text-gray-500">{getQuestionText(qId)}: </span>
                                                                <span className="font-medium">{ans}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <p className="text-xs text-gray-400">Submitted: {new Date(r.created_at).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ServiceReviewsTab;
