'use client';

import { useMemo, useState } from 'react';

const blankMember = {
  fullName: '',
  relation: '',
  birthday: '',
  anniversary: '',
  familyBranch: 'Immediate Family',
  generationLevel: '1',
  notes: '',
};

type Member = typeof blankMember & { id: number };

export default function FamilyBirthdaysFormApp() {
  const [form, setForm] = useState(blankMember);
  const [members, setMembers] = useState<Member[]>([
    { id: 1, fullName: 'Grandpa Bill', relation: 'Grandfather', birthday: '2025-02-10', anniversary: '', familyBranch: 'Paternal', generationLevel: '3', notes: 'Top-left branch' },
    { id: 2, fullName: 'Grandma Sue', relation: 'Grandmother', birthday: '2025-07-04', anniversary: '2025-06-12', familyBranch: 'Maternal', generationLevel: '3', notes: 'Top-right branch' },
  ]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(blankMember);
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.relation.trim() || !form.birthday) return;
    if (editingId) {
      setMembers((prev) => prev.map((m) => (m.id === editingId ? { ...m, ...form, id: editingId } : m)));
    } else {
      setMembers((prev) => [...prev, { ...form, id: Date.now() }]);
    }
    resetForm();
  }

  function handleEdit(member: Member) {
    setForm({ fullName: member.fullName, relation: member.relation, birthday: member.birthday, anniversary: member.anniversary, familyBranch: member.familyBranch, generationLevel: member.generationLevel, notes: member.notes });
    setEditingId(member.id);
  }

  function handleDelete(id: number) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (editingId === id) resetForm();
  }

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => [m.fullName, m.relation, m.familyBranch, m.notes].join(' ').toLowerCase().includes(q));
  }, [members, search]);

  const grouped = useMemo(() => [...filteredMembers].sort((a, b) => Number(a.generationLevel) - Number(b.generationLevel)), [filteredMembers]);

  const formatDate = (value: string) => {
    if (!value) return '—';
    const d = new Date(value + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_1fr]">
        {/* Form */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Family Dates Entry Form</h1>
            <p className="mt-2 text-sm text-slate-600">Add family members and their birthdays or anniversaries.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="e.g. Lucy Johnson" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Relation</label>
              <input name="relation" value={form.relation} onChange={handleChange} placeholder="e.g. Daughter, Grandpa, Cousin" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Birthday</label>
                <input type="date" name="birthday" value={form.birthday} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Anniversary</label>
                <input type="date" name="anniversary" value={form.anniversary} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Family branch</label>
                <select name="familyBranch" value={form.familyBranch} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500">
                  <option>Immediate Family</option>
                  <option>Paternal</option>
                  <option>Maternal</option>
                  <option>Extended Family</option>
                  <option>In-Laws</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Generation level</label>
                <select name="generationLevel" value={form.generationLevel} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500">
                  <option value="1">1 - Children</option>
                  <option value="2">2 - Parents</option>
                  <option value="3">3 - Grandparents</option>
                  <option value="4">4 - Extended</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes / placement hint</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="e.g. Left branch, special dates sign, center couple" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500" />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
                {editingId ? 'Update person' : 'Add person'}
              </button>
              <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Clear form
              </button>
            </div>
          </form>
        </div>

        {/* Members list */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Saved family members</h2>
                <p className="mt-1 text-sm text-slate-600">Preview the people you've added.</p>
              </div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search family members" className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none md:w-72" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {grouped.map((member) => (
              <div key={member.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{member.fullName}</div>
                    <div className="text-sm text-slate-500">{member.relation}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Level {member.generationLevel}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <div><span className="font-medium">Birthday:</span> {formatDate(member.birthday)}</div>
                  <div><span className="font-medium">Anniversary:</span> {formatDate(member.anniversary)}</div>
                  <div><span className="font-medium">Branch:</span> {member.familyBranch}</div>
                  <div><span className="font-medium">Notes:</span> {member.notes || '—'}</div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => handleEdit(member)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Edit</button>
                  <button onClick={() => handleDelete(member.id)} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Suggested fields for a production app</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {['Profile photo upload', 'Tree position / branch coordinates', 'Multiple anniversaries or special dates', 'Reminder toggle for upcoming dates', 'Family side filter', 'Export to printable poster'].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
