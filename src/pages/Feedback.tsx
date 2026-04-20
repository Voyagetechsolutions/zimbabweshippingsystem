import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckCircle, Send, User, Mail, Phone, MessageSquare } from 'lucide-react';

/* ──────── Rating options ──────── */
const RATING_OPTIONS = {
    ease: ['Very Easy', 'Easy', 'Neutral', 'Difficult', 'Very Difficult'],
    quality: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'],
    yesNo: ['Yes', 'No'],
    satisfaction: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
    condition: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']
};

/* ──────── Follow-up questions for poor ratings ──────── */
const FOLLOW_UP_QUESTIONS = {
    booking_ease: "What can we do to make the booking process easier for you?",
    communication: "How can we improve our communication during the shipping process?",
    customer_service: "What can we do to provide better customer service?",
    delivery_time: "What can we do so that deliveries are completed on time?",
    goods_condition: "What can we do to ensure your goods arrive in better condition?",
    overall_satisfaction: "What can we do to improve your overall experience with our service?"
};

/* ──────── Custom-question types ──────── */
interface CustomQuestion {
    id: string;
    question_text: string;
    question_type: 'text' | 'select' | 'radio' | 'linear_scale';
    options: any;
    is_required: boolean;
}

/* ──────── Rating component ──────── */
interface RatingProps { 
    label: string; 
    icon?: React.ReactNode; 
    value: string; 
    onChange: (v: string) => void;
    options: string[];
    required?: boolean;
}

