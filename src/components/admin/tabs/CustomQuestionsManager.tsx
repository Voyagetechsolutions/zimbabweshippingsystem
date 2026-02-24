
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Trash2,
    Save,
    ToggleLeft,
    ToggleRight,
    GripVertical,
    Edit2,
    X,
} from 'lucide-react';

interface CustomQuestion {
    id: string;
    question_text: string;
    question_type: string;
    options: any;
    is_required: boolean;
    is_active: boolean;
    sort_order: number;
}

const QUESTION_TYPES = [
    { value: 'text', label: 'Text (free response)' },
    { value: 'select', label: 'Dropdown (select one)' },
    { value: 'radio', label: 'Radio (select one)' },
    { value: 'linear_scale', label: 'Linear Scale (1–N)' },
];

const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400';

const CustomQuestionsManager: React.FC = () => {
    const { toast } = useToast();
    const [questions, setQuestions] = useState<CustomQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    // New / edit form state
    const [editing, setEditing] = useState<string | null>(null); // null = new form closed, 'new' = creating, uuid = editing
    const [formText, setFormText] = useState('');
    const [formType, setFormType] = useState('text');
    const [formRequired, setFormRequired] = useState(false);
    const [formOptions, setFormOptions] = useState(''); // comma-separated for select/radio
    const [formScaleMin, setFormScaleMin] = useState(1);
    const [formScaleMax, setFormScaleMax] = useState(5);
    const [formScaleMinLabel, setFormScaleMinLabel] = useState('');
    const [formScaleMaxLabel, setFormScaleMaxLabel] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from('feedback_custom_questions' as any)
                .select('*')
                .order('sort_order', { ascending: true }) as any);
            if (error) throw error;
            setQuestions((data as CustomQuestion[]) || []);
        } catch {
            toast({ title: 'Error', description: 'Failed to load questions.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQuestions(); }, []);

    const resetForm = () => {
        setEditing(null);
        setFormText('');
        setFormType('text');
        setFormRequired(false);
        setFormOptions('');
        setFormScaleMin(1);
        setFormScaleMax(5);
        setFormScaleMinLabel('');
        setFormScaleMaxLabel('');
    };

    const openEdit = (q: CustomQuestion) => {
        setEditing(q.id);
        setFormText(q.question_text);
        setFormType(q.question_type);
        setFormRequired(q.is_required);
        if (q.question_type === 'select' || q.question_type === 'radio') {
            setFormOptions((q.options as string[])?.join(', ') || '');
        }
        if (q.question_type === 'linear_scale' && q.options) {
            const o = q.options as any;
            setFormScaleMin(o.min ?? 1);
            setFormScaleMax(o.max ?? 5);
            setFormScaleMinLabel(o.min_label ?? '');
            setFormScaleMaxLabel(o.max_label ?? '');
        }
    };

    const buildOptions = () => {
        if (formType === 'select' || formType === 'radio') {
            return formOptions.split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (formType === 'linear_scale') {
            return { min: formScaleMin, max: formScaleMax, min_label: formScaleMinLabel, max_label: formScaleMaxLabel };
        }
        return null;
    };

    const handleSave = async () => {
        if (!formText.trim()) {
            toast({ title: 'Required', description: 'Question text is required.', variant: 'destructive' });
            return;
        }
        if ((formType === 'select' || formType === 'radio') && !formOptions.trim()) {
            toast({ title: 'Required', description: 'Please provide comma-separated options.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        const payload = {
            question_text: formText.trim(),
            question_type: formType,
            options: buildOptions(),
            is_required: formRequired,
            sort_order: editing === 'new' ? questions.length : undefined,
            updated_at: new Date().toISOString(),
        };

        try {
            if (editing === 'new') {
                const { error } = await (supabase.from('feedback_custom_questions' as any).insert(payload as any) as any);
                if (error) throw error;
                toast({ title: 'Created', description: 'Question added to the feedback form.' });
            } else {
                const { error } = await (supabase.from('feedback_custom_questions' as any).update(payload as any).eq('id', editing!) as any);
                if (error) throw error;
                toast({ title: 'Updated', description: 'Question updated.' });
            }
            resetForm();
            fetchQuestions();
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error', description: 'Failed to save question.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (q: CustomQuestion) => {
        try {
            const { error } = await (supabase.from('feedback_custom_questions' as any).update({ is_active: !q.is_active, updated_at: new Date().toISOString() } as any).eq('id', q.id) as any);
            if (error) throw error;
            setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, is_active: !x.is_active } : x)));
        } catch {
            toast({ title: 'Error', description: 'Failed to toggle.', variant: 'destructive' });
        }
    };

    const deleteQuestion = async (id: string) => {
        if (!confirm('Delete this question? Existing answers referencing it will remain in the database.')) return;
        try {
            const { error } = await (supabase.from('feedback_custom_questions' as any).delete().eq('id', id) as any);
            if (error) throw error;
            setQuestions((prev) => prev.filter((x) => x.id !== id));
            toast({ title: 'Deleted', description: 'Question removed.' });
        } catch {
            toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    {questions.filter((q) => q.is_active).length} active questions shown on the feedback page
                </p>
                {editing === null && (
                    <Button size="sm" onClick={() => setEditing('new')}>
                        <Plus className="h-4 w-4 mr-1" /> Add Question
                    </Button>
                )}
            </div>

            {/* New / Edit Form */}
            {editing !== null && (
                <Card className="border-2 border-purple-300">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{editing === 'new' ? 'New Question' : 'Edit Question'}</h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Question Text *</label>
                            <Input value={formText} onChange={(e) => setFormText(e.target.value)} placeholder="e.g. What could we improve?" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                                <select value={formType} onChange={(e) => setFormType(e.target.value)} className={inputCls}>
                                    {QUESTION_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formRequired} onChange={(e) => setFormRequired(e.target.checked)} className="w-4 h-4 rounded" />
                                    <span className="text-sm">Required</span>
                                </label>
                            </div>
                        </div>

                        {(formType === 'select' || formType === 'radio') && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Options (comma-separated)</label>
                                <Input value={formOptions} onChange={(e) => setFormOptions(e.target.value)} placeholder="e.g. Option A, Option B, Option C" />
                            </div>
                        )}

                        {formType === 'linear_scale' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Min / Max</label>
                                    <div className="flex gap-2">
                                        <Input type="number" value={formScaleMin} onChange={(e) => setFormScaleMin(Number(e.target.value))} className="w-20" />
                                        <span className="self-center text-gray-400">–</span>
                                        <Input type="number" value={formScaleMax} onChange={(e) => setFormScaleMax(Number(e.target.value))} className="w-20" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Labels</label>
                                    <div className="flex gap-2">
                                        <Input value={formScaleMinLabel} onChange={(e) => setFormScaleMinLabel(e.target.value)} placeholder="Min label" />
                                        <Input value={formScaleMaxLabel} onChange={(e) => setFormScaleMaxLabel(e.target.value)} placeholder="Max label" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )
            }

            {/* Questions List */}
            {
                loading ? (
                    <p className="text-sm text-gray-400 text-center py-8">Loading questions...</p>
                ) : questions.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-gray-400">
                            <p>No custom questions yet. Click "Add Question" to create one.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {questions.map((q) => (
                            <Card key={q.id} className={`${!q.is_active ? 'opacity-50' : ''}`}>
                                <CardContent className="p-4 flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{q.question_text}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-xs">{q.question_type}</Badge>
                                            {q.is_required && <Badge variant="outline" className="text-xs">Required</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => toggleActive(q)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title={q.is_active ? 'Deactivate' : 'Activate'}>
                                            {q.is_active ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                                        </button>
                                        <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit">
                                            <Edit2 className="h-4 w-4 text-blue-500" />
                                        </button>
                                        <button onClick={() => deleteQuestion(q.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            }
        </div >
    );
};

export default CustomQuestionsManager;
