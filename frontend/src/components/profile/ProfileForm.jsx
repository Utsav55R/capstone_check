import React, { useRef, useState } from 'react';
import { User, GraduationCap, Briefcase, Camera, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import Avatar from './Avatar';
import { usePreferences } from '../../context/PreferencesContext';
import { imageFileToAvatarDataUrl } from '../../utils/image';

const INPUT_BASE =
  'w-full bg-[#FAF8F3] border rounded-xl px-3 py-2.5 text-sm text-[#1C4A57] font-medium placeholder:text-[#1C4A57]/35 focus:outline-none focus:ring-2 focus:ring-[#1C4A57] focus:border-transparent transition-shadow';

const toText = (value) => (value === null || value === undefined ? '' : String(value));

const initialState = (values = {}) => ({
  full_name: toText(values.full_name),
  age: toText(values.age),
  college_name: toText(values.college_name),
  course_and_branch: toText(values.course_and_branch),
  cgpa: toText(values.cgpa),
  ug_cgpa: toText(values.ug_cgpa),
  tenth_percentage: toText(values.tenth_percentage),
  twelfth_percentage: toText(values.twelfth_percentage),
  work_experience: toText(values.work_experience),
  avatar_url: values.avatar_url || null,
});

const inRange = (raw, min, max) => {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isFinite(n) && n >= min && n <= max;
};

function validate(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = 'form.errors.required';
  if (!form.college_name.trim()) errors.college_name = 'form.errors.required';
  if (!form.age.trim()) errors.age = 'form.errors.required';
  else if (!inRange(form.age, 14, 80) || !Number.isInteger(Number(form.age))) errors.age = 'form.errors.age';
  if (!form.cgpa.trim()) errors.cgpa = 'form.errors.required';
  else if (!inRange(form.cgpa, 0, 10)) errors.cgpa = 'form.errors.cgpa';
  if (form.ug_cgpa.trim() && !inRange(form.ug_cgpa, 0, 10)) errors.ug_cgpa = 'form.errors.cgpa';
  if (!form.tenth_percentage.trim()) errors.tenth_percentage = 'form.errors.required';
  else if (!inRange(form.tenth_percentage, 0, 100)) errors.tenth_percentage = 'form.errors.percentage';
  if (!form.twelfth_percentage.trim()) errors.twelfth_percentage = 'form.errors.required';
  else if (!inRange(form.twelfth_percentage, 0, 100)) errors.twelfth_percentage = 'form.errors.percentage';
  return errors;
}

const toPayload = (form) => ({
  full_name: form.full_name.trim(),
  age: parseInt(form.age, 10),
  college_name: form.college_name.trim(),
  course_and_branch: form.course_and_branch.trim() || null,
  cgpa: parseFloat(form.cgpa),
  ug_cgpa: form.ug_cgpa.trim() ? parseFloat(form.ug_cgpa) : null,
  tenth_percentage: parseFloat(form.tenth_percentage),
  twelfth_percentage: parseFloat(form.twelfth_percentage),
  work_experience: form.work_experience.trim() || null,
  avatar_url: form.avatar_url,
});

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3 pb-3 border-b border-[#1C4A57]/10">
        <div className="w-9 h-9 rounded-xl bg-[#CFE3E0] text-[#1C4A57] flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#1C4A57] tracking-tight">{title}</h3>
          {hint && <p className="text-xs text-[#1C4A57]/60 mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, required, error, hint, suffix, children }) {
  const { t } = usePreferences();
  return (
    <div>
      <label htmlFor={id} className="flex items-center justify-between text-xs font-bold text-[#1C4A57] mb-1.5">
        <span>
          {label} {required && <span className="text-[#D95D39]">*</span>}
        </span>
        {!required && <span className="text-[10px] font-semibold text-[#1C4A57]/50 uppercase tracking-wide">{t('form.optional')}</span>}
      </label>
      <div className="relative">
        {children}
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#1C4A57]/50 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-[11px] font-semibold text-[#D95D39] mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {t(error)}
        </p>
      ) : (
        hint && <p className="text-[11px] text-[#1C4A57]/55 mt-1">{hint}</p>
      )}
    </div>
  );
}

