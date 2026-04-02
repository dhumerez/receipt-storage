import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamMembers, inviteUser, changeRole, deactivateUser } from '../../api/users.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { SETTINGS } from '../../constants/strings/settings.ts';

type InviteRole = 'collaborator' | 'viewer';

const ROLE_LABELS: Record<string, string> = {
  owner: SETTINGS.roleOwner,
  collaborator: SETTINGS.roleCollaborator,
  viewer: SETTINGS.roleViewer,
  client: SETTINGS.roleClient,
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-blue-100 text-blue-800',
  collaborator: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-600',
  client: 'bg-purple-100 text-purple-800',
};

const ROLE_TIPS: Record<string, string> = {
  collaborator: SETTINGS.roleCollaboratorTip,
  viewer: SETTINGS.roleViewerTip,
};

export default function TeamManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('viewer');
  const [successMsg, setSuccessMsg] = useState('');

  const team = useQuery({ queryKey: ['team'], queryFn: getTeamMembers });

  const inviteMut = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setShowInvite(false);
      setFullName('');
      setEmail('');
      setRole('viewer');
      setSuccessMsg(SETTINGS.inviteSuccess);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const roleMut = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: string }) =>
      changeRole(id, newRole as 'owner' | 'collaborator' | 'viewer' | 'client'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const deactivateMut = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMut.mutate({ email: email.trim(), role, fullName: fullName.trim() });
  };

  const handleDeactivate = (id: string) => {
    if (window.confirm(SETTINGS.deactivateConfirm)) {
      deactivateMut.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{SETTINGS.teamDescription}</p>
        {!showInvite && (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium whitespace-nowrap ml-4"
          >
            {SETTINGS.inviteMember}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-md">
          {successMsg}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInviteSubmit} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-semibold text-gray-900">{SETTINGS.inviteTitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={SETTINGS.fieldFullName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <input
              type="email"
              required
              placeholder={SETTINGS.fieldEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="collaborator" title={SETTINGS.roleCollaboratorTip}>{SETTINGS.roleCollaborator}</option>
              <option value="viewer" title={SETTINGS.roleViewerTip}>{SETTINGS.roleViewer}</option>
            </select>
            <p className="text-xs text-gray-400 sm:col-span-3">{ROLE_TIPS[role]}</p>
          </div>
          {inviteMut.isError && (
            <p className="text-sm text-red-600">
              {(inviteMut.error as Error).message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={inviteMut.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {inviteMut.isPending ? SETTINGS.inviteSending : SETTINGS.inviteMember}
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              {SETTINGS.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Team list */}
      {team.isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">...</div>
      ) : team.isError ? (
        <div className="py-4 text-sm text-red-600">{(team.error as Error).message}</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {SETTINGS.thName}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  {SETTINGS.thEmail}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {SETTINGS.thRole}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {SETTINGS.thActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(team.data ?? []).map((member) => {
                const isSelf = member.id === user?.sub;
                return (
                  <tr key={member.id} className={`hover:bg-gray-50 ${!member.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {member.fullName}
                      {isSelf && <span className="ml-1 text-xs text-gray-400">{SETTINGS.you}</span>}
                      {!member.isActive && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                          {SETTINGS.statusInactive}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf || !member.isActive ? (
                        <span
                          title={ROLE_TIPS[member.role] ?? ''}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold cursor-help ${ROLE_BADGE[member.role] ?? ROLE_BADGE.viewer}`}
                        >
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => roleMut.mutate({ id: member.id, newRole: e.target.value })}
                          disabled={roleMut.isPending}
                          className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="owner">{SETTINGS.roleOwner}</option>
                          <option value="collaborator" title={SETTINGS.roleCollaboratorTip}>{SETTINGS.roleCollaborator}</option>
                          <option value="viewer" title={SETTINGS.roleViewerTip}>{SETTINGS.roleViewer}</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && member.isActive && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(member.id)}
                          disabled={deactivateMut.isPending}
                          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {SETTINGS.deactivate}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
