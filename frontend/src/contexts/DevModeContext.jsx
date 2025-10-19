/**
 * DevModeContext - Development mode for testing without Supabase
 * Allows testing onboarding flows, different scenarios, unlimited resets
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const DevModeContext = createContext(null);

// Test scenarios for quick testing
export const TEST_SCENARIOS = {
  single: {
    firstName: 'Primary',
    lastName: 'Filer',
    dateOfBirth: '1965-01-15',
    relationshipStatus: 'single',
    receivingBenefits: false,
    email: 'primary.filer@test.com'
  },
  married: {
    firstName: 'Primary',
    lastName: 'Filer',
    dateOfBirth: '1960-06-20',
    relationshipStatus: 'married',
    receivingBenefits: false,
    partnerDob: '1958-03-10',
    partnerReceivingBenefits: false,
    email: 'primary.filer@test.com'
  },
  divorced: {
    firstName: 'Primary',
    lastName: 'Filer',
    dateOfBirth: '1962-09-05',
    relationshipStatus: 'divorced',
    receivingBenefits: false,
    partnerDob: '1960-12-15',
    partnerReceivingBenefits: true,
    divorceDate: '2020-03-20',
    marriageLength: '15',
    email: 'primary.filer@test.com'
  },
  widowed: {
    firstName: 'Primary',
    lastName: 'Filer',
    dateOfBirth: '1958-11-30',
    relationshipStatus: 'widowed',
    receivingBenefits: true,
    partnerDob: '1955-07-22',
    dateOfDeath: '2022-05-10',
    email: 'primary.filer@test.com'
  }
};

export const DevModeProvider = ({ children }) => {
  const [isDevMode, setIsDevMode] = useState(() => {
    return localStorage.getItem('devMode') === 'true';
  });
  
  const [devUser, setDevUser] = useState(() => {
    const saved = localStorage.getItem('devUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [devProfile, setDevProfile] = useState(() => {
    const saved = localStorage.getItem('devProfile');
    return saved ? JSON.parse(saved) : null;
  });

  const [devPartners, setDevPartners] = useState(() => {
    const saved = localStorage.getItem('devPartners');
    return saved ? JSON.parse(saved) : [];
  });

  const [devChildren, setDevChildren] = useState(() => {
    const saved = localStorage.getItem('devChildren');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist dev mode state
  useEffect(() => {
    localStorage.setItem('devMode', isDevMode.toString());
  }, [isDevMode]);

  // Persist dev data
  useEffect(() => {
    if (isDevMode) {
      localStorage.setItem('devUser', JSON.stringify(devUser));
      localStorage.setItem('devProfile', JSON.stringify(devProfile));
      localStorage.setItem('devPartners', JSON.stringify(devPartners));
      localStorage.setItem('devChildren', JSON.stringify(devChildren));
    }
  }, [isDevMode, devUser, devProfile, devPartners, devChildren]);

  const toggleDevMode = () => {
    setIsDevMode(!isDevMode);
  };

  const devLogin = (email = 'test@test.com') => {
    const user = {
      id: 'dev-user-id',
      email: email,
      created_at: new Date().toISOString()
    };
    setDevUser(user);
    return user;
  };

  const devSignup = (userData) => {
    const user = {
      id: 'dev-user-id',
      email: userData.email,
      created_at: new Date().toISOString()
    };
    
    const profile = {
      id: 'dev-user-id',
      first_name: userData.firstName,
      last_name: userData.lastName,
      date_of_birth: userData.dateOfBirth,
      relationship_status: userData.relationshipStatus,
      onboarding_completed: false,
      created_at: new Date().toISOString()
    };

    setDevUser(user);
    setDevProfile(profile);
    return { user, profile };
  };

  const devLogout = () => {
    setDevUser(null);
  };

  const devUpdateProfile = (updates) => {
    setDevProfile(prev => ({ ...prev, ...updates }));
  };

  const devCompleteOnboarding = () => {
    setDevProfile(prev => ({
      ...prev,
      onboarding_completed: true
    }));
  };

  const devResetOnboarding = () => {
    setDevProfile(prev => ({
      ...prev,
      onboarding_completed: false
    }));
    setDevPartners([]);
    setDevChildren([]);
  };

  const devClearAll = () => {
    setDevUser(null);
    setDevProfile(null);
    setDevPartners([]);
    setDevChildren([]);
    localStorage.removeItem('devUser');
    localStorage.removeItem('devProfile');
    localStorage.removeItem('devPartners');
    localStorage.removeItem('devChildren');
  };

  const devAddPartner = (partnerData) => {
    const partner = {
      id: `dev-partner-${Date.now()}`,
      user_id: 'dev-user-id',
      ...partnerData,
      created_at: new Date().toISOString()
    };
    setDevPartners(prev => [...prev, partner]);
    return partner;
  };

  const devAddChild = (childData) => {
    const child = {
      id: `dev-child-${Date.now()}`,
      user_id: 'dev-user-id',
      ...childData,
      created_at: new Date().toISOString()
    };
    setDevChildren(prev => [...prev, child]);
    return child;
  };

  const loadTestScenario = (scenarioName) => {
    const scenario = TEST_SCENARIOS[scenarioName];
    if (!scenario) return;

    devClearAll();
    devSignup(scenario);
  };

  const value = {
    // State
    isDevMode,
    devUser,
    devProfile,
    devPartners,
    devChildren,

    // Controls
    toggleDevMode,
    devLogin,
    devSignup,
    devLogout,
    devUpdateProfile,
    devCompleteOnboarding,
    devResetOnboarding,
    devClearAll,
    devAddPartner,
    devAddChild,
    loadTestScenario,

    // Test scenarios
    testScenarios: TEST_SCENARIOS
  };

  return (
    <DevModeContext.Provider value={value}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode must be used within DevModeProvider');
  }
  return context;
};

export default DevModeContext;
