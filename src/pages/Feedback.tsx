import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Star, CheckCircle, Send, User, Hash, Package, MessageSquare } from 'lucide-react';

/* ──────── star-label map ──────── */
const STAR_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Good', 3: 'Excellent' };

/* ──────── Custom-question types ──────── */
interface CustomQuestion {
    id: string;
    question_text: string;
    question_type: 'text' | 'select' | 'radio' | 'linear_scale';
    options: any;
    is_required: boolean;
}

/* ──────── 3-Star rating component ──────── */
interface StarRatingProps { label: string; icon?: React.ReactNode; value: number; onChange: (v: number) => void }
const StarRating: React.FC<StarRatingProps> = ({ label, icon, value, onChange }) => (
    <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {icon}{label} <span className="text-zim-yellow">*</span>
        </label>
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
                {[1, 2, 3].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className={`w-10 h-10 rounded-lg border transition-all duration-200 flex items-center justify-center text-lg
              ${star <= value
                                ? 'border-zim-yellow/70 bg-zim-yellow/15 text-zim-yellow scale-105 shadow-sm'
                                : 'border-gray-300 dark:border-gray-600 bg-white/5 text-gray-400 hover:border-zim-yellow/40 hover:text-zim-yellow/60'
                            }`}
                        aria-label={`${star} star`}
                    >
                        <Star className={`h-5 w-5 ${star <= value ? 'fill-current' : ''}`} />
                    </button>
                ))}
            </div>
            {value > 0 && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{STAR_LABELS[value]}</span>}
        </div>
    </div>
);

