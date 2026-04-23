import React, { useState, useEffect } from 'react';
import TabHeader from '../TabHeader';
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
    AlertTriangle,
    Mail,
    Phone,
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
    
    // New fields
    first_name?: string;
    last_name?: string;
    email?: string;
    whatsapp_number?: string;
    is_first_time?: string;
    booking_ease?: string;
    communication_rating?: string;
    customer_service_rating?: string;
    delivery_on_time?: string;
    goods_condition?: string;
    overall_satisfaction?: string;
    follow_up_answers?: Record<string, string> | null;
    liked_most?: string;
    can_improve?: string;
    needs_admin_attention?: boolean;
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
    const [view, setView] = useState<'reviews' | 'questions' | 'attention'>('reviews');

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
        const fullName = r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim();
        const refNumber = r.customer_reference_number || '';
        const whatsapp = r.whatsapp_number || '';
        return fullName.toLowerCase().includes(q) || 
               refNumber.toLowerCase().includes(q) ||
               whatsapp.toLowerCase().includes(q);
    });

    const attentionReviews = reviews.filter(r => r.needs_admin_attention);
    const displayReviews = view === 'attention' ? attentionReviews : filtered;

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
        <div className="space-y-4">
            <TabHeader
                title="Service Reviews"
                description={`Customer feedback — ${reviews.length} total${attentionReviews.length > 0 ? `, ${attentionReviews.length} need attention` : ''}`}
                actions={
                    <>
                        <Button variant={view === 'reviews' ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setView('reviews')}>
                            <ClipboardList className="h-3.5 w-3.5 mr-1" /> All Reviews
                        </Button>
                        {attentionReviews.length > 0 && (
                            <Button
                                variant={view === 'attention' ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 text-xs relative"
                                onClick={() => setView('attention')}
                            >
                                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                Need Attention
                                <Badge variant="destructive" className="ml-1.5 px-1 py-0 text-[10px]">
                                    {attentionReviews.length}
                                </Badge>
                            </Button>
                        )}
                        <Button variant={view === 'questions' ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setView('questions')}>
                            <Settings2 className="h-3.5 w-3.5 mr-1" /> Manage Questions
                        </Button>
                    </>
                }
            />

            {/* ─── Questions Manager View ─── */}
            {view === 'questions' && <CustomQuestionsManager />}

            {/* ─── Reviews View ─── */}
            {(view === 'reviews' || view === 'attention') && (
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
                        <Card className={attentionReviews.length > 0 ? 'border-red-200 bg-red-50' : ''}>
                            <CardContent className="p-3 text-center">
                                <p className={`text-xl font-bold ${attentionReviews.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {attentionReviews.length}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">Need Attention</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    {view !== 'attention' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search by name, WhatsApp, or reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                        </div>
                    )}

                    {view === 'attention' && attentionReviews.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertTriangle className="h-5 w-5" />
                                <h3 className="font-semibold">Reviews Requiring Attention</h3>
                            </div>
                            <p className="text-red-700 text-sm mt-1">
                                These customers provided poor ratings and feedback. Please review and follow up as needed.
                            </p>
                        </div>
                    )}

                    {/* List */}
                    {loading ? (
                        <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-purple-600" /></div>
                    ) : displayReviews.length === 0 ? (
                        <Card><CardContent className="p-12 text-center text-gray-400">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            {view === 'attention' ? 'No reviews need attention.' : 
                             searchQuery ? 'No reviews match your search.' : 'No reviews yet.'}
                        </CardContent></Card>
                    ) : (
                        <div className="space-y-3">
                            {displayReviews.map((r) => {
                                const open = expandedId === r.id;
                                const fullName = r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim();
                                const refNumber = r.customer_reference_number || 'N/A';
                                
                                return (
                                    <Card key={r.id} className={`overflow-hidden ${r.needs_admin_attention ? 'border-red-200 bg-red-50/30' : ''}`}>
                                        <button onClick={() => setExpandedId(open ? null : r.id)} className="w-full text-left">
                                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                        r.needs_admin_attention ? 'bg-red-100' : 'bg-purple-100'
                                                    }`}>
                                                        {r.needs_admin_attention ? (
                                                            <AlertTriangle className="h-5 w-5 text-red-600" />
                                                        ) : (
                                                            <User className="h-5 w-5 text-purple-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 truncate">{fullName}</p>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <Hash className="h-3 w-3" />{refNumber}
                                                            </span>
                                                            {r.email && (
                                                                <span className="flex items-center gap-1">
                                                                    <Mail className="h-3 w-3" />{r.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {r.overall_experience && <Stars3 count={r.overall_experience} />}
                                                    {r.overall_satisfaction && (
                                                        <Badge variant={
                                                            ['Very Satisfied', 'Satisfied'].includes(r.overall_satisfaction) ? 'default' :
                                                            r.overall_satisfaction === 'Neutral' ? 'secondary' : 'destructive'
                                                        } className="text-xs">
                                                            {r.overall_satisfaction}
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />{new Date(r.created_at).toLocaleDateString()}
                                                    </span>
                                                    {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                                </div>
                                            </CardContent>
                                        </button>

                                        {open && (
                                            <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                                                {/* Contact Information */}
                                                {(r.first_name || r.email || r.whatsapp_number) && (
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                        <p className="text-xs font-medium text-gray-500 mb-2">Contact Information</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                            {r.first_name && (
                                                                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{r.first_name} {r.last_name}</span></div>
                                                            )}
                                                            {r.whatsapp_number && (
                                                                <div><span className="text-gray-500">WhatsApp:</span> <span className="font-medium">{r.whatsapp_number}</span></div>
                                                            )}
                                                            {r.is_first_time && (
                                                                <div><span className="text-gray-500">First time:</span> <span className="font-medium">{r.is_first_time}</span></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* New Rating System */}
                                                {(r.booking_ease || r.communication_rating || r.customer_service_rating) && (
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                        <p className="text-xs font-medium text-gray-500 mb-2">Service Ratings</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                            {r.booking_ease && (
                                                                <div><span className="text-gray-500">Booking Ease:</span> <span className="font-medium">{r.booking_ease}</span></div>
                                                            )}
                                                            {r.communication_rating && (
                                                                <div><span className="text-gray-500">Communication:</span> <span className="font-medium">{r.communication_rating}</span></div>
                                                            )}
                                                            {r.customer_service_rating && (
                                                                <div><span className="text-gray-500">Customer Service:</span> <span className="font-medium">{r.customer_service_rating}</span></div>
                                                            )}
                                                            {r.delivery_on_time && (
                                                                <div><span className="text-gray-500">On Time Delivery:</span> <span className="font-medium">{r.delivery_on_time}</span></div>
                                                            )}
                                                            {r.goods_condition && (
                                                                <div><span className="text-gray-500">Goods Condition:</span> <span className="font-medium">{r.goods_condition}</span></div>
                                                            )}
                                                            {r.overall_satisfaction && (
                                                                <div><span className="text-gray-500">Overall Satisfaction:</span> <span className="font-medium">{r.overall_satisfaction}</span></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Follow-up Answers for Poor Ratings */}
                                                {r.follow_up_answers && Object.keys(r.follow_up_answers).length > 0 && (
                                                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                                        <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Follow-up Responses (Poor Ratings)
                                                        </p>
                                                        <div className="space-y-2">
                                                            {Object.entries(r.follow_up_answers).map(([key, answer]) => (
                                                                <div key={key} className="text-sm">
                                                                    <span className="text-red-600 font-medium capitalize">{key.replace('_', ' ')}:</span>
                                                                    <p className="text-gray-700 mt-1">{answer}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Legacy Overall ratings */}
                                                {r.overall_experience && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-0.5">Overall Experience (Legacy)</p>
                                                            <Stars3 count={r.overall_experience} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-0.5">Overall Customer Service (Legacy)</p>
                                                            <Stars3 count={r.overall_customer_service} />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Legacy Satisfaction grid */}
                                                {r.satisfaction_bookings_customer_service && (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {[
                                                            { label: 'Bookings & Service', v: r.satisfaction_bookings_customer_service },
                                                            { label: 'Collections (UK)', v: r.satisfaction_collections_uk },
                                                            { label: 'Accounts', v: r.satisfaction_accounts },
                                                            { label: 'Deliveries', v: r.satisfaction_deliveries },
                                                        ].map((s) => (
                                                            <div key={s.label}>
                                                                <p className="text-xs text-gray-500 mb-0.5">{s.label} (Legacy)</p>
                                                                <Stars3 count={s.v} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Additional Feedback */}
                                                {r.additional_comments && (
                                                    <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-3">
                                                        <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                            <MessageSquare className="h-3 w-3" /> Additional Feedback
                                                        </p>
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">General Comments:</p>
                                                            <p className="text-sm text-gray-700">{r.additional_comments}</p>
                                                        </div>
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
