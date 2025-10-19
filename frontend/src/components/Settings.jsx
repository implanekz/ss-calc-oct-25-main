import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useDevMode } from '../contexts/DevModeContext';
import { Button } from './ui';

const Settings = () => {
    const { profile: realProfile, partners: realPartners, updateProfile, updatePartner } = useUser();
    const { isDevMode, devProfile, devPartners, updateDevProfile, updateDevPartner } = useDevMode();
    
    // Use dev or real data based on mode
    const profile = isDevMode ? devProfile : realProfile;
    const partners = isDevMode ? devPartners : realPartners;
    
    // Form state
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [relationshipStatus, setRelationshipStatus] = useState('single');
    const [spouseDateOfBirth, setSpouseDateOfBirth] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Load current profile data
    useEffect(() => {
        if (profile) {
            setDateOfBirth(profile.date_of_birth || '');
            setRelationshipStatus(profile.relationship_status || 'single');
        }
        if (partners && partners.length > 0) {
            setSpouseDateOfBirth(partners[0].date_of_birth || '');
        }
    }, [profile, partners]);

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage('');
        
        try {
            // Update profile
            const profileUpdate = {
                date_of_birth: dateOfBirth,
                relationship_status: relationshipStatus
            };

            if (isDevMode) {
                updateDevProfile(profileUpdate);
            } else {
                await updateProfile(profileUpdate);
            }

            // Update partner if married/divorced/widowed
            if (['married', 'divorced', 'widowed'].includes(relationshipStatus) && spouseDateOfBirth) {
                const partnerUpdate = {
                    date_of_birth: spouseDateOfBirth
                };

                if (isDevMode) {
                    updateDevPartner(0, partnerUpdate);
                } else if (partners && partners.length > 0) {
                    await updatePartner(partners[0].id, partnerUpdate);
                }
            }

            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveMessage('Error saving settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const isMarried = ['married', 'divorced', 'widowed'].includes(relationshipStatus);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
                        <p className="text-gray-600">Manage your profile information</p>
                    </div>

                    {/* Dev Mode Indicator */}
                    {isDevMode && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-yellow-800">
                                    Dev Mode Active - Changes saved to browser only
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-6">
                        {/* Date of Birth */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Date of Birth
                            </label>
                            <input
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Relationship Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Relationship Status
                            </label>
                            <select
                                value={relationshipStatus}
                                onChange={(e) => setRelationshipStatus(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="single">Single</option>
                                <option value="married">Married</option>
                                <option value="divorced">Divorced</option>
                                <option value="widowed">Widowed</option>
                            </select>
                        </div>

                        {/* Spouse Date of Birth - Only show if married/divorced/widowed */}
                        {isMarried && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Spouse/Partner Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={spouseDateOfBirth}
                                    onChange={(e) => setSpouseDateOfBirth(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Save Message */}
                    {saveMessage && (
                        <div className={`mt-6 p-4 rounded-lg ${
                            saveMessage.includes('Error') 
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : 'bg-green-50 text-green-800 border border-green-200'
                        }`}>
                            <p className="text-sm font-medium">{saveMessage}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-8 flex justify-between items-center">
                        <button
                            onClick={() => window.history.back()}
                            className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            variant="primary"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">About These Settings</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Your date of birth determines your Full Retirement Age (FRA)</li>
                        <li>• Relationship status affects survivor benefit calculations</li>
                        <li>• Calculator settings (PIAs, filing ages, etc.) are saved automatically</li>
                        <li>• Changes here update your profile used across all calculators</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Settings;