/* ══════════════════════════════════════ */
/*           Feedback Page               */
/* ══════════════════════════════════════ */
const Feedback = () => {
    const { toast } = useToast();

    /* ── fixed fields ── */
    const [fullName, setFullName] = useState('');
    const [refNo, setRefNo] = useState('');
    const [overallExperience, setOverallExperience] = useState(0);
    const [overallCustomerService, setOverallCustomerService] = useState(0);
    const [satBookings, setSatBookings] = useState(0);
    const [satCollections, setSatCollections] = useState(0);
    const [satAccounts, setSatAccounts] = useState(0);
    const [satDeliveries, setSatDeliveries] = useState(0);
    const [parcelArrived, setParcelArrived] = useState('');
    const [hasComments, setHasComments] = useState(false);
    const [comments, setComments] = useState('');

    /* ── dynamic custom questions ── */
    const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    /* fetch active custom questions */
    useEffect(() => {
        document.title = 'Feedback | Zimbabwe Shipping';
        (async () => {
            const { data } = await (supabase
                .from('feedback_custom_questions' as any)
                .select('*')
                .eq('is_active', true)
                .order('sort_order') as any);
            if (data) setCustomQuestions(data as CustomQuestion[]);
        })();
    }, []);

    /* ── validation ── */
    const isValid = () => {
        if (!fullName.trim() || !refNo.trim()) return false;
        if (overallExperience === 0 || overallCustomerService === 0) return false;
        if (satBookings === 0 || satCollections === 0 || satAccounts === 0 || satDeliveries === 0) return false;
        if (!parcelArrived) return false;
        for (const q of customQuestions) {
            if (q.is_required && !customAnswers[q.id]?.trim()) return false;
        }
        return true;
    };

    /* ── submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid()) {
            toast({ title: 'Please fill in all required fields', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await (supabase.from('service_reviews' as any).insert({
                full_name: fullName.trim(),
                customer_reference_number: refNo.trim(),
                overall_experience: overallExperience,
                overall_customer_service: overallCustomerService,
                satisfaction_bookings_customer_service: satBookings,
                satisfaction_collections_uk: satCollections,
                satisfaction_accounts: satAccounts,
                satisfaction_deliveries: satDeliveries,
                parcel_arrived_as_anticipated: parcelArrived,
                has_additional_comments: hasComments,
                additional_comments: hasComments ? comments.trim() || null : null,
                custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : null,
            }) as any);
            if (error) throw error;
            setSubmitted(true);
        } catch {
            toast({ title: 'Something went wrong', description: 'Please try again later.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    /* ── reset ── */
    const resetForm = () => {
        setFullName(''); setRefNo('');
        setOverallExperience(0); setOverallCustomerService(0);
        setSatBookings(0); setSatCollections(0); setSatAccounts(0); setSatDeliveries(0);
        setParcelArrived(''); setHasComments(false); setComments('');
        setCustomAnswers({}); setSubmitted(false);
    };

    /* ══════ Render ══════ */
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <Navbar />
            <main className="container max-w-2xl mx-auto px-4 py-12">

                {/* ── Success Screen ── */}
                {submitted ? (
                    <div className="text-center py-16 space-y-4">
                        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Thank you for your feedback!</h2>
                        <p className="text-gray-500 dark:text-gray-400">Your response helps us improve our service.</p>
                        <button onClick={resetForm} className="mt-4 px-6 py-2 rounded-lg bg-zim-green text-white font-medium hover:bg-zim-green/90 transition">
                            Submit Another
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Service Feedback</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">We value your opinion — please take a moment to rate our service.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* ─── Identity ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><User className="h-5 w-5 text-zim-green" /> Your Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name <span className="text-zim-yellow">*</span></label>
                                        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green" placeholder="Your full name" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Reference <span className="text-zim-yellow">*</span></label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input value={refNo} onChange={(e) => setRefNo(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green" placeholder="e.g. ZS-12345" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ─── Overall Ratings ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Star className="h-5 w-5 text-zim-yellow" /> Overall Ratings</h3>
                                <StarRating label="Rate Overall Experience" value={overallExperience} onChange={setOverallExperience} />
                                <StarRating label="Overall Customer Service" value={overallCustomerService} onChange={setOverallCustomerService} />
                            </section>

                            {/* ─── Satisfaction Grid ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Satisfied with the following</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <StarRating label="Bookings & Customer Service" value={satBookings} onChange={setSatBookings} />
                                    <StarRating label="Collections (UK)" value={satCollections} onChange={setSatCollections} />
                                    <StarRating label="Accounts" value={satAccounts} onChange={setSatAccounts} />
                                    <StarRating label="Deliveries" value={satDeliveries} onChange={setSatDeliveries} />
                                </div>
                            </section>

                            {/* ─── Parcel Arrival ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Package className="h-5 w-5 text-zim-green" /> Did your parcel arrive as anticipated? <span className="text-zim-yellow">*</span></h3>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'yes', label: 'Yes', emoji: '✅' },
                                        { value: 'no', label: 'No', emoji: '❌' },
                                        { value: 'partially', label: 'Partially', emoji: '⚠️' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setParcelArrived(opt.value)}
                                            className={`px-5 py-2.5 rounded-lg border font-medium text-sm transition-all duration-200 flex items-center gap-2
                        ${parcelArrived === opt.value
                                                    ? 'border-zim-green bg-zim-green/10 text-zim-green shadow-sm'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-zim-green/40'}`}
                                        >
                                            <span>{opt.emoji}</span> {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* ─── Additional Comments ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><MessageSquare className="h-5 w-5 text-zim-green" /> Any additional comments?</h3>
                                <div className="flex gap-3">
                                    {['yes', 'no'].map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => { setHasComments(val === 'yes'); if (val === 'no') setComments(''); }}
                                            className={`px-5 py-2 rounded-lg border font-medium text-sm transition-all
                        ${(val === 'yes' ? hasComments : !hasComments)
                                                    ? 'border-zim-green bg-zim-green/10 text-zim-green'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-zim-green/40'}`}
                                        >
                                            {val === 'yes' ? 'Yes' : 'No'}
                                        </button>
                                    ))}
                                </div>
                                {hasComments && (
                                    <textarea
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green resize-none"
                                        placeholder="Tell us more..."
                                    />
                                )}
                            </section>

                            {/* ─── Dynamic Custom Questions ─── */}
                            {customQuestions.length > 0 && (
                                <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Additional Questions</h3>
                                    {customQuestions.map((q) => (
                                        <div key={q.id} className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {q.question_text} {q.is_required && <span className="text-zim-yellow">*</span>}
                                            </label>

                                            {q.question_type === 'text' && (
                                                <input value={customAnswers[q.id] || ''} onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green" />
                                            )}

                                            {(q.question_type === 'select' || q.question_type === 'radio') && (
                                                <div className="flex flex-wrap gap-2">
                                                    {(q.options as string[])?.map((opt: string) => (
                                                        <button key={opt} type="button" onClick={() => setCustomAnswers({ ...customAnswers, [q.id]: opt })}
                                                            className={`px-4 py-2 rounded-lg border text-sm transition-all
                                ${customAnswers[q.id] === opt ? 'border-zim-green bg-zim-green/10 text-zim-green' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-zim-green/40'}`}>
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {q.question_type === 'linear_scale' && (
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((n) => (
                                                        <button key={n} type="button" onClick={() => setCustomAnswers({ ...customAnswers, [q.id]: String(n) })}
                                                            className={`w-10 h-10 rounded-lg border font-medium transition-all
                                ${customAnswers[q.id] === String(n) ? 'border-zim-green bg-zim-green/10 text-zim-green' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-zim-green/40'}`}>
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </section>
                            )}

                            {/* ─── Submit ─── */}
                            <button
                                type="submit"
                                disabled={submitting || !isValid()}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-zim-green to-zim-green/80 text-white font-semibold text-lg flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {submitting ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <><Send className="h-5 w-5" /> Submit Feedback</>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Feedback;
