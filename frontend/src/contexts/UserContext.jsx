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

  // Initialize auth listener
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserData(session.user.id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setProfile(null);
        setPartners([]);
        setUserChildren([]);
        setPreferences(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  /**
   * Load all user data from API
   */
  const loadUserData = useCallback(async (userId) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const profileRes = await fetch(`${API_BASE_URL}/api/profiles/me/full`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      if (profileRes.ok) {
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
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Sign up new user
   */
  const signup = useCallback(async (userData) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: userData.dateOfBirth,
          relationshipStatus: userData.relationshipStatus
        })
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server is not responding correctly. Please ensure the API server is running at ' + API_BASE_URL);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'Signup failed');

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
      if (!response.ok) throw new Error(data.detail || data.error || 'Login failed');

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
      if (!token) return;

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
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      setProfile(data.profile);
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
      if (!token) return;

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
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/partners/${partnerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update partner');

      setPartners(partners.map(p => p.id === partnerId ? data.partner : p));
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
      if (!response.ok) throw new Error(data.error || 'Failed to update preferences');

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
