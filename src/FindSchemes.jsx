import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SchemeCard from './components/SchemeCard';
import useLocalStorage from './hooks/useLocalStorage';

export default function FindSchemes() {
  // Load saved profile (if any)
  const [savedProfile] = useLocalStorage('userInfo', {});

  const emptyForm = {
    age: '',
    state: '',
    category: '',
    occupation: '',
    gender: '',
    income: ''
  };


  const navigate = useNavigate();
  // State declarations

  const [form, setForm] = useState(emptyForm);
  const [useSaved, setUseSaved] = useState(false);
  // Populate form when user opts to use saved profile
  useEffect(() => {
    if (useSaved && savedProfile) {
      setForm({
        age: savedProfile.age || '',
        state: savedProfile.state || '',
        category: savedProfile.category || '',
        occupation: savedProfile.occupation || '',
        gender: savedProfile.gender || ''
      });
    } else {
      setForm(emptyForm);
    }
  }, [useSaved, savedProfile]);
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form validation
  const requiredFieldsFilled = form.age && form.state && form.category && form.occupation && form.income;
  const ageValid = Number(form.age) >= 0 && Number(form.age) <= 120;
  const isFormValid = requiredFieldsFilled && ageValid;

  // Validation messages
  const validationMessage = !requiredFieldsFilled
    ? 'Please fill in all required fields (Age, State, Category, Occupation, Income).'
    : (!ageValid ? 'Age must be between 0 and 120.' : '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm(emptyForm);
    setUseSaved(false);
    setResults([]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('HandleSubmit called with form data:', form);
    setLoading(true);
    setError('');
    console.log('Starting fetch to /api/schemes/match');
    try {
      const response = await fetch('/api/schemes/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      console.log('Fetch response status:', response.status, 'ok?', response.ok);
      if (!response.ok) throw new Error('Failed to fetch matches');
      const data = await response.json();
      console.log('Raw response JSON:', data);
      // API returns an object with a 'schemes' array (may also have 'results' for compatibility)
      const schemesArray = data.schemes || data.results || [];
      const sorted = schemesArray.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      setResults(sorted);
      setVisibleCount(12);
      console.log('Results state set to', sorted);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  console.log('Render: results length', results.length);
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-4 text-center">Find Schemes For Me</h1>
      <div className="flex justify-center space-x-4 mb-6">
        <button
          type="button"
          onClick={() => setUseSaved(true)}
          className={`px-4 py-2 rounded ${useSaved ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'} hover:${useSaved ? 'bg-indigo-500' : 'bg-gray-500'} transition`}
        >
          Use my saved profile
        </button>
        <button
          type="button"
          onClick={() => setUseSaved(false)}
          className={`px-4 py-2 rounded ${!useSaved ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-300'} hover:${!useSaved ? 'bg-indigo-500' : 'bg-gray-500'} transition`}
        >
          Enter details manually
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded"
        >
          Reset
        </button>
      </div>
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-slate-300 mb-1">Age</label>
            <input
              type="number"
              name="age"
              id="age"
              className="w-full glass-input px-3 py-2 rounded text-white bg-transparent"
              value={form.age}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-1">Gender</label>
            <select
              name="gender"
              id="gender"
              className="w-full glass-input px-3 py-2 rounded text-white bg-transparent"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other/Prefer not to say">Other/Prefer not to say</option>
            </select>
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-slate-300 mb-1">State</label>
            <select
              name="state"
              id="state"
              className="w-full glass-input px-3 py-2 rounded text-white bg-transparent"
              value={form.state}
              onChange={handleChange}
              required
            >
              <option value="">Select state</option>
                <option value=""></option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Bihar">Bihar</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Delhi">Delhi</option>
                <option value="Goa">Goa</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Kerala">Kerala</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Odisha">Odisha</option>
                <option value="Punjab">Punjab</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Tripura">Tripura</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Andaman &amp; Nicobar Islands">Andaman &amp; Nicobar Islands</option>
                <option value="Chandigarh">Chandigarh</option>
                <option value="Dadra &amp; Nagar Haveli &amp; Daman &amp; Diu">Dadra &amp; Nagar Haveli &amp; Daman &amp; Diu</option>
                <option value="Lakshadweep">Lakshadweep</option>
                <option value="Puducherry">Puducherry</option>
                <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">Category</label>
            <select
              name="category"
              id="category"
              className="w-full glass-input px-3 py-2 rounded text-white bg-transparent"
              value={form.category}
              onChange={handleChange}
            >
              <option value="">Select category</option>
              <option value="General">General</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="OBC">OBC</option>
              <option value="EWS">EWS</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="occupation" className="block text-sm font-medium text-slate-300 mb-1">Occupation</label>
            <select
              name="occupation"
              id="occupation"
              className="w-full glass-input px-3 py-2 rounded text-white bg-transparent"
              value={form.occupation}
              onChange={handleChange}
            >
              <option value="">Select occupation</option>
              <option value="Student">Student</option>
              <option value="Salaried">Salaried</option>
              <option value="Self-Employed/Business">Self‑Employed/Business</option>
              <option value="Farmer">Farmer</option>
              <option value="Unemployed">Unemployed</option>
              <option value="Retired">Retired</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="income" className="block text-sm font-medium text-slate-300 mb-1">Annual Income</label>
            <select
              name="income"
              id="income"
              className="w-full glass-input px-3 py-2 rounded text-white bg-transparent"
              value={form.income}
              onChange={handleChange}
            >
              <option value="">Select income</option>
              <option value="No Income / Not Earning">No Income / Not Earning</option>
              <option value="Below ₹1 Lakh">Below ₹1 Lakh</option>
              <option value="₹1-3 Lakh">₹1-3 Lakh</option>
              <option value="₹3-5 Lakh">₹3-5 Lakh</option>
              <option value="₹5-10 Lakh">₹5-10 Lakh</option>
              <option value="Above ₹10 Lakh">Above ₹10 Lakh</option>
            </select>
          </div>
        </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50"
        disabled={!isFormValid || loading}
      >
        {loading ? 'Searching…' : 'Find Schemes'}
      </button>
      {validationMessage && !loading && (
        <p className="text-red-400 mt-2">{validationMessage}</p>
      )}
      {error && !loading && (
        <p className="text-red-400 mt-2">{error}</p>
      )}
      </form>

    {/* Render matched schemes if any */}
    {results.length > 0 && (
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Matched Schemes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.slice(0, visibleCount).map((item) => {
            const scheme = item?.scheme || item;
            if (!scheme || !scheme.slug) return null;
            const matchScore = item.matchScore ?? item.scheme?.matchScore;
            const rationale = item.rationale ?? item.scheme?.rationale;
            return (
                <div
                  key={scheme.slug}
                  className="relative glass-card p-4 cursor-pointer hover:bg-slate-800 transition"
                  onClick={() => navigate(`/scheme/${scheme.slug}`)}
                >
                  <SchemeCard scheme={scheme} matchScore={matchScore} />
                </div>
            );
          })}
        </div>
      </div>
    )}
    {results.length > visibleCount && (
      <div className="flex justify-center mt-6">
        <button
          type="button"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
          onClick={() => setVisibleCount(prev => prev + 12)}
        >
          Load More
        </button>
      </div>
    )}
    {/* No results message */}
    {results.length === 0 && !loading && !error && (
      <p className="text-slate-400 mt-4">No schemes matched your criteria.</p>
    )}
    </section>
  );
}
