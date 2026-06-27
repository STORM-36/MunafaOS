import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { logAudit } from '../../../shared/utils/auditLogger';
import { createNotification } from '../../../shared/utils/notificationService';
import ConfirmModal from "../../../components/ConfirmModal";

const TeamManagement = () => {
  const { currentUser, workspaceId, userRole } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Operator'
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    subtitle: "",
    onConfirm: null
  });

  const effectiveWorkspaceId = workspaceId || currentUser?.workspaceId || null;

  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setTeamMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const usersQuery = query(
      collection(db, 'users'),
      where('workspaceId', '==', effectiveWorkspaceId)
    );

    const unsubscribe = onSnapshot(
      usersQuery,
      (usersSnapshot) => {
        const rows = usersSnapshot.docs
          .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
          .filter((user) => {
            const normalizedRole = String(user.role || '').toLowerCase();
            return normalizedRole === 'admin' || normalizedRole === 'operator';
          })
          .filter((user) => String(user.status || 'active').toLowerCase() !== 'disabled')
          .map((user) => ({
            id: user.id,
            uid: user.id,
            firstName: user.firstName || '',
            name:
              [user.firstName, user.lastName].filter(Boolean).join(' ') ||
              user.shopName ||
              user.displayName ||
              'Team Member',
            email: user.email || '-',
            role:
              String(user.role || 'Operator').toLowerCase() === 'admin'
                ? 'Admin'
                : 'Operator',
            status: String(user.status || 'Offline').toLowerCase() === 'online' ? 'Online' : 'Offline'
          }));

        setTeamMembers(rows);
        setIsLoading(false);
      },
      (error) => {
        console.error('Team realtime subscription failed:', error);
        setConfirmModal({
          isOpen: true,
          type: "error",
          title: "Failed to Load Team",
          subtitle: "Could not load team members. Please refresh the page.",
          onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveWorkspaceId]);

  const handleInputChange = (field) => (event) => {
    setFormData((previousFormData) => ({
      ...previousFormData,
      [field]: event.target.value
    }));
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim();

    if (!firstName || !lastName || !email || !formData.password) {
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Missing Fields",
        subtitle: "Please fill in all required fields before saving.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
      return;
    }

    if (!effectiveWorkspaceId) {
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Workspace Not Found",
        subtitle: "Could not find your workspace. Please try again.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
      return;
    }

    setIsSaving(true);
    try {
      const createdMember = await addDoc(collection(db, 'users'), {
        firstName,
        lastName,
        email,
        role: formData.role.toLowerCase(),
        status: 'Offline',
        workspaceId: effectiveWorkspaceId,
        createdBy: currentUser?.uid || '',
        createdAt: new Date()
      });

      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            'CREATED_EMPLOYEE',
            `Created employee: ${firstName} ${lastName} (${email}) [${createdMember.id}]`
          );
        } catch (err) {
          console.error(err);
        }
      }

        await createNotification(
          workspaceId,
          'member_joined',
          'New Team Member Added',
          `${firstName} ${lastName} joined as ${formData.role}`,
          createdMember.id
        );

      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Operator'
      });
      setIsAddingMode(false);
      setConfirmModal({
        isOpen: true,
        type: "success",
        title: "Employee Created",
        subtitle: "The employee account has been created successfully.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
    } catch (error) {
      console.error('Employee create failed:', error);
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Creation Failed",
        subtitle: "Failed to create employee account. Please try again.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeAccess = async (memberId) => {
    await new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        type: "confirm",
        title: "Revoke Access?",
        subtitle: "This team member will immediately lose access to the workspace.",
        onConfirm: () => {
          setConfirmModal(m => ({ ...m, isOpen: false }));
          resolve(true);
        }
      });
    });

    try {
      await updateDoc(doc(db, 'users', memberId), {
        role: 'revoked',
        status: 'disabled'
      });

      if (currentUser) {
        try {
          await logAudit(
            currentUser.workspaceId,
            currentUser,
            'REVOKED_EMPLOYEE',
            `Revoked employee access: ${memberId}`
          );
        } catch (err) {
          console.error(err);
        }
      }

      setTeamMembers((previousMembers) => previousMembers.filter((member) => member.id !== memberId));
    } catch (error) {
      console.error('Revoke failed:', error);
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Revoke Failed",
        subtitle: "Failed to revoke access. Please try again.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
    }
  };

  const handleOpenAudit = async (employee) => {
    setSelectedEmployee(employee);
    setIsAuditModalOpen(true);
    setIsLoadingLogs(true);

    try {
      const employeeAuthUid = employee?.uid || employee?.id;

      const logsQuery = query(
        collection(db, 'audit_logs'),
        where('workspaceId', '==', currentUser.workspaceId),
        where('userId', '==', employeeAuthUid),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const logsSnapshot = await getDocs(logsQuery);
      const rows = logsSnapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      }));

      setAuditLogs(rows);
    } catch (error) {
      console.error('CRITICAL: Audit Fetch Failed:', error);
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden px-4 md:px-8 box-border">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        subtitle={confirmModal.subtitle}
        confirmText={confirmModal.type === "confirm" ? "Yes, Revoke" : "OK"}
        cancelText={confirmModal.type === "confirm" ? "Cancel" : null}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team & Workspace Access</h1>
          <p className="text-slate-500 mt-1">Manage who has access to your store.</p>
          {currentUser?.shopName && <p className="text-xs text-slate-400 mt-1">{currentUser.shopName}</p>}
        </div>
        <button
          disabled={userRole !== 'owner'}
          onClick={() => setIsAddingMode((previousState) => !previousState)}
          className="w-full md:w-auto bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add New Employee
        </button>
      </div>

      {userRole !== 'owner' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
          Only workspace owners can add or revoke team members.
        </div>
      )}

      {isAddingMode && (
        <div className="w-full box-border bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Add Employee</h2>
          <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
              placeholder="First Name"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <input
              type="text"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
              placeholder="Last Name"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <input
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="Email"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <input
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Password"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <select
              value={formData.role}
              onChange={handleInputChange('role')}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="Admin">Admin</option>
              <option value="Operator">Operator</option>
            </select>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAddingMode(false)}
                className="bg-slate-100 text-slate-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {isSaving ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="w-full box-border bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Team Members</h2>
        <div className="overflow-x-auto w-full pb-2">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left p-3 border-b font-bold">Name</th>
                <th className="text-left p-3 border-b font-bold">Email</th>
                <th className="text-left p-3 border-b font-bold">Role</th>
                <th className="text-left p-3 border-b font-bold">Status</th>
                <th className="text-right p-3 border-b font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-4 text-slate-500 text-center">Loading team members...</td>
                </tr>
              )}
              {!isLoading && teamMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-slate-500 text-center">No team members found.</td>
                </tr>
              )}
              {teamMembers.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-700 font-medium">{employee.name}</td>
                  <td className="p-3 text-slate-600">{employee.email}</td>
                  <td className="p-3 text-slate-700">{employee.role}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        employee.status === 'Online'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {employee.status || 'Offline'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleOpenAudit(employee)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium mr-4"
                    >
                      Audit
                    </button>
                    <button
                      disabled={userRole !== 'owner'}
                      onClick={() => handleRevokeAccess(employee.id)}
                      className="bg-red-50 text-red-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Revoke Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                Audit Logs: {selectedEmployee?.firstName || selectedEmployee?.name || 'Employee'}
              </h3>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto mt-4 pr-1">
              {isLoadingLogs ? (
                <div className="py-8 text-center text-slate-500">Loading...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No activity found.</div>
              ) : (
                <ul className="space-y-3">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="border border-slate-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-slate-800">{log.action || '-'}</p>
                      <p className="text-sm text-slate-600 mt-1">{log.details || '-'}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {log.timestamp
                          ? log.timestamp.toDate().toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Just now'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
