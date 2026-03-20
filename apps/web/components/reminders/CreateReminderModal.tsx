'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Phone, CheckSquare, Mail, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAllCategories } from '../../hooks/useAllCategories';
import toast from 'react-hot-toast';

const schema = z.object({
  type:     z.enum(['call', 'task', 'email', 'location', 'event']),
  title:    z.string().min(1, 'Title is required').max(255),
  notes:    z.string().max(5000).optional(),
  fire_at:  z.string().min(1, 'Date & time is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: 'task',     label: 'Task',     icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'call',     label: 'Call',     icon: <Phone       className="w-4 h-4" /> },
  { value: 'email',    label: 'Email',    icon: <Mail        className="w-4 h-4" /> },
  { value: 'location', label: 'Location', icon: <MapPin      className="w-4 h-4" /> },
  { value: 'event',    label: 'Event',    icon: <Calendar    className="w-4 h-4" /> },
] as const;

interface CreateReminderModalProps {
  onClose: () => void;
}

export function CreateReminderModal({ onClose }: CreateReminderModalProps) {
  const qc = useQueryClient();
  const allCategories = useAllCategories();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:     'task',
      priority: 'medium',
      fire_at:  new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    },
  });

  const selectedType = watch('type');
  const selectedCategory = watch('category');

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.reminders.create({
        ...data,
        fire_at: new Date(data.fire_at).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Reminder created!');
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to create reminder';
      toast.error(msg);
    },
  });

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          className="bg-white rounded-xl w-full max-w-lg shadow-dark"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-display font-bold text-lg text-[var(--color-text)]">
              New Reminder
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-4 space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Type
              </label>
              <div className="grid grid-cols-5 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('type', opt.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs font-medium transition-all ${
                      selectedType === opt.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-gray-300'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                {...register('title')}
                placeholder="What do you need to remember?"
                className="input"
                autoFocus
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <label htmlFor="fire_at" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                id="fire_at"
                type="datetime-local"
                {...register('fire_at')}
                className="input"
              />
              {errors.fire_at && (
                <p className="text-red-500 text-xs mt-1">{errors.fire_at.message}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Priority
              </label>
              <select id="priority" {...register('priority')} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setValue('category', selectedCategory === cat.slug ? undefined : cat.slug)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedCategory === cat.slug
                        ? 'text-white border-transparent'
                        : 'bg-white border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-gray-300'
                    }`}
                    style={selectedCategory === cat.slug ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                {...register('notes')}
                placeholder="Optional notes..."
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary flex-1"
              >
                {mutation.isPending ? 'Saving...' : 'Create Reminder'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