const RatingComponent: React.FC<RatingProps> = ({ label, icon, value, onChange, options, required = true }) => (
    <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {icon}{label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex flex-wrap gap-2">
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all duration-200
                        ${value === option
                            ? 'border-zim-green bg-zim-green/10 text-zim-green shadow-sm'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-zim-green/40'
                        }`}
                >
                    {option}
                </button>
            ))}
        </div>
    </div>
);

/* ══════════════════════════════════════ */
/*           Feedback Page               */
/* ══════════════════════════════════════ */
const Feedback = () => {
    const { toast } = useToast();

    /* ── Contact Information ── */
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');

    /* ── Main Questions ── */
    const [isFirstTime, setIsFirstTime] = useState('');
    const [bookingEase, setBookingEase] = useState('');
    const [communication, setCommunication] = useState('');
    const [customerService, setCustomerService] = useState('');
    const [deliveryOnTime, setDeliveryOnTime] = useState('');
    const [goodsCondition, setGoodsCondition] = useState('');
    const [overallSatisfaction, setOverallSatisfaction] = useState('');

    /* ── Follow-up questions for poor ratings ── */
    const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});

    /* ── Additional feedback ── */
    const [additionalFeedback, setAdditionalFeedback] = useState('');
    const [likedMost, setLikedMost] = useState('');
    const [canImprove, setCanImprove] = useState('');

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

    /* ── Check if follow-up question should be shown ── */
    const shouldShowFollowUp = (field: string, value: string) => {
        const poorRatings = ['Poor', 'Very Poor', 'Difficult', 'Very Difficult', 'Dissatisfied', 'Very Dissatisfied'];
        return poorRatings.includes(value);
    };

    /* ── validation ── */
    const isValid = () => {
        // Required contact information
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !whatsappNumber.trim()) return false;
        
        // Required main questions
        if (!isFirstTime || !bookingEase || !communication || !customerService || 
            !deliveryOnTime || !goodsCondition || !overallSatisfaction) return false;
        
        // Check follow-up questions for poor ratings
        const followUpFields = [
            { field: 'booking_ease', value: bookingEase },
            { field: 'communication', value: communication },
            { field: 'customer_service', value: customerService },
            { field: 'delivery_time', value: deliveryOnTime },
            { field: 'goods_condition', value: goodsCondition },
            { field: 'overall_satisfaction', value: overallSatisfaction }
        ];

        for (const { field, value } of followUpFields) {
            if (shouldShowFollowUp(field, value) && !followUpAnswers[field]?.trim()) {
                return false;
            }
        }
        
        // Check required custom questions
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
            // Check if any ratings are poor to flag for admin attention
            const poorRatings = ['Poor', 'Very Poor', 'Difficult', 'Very Difficult', 'Dissatisfied', 'Very Dissatisfied'];
            const hasPoorRating = [bookingEase, communication, customerService, deliveryOnTime, goodsCondition, overallSatisfaction]
                .some(rating => poorRatings.includes(rating));

            const { error } = await (supabase.from('service_reviews' as any).insert({
                // Contact information
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                whatsapp_number: whatsappNumber.trim(),
                
                // Main questions
                is_first_time: isFirstTime,
                booking_ease: bookingEase,
                communication_rating: communication,
                customer_service_rating: customerService,
                delivery_on_time: deliveryOnTime,
                goods_condition: goodsCondition,
                overall_satisfaction: overallSatisfaction,
                
                // Follow-up answers
                follow_up_answers: Object.keys(followUpAnswers).length > 0 ? followUpAnswers : null,
                
                // Additional feedback
                additional_feedback: additionalFeedback.trim() || null,
                liked_most: likedMost.trim() || null,
                can_improve: canImprove.trim() || null,
                
                // Custom answers
                custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : null,
                
                // Flag for admin attention
                needs_admin_attention: hasPoorRating,
                
                // Required legacy fields for compatibility
                full_name: `${firstName.trim()} ${lastName.trim()}`,
                customer_reference_number: `FB-${Date.now()}`, // Generate a feedback reference number
                overall_experience: overallSatisfaction === 'Very Satisfied' ? 3 : overallSatisfaction === 'Satisfied' ? 2 : 1,
                overall_customer_service: customerService === 'Excellent' ? 3 : customerService === 'Good' ? 2 : 1,
                satisfaction_bookings_customer_service: bookingEase === 'Very Easy' ? 3 : bookingEase === 'Easy' ? 2 : 1,
                satisfaction_collections_uk: 2, // Default neutral rating for legacy field
                satisfaction_accounts: 2, // Default neutral rating for legacy field  
                satisfaction_deliveries: deliveryOnTime === 'Yes' ? 3 : 1,
                parcel_arrived_as_anticipated: deliveryOnTime === 'Yes' ? 'yes' : 'no',
                has_additional_comments: !!(additionalFeedback.trim() || likedMost.trim() || canImprove.trim()),
                additional_comments: additionalFeedback.trim() || null,
            }) as any);
            
            if (error) {
                console.error('Feedback submission error:', error);
                throw error;
            }
            setSubmitted(true);
        } catch (error) {
            console.error('Feedback submission failed:', error);
            toast({ 
                title: 'Something went wrong', 
                description: 'Please try again later. If the problem persists, please contact support.', 
                variant: 'destructive' 
            });
        } finally {
            setSubmitting(false);
        }
    };

    /* ── reset ── */
    const resetForm = () => {
        setFirstName(''); setLastName(''); setEmail(''); setWhatsappNumber('');
        setIsFirstTime(''); setBookingEase(''); setCommunication(''); setCustomerService('');
        setDeliveryOnTime(''); setGoodsCondition(''); setOverallSatisfaction('');
        setFollowUpAnswers({}); setAdditionalFeedback(''); setLikedMost(''); setCanImprove('');
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
                            {/* ─── Contact Information ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <User className="h-5 w-5 text-zim-green" /> Contact Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            value={firstName} 
                                            onChange={(e) => setFirstName(e.target.value)} 
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green" 
                                            placeholder="Your first name" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Last Name <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            value={lastName} 
                                            onChange={(e) => setLastName(e.target.value)} 
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green" 
                                            placeholder="Your last name" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input 
                                                type="email"
                                                value={email} 
                                                onChange={(e) => setEmail(e.target.value)} 
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green" 
                                                placeholder="your.email@example.com" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            WhatsApp Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input 
                                                type="tel"
                                                value={whatsappNumber} 
                                                onChange={(e) => setWhatsappNumber(e.target.value)} 
                                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green" 
                                                placeholder="+44 7XXX XXXXXX" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ─── Main Questions ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Service Experience</h3>
                                
                                {/* First time using service */}
                                <RatingComponent
                                    label="Is this your first time using Zimbabwe Shipping Services?"
                                    value={isFirstTime}
                                    onChange={setIsFirstTime}
                                    options={RATING_OPTIONS.yesNo}
                                />

                                {/* Booking ease */}
                                <RatingComponent
                                    label="How easy was the booking process?"
                                    value={bookingEase}
                                    onChange={setBookingEase}
                                    options={RATING_OPTIONS.ease}
                                />
                                {shouldShowFollowUp('booking_ease', bookingEase) && (
                                    <div className="ml-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                            {FOLLOW_UP_QUESTIONS.booking_ease} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={followUpAnswers.booking_ease || ''}
                                            onChange={(e) => setFollowUpAnswers({...followUpAnswers, booking_ease: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                            placeholder="Please tell us how we can improve..."
                                        />
                                    </div>
                                )}

                                {/* Communication */}
                                <RatingComponent
                                    label="How would you rate our communication during the shipping process?"
                                    value={communication}
                                    onChange={setCommunication}
                                    options={RATING_OPTIONS.quality}
                                />
                                {shouldShowFollowUp('communication', communication) && (
                                    <div className="ml-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                            {FOLLOW_UP_QUESTIONS.communication} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={followUpAnswers.communication || ''}
                                            onChange={(e) => setFollowUpAnswers({...followUpAnswers, communication: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                            placeholder="Please tell us how we can improve..."
                                        />
                                    </div>
                                )}

                                {/* Customer service */}
                                <RatingComponent
                                    label="How would you rate our customer service?"
                                    value={customerService}
                                    onChange={setCustomerService}
                                    options={RATING_OPTIONS.quality}
                                />
                                {shouldShowFollowUp('customer_service', customerService) && (
                                    <div className="ml-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                            {FOLLOW_UP_QUESTIONS.customer_service} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={followUpAnswers.customer_service || ''}
                                            onChange={(e) => setFollowUpAnswers({...followUpAnswers, customer_service: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                            placeholder="Please tell us how we can improve..."
                                        />
                                    </div>
                                )}

                                {/* Delivery timing */}
                                <RatingComponent
                                    label="Was your delivery completed on time?"
                                    value={deliveryOnTime}
                                    onChange={setDeliveryOnTime}
                                    options={RATING_OPTIONS.yesNo}
                                />
                                {deliveryOnTime === 'No' && (
                                    <div className="ml-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                            {FOLLOW_UP_QUESTIONS.delivery_time} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={followUpAnswers.delivery_time || ''}
                                            onChange={(e) => setFollowUpAnswers({...followUpAnswers, delivery_time: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                            placeholder="Please tell us how we can improve..."
                                        />
                                    </div>
                                )}

                                {/* Goods condition */}
                                <RatingComponent
                                    label="What was the condition of your goods upon arrival?"
                                    value={goodsCondition}
                                    onChange={setGoodsCondition}
                                    options={RATING_OPTIONS.condition}
                                />
                                {shouldShowFollowUp('goods_condition', goodsCondition) && (
                                    <div className="ml-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                            {FOLLOW_UP_QUESTIONS.goods_condition} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={followUpAnswers.goods_condition || ''}
                                            onChange={(e) => setFollowUpAnswers({...followUpAnswers, goods_condition: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                            placeholder="Please tell us how we can improve..."
                                        />
                                    </div>
                                )}

                                {/* Overall satisfaction */}
                                <RatingComponent
                                    label="How satisfied are you overall with our service?"
                                    value={overallSatisfaction}
                                    onChange={setOverallSatisfaction}
                                    options={RATING_OPTIONS.satisfaction}
                                />
                                {shouldShowFollowUp('overall_satisfaction', overallSatisfaction) && (
                                    <div className="ml-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                                            {FOLLOW_UP_QUESTIONS.overall_satisfaction} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={followUpAnswers.overall_satisfaction || ''}
                                            onChange={(e) => setFollowUpAnswers({...followUpAnswers, overall_satisfaction: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                            placeholder="Please tell us how we can improve..."
                                        />
                                    </div>
                                )}
                            </section>

                            {/* ─── Additional Feedback ─── */}
                            <section className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-zim-green" /> Additional Feedback
                                </h3>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Please share any additional feedback, testimonials, or complaints about your experience with Zimbabwe Shipping Services:
                                    </label>
                                    <textarea
                                        value={additionalFeedback}
                                        onChange={(e) => setAdditionalFeedback(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green resize-none"
                                        placeholder="Share your thoughts..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            What did you like most about our service?
                                        </label>
                                        <textarea
                                            value={likedMost}
                                            onChange={(e) => setLikedMost(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green resize-none"
                                            placeholder="Tell us what you enjoyed..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            What can we improve?
                                        </label>
                                        <textarea
                                            value={canImprove}
                                            onChange={(e) => setCanImprove(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zim-green resize-none"
                                            placeholder="Suggestions for improvement..."
                                        />
                                    </div>
                                </div>
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
