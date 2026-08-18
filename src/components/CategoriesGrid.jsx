import React from 'react';
import { 
  Briefcase, Wheat, PiggyBank, HeartHandshake, GraduationCap, 
  Droplet, Compass, Shield, Laptop, Truck, Landmark, UserCheck, 
  HelpCircle, ChevronRight, LayoutGrid 
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Skills & Employment': Briefcase,
  'Agriculture,Rural & Environment': Wheat,
  'Banking,Financial Services and Insurance': PiggyBank,
  'Women and Child': HeartHandshake,
  'Education & Learning': GraduationCap,
  'Utility & Sanitation': Droplet,
  'Travel & Tourism': Compass,
  'Public Safety,Law & Justice': Shield,
  'Science, IT & Communications': Laptop,
  'Transport & Infrastructure': Truck,
  'Social welfare & Empowerment': Landmark,
  'Business & Entrepreneurship': UserCheck,
  'Health & Wellness': HeartHandshake,
  'Sports & Culture': Compass,
  'Housing & Shelter': Landmark
};

export default function CategoriesGrid({ categories = [], selectedCategory, onSelectCategory }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
      
      {/* Section Title */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-outfit text-white flex items-center gap-2">
            <LayoutGrid className="w-7 h-7 text-indigo-400" />
            Browse Schemes by Category
          </h2>
          <p className="text-sm text-slate-400 mt-1">Explore 15 major sectors powered by real-time scheme data</p>
        </div>

        {selectedCategory !== 'All' && (
          <button
            onClick={() => onSelectCategory('All')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear Filter (Show All)
          </button>
        )}
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {categories.map((item) => {
          const catName = item.category;
          const count = item.count;
          const IconComp = CATEGORY_ICONS[catName] || HelpCircle;
          const isSelected = selectedCategory === catName;

          return (
            <button
              key={catName}
              onClick={() => onSelectCategory(isSelected ? 'All' : catName)}
              className={`glass-card glass-card-hover text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between group ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/20'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3 w-full">
                <div className={`p-3 rounded-xl transition-colors ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-indigo-400 group-hover:bg-indigo-600/20'
                }`}>
                  <IconComp className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                  {count} schemes
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                  {catName}
                </h3>
                <div className="flex items-center text-xs text-slate-500 mt-2 font-medium group-hover:text-indigo-400 transition-colors">
                  <span>Filter category</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

    </section>
  );
}
