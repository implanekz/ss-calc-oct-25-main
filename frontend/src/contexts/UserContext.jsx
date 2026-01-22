/**
 * UserContext - Global state management for user data
 * Handles: authentication, profile, partners, preferences
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getAuthToken } from '../config/supabase';
import { API_BASE_URL } from '../config/api';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partners, setPartners] = useState([]);
  const [userChildren, setUserChildren] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
  /**
   * Load all user data from API
   */
  const loadUserData = useCallback(async (userId) => {
    console.log("[UserContext] loadUserData called with userId:", userId);
    if (!userId) {
      console.warn("[UserContext] loadUserData: No userId provided!");
      return;
    }

    try {
      console.log("[UserContext] Getting auth token...");
      const token = await getAuthToken();
      if (!token) {
        console.error("[UserContext] No auth token available!");
        throw new Error("No auth token available");
      }
      console.log("[UserContext] Got auth token, fetching profile...");

      // Create a timeout signal to prevent indefinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds max

      let profileRes;
      try {
        console.log("[UserContext] Calling", `${API_BASE_URL}/api/profiles/me/full`);
        profileRes = await fetch(`${API_BASE_URL}/api/profiles/me/full`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        });
        console.log("[UserContext] Profile response status:", profileRes.status);
      } catch (e) {
        if (e.name === 'AbortError') {
          throw new Error("Connection timed out. The server took too long to respond.");
        }
        throw e;
      } finally {
        clearTimeout(timeoutId);
      }

      if (profileRes.status === 401) {
        // Token invalid/expired - force logout
        console.warn("Token expired, signing out...");
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        return;
      }

      if (!profileRes.ok) {
        // Try to read error message
        try {
          const errData = await profileRes.json();
          throw new Error(errData.detail || `Server error: ${profileRes.status}`);
        } catch (e) {
          throw new Error(`Server error: ${profileRes.status}`);
        }
      }

      const profileData = await profileRes.json();

      // Normalize keys for front-end (camelCase) while preserving originals
      const p = profileData.profile || {};
      const normalizedProfile = {
        ...p,
        firstName: p.firstName ?? p.first_name,
        lastName: p.lastName ?? p.last_name,
        dateOfBirth: p.dateOfBirth ?? p.date_of_birth,
        relationshipStatus: p.relationshipStatus ?? p.relationship_status,
      };
      setProfile(normalizedProfile);

      const partnerList = (profileData.partners || []).map((pt) => ({
        ...pt,
        firstName: pt.firstName ?? pt.first_name,
        lastName: pt.lastName ?? pt.last_name,
        dateOfBirth: pt.dateOfBirth ?? pt.date_of_birth,
      }));
      setPartners(partnerList);
      setUserChildren(profileData.children || []);
      setPreferences(profileData.preferences);

    } catch (err) {
      console.error('Error loading user data:', err);
      // We do NOT setError here if we can avoid it, because it might just be a temporary network blip.
      // But if it's critical, we usually set error. 
      // For now, let's set error so UI knows something failed.
      setError(err.message);
    }
  }, []);

  // Initialize auth listener
  useEffect(() => {
    let mounted = true;
    console.log("[UserContext] useEffect mounted");

    const initAuth = async () => {
      console.log("[UserContext] initAuth started");
      try {
        // Create a timeout promise - increased to 10 seconds
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ timeOut: true }), 10000); // 10 seconds timeout
        });

        const sessionPromise = supabase.auth.getSession();

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if (result.timeOut) {
          console.warn("[UserContext] Supabase getSession timed out! Will wait for auth state change.");
          // Don't set loading=false here - let the auth state change listener handle it
          // The onAuthStateChange will fire with INITIAL_SESSION event
          return;
        }

        const { data: { session }, error } = result;

        console.log("[UserContext] getSession result:", session ? "Session found" : "No session");
        if (error) throw error;

        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            console.log("[UserContext] Calling loadUserData form initAuth");
            await loadUserData(session.user.id);
            console.log("[UserContext] loadUserData completed");
          }
        }
      } catch (err) {
        console.error("[UserContext] Auth Init Error:", err);
        if (mounted) setError(err.message);
      } finally {
        console.log("[UserContext] initAuth finally block - setting loading to false");
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[UserContext] Auth State Change:", event, session?.user?.email);

      if (mounted) {
        // Update user state immediately
        setUser(session?.user ?? null);

        if (session?.user) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            // Reload profile data on sign in
            console.log("[UserContext] Calling loadUserData from onAuthStateChange");
            await loadUserData(session.user.id);
            console.log("[UserContext] loadUserData completed from onAuthStateChange, setting loading false");
            setLoading(false);
          }
        } else {
          setProfile(null);
          setPartners([]);
          setUserChildren([]);
          setPreferences(null);
          console.log("[UserContext] Signed out, setting loading false");
          setLoading(false);
        }
      }
    });

    return () => {
      console.log("[UserContext] useEffect cleanup");
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadUserData]);

  /**
   * Sign up new user
   */
  const signup = useCallback(async (userData) => {
    try {
      setError(null);
      // Normalize dateOfBirth to YYYY-MM-DD for FastAPI/Pydantic
      const dobRaw = userData.dateOfBirth;
      let dobIso = dobRaw;
      try {
        // Accept MM/DD/YYYY or YYYY-MM-DD
        const parsed = new Date(dobRaw);
        if (!isNaN(parsed.getTime())) {
          dobIso = parsed.toISOString().slice(0, 10);
        }
      } catch (_) { /* keep original if parsing fails */ }

      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: dobIso,
          relationshipStatus: userData.relationshipStatus
        })
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server is not responding correctly. Please ensure the API server is running at ' + API_BASE_URL);
      }

      const data = await response.json();
      if (!response.ok) {
        const detail = (data && (data.detail ?? data.error ?? data.message)) ?? 'Signup failed';
        const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
        throw new Error(msg);
      }

      // Establish a Supabase session so the UI knows the user is signed in
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });

      if (supabaseError) {
        throw new Error(supabaseError.message || 'Signup succeeded but automatic login failed');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Sign in user
   */
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = (data && (data.detail ?? data.error ?? data.message)) ?? 'Login failed';
        const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
        throw new Error(msg);
      }

      // Ensure the Supabase JS client has a session for downstream requests
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (supabaseError) {
        throw new Error(supabaseError.message || 'Login succeeded but session could not be established');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Sign out user
   */
  const logout = useCallback(async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setPartners([]);
      setUserChildren([]);
      setPreferences(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Mark onboarding as complete
   */
  const completeOnboarding = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${API_BASE_URL}/api/profiles/me/onboarding-complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to mark onboarding complete');

      await loadUserData(user.id);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user, loadUserData]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || 'Failed to update profile');

      // Normalize profile response
      const p = data.profile;
      const normalizedProfile = {
        ...p,
        firstName: p.firstName ?? p.first_name,
        lastName: p.lastName ?? p.last_name,
        dateOfBirth: p.dateOfBirth ?? p.date_of_birth,
        relationshipStatus: p.relationshipStatus ?? p.relationship_status,
      };
      setProfile(normalizedProfile);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Add partner
   */
  const addPartner = useCallback(async (partnerData) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${API_BASE_URL}/api/partners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(partnerData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add partner');

      setPartners([...partners, data.partner]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [partners]);

  /**
   * Update partner
   */
  const updatePartner = useCallback(async (partnerId, updates) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${API_BASE_URL}/api/partners/${partnerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || 'Failed to update partner');

      // Normalize partner response
      const pt = data.partner;
      const normalizedPartner = {
        ...pt,
        firstName: pt.firstName ?? pt.first_name,
        lastName: pt.lastName ?? pt.last_name,
        dateOfBirth: pt.dateOfBirth ?? pt.date_of_birth,
      };

      setPartners(partners.map(p => p.id === partnerId ? normalizedPartner : p));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [partners]);

  /**
   * Delete partner
   */
  const deletePartner = useCallback(async (partnerId) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/partners/${partnerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete partner');

      setPartners(partners.filter(p => p.id !== partnerId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [partners]);

  /**
   * Add child
   */
  const addChild = useCallback(async (childData) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/children`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(childData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add child');

      setUserChildren([...userChildren, data.child]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userChildren]);

  /**
   * Delete child
   */
  const deleteChild = useCallback(async (childId) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/children/${childId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete child');

      setUserChildren(userChildren.filter(c => c.id !== childId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userChildren]);

  /**
   * Update preferences (auto-save)
   */
  const updatePreferences = useCallback(async (updates) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || 'Failed to update preferences');

      setPreferences(data.preferences);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value = {
    // State
    user,
    profile,
    partners,
    children: userChildren,
    preferences,
    loading,
    error,

    // Auth methods
    signup,
    login,
    logout,

    // Profile methods
    completeOnboarding,
    updateProfile,

    // Partner methods
    addPartner,
    updatePartner,
    deletePartner,

    // Children methods
    addChild,
    deleteChild,

    // Preferences methods
    updatePreferences,

    // Data loading
    loadUserData
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Hook to use UserContext
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export default UserContext;
