import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useLocalStorage from './hooks/useLocalStorage';
import SchemeCard from "./components/SchemeCard";
import { Heart } from 'lucide-react';

export default function Profile() {
  // LocalStorage hooks
  const [userInfo, setUserInfo] = useLocalStorage('userInfo', {});
  const [likedSchemes, setLikedSchemes] = useLocalStorage('likedSchemes', []);
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage('recentlyViewed', []);



  // Form state (prepopulate from userInfo)
  const [form, setForm] = useState({
    name: userInfo?.name || '',
    age: userInfo?.age || '',
    income: userInfo?.income || '',
    state: userInfo?.state || '',
    occupation: userInfo?.occupation || '',
    category: userInfo?.category || '',
    gender: userInfo?.gender || ''
  });

  const [validationError, setValidationError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate completion percentage (7 fields total)
  const completedFields = ['name','age','income','state','occupation','category','gender'].filter(f => form[f] && form[f].toString().trim() !== '').length;
  const completionPercent = Math.round((completedFields / 7) * 100);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Required fields: name, state
    if (!form.name.trim() || !form.state.trim()) {
      setValidationError('Name and State are required.');
      return;
    }
    // Optional numeric validation
    if (form.age && (Number(form.age) < 0 || Number(form.age) > 120)) {
      setValidationError('Age must be between 0 and 120.');
      return;
    }
    if (form.income && Number(form.income) < 0) {
      setValidationError('Income must be non‑negative.');
      return;
    }
    setValidationError('');
    setUserInfo(form);
    // Show toast confirmation
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Fetch scheme objects for liked and recent lists
  const [likedDetails, setLikedDetails] = useState([]);
  const [recentDetails, setRecentDetails] = useState([]);

  const fetchSchemes = async (slugs) => {
    try {
      const promises = slugs.map((s) => fetch(`/api/schemes/${s}`).then((r) => r.ok ? r.json() : null));
      const results = await Promise.all(promises);
      return results.filter(Boolean);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (likedSchemes.length) {
      fetchSchemes(likedSchemes).then(setLikedDetails);
    } else {
      setLikedDetails([]);
    }
  }, [likedSchemes]);

  useEffect(() => {
    if (recentlyViewed.length) {
      fetchSchemes(recentlyViewed).then(setRecentDetails);
    } else {
      setRecentDetails([]);
    }
  }, [recentlyViewed]);

  // Heart toggle helper for profile list
  const toggleLike = (slug) => {
    if (likedSchemes.includes(slug)) {
      setLikedSchemes(likedSchemes.filter((s) => s !== slug));
    } else {
      setLikedSchemes([...likedSchemes, slug]);
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white font-outfit mb-4 text-center">My Profile</h1>
      <p className="text-sm text-slate-300 mb-4 text-center">Save your details once to get personalized scheme matches faster.</p>
      <div className="flex items-center justify-center mb-4">
        <span className="text-sm text-slate-400">Profile {completedFields} of 7 fields filled ({completionPercent}%)</span>
        <div className="w-32 bg-slate-800 rounded-full h-2 ml-4 overflow-hidden">
          <div className="bg-indigo-500 h-full" style={{ width: `${completionPercent}%` }}></div>
        </div>
      </div>
      {showToast && (
        <div className="toast fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg flex items-center space-x-2 animate-fade-in">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span>Profile saved!</span>
        </div>
      )}
      {/* Profile Form */}
      <div className="profile-section glass-card p-6">
        <h2 className="text-2xl font-semibold text-white mb-4">My Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <h3 className="text-xl font-medium text-white mb-2">Personal Details</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
              <input type="text" name="name" id="name" className="w-full glass-input px-3 py-2 rounded text-white bg-transparent" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-slate-300 mb-1">Age</label>
              <input type="number" name="age" id="age" className="w-full glass-input px-3 py-2 rounded text-white bg-transparent" value={form.age} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-1">Gender</label>
              <select name="gender" id="gender" className="w-full glass-input px-3 py-2 rounded text-white bg-transparent" value={form.gender} onChange={handleChange}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other/Prefer not to say">Other/Prefer not to say</option>
              </select>
            </div>
          </div>
          <hr className="border-slate-800 my-6" />
          {/* Location & Category */}
          <h3 className="text-xl font-medium text-white mb-2">Location & Category</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-slate-300 mb-1">State *</label>
              <select name="state" id="state" className="w-full glass-input px-3 py-2 rounded text-white bg-transparent" value={form.state} onChange={handleChange} required>
                <option value="">Select state</option>
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
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select name="category" id="category" className="w-full glass-input px-3 py-2 rounded text-white bg-transparent" value={form.category} onChange={handleChange}>
                <option value="">Select category</option>
                <option value="General">General</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="OBC">OBC</option>
                <option value="EWS">EWS</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <hr className="border-slate-800 my-6" />
          {/* Work & Income */}
          <h3 className="text-xl font-medium text-white mb-2">Work & Income</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="occupation" className="block text-sm font-medium text-slate-300 mb-1">Occupation</label>
              <select name="occupation" id="occupation" className="w-full glass-input px-3 py-2 rounded text-white bg-transparent" value={form.occupation} onChange={handleChange}>
                <option value="">Select occupation</option>
                <option value="Student">Student</option>
                <option value="Salaried">Salaried</option>
                <option value="Self-Employed/Business">Self-Employed/Business</option>
                <option value="Farmer">Farmer</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Retired">Retired</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="income" className="block text-sm font-medium text-slate-300 mb-1">Annual Income</label>
              <select name="income" id="income" className="w-full glass-input px-3 py-2 rounded text-white bg-transparent" value={form.income} onChange={handleChange}>
                <option value="">Select income bracket</option>
                <option value="No Income / Not Earning">No Income / Not Earning</option>
                <option value="Below ₹1 Lakh">Below ₹1 Lakh</option>
                <option value="₹1-3 Lakh">₹1-3 Lakh</option>
                <option value="₹3-5 Lakh">₹3-5 Lakh</option>
                <option value="5-10 Lakh">₹5-10 Lakh</option>
                <option value="Above ₹10 Lakh">Above ₹10 Lakh</option>
              </select>
            </div>
          </div>
          {validationError && <p className="text-red-400">{validationError}</p>}
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Save</button>
        </form>
      </div>
        {/* Liked Schemes Section */}
        <div className="profile-section glass-card p-6 mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Liked Schemes</h2>
          {likedDetails.length ? (
            <div className="flex flex-nowrap space-x-4 overflow-x-auto py-2 w-full">
              {likedDetails.map((scheme) => (
                <div key={scheme.slug} className="relative flex-none w-80">
                  <SchemeCard scheme={scheme} />
                  <button onClick={() => toggleLike(scheme.slug)} className={`absolute top-2 right-2 heart-btn ${likedSchemes.includes(scheme.slug) ? 'liked' : ''}`} aria-label={likedSchemes.includes(scheme.slug) ? 'Unlike' : 'Love'}><Heart className="w-5 h-5"/></button>
                </div>
              ))}
            </div>
          ) : (<p className="text-slate-400">No liked schemes.</p>)}
        </div>
        {/* Recently Viewed Section */}
        <div className="profile-section glass-card p-6 mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Recently Viewed</h2>
          {recentDetails.length ? (
            <div className="flex space-x-4 overflow-x-auto py-2">
              {recentDetails.map((scheme) => (
                <div key={scheme.slug} className="relative flex-none w-80">
                  <SchemeCard scheme={scheme} />
                  <button onClick={() => toggleLike(scheme.slug)} className={`absolute top-2 right-2 heart-btn ${likedSchemes.includes(scheme.slug) ? 'liked' : ''}`} aria-label={likedSchemes.includes(scheme.slug) ? 'Unlike' : 'Love'}><Heart className="w-5 h-5"/></button>
                </div>
              ))}
            </div>
          ) : (<p className="text-slate-400">No recently viewed schemes.</p>)}
        </div>
    </section>
  );
}