export default function ProfileForm({ initialValues, onSubmit, submitLabel, submittingLabel, onCancel }) {
  const { t } = usePreferences();
  const [form, setForm] = useState(() => initialState(initialValues));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const update = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const inputClass = (field) =>
    `${INPUT_BASE} ${errors[field] ? 'border-[#D95D39]' : 'border-[#1C4A57]/20'}`;

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError('');
    try {
      const dataUrl = await imageFileToAvatarDataUrl(file);
      setForm((prev) => ({ ...prev, avatar_url: dataUrl }));
    } catch (err) {
      const key = { unsupported: 'form.errors.photoType', too_large: 'form.errors.photoSize' }[err.message];
      setPhotoError(key || 'form.errors.photoRead');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError(t('form.errors.fixFields'));
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await onSubmit(toPayload(form));
    } catch (err) {
      setFormError(err.message || t('form.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {formError && (
        <div role="alert" className="bg-[#FDEAE5] text-[#D95D39] text-xs p-3 rounded-xl font-bold border border-[#D95D39]/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
        </div>
      )}

      {/* Personal details */}
      <Section icon={User} title={t('form.section.personal')} hint={t('form.section.personalHint')}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-[#FAF8F3] border border-[#1C4A57]/10">
          <Avatar src={form.avatar_url} name={form.full_name} size={72} className="ring-4 ring-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#1C4A57]">{t('form.photo')}</p>
            <p className="text-[11px] text-[#1C4A57]/60 mt-0.5">{t('form.photoHint')}</p>
            {photoError && <p className="text-[11px] font-semibold text-[#D95D39] mt-1">{t(photoError)}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handlePhotoSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-[#1C4A57]/20 hover:border-[#1C4A57] text-[#1C4A57] text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" /> {form.avatar_url ? t('form.changePhoto') : t('form.uploadPhoto')}
            </button>
            {form.avatar_url && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, avatar_url: null }))}
                className="text-[#D95D39] hover:bg-[#FDEAE5] text-xs font-bold px-2.5 py-2 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t('form.removePhoto')}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Field id="pf-name" label={t('form.fullName')} required error={errors.full_name}>
              <input id="pf-name" type="text" autoComplete="name" value={form.full_name} onChange={update('full_name')}
                placeholder={t('form.fullNamePlaceholder')} className={inputClass('full_name')} />
            </Field>
          </div>
          <Field id="pf-age" label={t('form.age')} required error={errors.age}>
            <input id="pf-age" type="number" inputMode="numeric" min="14" max="80" value={form.age} onChange={update('age')}
              placeholder="21" className={inputClass('age')} />
          </Field>
        </div>
      </Section>

      {/* Education */}
      <Section icon={GraduationCap} title={t('form.section.education')} hint={t('form.section.educationHint')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="pf-college" label={t('form.college')} required error={errors.college_name}>
            <input id="pf-college" type="text" autoComplete="organization" value={form.college_name} onChange={update('college_name')}
              placeholder={t('form.collegePlaceholder')} className={inputClass('college_name')} />
          </Field>
          <Field id="pf-course" label={t('form.course')} error={errors.course_and_branch}>
            <input id="pf-course" type="text" value={form.course_and_branch} onChange={update('course_and_branch')}
              placeholder={t('form.coursePlaceholder')} className={inputClass('course_and_branch')} />
          </Field>
          <Field id="pf-cgpa" label={t('form.cgpa')} required error={errors.cgpa} hint={t('form.cgpaHint')} suffix="/ 10">
            <input id="pf-cgpa" type="number" inputMode="decimal" step="0.01" min="0" max="10" value={form.cgpa} onChange={update('cgpa')}
              placeholder="8.50" className={`${inputClass('cgpa')} pr-12`} />
          </Field>
          <Field id="pf-ugcgpa" label={t('form.ugCgpa')} error={errors.ug_cgpa} hint={t('form.ugCgpaHint')} suffix="/ 10">
            <input id="pf-ugcgpa" type="number" inputMode="decimal" step="0.01" min="0" max="10" value={form.ug_cgpa} onChange={update('ug_cgpa')}
              placeholder="8.20" className={`${inputClass('ug_cgpa')} pr-12`} />
          </Field>
          <Field id="pf-tenth" label={t('form.tenth')} required error={errors.tenth_percentage} suffix="%">
            <input id="pf-tenth" type="number" inputMode="decimal" step="0.01" min="0" max="100" value={form.tenth_percentage} onChange={update('tenth_percentage')}
              placeholder="92.40" className={`${inputClass('tenth_percentage')} pr-9`} />
          </Field>
          <Field id="pf-twelfth" label={t('form.twelfth')} required error={errors.twelfth_percentage} suffix="%">
            <input id="pf-twelfth" type="number" inputMode="decimal" step="0.01" min="0" max="100" value={form.twelfth_percentage} onChange={update('twelfth_percentage')}
              placeholder="88.60" className={`${inputClass('twelfth_percentage')} pr-9`} />
          </Field>
        </div>
      </Section>

      {/* Work experience */}
      <Section icon={Briefcase} title={t('form.section.experience')} hint={t('form.section.experienceHint')}>
        <Field id="pf-exp" label={t('form.workExperience')} error={errors.work_experience} hint={t('form.workExperienceHint')}>
          <textarea id="pf-exp" rows={4} maxLength={4000} value={form.work_experience} onChange={update('work_experience')}
            placeholder={t('form.workExperiencePlaceholder')} className={`${inputClass('work_experience')} resize-y leading-relaxed`} />
        </Field>
      </Section>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 border-t border-[#1C4A57]/10">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#1C4A57] border border-[#1C4A57]/20 hover:bg-[#FAF8F3] transition-colors"
          >
            {t('form.cancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#1C4A57] hover:bg-[#143741] text-[#F1EEE3] shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
        >
          {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
