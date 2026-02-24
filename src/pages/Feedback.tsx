
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ───────── types ───────── */
interface CustomQuestion {
    id: string;
    question_text: string;
    question_type: 'text' | 'select' | 'radio' | 'linear_scale';
    options: any;
    is_required: boolean;
    sort_order: number;
}

const HOW_HEARD_OPTIONS = [
    { value: 'social_media', label: 'Social Media' },
    { value: 'referral', label: 'Referral / Word of Mouth' },
    { value: 'website', label: 'Website' },
    { value: 'other', label: 'Other' },
];

const SATISFACTION_LABELS = ['Very Unsatisfied', 'Unsatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];
const SATISFACTION_ROWS = [
    { key: 'satisfaction_delivery_time', label: 'Delivery time' },
    { key: 'satisfaction_customer_service', label: 'Customer service' },
    { key: 'satisfaction_parcel_safety', label: 'Parcel safety / packaging' },
    { key: 'satisfaction_price_fairness', label: 'Price fairness' },
] as const;

/* ───────── small components ───────── */
const inputCls =
    'w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zim-green/50 focus:border-zim-green transition-all';

const RequiredMark = () => <span className="text-zim-yellow">*</span>;

const LinearScale = ({
    value,
    onChange,
    min = 1,
    max = 5,
    minLabel = 'Very Poor',
    maxLabel = 'Excellent',
}: {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
    minLabel?: string;
    maxLabel?: string;
}) => {
    const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
            <div className="flex gap-2">
                {range.map((n) => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ${n === value
                                ? 'border-zim-green bg-zim-green/15 text-zim-green shadow-sm'
                                : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-zim-green/40'
                            }`}
                    >
                        {n}
                    </button>
                ))}
            </div>
        </div>
    );
};

const RadioGroup = ({
    options,
    value,
    onChange,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
}) => (
    <div className="flex flex-col gap-2">
        {options.map((opt) => (
            <label
                key={opt.value}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${value === opt.value
                        ? 'border-zim-green bg-zim-green/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-zim-green/40'
                    }`}
            >
                <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${value === opt.value ? 'border-zim-green' : 'border-gray-400'
                        }`}
                >
                    {value === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-zim-green" />}
                </div>
                <span className="text-sm text-gray-800 dark:text-gray-200">{opt.label}</span>
            </label>
        ))}
    </div>
);

/* ───────── satisfaction grid ───────── */
const SatisfactionGrid = ({
    values,
    onChange,
}: {
    values: Record<string, number>;
    onChange: (key: string, v: number) => void;
}) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
                <tr>
                    <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium" />
                    {SATISFACTION_LABELS.map((l, i) => (
                        <th key={i} className="text-center px-2 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                            {l}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {SATISFACTION_ROWS.map((row) => (
                    <tr key={row.key} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="py-3 pr-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.label}</td>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <td key={n} className="text-center px-2 py-3">
                                <button
                                    type="button"
                                    onClick={() => onChange(row.key, n)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all mx-auto flex items-center justify-center ${values[row.key] === n
                                            ? 'border-zim-green bg-zim-green text-white'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-zim-green/50'
                                        }`}
                                >
                                    {values[row.key] === n && <CheckCircle2 className="h-4 w-4" />}
                                </button>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/* ───────── render custom question ───────── */
const RenderCustomQuestion = ({
    q,
    value,
    onChange,
}: {
    q: CustomQuestion;
    value: string;
    onChange: (v: string) => void;
}) => {
    switch (q.question_type) {
        case 'text':
            return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer..." className={inputCls} />;
        case 'select':
            return (
                <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
                    <option value="" disabled>Select one</option>
                    {(q.options as string[])?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        case 'radio':
            return (
                <RadioGroup
                    options={(q.options as string[])?.map((o: string) => ({ value: o, label: o })) || []}
                    value={value}
                    onChange={onChange}
                />
            );
        case 'linear_scale': {
            const opts = q.options as { min?: number; max?: number; min_label?: string; max_label?: string } | null;
            return (
                <LinearScale
                    value={value ? parseInt(value, 10) : 0}
                    onChange={(n) => onChange(String(n))}
                    min={opts?.min ?? 1}
                    max={opts?.max ?? 5}
                    minLabel={opts?.min_label ?? ''}
                    maxLabel={opts?.max_label ?? ''}
                />
            );
        }
        default:
            return null;
    }
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const Feedback: React.FC = () => {
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

    // Fixed fields
    const [fullName, setFullName] = useState('');
    const [refNo, setRefNo] = useState('');
    const [howHeard, setHowHeard] = useState('');
    const [howHeardOther, setHowHeardOther] = useState('');
    const [overallExperience, setOverallExperience] = useState(0);
    const [satisfaction, setSatisfaction] = useState<Record<string, number>>({});
    const [arrivedOnTime, setArrivedOnTime] = useState('');
    const [wouldRecommend, setWouldRecommend] = useState('');
    const [hasComments, setHasComments] = useState('');
    const [comments, setComments] = useState('');

    // Dynamic custom answers
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await (supabase
                    .from('feedback_custom_questions' as any)
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true }) as any);
                if (data) setCustomQuestions(data as CustomQuestion[]);
            } catch (e) {
                console.error('Failed to load custom questions', e);
            }
        };
        load();
    }, []);

    const resetForm = () => {
        setFullName('');
        setRefNo('');
        setHowHeard('');
        setHowHeardOther('');
        setOverallExperience(0);
        setSatisfaction({});
        setArrivedOnTime('');
        setWouldRecommend('');
        setHasComments('');
        setComments('');
        setCustomAnswers({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        if (!fullName.trim() || !refNo.trim()) {
            toast({ title: 'Missing Fields', description: 'Full name and reference number are required.', variant: 'destructive' });
            return;
        }
        if (!howHeard) {
            toast({ title: 'Missing Field', description: 'Please tell us how you heard about us.', variant: 'destructive' });
            return;
        }
        if (overallExperience === 0) {
            toast({ title: 'Missing Rating', description: 'Please rate your overall experience.', variant: 'destructive' });
            return;
        }
        const missingSatisfaction = SATISFACTION_ROWS.filter((r) => !satisfaction[r.key]);
        if (missingSatisfaction.length > 0) {
            toast({ title: 'Missing Satisfaction Ratings', description: `Please rate: ${missingSatisfaction.map((r) => r.label).join(', ')}`, variant: 'destructive' });
            return;
        }
        if (!arrivedOnTime) {
            toast({ title: 'Missing Field', description: 'Please indicate if your parcel arrived on time.', variant: 'destructive' });
            return;
        }
        if (!wouldRecommend) {
            toast({ title: 'Missing Field', description: 'Please indicate if you would recommend us.', variant: 'destructive' });
            return;
        }
        if (!hasComments) {
            toast({ title: 'Missing Field', description: 'Please indicate whether you have additional comments.', variant: 'destructive' });
            return;
        }

        // Validate required custom questions
        const missingCustom = customQuestions.filter((q) => q.is_required && !customAnswers[q.id]?.trim());
        if (missingCustom.length > 0) {
            toast({ title: 'Missing Answers', description: `Please answer: ${missingCustom.map((q) => q.question_text).join(', ')}`, variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await (supabase.from('service_reviews' as any).insert({
                full_name: fullName.trim(),
                customer_reference_number: refNo.trim(),
                how_heard_about_us: howHeard,
                how_heard_other: howHeard === 'other' ? howHeardOther.trim() : null,
                overall_experience: overallExperience,
                satisfaction_delivery_time: satisfaction.satisfaction_delivery_time,
                satisfaction_customer_service: satisfaction.satisfaction_customer_service,
                satisfaction_parcel_safety: satisfaction.satisfaction_parcel_safety,
                satisfaction_price_fairness: satisfaction.satisfaction_price_fairness,
                parcel_arrived_on_time: arrivedOnTime,
                would_recommend: wouldRecommend,
                has_additional_comments: hasComments === 'true',
                additional_comments: hasComments === 'true' ? comments.trim() : null,
                custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : null,
            } as any) as any);

            if (error) throw error;

            setSubmitted(true);
            resetForm();
        } catch (err: any) {
            console.error('Submission error:', err);
            toast({ title: 'Submission Failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Success Screen ───
    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
                    <div className="max-w-md mx-auto text-center px-4">
                        <div className="w-20 h-20 bg-zim-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="h-10 w-10 text-zim-green" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Thank You!</h1>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve.</p>
                        <Button onClick={() => setSubmitted(false)} className="bg-zim-green hover:bg-zim-green/90 text-white">
                            Submit Another Review
                        </Button>
                    </div>
                </main>
                <Footer />
                <WhatsAppButton />
            </div>
        );
    }

    // ─── Form ───
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Service Review</h1>
                            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                                Thank you for using our shipping services. This takes about 2–3 minutes and helps us improve.
                            </p>
                            <div className="flex justify-center mt-6">
                                <div className="h-1 w-20 bg-zim-green rounded-full mx-1" />
                                <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1" />
                                <div className="h-1 w-20 bg-zim-red rounded-full mx-1" />
                            </div>
                        </div>

                        {/* Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="p-6 sm:p-8">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* ── 1. Identity ── */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name <RequiredMark /></label>
                                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Tendai M." className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Reference Number <RequiredMark /></label>
                                            <input type="text" value={refNo} onChange={(e) => setRefNo(e.target.value)} required placeholder="e.g. ZS-UK-10293" className={inputCls} />
                                        </div>
                                    </div>

                                    {/* ── 2. How heard ── */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            How did you hear about our shipping service? <RequiredMark />
                                        </label>
                                        <RadioGroup options={HOW_HEARD_OPTIONS} value={howHeard} onChange={setHowHeard} />
                                        {howHeard === 'other' && (
                                            <input
                                                type="text"
                                                value={howHeardOther}
                                                onChange={(e) => setHowHeardOther(e.target.value)}
                                                placeholder="Please specify..."
                                                className={`${inputCls} mt-3`}
                                            />
                                        )}
                                    </div>

                                    {/* ── 3. Overall Experience 1-5 ── */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Rate your overall experience with us. <RequiredMark />
                                        </label>
                                        <LinearScale value={overallExperience} onChange={setOverallExperience} minLabel="Very Poor" maxLabel="Excellent" />
                                    </div>

                                    {/* ── 4. Satisfaction Grid ── */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            How satisfied were you with the following? <RequiredMark />
                                        </label>
                                        <SatisfactionGrid values={satisfaction} onChange={(k, v) => setSatisfaction((prev) => ({ ...prev, [k]: v }))} />
                                    </div>

                                    {/* ── 5. Parcel arrived on time ── */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Did your parcel arrive on time? <RequiredMark />
                                        </label>
                                        <RadioGroup
                                            options={[
                                                { value: 'yes', label: 'Yes' },
                                                { value: 'no', label: 'No' },
                                                { value: 'partially', label: 'Partially' },
                                            ]}
                                            value={arrivedOnTime}
                                            onChange={setArrivedOnTime}
                                        />
                                    </div>

                                    {/* ── 6. Would Recommend ── */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Would you recommend us to others? <RequiredMark />
                                        </label>
                                        <RadioGroup
                                            options={[
                                                { value: 'definitely', label: 'Definitely' },
                                                { value: 'maybe', label: 'Maybe' },
                                                { value: 'no', label: 'No' },
                                            ]}
                                            value={wouldRecommend}
                                            onChange={setWouldRecommend}
                                        />
                                    </div>

                                    {/* ── 7. Additional Comments ── */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Any additional comments? <RequiredMark />
                                        </label>
                                        <select value={hasComments} onChange={(e) => setHasComments(e.target.value)} required className={inputCls}>
                                            <option value="" disabled>Select one</option>
                                            <option value="true">Yes</option>
                                            <option value="false">No</option>
                                        </select>
                                        {hasComments === 'true' && (
                                            <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Write your comment here..." rows={4} className={`${inputCls} mt-3 resize-vertical`} />
                                        )}
                                    </div>

                                    {/* ── 8. Dynamic Custom Questions ── */}
                                    {customQuestions.length > 0 && (
                                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
                                            <h2 className="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                                                Additional Questions
                                            </h2>
                                            {customQuestions.map((q) => (
                                                <div key={q.id}>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        {q.question_text} {q.is_required && <RequiredMark />}
                                                    </label>
                                                    <RenderCustomQuestion
                                                        q={q}
                                                        value={customAnswers[q.id] || ''}
                                                        onChange={(v) => setCustomAnswers((prev) => ({ ...prev, [q.id]: v }))}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── Submit ── */}
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-6 rounded-xl text-base font-semibold bg-gradient-to-r from-zim-green to-zim-green/80 hover:from-zim-green/90 hover:to-zim-green/70 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                                Submitting...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <Send className="h-5 w-5" />
                                                Submit Review
                                            </span>
                                        )}
                                    </Button>

                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                        By submitting, you confirm this feedback is honest and related to your shipment experience.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
            <WhatsAppButton />
        </div>
    );
};

export default Feedback;
