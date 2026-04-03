import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompany, updateCompany, createOwner } from '../../api/admin.ts';
import type { UpdateCompanyInput, CreateOwnerInput } from '../../api/admin.ts';
import { ADMIN } from '../../constants/strings/admin.ts';

export default function AdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['admin-company', id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateCompanyInput) => updateCompany(id!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setEditOpen(false);
      setConfirmToggle(false);
    },
  });

  const ownerMutation = useMutation({
    mutationFn: (input: CreateOwnerInput) => createOwner(id!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company', id] });
      setOwnerModalOpen(false);
    },
  });

  if (isLoading) {
    return <div className="p-8 text-gray-500">{ADMIN.loading}</div>;
  }

  if (error || !company) {
    return (
      <div className="p-8">
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {ADMIN.errorLoading}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Back link */}
      <Link to="/admin" className="inline-flex items-center text-sm text-blue-600 hover:underline mb-6">
        &#8592; {ADMIN.back}
      </Link>

      {/* Company Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              company.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {company.isActive ? ADMIN.active : ADMIN.inactive}
            </span>
            <button
              onClick={() => setEditOpen(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              {ADMIN.editCompany}
            </button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">{ADMIN.currencyCode}</dt>
            <dd className="font-medium text-gray-900">{company.currencyCode}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{ADMIN.thCreated}</dt>
            <dd className="font-medium text-gray-900">{new Date(company.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {/* Owner Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{ADMIN.ownerSection}</h2>
        {company.owner ? (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">{ADMIN.email}</dt>
              <dd className="font-medium text-gray-900">{company.owner.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{ADMIN.fullName}</dt>
              <dd className="font-medium text-gray-900">{company.owner.fullName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{ADMIN.role}</dt>
              <dd>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {company.owner.role}
                </span>
              </dd>
            </div>
          </dl>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">{ADMIN.noOwner}</p>
            <button
              onClick={() => setOwnerModalOpen(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              {ADMIN.createOwner}
            </button>
          </div>
        )}
      </div>

      {/* Activate / Deactivate */}
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={() => setConfirmToggle(true)}
          className={`px-4 py-2 text-sm rounded-md font-medium ${
            company.isActive
              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
          }`}
        >
          {company.isActive ? ADMIN.deactivate : ADMIN.activate}
        </button>
      </div>

      {/* Edit Company Modal */}
      {editOpen && (
        <EditCompanyModal
          name={company.name}
          currencyCode={company.currencyCode}
          onClose={() => { setEditOpen(false); updateMutation.reset(); }}
          onSubmit={(data) => updateMutation.mutate(data)}
          isSubmitting={updateMutation.isPending}
          error={updateMutation.error?.message}
        />
      )}

      {/* Create Owner Modal */}
      {ownerModalOpen && (
        <CreateOwnerModal
          onClose={() => { setOwnerModalOpen(false); ownerMutation.reset(); }}
          onSubmit={(data) => ownerMutation.mutate(data)}
          isSubmitting={ownerMutation.isPending}
          error={ownerMutation.error?.message}
        />
      )}

      {/* Confirm Toggle Modal */}
      {confirmToggle && (
        <ConfirmModal
          message={company.isActive ? ADMIN.confirmDeactivate : ADMIN.confirmActivate}
          onConfirm={() => updateMutation.mutate({ isActive: !company.isActive })}
          onCancel={() => { setConfirmToggle(false); updateMutation.reset(); }}
          isSubmitting={updateMutation.isPending}
          confirmLabel={company.isActive ? ADMIN.deactivate : ADMIN.activate}
          danger={company.isActive}
        />
      )}
    </div>
  );
}

/* ── Edit Company Modal ── */

interface EditCompanyModalProps {
  name: string;
  currencyCode: string;
  onClose: () => void;
  onSubmit: (data: UpdateCompanyInput) => void;
  isSubmitting: boolean;
  error?: string;
}

function EditCompanyModal({ name: initialName, currencyCode: initialCurrency, onClose, onSubmit, isSubmitting, error }: EditCompanyModalProps) {
  const [name, setName] = useState(initialName);
  const [currencyCode, setCurrencyCode] = useState(initialCurrency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), currencyCode: currencyCode.trim().toUpperCase() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{ADMIN.editCompany}</h2>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ADMIN.companyName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ADMIN.currencyCode}</label>
            <input
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              required
              maxLength={3}
              minLength={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium">
              {ADMIN.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
              {isSubmitting ? ADMIN.loading : ADMIN.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Create Owner Modal ── */

interface CreateOwnerModalProps {
  onClose: () => void;
  onSubmit: (data: CreateOwnerInput) => void;
  isSubmitting: boolean;
  error?: string;
}

function CreateOwnerModal({ onClose, onSubmit, isSubmitting, error }: CreateOwnerModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const displayError = error === 'El correo ya está en uso' ? ADMIN.emailInUse : error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email: email.trim(), fullName: fullName.trim(), password });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{ADMIN.createOwner}</h2>
        {displayError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{displayError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ADMIN.fullName}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ADMIN.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ADMIN.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">{ADMIN.passwordHint}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium">
              {ADMIN.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
              {isSubmitting ? ADMIN.loading : ADMIN.createOwner}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Confirm Modal ── */

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  confirmLabel: string;
  danger?: boolean;
}

function ConfirmModal({ message, onConfirm, onCancel, isSubmitting, confirmLabel, danger }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 mx-4">
        <p className="text-sm text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium">
            {ADMIN.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm rounded-md font-medium disabled:opacity-50 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSubmitting ? ADMIN.loading : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
