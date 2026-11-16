import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { usePageMeta } from '../hooks/usePageMeta';
import { authFetch } from '../utils/api';
import '../styles/monitored-apps.css';

type MemberRole = 'admin' | 'dev' | 'staff';
type StoredRole = MemberRole | 'account';
type WorkspaceRole = 'owner' | MemberRole;
type RoleFilter = 'all' | MemberRole | 'pending';

interface TeamMember {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: StoredRole;
  isOwner?: boolean;
  isSelf?: boolean;
  phoneCode?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dateAdded: string;
  lastActive: string;
  avatarBg: string;
}

interface PendingInvite {
  id: string;
  name: string;
  email: string;
  role: StoredRole;
  invitedAt: string;
  avatarBg: string;
}

function normalizeRole(role: StoredRole): MemberRole {
  if (role === 'admin' || role === 'dev' || role === 'staff') return role;
  return 'staff';
}

const ROLE_OPTIONS: Array<{
  value: MemberRole;
  label: string;
  desc: string;
  dot: string;
  badgeBg: string;
  badgeColor: string;
}> = [
  {
    value: 'admin',
    label: 'Admin',
    desc: 'Full access to apps, team & settings',
    dot: '#059669',
    badgeBg: '#ecfdf5',
    badgeColor: '#065f46',
  },
  {
    value: 'dev',
    label: 'Dev',
    desc: 'Manage apps, integrations & API sync',
    dot: '#2563eb',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
  },
  {
    value: 'staff',
    label: 'Staff',
    desc: 'View & respond to app reviews',
    dot: '#64748b',
    badgeBg: '#f1f5f9',
    badgeColor: '#475569',
  },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function TeamPage() {
  usePageMeta('monitored-apps', 'Sentriqe - Team Members');
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [perPageDropdown, setPerPageDropdown] = useState<'top' | 'bottom' | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole>('owner');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const canManageTeam = workspaceRole === 'owner' || workspaceRole === 'admin';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<MemberRole>('staff');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!perPageDropdown) return;
    const handleClose = () => setPerPageDropdown(null);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [perPageDropdown]);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = window.setTimeout(() => setToastMsg(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMsg]);

  useEffect(() => {
    if (!roleMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRoleMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [roleMenuOpen]);

  const fetchTeam = async (isCancelled?: () => boolean) => {
    try {
      const resp = await authFetch('/api/team');
      const data = await resp.json().catch(() => ({}));
      if (isCancelled?.()) return;
      if (resp.ok) {
        if (Array.isArray(data.members)) setMembers(data.members);
        if (Array.isArray(data.pendingInvites)) setPendingInvites(data.pendingInvites);
        if (data.workspaceRole) setWorkspaceRole(data.workspaceRole);
      }
    } catch {
      // ignore load errors
    } finally {
      if (!isCancelled?.()) setLoadingMembers(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchTeam(() => !active);
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: members.length,
      admin: members.filter((m) => normalizeRole(m.role) === 'admin').length,
      dev: members.filter((m) => normalizeRole(m.role) === 'dev').length,
      staff: members.filter((m) => normalizeRole(m.role) === 'staff').length,
      pending: pendingInvites.length,
    }),
    [members, pendingInvites]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (roleFilter === 'pending') return [];
    return members.filter((m) => {
      const matchesRole = roleFilter === 'all' || normalizeRole(m.role) === roleFilter;
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [members, roleFilter, searchQuery]);

  const filteredPending = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pendingInvites.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }, [pendingInvites, searchQuery]);

  const activeListLength = roleFilter === 'pending' ? filteredPending.length : filtered.length;
  const totalPages = Math.max(1, Math.ceil(activeListLength / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const pageMembers = filtered.slice(startIdx, startIdx + itemsPerPage);
  const pagePending = filteredPending.slice(startIdx, startIdx + itemsPerPage);
  const startItem = activeListLength === 0 ? 0 : startIdx + 1;
  const endItem = Math.min(activeListLength, safePage * itemsPerPage);
  const infoText = `Showing ${startItem} - ${endItem} of ${activeListLength} results`;

  const maxVisible = 6;
  let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  const pageNumbers: number[] = [];
  for (let p = startPage; p <= endPage; p++) pageNumbers.push(p);

  const renderPaginationBar = (isBottom = false) => {
    const positionKey = isBottom ? 'bottom' : 'top';
    return (
      <div
        className="pagination-bar"
        style={
          isBottom
            ? {
                display: loadingMembers ? 'none' : 'flex',
                borderBottom: 'none',
                padding: '16px 4px 4px 4px',
                marginBottom: 0,
              }
            : { display: loadingMembers ? 'none' : 'flex' }
        }
      >
        <div className="pagination-info">{infoText}</div>
        <div className="pagination-pages">
          <button
            type="button"
            className="page-nav-btn"
            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            title="Previous Page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              className={`page-num-btn${p === safePage ? ' active' : ''}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className="page-nav-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            title="Next Page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div className="pagination-per-page">
          <span>Items per page</span>
          <div className={`per-page-select-wrap${perPageDropdown === positionKey ? ' open' : ''}`}>
            <button
              type="button"
              className="per-page-custom-btn"
              onClick={(e) => {
                e.stopPropagation();
                setPerPageDropdown((d) => (d === positionKey ? null : positionKey));
              }}
            >
              <span>{itemsPerPage}</span>
              <svg className="per-page-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div className="per-page-dropdown-menu">
              {[10, 20, 50].map((val) => (
                <div
                  key={val}
                  className={`per-page-option${itemsPerPage === val ? ' selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemsPerPage(val);
                    setCurrentPage(1);
                    setPerPageDropdown(null);
                  }}
                >
                  {val}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const allSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));

  const openAddModal = () => {
    setEditingMember(null);
    setFormEmail('');
    setFormRole('staff');
    setRoleMenuOpen(false);
    setInviteError('');
    setModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setFormEmail(member.email);
    setFormRole(normalizeRole(member.role));
    setRoleMenuOpen(false);
    setInviteError('');
    setModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = formEmail.trim();
    if (!trimmedEmail || sendingInvite) return;
    setInviteError('');

    if (editingMember) {
      setSendingInvite(true);
      try {
        const resp = await authFetch(`/api/team/${editingMember.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: formRole }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setInviteError(data.message || 'Failed to update team member.');
          return;
        }
        setMembers((prev) =>
          prev.map((m) => (m.id === editingMember.id ? { ...m, role: formRole } : m))
        );
        setToastMsg('Team member role updated.');
        setModalOpen(false);
      } catch {
        setInviteError('Network error while updating team member.');
      } finally {
        setSendingInvite(false);
      }
      return;
    }

    setSendingInvite(true);
    try {
      const resp = await authFetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          role: formRole,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setInviteError(data.message || 'Failed to send invitation email.');
        return;
      }

      await fetchTeam();
      setToastMsg(
        data.message || `Invitation sent to ${trimmedEmail}. They will appear once they accept.`
      );
      setModalOpen(false);
    } catch {
      setInviteError('Network error while sending invitation email.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (invite: PendingInvite) => {
    if (resendingId) return;
    setResendingId(invite.id);
    try {
      const resp = await authFetch(`/api/team/invites/${invite.id}/resend`, {
        method: 'POST',
      });
      const data = await resp.json().catch(() => ({}));
      setToastMsg(
        resp.ok
          ? data.message || `Invitation resent to ${invite.email}.`
          : data.message || 'Failed to resend invitation.'
      );
    } catch {
      setToastMsg('Network error while resending invitation.');
    } finally {
      setResendingId(null);
    }
  };

  const handleRevokeInvite = async (invite: PendingInvite) => {
    if (!window.confirm(`Revoke the pending invitation for ${invite.email}?`)) return;
    try {
      const resp = await authFetch(`/api/team/${invite.id}`, { method: 'DELETE' });
      if (!resp.ok) return;
      setPendingInvites((prev) => prev.filter((p) => p.id !== invite.id));
      setToastMsg(`Invitation for ${invite.email} revoked.`);
    } catch {
      // ignore revoke errors
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name} from the team?`)) return;
    try {
      const resp = await authFetch(`/api/team/${member.id}`, { method: 'DELETE' });
      if (!resp.ok) return;
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
      setToastMsg(`${member.name} removed from the team.`);
    } catch {
      // ignore delete errors
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((m) => {
        if (checked) next.add(m.id);
        else next.delete(m.id);
      });
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const renderAddMemberButton = () => (
    <button
      type="button"
      onClick={openAddModal}
      className="btn-action-solid"
      style={{
        height: 38,
        padding: '0 18px',
        borderRadius: 14,
        fontSize: 13.5,
        fontWeight: 700,
        gap: 7,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Add member</span>
    </button>
  );

  return (
    <>
      <Sidebar
        activePage="team"
        onOpenDevices={() => navigate('/settings')}
        onOpenSyncScheduler={() => navigate('/settings')}
        onOpenProfile={() => navigate('/settings')}
        onOpenTeams={() => navigate('/team')}
        onOpenHelpCentre={() => navigate('/settings')}
      />

      <main className="main-wrapper">
        <div className="canvas-container">
          <TopBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onAddApp={() => navigate('/monitored-apps')}
            onAlerts={() => navigate('/alerts')}
            onProfile={() => navigate('/settings')}
          />

          <div className="page-scroll-body">
            <div className="apps-table-card">
              {/* TOOLBAR */}
              <div className="catalog-toolbar">
                <div className="store-tabs">
                  {(
                    [
                      { key: 'all', label: 'All Members', count: counts.all },
                      { key: 'admin', label: 'Admin', count: counts.admin },
                      { key: 'dev', label: 'Dev', count: counts.dev },
                      { key: 'staff', label: 'Staff', count: counts.staff },
                      ...(canManageTeam
                        ? [{ key: 'pending', label: 'Pending', count: counts.pending } as const]
                        : []),
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      className={`store-tab${roleFilter === tab.key ? ' active' : ''}`}
                      onClick={() => {
                        setRoleFilter(tab.key);
                        setCurrentPage(1);
                      }}
                    >
                      <span>{tab.label}</span>
                      <span className="store-tab-count">{tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className="toolbar-right">
                  {canManageTeam ? (
                    renderAddMemberButton()
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: 'var(--bg-canvas, #f8fafc)',
                        border: '1px solid var(--border-soft, #e2e8f0)',
                      }}
                    >
                      {workspaceRole === 'dev' ? 'Dev Access' : 'Staff Access'}
                    </span>
                  )}
                </div>
              </div>

              {/* TOP PAGINATION & RESULTS BAR */}
              {renderPaginationBar(false)}

              {/* TABLE */}
              <div className="table-scroll-wrap">
                <table className="apps-table team-table">
                  <thead>
                    <tr>
                      <th>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <input
                            type="checkbox"
                            className="app-row-checkbox"
                            checked={allSelected}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            aria-label="Select all members"
                          />
                          <span>Member</span>
                        </div>
                      </th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>{roleFilter === 'pending' ? 'Invited' : 'Date Added'}</th>
                      <th>{roleFilter === 'pending' ? 'Status' : 'Last Active'}</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMembers ? (
                      <tr>
                        <td colSpan={6} className="loader-td">
                          <div className="loader-cell-wrap">
                            <div className="circular-spinner"></div>
                          </div>
                        </td>
                      </tr>
                    ) : roleFilter === 'pending' ? (
                        filteredPending.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              textAlign: 'center',
                              padding: 48,
                              color: 'var(--text-muted)',
                            }}
                          >
                            No pending invitations.
                          </td>
                        </tr>
                      ) : (
                        pagePending.map((invite) => {
                          const normalizedRole = normalizeRole(invite.role);
                          const roleMeta = ROLE_OPTIONS.find((r) => r.value === normalizedRole) || ROLE_OPTIONS[2];
                          return (
                            <tr key={invite.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                                  <span
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: '50%',
                                      background: invite.avatarBg,
                                      color: '#ffffff',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {getInitials(invite.name)}
                                  </span>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {invite.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {invite.email}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    background: roleMeta.badgeBg,
                                    color: roleMeta.badgeColor,
                                  }}
                                >
                                  {roleMeta.label}
                                </span>
                              </td>
                              <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {invite.invitedAt}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: 999,
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    background: '#fef3c7',
                                    color: '#92400e',
                                  }}
                                >
                                  Pending
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleResendInvite(invite)}
                                    disabled={resendingId === invite.id}
                                    style={{
                                      height: 30,
                                      padding: '0 12px',
                                      borderRadius: 999,
                                      border: '1px solid var(--border-soft, #cbd5e1)',
                                      background: 'var(--bg-card, #ffffff)',
                                      color: 'var(--text-dark, #0f172a)',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {resendingId === invite.id ? 'Sending...' : 'Resend'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvite(invite)}
                                    style={{
                                      height: 30,
                                      padding: '0 12px',
                                      borderRadius: 999,
                                      border: '1px solid #fecaca',
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Revoke
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: 48,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {members.length === 0 && canManageTeam ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                              <span>No team members yet. Click &quot;+ Add member&quot; to invite someone.</span>
                              {renderAddMemberButton()}
                            </div>
                          ) : (
                            'No team members match your filter.'
                          )}
                        </td>
                      </tr>
                    ) : (
                      pageMembers.map((member) => {
                        const isLightAvatar = member.avatarBg === '#f1f5f9';
                        const normalizedRole = normalizeRole(member.role);
                        const roleMeta = ROLE_OPTIONS.find((r) => r.value === normalizedRole) || ROLE_OPTIONS[2];
                        return (
                          <tr key={member.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  className="app-row-checkbox"
                                  checked={selectedIds.has(member.id)}
                                  onChange={(e) => toggleOne(member.id, e.target.checked)}
                                  aria-label={`Select ${member.name}`}
                                />
                                {member.avatarUrl ? (
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.name}
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      flexShrink: 0,
                                      border: '1px solid var(--border-soft, #e2e8f0)',
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: '50%',
                                      background: member.avatarBg,
                                      color: isLightAvatar ? '#475569' : '#ffffff',
                                      border: isLightAvatar ? '1px solid #e2e8f0' : 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {getInitials(member.name)}
                                  </span>
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {member.name}
                                    </span>
                                    {member.isSelf && (
                                      <span
                                        style={{
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          padding: '1px 7px',
                                          borderRadius: 999,
                                          background: '#e0f2fe',
                                          color: '#0369a1',
                                          flexShrink: 0,
                                        }}
                                      >
                                        You
                                      </span>
                                    )}
                                    {member.isOwner && (
                                      <span
                                        style={{
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          padding: '1px 7px',
                                          borderRadius: 999,
                                          background: '#fef3c7',
                                          color: '#92400e',
                                          flexShrink: 0,
                                        }}
                                      >
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {member.email}
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: 999,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  background: roleMeta.badgeBg,
                                  color: roleMeta.badgeColor,
                                }}
                              >
                                {roleMeta.label}
                              </span>
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {member.dateAdded}
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {member.lastActive}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {canManageTeam && !member.isOwner ? (
                                <div className="action-sq-group">
                                  <button
                                    className="btn-action-sq"
                                    onClick={() => openEditModal(member)}
                                    title="Edit Member"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 20h9"></path>
                                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                    </svg>
                                  </button>
                                  <button
                                    className="btn-action-sq danger"
                                    onClick={() => handleDeleteMember(member)}
                                    title="Delete Member"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      <line x1="10" y1="11" x2="10" y2="17"></line>
                                      <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM PAGINATION & RESULTS BAR */}
              {renderPaginationBar(true)}
            </div>
          </div>
        </div>
      </main>

      {/* Add / Edit Team Member Modal */}
      <div
        className={`modal-overlay${modalOpen ? ' active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
      >
        <div className="modal-card team-member-modal-card">
          <div className="team-modal-header">
            <div className="modal-title">
              {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSaveMember} className="team-modal-form" style={{ marginTop: 18 }}>
            <div className="team-modal-row">
              <label htmlFor="teamEmail" className="team-modal-label">
                Email address*
              </label>
              <input
                id="teamEmail"
                type="email"
                required
                disabled={Boolean(editingMember)}
                className="team-modal-pill-input"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>

            <div className="team-modal-row">
              <label id="teamRoleLabel" className="team-modal-label">
                Role*
              </label>
              <div className="team-modal-select-wrap" ref={roleDropdownRef}>
                {(() => {
                  const activeRole = ROLE_OPTIONS.find((r) => r.value === formRole) || ROLE_OPTIONS[2];
                  return (
                    <button
                      type="button"
                      aria-labelledby="teamRoleLabel"
                      aria-haspopup="listbox"
                      aria-expanded={roleMenuOpen}
                      className="team-modal-pill-input team-modal-select-btn"
                      onClick={() => setRoleMenuOpen((open) => !open)}
                    >
                      <span>{activeRole.label}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`team-modal-select-chevron${roleMenuOpen ? ' open' : ''}`}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  );
                })()}

                {roleMenuOpen && (
                  <div className="team-modal-select-menu" role="listbox" aria-labelledby="teamRoleLabel">
                    {ROLE_OPTIONS.map((opt) => {
                      const selected = formRole === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`team-modal-select-option${selected ? ' selected' : ''}`}
                          onClick={() => {
                            setFormRole(opt.value);
                            setRoleMenuOpen(false);
                          }}
                        >
                          <div>
                            <div className="team-modal-select-option-title">{opt.label}</div>
                            <div className="team-modal-select-option-desc">{opt.desc}</div>
                          </div>
                          {selected && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="team-modal-select-check"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {inviteError && (
              <div
                role="alert"
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 12,
                  padding: '9px 12px',
                }}
              >
                {inviteError}
              </div>
            )}

            <div className="team-modal-footer">
              <button
                type="button"
                className="team-modal-btn-cancel"
                onClick={() => setModalOpen(false)}
                disabled={sendingInvite}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-action-solid team-modal-btn-save"
                disabled={sendingInvite}
              >
                {editingMember ? 'Save changes' : sendingInvite ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`toast-message${toastMsg ? ' show' : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </>
  );
}
