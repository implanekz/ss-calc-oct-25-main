import React, { useState, useEffect } from 'react';

const RetirementBudgetWorksheet = () => {
    const [viewMode, setViewMode] = useState('simple'); // 'simple' or 'detailed'
    const [currentAge] = useState(60); // TODO: Pull from user context
    const currentYear = new Date().getFullYear();
    const [year1] = useState(currentYear + 1); // Next year
    const [year2, setYear2] = useState(currentYear + 10);

    // Expense categories with all line items
    const [expenses, setExpenses] = useState({
        housing: {
            label: 'Housing Expenses',
            simple: 0,
            items: {
                mortgageRent: { label: 'Mortgage/Rent', amount: 0, startAge: 0, endAge: 100 },
                homeownersIns: { label: 'Homeowners Insurance', amount: 0, startAge: 0, endAge: 100 },
                propertyTaxes: { label: 'Property Taxes', amount: 0, startAge: 0, endAge: 100 },
                electric: { label: 'Electric Utility', amount: 0, startAge: 0, endAge: 100 },
                gas: { label: 'Gas Utility', amount: 0, startAge: 0, endAge: 100 },
                water: { label: 'Water Utility', amount: 0, startAge: 0, endAge: 100 },
                lawnCare: { label: 'Lawn Care', amount: 0, startAge: 0, endAge: 100 }
            }
        },
        living: {
            label: 'Living Expenses',
            simple: 0,
            items: {
                groceries: { label: 'Groceries', amount: 0, startAge: 0, endAge: 100 },
                clothing: { label: 'Clothing', amount: 0, startAge: 0, endAge: 100 },
                homePhone: { label: 'Home Phone', amount: 0, startAge: 0, endAge: 100 },
                cellPhones: { label: 'Cell Phones', amount: 0, startAge: 0, endAge: 100 },
                cableTvInternet: { label: 'Cable TV / Internet', amount: 0, startAge: 0, endAge: 100 },
                petsHousehold: { label: 'Other - Pets/Household', amount: 0, startAge: 0, endAge: 100 }
            }
        },
        auto: {
            label: 'Auto Expenses',
            simple: 0,
            items: {
                autoPayment1: { label: 'Auto Payment/Lease 1', amount: 0, startAge: 0, endAge: 100 },
                autoPayment2: { label: 'Auto Payment/Lease 2', amount: 0, startAge: 0, endAge: 100 },
                gasoline: { label: 'Gasoline', amount: 0, startAge: 0, endAge: 100 },
                autoInsurance: { label: 'Auto Insurance', amount: 0, startAge: 0, endAge: 100 },
                maintenanceRepair: { label: 'Maintenance/Repair/Tag', amount: 0, startAge: 0, endAge: 100 }
            }
        },
        loansCredit: {
            label: 'Loans/Credit Cards',
            simple: 0,
            items: {
                homeEquityLoan: { label: 'Home Equity Loan', amount: 0, startAge: 0, endAge: 100 },
                creditCardPayments: { label: 'Credit Card Payments', amount: 0, startAge: 0, endAge: 100 },
                otherLoanPayments: { label: 'Other Loan Payments', amount: 0, startAge: 0, endAge: 100 }
            }
        },
        medicalHealth: {
            label: 'Medical/Health',
            simple: 0,
            items: {
                prescriptionsMedicines: { label: 'Prescriptions/Medicines', amount: 0, startAge: 0, endAge: 100 },
                healthInsurance: { label: 'Health Insurance', amount: 0, startAge: 0, endAge: 100 },
                lifeInsurance: { label: 'Life Insurance', amount: 0, startAge: 0, endAge: 100 },
                disabilityInsurance: { label: 'Disability Insurance', amount: 0, startAge: 0, endAge: 100 },
                longTermCareIns: { label: 'Long Term Care Ins', amount: 0, startAge: 0, endAge: 100 },
                medSuppIns: { label: 'Med Supp Ins', amount: 0, startAge: 0, endAge: 100 },
                otherInsurance: { label: 'Other Insurance', amount: 0, startAge: 0, endAge: 100 }
            }
        },
        giftsDonations: {
            label: 'Gifts/Donations',
            simple: 0,
            items: {
                birthdayGifts: { label: 'Birthday Gifts', amount: 0, startAge: 0, endAge: 100 },
                holidayGifts: { label: 'Holiday Gifts', amount: 0, startAge: 0, endAge: 100 },
                churchDonations: { label: 'Church Donations', amount: 0, startAge: 0, endAge: 100 },
                otherGiftsDonations: { label: 'Other Gifts/Donations', amount: 0, startAge: 0, endAge: 100 }
            }
        },
        entertainment: {
            label: 'Entertainment/Travel',
            simple: 0,
            items: {
                diningMovies: { label: 'Dining out, movies etc.', amount: 0, startAge: 0, endAge: 100 },
                hobbiesMemberships: { label: 'Hobbies/Memberships', amount: 0, startAge: 0, endAge: 100 },
                vacationTravel: { label: 'Vacation/Travel', amount: 0, startAge: 0, endAge: 100 }
            }
        },
        miscellaneous: {
            label: 'Miscellaneous',
            simple: 0,
            items: {
                miscellaneousOther: { label: 'Miscellaneous Other', amount: 0, startAge: 0, endAge: 100 }
            }
        }
    });

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const calculateItemValue = (item, targetYear) => {
        const yearsFromNow = targetYear - currentYear;
        const targetAge = currentAge + yearsFromNow;
        
        // Check if expense is active at target age
        if (targetAge < item.startAge || targetAge > item.endAge) {
            return 0;
        }
        
        // Return monthly amount (convert to annual by multiplying by 12)
        return item.amount;
    };

    const calculateCategoryTotal = (categoryKey, targetYear) => {
        if (viewMode === 'simple') {
            return expenses[categoryKey].simple;
        }
        
        const category = expenses[categoryKey];
        return Object.values(category.items).reduce((sum, item) => {
            return sum + calculateItemValue(item, targetYear);
        }, 0);
    };

    const calculateGrandTotal = (targetYear) => {
        return Object.keys(expenses).reduce((sum, categoryKey) => {
            return sum + calculateCategoryTotal(categoryKey, targetYear);
        }, 0);
    };

    const updateSimpleValue = (categoryKey, value) => {
        setExpenses(prev => ({
            ...prev,
            [categoryKey]: {
                ...prev[categoryKey],
                simple: parseFloat(value) || 0
            }
        }));
    };

    const updateDetailedValue = (categoryKey, itemKey, field, value) => {
        setExpenses(prev => ({
            ...prev,
            [categoryKey]: {
                ...prev[categoryKey],
                items: {
                    ...prev[categoryKey].items,
                    [itemKey]: {
                        ...prev[categoryKey].items[itemKey],
                        [field]: field === 'amount' ? (parseFloat(value) || 0) : (parseInt(value) || 0)
                    }
                }
            }
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    const generateAgeOptions = (start = 0, end = 100) => {
        const options = [];
        for (let i = start; i <= end; i++) {
            options.push(<option key={i} value={i}>{i}</option>);
        }
        return options;
    };


    const generateYearOptions = () => {
        const options = [];
        for (let i = currentYear + 1; i <= currentYear + 50; i++) {
            options.push(<option key={i} value={i}>{i}</option>);
        }
        return options;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        💰 Retirement Budget Worksheet
                    </h1>
                    <p className="text-gray-600">
                        Plan your retirement expenses with simple estimates or detailed breakdowns
                    </p>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        {/* View Mode Toggle */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                View Mode
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('simple')}
                                    className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
                                        viewMode === 'simple'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    Simple
                                </button>
                                <button
                                    onClick={() => setViewMode('detailed')}
                                    className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors ${
                                        viewMode === 'detailed'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    Detailed
                                </button>
                            </div>
                        </div>

                        {/* Year Selections */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Year 1: {year1} (Age {currentAge + 1})
                            </label>
                            <input
                                type="text"
                                value={year1}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Year 2: {year2} (Age {currentAge + (year2 - currentYear)})
                            </label>
                            <select
                                value={year2}
                                onChange={(e) => setYear2(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {generateYearOptions()}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Expense Input Section */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {viewMode === 'simple' ? 'Simple Budget Entry' : 'Detailed Budget Entry'}
                    </h2>

                    {viewMode === 'simple' ? (
                        // Simple Mode
                        <div className="space-y-4">
                            {Object.entries(expenses).map(([categoryKey, category]) => (
                                <div key={categoryKey} className="grid grid-cols-2 gap-4 items-center">
                                    <label className="text-sm font-medium text-gray-700">
                                        {category.label}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={category.simple || ''}
                                            onChange={(e) => updateSimpleValue(categoryKey, e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Detailed Mode
                        <div className="space-y-6">
                            {Object.entries(expenses).map(([categoryKey, category]) => (
                                <div key={categoryKey} className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-white bg-green-700 px-3 py-2 rounded mb-3">
                                        {category.label}
                                    </h3>
                                    <div className="space-y-2">
                                        {/* Header Row */}
                                        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 pb-2 border-b">
                                            <div>Expense Item</div>
                                            <div>Start Age</div>
                                            <div>Monthly Amount</div>
                                            <div>End Age</div>
                                        </div>
                                        {/* Data Rows */}
                                        {Object.entries(category.items).map(([itemKey, item]) => (
                                            <div key={itemKey} className="grid grid-cols-4 gap-2 items-center">
                                                <div className="text-sm text-gray-700">{item.label}</div>
                                                <select
                                                    value={item.startAge}
                                                    onChange={(e) => updateDetailedValue(categoryKey, itemKey, 'startAge', e.target.value)}
                                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {generateAgeOptions(0, 100)}
                                                </select>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1 text-gray-500 text-xs">$</span>
                                                    <input
                                                        type="number"
                                                        value={item.amount || ''}
                                                        onChange={(e) => updateDetailedValue(categoryKey, itemKey, 'amount', e.target.value)}
                                                        className="w-full pl-5 pr-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <select
                                                    value={item.endAge}
                                                    onChange={(e) => updateDetailedValue(categoryKey, itemKey, 'endAge', e.target.value)}
                                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {generateAgeOptions(currentAge, 100)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Summary Section */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6" id="budget-summary">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Budget Summary
                        </h2>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <span>🖨️</span>
                            <span>Print/Export</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-green-700 text-white">
                                    <th className="border border-gray-300 px-4 py-2 text-left">EXPENSES</th>
                                    <th className="border border-gray-300 px-4 py-2 text-center" colSpan="2">{year1}</th>
                                    <th className="border border-gray-300 px-4 py-2 text-center" colSpan="2">{year2}</th>
                                </tr>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-4 py-2"></th>
                                    <th className="border border-gray-300 px-4 py-2 text-center">Mo</th>
                                    <th className="border border-gray-300 px-4 py-2 text-center">Annual</th>
                                    <th className="border border-gray-300 px-4 py-2 text-center">Mo</th>
                                    <th className="border border-gray-300 px-4 py-2 text-center">Annual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(expenses).map(([categoryKey, category]) => {
                                    const year1Total = calculateCategoryTotal(categoryKey, year1);
                                    const year2Total = calculateCategoryTotal(categoryKey, year2);
                                    
                                    return (
                                        <React.Fragment key={categoryKey}>
                                            <tr className="bg-green-700 text-white font-semibold">
                                                <td className="border border-gray-300 px-4 py-2" colSpan="5">
                                                    {category.label}
                                                </td>
                                            </tr>
                                            {viewMode === 'detailed' && Object.entries(category.items).map(([itemKey, item]) => {
                                                const year1Value = calculateItemValue(item, year1);
                                                const year2Value = calculateItemValue(item, year2);
                                                
                                                return (
                                                    <tr key={itemKey}>
                                                        <td className="border border-gray-300 px-4 py-2">{item.label}</td>
                                                        <td className="border border-gray-300 px-4 py-2 text-right">
                                                            {formatCurrency(year1Value)}
                                                        </td>
                                                        <td className="border border-gray-300 px-4 py-2 text-right">
                                                            {formatCurrency(year1Value * 12)}
                                                        </td>
                                                        <td className="border border-gray-300 px-4 py-2 text-right">
                                                            {formatCurrency(year2Value)}
                                                        </td>
                                                        <td className="border border-gray-300 px-4 py-2 text-right">
                                                            {formatCurrency(year2Value * 12)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="bg-gray-50 font-semibold">
                                                <td className="border border-gray-300 px-4 py-2">
                                                    {category.label} Total
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-right">
                                                    {formatCurrency(year1Total)}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-right">
                                                    {formatCurrency(year1Total * 12)}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-right">
                                                    {formatCurrency(year2Total)}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-right">
                                                    {formatCurrency(year2Total * 12)}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                                <tr className="bg-blue-100 font-bold text-lg">
                                    <td className="border border-gray-300 px-4 py-3">GRAND TOTAL</td>
                                    <td className="border border-gray-300 px-4 py-3 text-right">
                                        {formatCurrency(calculateGrandTotal(year1))}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-right">
                                        {formatCurrency(calculateGrandTotal(year1) * 12)}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-right">
                                        {formatCurrency(calculateGrandTotal(year2))}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-right">
                                        {formatCurrency(calculateGrandTotal(year2) * 12)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 How to Use This Tool:</h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                        <li><strong>Simple Mode:</strong> Enter total monthly estimates for each expense category</li>
                        <li><strong>Detailed Mode:</strong> Break down expenses by individual items with monthly amounts and start/end ages</li>
                        <li><strong>Age-Based Projections:</strong> Expenses automatically activate/deactivate based on start and end ages</li>
                        <li><strong>Monthly Input:</strong> Enter all amounts as monthly expenses - annual amounts are calculated automatically</li>
                        <li><strong>Future Planning:</strong> Compare expenses between next year and any future year</li>
                    </ul>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #budget-summary, #budget-summary * {
                        visibility: visible;
                    }
                    #budget-summary {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default RetirementBudgetWorksheet;
