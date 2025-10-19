import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useDevMode } from '../contexts/DevModeContext';

/**
 * Custom hook for persisting calculator state
 * Handles both localStorage (Dev Mode) and database (logged in users)
 */
export const useCalculatorPersistence = (calculatorType = 'showMeTheMoney', initialState = {}) => {
    const { user, preferences, updatePreferences } = useUser();
    const { isDevMode } = useDevMode();
    
    const [state, setState] = useState(initialState);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load persisted state on mount
    useEffect(() => {
        const loadState = async () => {
            if (isDevMode) {
                // Load from localStorage in Dev Mode
                const storageKey = `calculator_${calculatorType}`;
                const savedState = localStorage.getItem(storageKey);
                if (savedState) {
                    try {
                        const parsed = JSON.parse(savedState);
                        setState(prev => ({ ...prev, ...parsed }));
                    } catch (error) {
                        console.error('Error loading from localStorage:', error);
                    }
                }
            } else if (user && preferences) {
                // Load from database for logged-in users
                const savedState = preferences[calculatorType];
                if (savedState) {
                    setState(prev => ({ ...prev, ...savedState }));
                }
            }
            setIsLoaded(true);
        };

        loadState();
    }, [calculatorType, isDevMode, user, preferences]);

    // Save state whenever it changes
    useEffect(() => {
        if (!isLoaded) return; // Don't save until initial load is complete

        const saveState = async () => {
            if (isDevMode) {
                // Save to localStorage in Dev Mode
                const storageKey = `calculator_${calculatorType}`;
                try {
                    localStorage.setItem(storageKey, JSON.stringify(state));
                } catch (error) {
                    console.error('Error saving to localStorage:', error);
                }
            } else if (user) {
                // Save to database for logged-in users
                try {
                    await updatePreferences({
                        [calculatorType]: state
                    });
                } catch (error) {
                    console.error('Error saving to database:', error);
                }
            }
        };

        // Debounce saves to avoid too many writes
        const timeoutId = setTimeout(saveState, 500);
        return () => clearTimeout(timeoutId);
    }, [state, calculatorType, isDevMode, user, isLoaded, updatePreferences]);

    // Clear all persisted state
    const clearState = async () => {
        setState(initialState);
        
        if (isDevMode) {
            const storageKey = `calculator_${calculatorType}`;
            localStorage.removeItem(storageKey);
        } else if (user) {
            try {
                await updatePreferences({
                    [calculatorType]: null
                });
            } catch (error) {
                console.error('Error clearing database state:', error);
            }
        }
    };

    return {
        state,
        setState,
        clearState,
        isLoaded
    };
};
