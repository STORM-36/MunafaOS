import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { logAudit } from '../../../shared/utils/auditLogger';
import { useToast } from '../../../shared/components/Toast/ToastContext';

const AuthContext = createContext({
  currentUser: null,
  userRole: null,
  workspaceId: null,
  loading: true,
  logout: async () => {}
});

export const AuthProvider = ({ children }) => {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef(null);

  const logout = async () => {
    try {
      if (currentUser?.uid) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          status: 'Offline',
          lastLogout: serverTimestamp()
        });

        await logAudit(
          currentUser.workspaceId,
          currentUser,
          'LOGGED_OUT',
          'User signed out manually'
        );
      }
    } catch (error) {
      console.error('Presence update failed on logout:', error);
    }

    await signOut(auth);
  };

  useEffect(() => {
    const handleTabClose = () => {
      const activeUserId = auth.currentUser?.uid || currentUser?.uid;
      if (!activeUserId) return;

      updateDoc(doc(db, 'users', activeUserId), {
        status: 'Offline',
        lastLogout: serverTimestamp()
      });
    };

    window.addEventListener('beforeunload', handleTabClose);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);

      const previousUserId = previousUserIdRef.current;
      if (previousUserId && (!user || user.uid !== previousUserId)) {
        try {
          await updateDoc(doc(db, 'users', previousUserId), {
            status: 'Offline',
            lastLogout: serverTimestamp()
          });
        } catch (presenceError) {
          console.error('Presence update failed while switching account:', presenceError);
        }
      }

      if (!user) {
        setUserRole(null);
        setWorkspaceId(null);
        previousUserIdRef.current = null;
        setLoading(false);
        return;
      }

      if (!user.emailVerified && user.providerData?.[0]?.providerId === 'password') {
        await signOut(auth);
        setCurrentUser(null);
        setUserRole(null);
        setWorkspaceId(null);
        previousUserIdRef.current = null;
        setLoading(false);
        return;
      }

      previousUserIdRef.current = user.uid;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          if (userData?.role === 'revoked') {
            toast.warning('Your access to this workspace has been revoked.');
            await signOut(auth);
            setUserRole(null);
            setWorkspaceId(null);
            return;
          }

          await updateDoc(userRef, {
            status: 'Online',
            lastLogin: serverTimestamp()
          });

          await logAudit(
            userData.workspaceId,
            { uid: user.uid, email: user.email, firstName: userData.firstName },
            'LOGGED_IN',
            'User signed into the system'
          );

          setUserRole(userData?.role || null);
          setWorkspaceId(userData?.workspaceId || null);
          setCurrentUser({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            ...userData
          });
        } else {
          const fallbackProfile = {
            email: user.email || '',
            role: 'owner',
            workspaceId: user.uid,
            status: 'Online',
            tokenBalance: 250,
            plan: 'free',
            tokenResetAt: null,
            lastLogin: serverTimestamp(),
            createdAt: serverTimestamp()
          };

          await setDoc(userRef, fallbackProfile);

          await logAudit(
            fallbackProfile.workspaceId,
            { uid: user.uid, email: user.email, firstName: fallbackProfile.firstName },
            'LOGGED_IN',
            'User signed into the system'
          );

          setUserRole(fallbackProfile.role);
          setWorkspaceId(fallbackProfile.workspaceId);
          setCurrentUser({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            ...fallbackProfile
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserRole(null);
        setWorkspaceId(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, workspaceId, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
