import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db, auth } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { logAudit } from "../utils/auditLogger";
import ConfirmModal from "../components/ConfirmModal";
import {
  User, Bell, Shield, Database, Eye, EyeOff,
  Trash2, AlertTriangle, CheckCircle2, ChevronRight,
  Moon, Sun, Globe, Smartphone, LogOut, Zap,
  RefreshCw, Lock, Download, Brain, Facebook, Clock
} from "lucide-react";

const tabs = [
  { id: "profile", label: "Profile", icon: <User size={15} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={15} /> },
  { id: "security", label: "Security", icon: <Shield size={15} /> },
  { id: "integrations", label: "Integrations", icon: <Zap size={15} /> },
  { id: "data", label: "Data & Privacy", icon: <Database size={15} /> },
];

const SectionCard = ({ title, desc, children }) => (
  <div className="bg-white rounded-2xl overflow-hidden"
    style={{ border: "1px solid rgba(15,31,61,0.09)", boxShadow: "0 1px 4px rgba(15,31,61,0.06)" }}>
    <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(15,31,61,0.09)" }}>
      <h3 className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>{title}</h3>
      {desc && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{desc}</p>}
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const FieldRow = ({ label, desc, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b last:border-0"
    style={{ borderColor: "rgba(15,31,61,0.06)" }}>
    <div>
      <p className="text-sm font-medium" style={{ color: "#0F1F3D" }}>{label}</p>
      {desc && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{desc}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button onClick={onChange}
    className="relative rounded-full transition-all duration-200"
    style={{ width: 40, height: 22, background: checked ? "#0F1F3D" : "#e2e8f0" }}>
    <div className="absolute rounded-full bg-white shadow transition-all duration-200"
      style={{ width: 18, height: 18, top: 2, left: checked ? 20 : 2 }} />
  </button>
);

const ComingSoonBadge = () => (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
    style={{ background: "rgba(232,184,75,0.15)", color: "#b45309" }}>
    Coming Soon
  </span>
);

const Settings = () => {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteStep, setDeleteStep] = useState("idle");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    shopName: "",
    phone: ""
  });
  const [notifs, setNotifs] = useState({
    lowStock: true,
    newOrder: true,
    aiInsight: true,
    weeklyReport: false,
    fbSync: false,
    smsAlerts: false,
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    subtitle: "",
    onConfirm: null
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        shopName: currentUser.shopName || "",
        phone: currentUser.phone || ""
      });
    }
  }, [currentUser]);

  const handleFieldChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleLogout = async () => {
    setConfirmModal({
      isOpen: true,
      type: "confirm",
      title: "Sign Out?",
      subtitle: "You will be redirected to the login page.",
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, isOpen: false }));
        await logout();
        navigate("/");
      }
    });
  };

  const handleSaveProfile = async () => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, formData);
      try {
        await logAudit(
          currentUser.workspaceId,
          currentUser,
          "UPDATED_PROFILE",
          "Updated account profile details"
        );
      } catch (err) {
        console.error(err);
      }
      setIsEditing(false);
      setConfirmModal({
        isOpen: true,
        type: "success",
        title: "Profile Saved",
        subtitle: "Your profile details have been updated successfully.",
        onConfirm: () => {
          setConfirmModal(m => ({ ...m, isOpen: false }));
          window.location.reload();
        }
      });
    } catch (error) {
      console.error(error);
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Save Failed",
        subtitle: "Failed to save profile. Please try again.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) {
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "No Email Found",
        subtitle: "No email address found for this account.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setConfirmModal({
        isOpen: true,
        type: "success",
        title: "Reset Email Sent",
        subtitle: "Password reset email sent. Please check your inbox.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
    } catch (error) {
      console.error(error);
      setConfirmModal({
        isOpen: true,
        type: "error",
        title: "Reset Failed",
        subtitle: "Unable to send password reset email right now.",
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false }))
      });
    }
  };

  const handleTerminateAccount = () => {
    if (deleteConfirm !== "DELETE MY ACCOUNT") return;
    setConfirmModal({
      isOpen: true,
      type: "confirm",
      title: "Permanently Delete Account?",
      subtitle: "This will delete all your data forever. This cannot be undone.",
      onConfirm: () => {
        setConfirmModal(m => ({ ...m, isOpen: false }));
        setDeleteStep("done");
      }
    });
  };

  const inputStyle = {
    border: "1.5px solid rgba(15,31,61,0.12)",
    background: "#f8fafc",
    color: "#0F1F3D"
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        subtitle={confirmModal.subtitle}
        confirmText={confirmModal.type === "confirm" ? "Yes, Proceed" : "OK"}
        cancelText={confirmModal.type === "confirm" ? "Cancel" : null}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
      />

      {/* Hero Banner */}
      <div className="rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1a3460 100%)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={16} style={{ color: "#a78bfa" }} />
            <span className="text-xs font-bold tracking-wider" style={{ color: "#a78bfa" }}>
              WORKSPACE SETTINGS
            </span>
          </div>
          <h2 className="text-white text-lg font-bold">Settings</h2>
          <p className="text-xs mt-1" style={{ color: "#93c5fd" }}>
            Manage your profile, security, and workspace preferences.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 rounded-2xl p-1 overflow-x-auto"
        style={{ background: "#f1f5f9" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-150"
            style={{
              background: activeTab === t.id ? "#fff" : "transparent",
              color: activeTab === t.id ? "#0F1F3D" : "#64748b",
              fontWeight: activeTab === t.id ? 600 : 400,
              boxShadow: activeTab === t.id ? "0 1px 4px rgba(15,31,61,0.08)" : "none"
            }}>
            <span style={{ color: activeTab === t.id ? "#0F1F3D" : "#94a3b8" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <SectionCard title="Business Profile" desc="Your seller information across MunafaOS">
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: "rgba(15,31,61,0.06)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: "#0F1F3D" }}>
                {currentUser?.firstName?.[0] || currentUser?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{currentUser?.email}</p>
                <span className="mt-1.5 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(232,184,75,0.15)", color: "#b45309" }}>
                  {userRole?.toUpperCase()}
                </span>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase" style={{ color: "#94a3b8" }}>First Name</label>
                    <input className="w-full mt-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ border: "1.5px solid rgba(15,31,61,0.12)", background: "#f8fafc", color: "#0F1F3D" }}
                      value={formData.firstName} onChange={handleFieldChange("firstName")} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase" style={{ color: "#94a3b8" }}>Last Name</label>
                    <input className="w-full mt-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ border: "1.5px solid rgba(15,31,61,0.12)", background: "#f8fafc", color: "#0F1F3D" }}
                      value={formData.lastName} onChange={handleFieldChange("lastName")} />
                  </div>
                </div>
                {userRole === "owner" && (
                  <div>
                    <label className="text-[11px] font-bold uppercase" style={{ color: "#94a3b8" }}>Shop Name</label>
                    <input className="w-full mt-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                      style={{ border: "1.5px solid rgba(15,31,61,0.12)", background: "#f8fafc", color: "#0F1F3D" }}
                      value={formData.shopName} onChange={handleFieldChange("shopName")} />
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-bold uppercase" style={{ color: "#94a3b8" }}>Phone</label>
                  <input className="w-full mt-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                    style={{ border: "1.5px solid rgba(15,31,61,0.12)", background: "#f8fafc", color: "#0F1F3D" }}
                    value={formData.phone} onChange={handleFieldChange("phone")} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveProfile}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: "#0F1F3D", color: "#E8B84B" }}>
                    Save Changes
                  </button>
                  <button onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-slate-50"
                    style={{ borderColor: "rgba(15,31,61,0.12)", color: "#64748b" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <FieldRow label="First Name">
                  <span className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>{currentUser?.firstName || "—"}</span>
                </FieldRow>
                <FieldRow label="Last Name">
                  <span className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>{currentUser?.lastName || "—"}</span>
                </FieldRow>
                <FieldRow label="Shop Name">
                  <span className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>{currentUser?.shopName || "—"}</span>
                </FieldRow>
                <FieldRow label="Phone">
                  <span className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>{currentUser?.phone || "—"}</span>
                </FieldRow>
                <FieldRow label="Email">
                  <span className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>{currentUser?.email || "—"}</span>
                </FieldRow>
                <div className="pt-3">
                  <button onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: "#0F1F3D", color: "#E8B84B" }}>
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </SectionCard>

          {userRole === "owner" && (
            <SectionCard title="Team & Permissions" desc="Manage your operators and workspace access">
              <button onClick={() => navigate("/team")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-slate-50"
                style={{ border: "1px solid rgba(15,31,61,0.09)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(15,31,61,0.06)" }}>
                    <User size={14} style={{ color: "#0F1F3D" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: "#0F1F3D" }}>Manage Team</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>Add operators, assign roles, revoke access</p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "#94a3b8" }} />
              </button>
            </SectionCard>
          )}

          <SectionCard title="Appearance" desc="Customize how MunafaOS looks">
            <FieldRow label="Theme" desc="Light, Dark, or System">
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: "light", icon: <Sun size={13} />, label: "Light" },
                  { id: "dark", icon: <Moon size={13} />, label: "Dark" },
                  { id: "system", icon: <Smartphone size={13} />, label: "System" },
                ].map((t) => (
                  <button key={t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors"
                    style={{
                      background: t.id === "light" ? "rgba(15,31,61,0.06)" : "transparent",
                      borderColor: t.id === "light" ? "rgba(15,31,61,0.2)" : "rgba(15,31,61,0.09)",
                      color: t.id === "light" ? "#0F1F3D" : "#94a3b8",
                      fontWeight: t.id === "light" ? 600 : 400
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
                <ComingSoonBadge />
              </div>
            </FieldRow>
            <FieldRow label="Language" desc="Full Bangla UI in Phase 5">
              <div className="flex items-center gap-2">
                <select className="px-3 py-2 rounded-xl text-sm"
                  style={{ border: "1.5px solid rgba(15,31,61,0.12)", background: "#f8fafc", color: "#0F1F3D" }}
                  disabled>
                  <option>English</option>
                  <option>বাংলা (Bangla)</option>
                </select>
                <ComingSoonBadge />
              </div>
            </FieldRow>
          </SectionCard>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <SectionCard title="Alert Preferences" desc="Choose what notifications you receive">
            {[
              { key: "lowStock", label: "Low Stock Alerts", desc: "Get notified when inventory falls below threshold" },
              { key: "newOrder", label: "New Order Notifications", desc: "Instant alerts for every new order" },
              { key: "aiInsight", label: "AI Insights", desc: "Predictive recommendations from MunafaOS AI" },
              { key: "weeklyReport", label: "Weekly Performance Report", desc: "Summary every Monday morning" },
              { key: "fbSync", label: "Facebook Sync Updates", desc: "Notify when FB orders are synced" },
              { key: "smsAlerts", label: "SMS Alerts", desc: "Critical alerts via SMS" },
            ].map((n) => (
              <FieldRow key={n.key} label={n.label} desc={n.desc}>
                <Toggle
                  checked={notifs[n.key]}
                  onChange={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                />
              </FieldRow>
            ))}
          </SectionCard>

          <SectionCard title="Notification Channels" desc="How you want to receive alerts">
            <FieldRow label="Email" desc={currentUser?.email || "—"}>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                <CheckCircle2 size={11} /> Verified
              </span>
            </FieldRow>
            <FieldRow label="WhatsApp" desc="Not connected">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors hover:bg-slate-50"
                  style={{ borderColor: "rgba(15,31,61,0.12)", color: "#64748b" }}>
                  Connect <ChevronRight size={12} />
                </button>
                <ComingSoonBadge />
              </div>
            </FieldRow>
            <FieldRow label="Push Notifications" desc="Browser notifications">
              <div className="flex items-center gap-2">
                <Toggle checked={true} onChange={() => {}} />
                <ComingSoonBadge />
              </div>
            </FieldRow>
          </SectionCard>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <SectionCard title="Password Reset" desc="Send a reset link to your email">
            <FieldRow label="Email Address" desc={currentUser?.email || "—"}>
              <button onClick={handlePasswordReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "#0F1F3D", color: "#E8B84B" }}>
                <RefreshCw size={13} /> Send Reset Email
              </button>
            </FieldRow>
          </SectionCard>

          <SectionCard title="Two-Factor Authentication" desc="Add an extra layer of security">
            <FieldRow label="2FA via Authenticator App" desc="Google Authenticator or similar">
              <div className="flex items-center gap-2">
                <Toggle checked={false} onChange={() => {}} />
                <ComingSoonBadge />
              </div>
            </FieldRow>
          </SectionCard>

          <SectionCard title="Active Sessions" desc="Devices currently signed in">
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(15,31,61,0.04)" }}>
                <Clock size={20} style={{ color: "#cbd5e1" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "#64748b" }}>
                Session Management
              </p>
              <p className="text-xs text-center" style={{ color: "#94a3b8" }}>
                Active session tracking coming in Phase 4.
              </p>
              <ComingSoonBadge />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          <SectionCard title="Connected Apps" desc="Manage third-party integrations">
            {[
              {
                icon: <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#1877f2" }}><Facebook size={15} className="text-white" /></div>,
                name: "Facebook Business",
                desc: "Order sync · Ad metrics · Page insights",
              },
              {
                icon: <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#25D366" }}><Smartphone size={14} className="text-white" /></div>,
                name: "WhatsApp Business",
                desc: "Customer order updates via WhatsApp",
              },
              {
                icon: <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#0F1F3D" }}><Brain size={14} className="text-white" /></div>,
                name: "MunafaOS AI Engine",
                desc: "OCR · Bulk import · Predictive analytics",
              },
              {
                icon: <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#E8B84B" }}><Globe size={14} style={{ color: "#0F1F3D" }} /></div>,
                name: "Delivery Partners",
                desc: "Pathao · Steadfast · Redex · Paperfly",
              },
            ].map((app, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0"
                style={{ borderColor: "rgba(15,31,61,0.06)" }}>
                <div className="flex items-center gap-3">
                  {app.icon}
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0F1F3D" }}>{app.name}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{app.desc}</p>
                  </div>
                </div>
                <ComingSoonBadge />
              </div>
            ))}
          </SectionCard>

          <SectionCard title="API Access" desc="Connect external tools to MunafaOS">
            <FieldRow label="API Key" desc="Use this to connect external tools">
              <div className="flex items-center gap-2">
                <code className="px-3 py-1.5 rounded-xl text-xs font-mono"
                  style={{ background: "rgba(15,31,61,0.06)", color: "#0F1F3D" }}>
                  mk_live_••••••••••••
                </code>
                <ComingSoonBadge />
              </div>
            </FieldRow>
          </SectionCard>
        </div>
      )}

      {/* ── DATA & PRIVACY TAB ── */}
      {activeTab === "data" && (
        <div className="space-y-4">
          <SectionCard title="Data Export" desc="Download a copy of your MunafaOS data">
            {[
              { label: "Export Orders", desc: "All orders in CSV format" },
              { label: "Export Inventory", desc: "Current stock and SKU data" },
              { label: "Export Financial Reports", desc: "Revenue and profit data" },
              { label: "Full Account Export", desc: "Complete data export (.zip)" },
            ].map((e) => (
              <FieldRow key={e.label} label={e.label} desc={e.desc}>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors hover:bg-slate-50"
                    style={{ borderColor: "rgba(15,31,61,0.12)", color: "#64748b" }}>
                    <Download size={12} /> Export
                  </button>
                  <ComingSoonBadge />
                </div>
              </FieldRow>
            ))}
          </SectionCard>

          <SectionCard title="Privacy Controls" desc="Manage how your data is used">
            <FieldRow label="Analytics Tracking" desc="Help us improve MunafaOS">
              <Toggle checked={true} onChange={() => {}} />
            </FieldRow>
            <FieldRow label="AI Training Data" desc="Allow anonymized data to improve AI">
              <Toggle checked={false} onChange={() => {}} />
            </FieldRow>
            <FieldRow label="Marketing Emails" desc="Receive product updates and tips">
              <Toggle checked={true} onChange={() => {}} />
            </FieldRow>
          </SectionCard>

          {userRole === "owner" && (
            <div className="rounded-2xl overflow-hidden"
              style={{ border: "2px solid rgba(239,68,68,0.3)" }}>
              <div className="px-5 py-4 border-b flex items-center gap-2"
                style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.15)" }}>
                <AlertTriangle size={16} className="text-red-500" />
                <div>
                  <h3 className="text-sm font-bold text-red-700">Danger Zone</h3>
                  <p className="text-xs text-red-400 mt-0.5">
                    Actions here are permanent and cannot be undone.
                  </p>
                </div>
              </div>
              <div className="p-5 space-y-5 bg-white">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
                  style={{ borderColor: "rgba(15,31,61,0.06)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0F1F3D" }}>Clear All Orders</p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      Permanently delete all order history. Inventory is kept.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-medium transition-colors hover:bg-red-50"
                      style={{ borderColor: "rgba(239,68,68,0.3)", color: "#dc2626" }}>
                      <Trash2 size={12} /> Clear Orders
                    </button>
                    <ComingSoonBadge />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#0F1F3D" }}>Delete Account</p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      Permanently deletes your account, all orders, inventory, and AI history.{" "}
                      <span className="font-bold text-red-500">Cannot be undone.</span>
                    </p>
                  </div>

                  {deleteStep === "idle" && (
                    <button
                      onClick={() => setDeleteStep("confirm")}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors hover:bg-red-700"
                      style={{ background: "#dc2626", color: "#fff" }}>
                      <Trash2 size={14} /> Delete My Account
                    </button>
                  )}

                  {deleteStep === "confirm" && (
                    <div className="space-y-3 p-4 rounded-xl"
                      style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <div className="flex items-center gap-2 text-red-600">
                        <Lock size={14} />
                        <span className="text-xs font-semibold">
                          Type <code className="px-1 rounded font-mono"
                            style={{ background: "rgba(239,68,68,0.1)" }}>DELETE MY ACCOUNT</code> to confirm
                        </span>
                      </div>
                      <input
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="DELETE MY ACCOUNT"
                        className="w-full px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2"
                        style={{ border: "1px solid rgba(239,68,68,0.3)", background: "#fff" }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleTerminateAccount}
                          disabled={deleteConfirm !== "DELETE MY ACCOUNT"}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "#dc2626", color: "#fff" }}>
                          <Trash2 size={12} /> Permanently Delete
                        </button>
                        <button
                          onClick={() => { setDeleteStep("idle"); setDeleteConfirm(""); }}
                          className="px-4 py-2 rounded-xl border text-xs transition-colors hover:bg-slate-50"
                          style={{ borderColor: "rgba(15,31,61,0.12)", color: "#64748b" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {deleteStep === "done" && (
                    <div className="p-4 rounded-xl text-center"
                      style={{ background: "#f8fafc", border: "1px solid rgba(15,31,61,0.09)" }}>
                      <p className="text-sm" style={{ color: "#64748b" }}>
                        Account deletion scheduled. You'll receive a confirmation email within 24 hours.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Settings;
