import { useLanguage } from '../lib/translations';
﻿import { useEffect, useState } from 'react';
import { Search, HelpCircle, Book, MessageCircle, Phone, ExternalLink, ChevronRight, FileText } from 'lucide-react';
import { fetchFAQs } from '../lib/admin';

const iconMap: Record<string, any> = {
  HelpCircle,
  Book,
  FileText,
  MessageCircle,
  Phone,
};

export default function HelpCenter() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<{ title: string; icon: string; items: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchFAQs(query);
        setCategories(data.categories);
      } catch (error) {
        console.error('Failed to load FAQs', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900">{t('How can we help you?')}</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">{t('Search our knowledge base or browse categories below to find answers to your questions.')}</p>
        
        <div className="relative max-w-2xl mx-auto mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search for help articles..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-lg shadow-xl shadow-slate-200/50 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {loading && categories.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || HelpCircle;
            return (
              <div key={category.title} className="professional-card p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{category.title}</h3>
                <ul className="space-y-3">
                  {category.items.map((item) => (
                    <li key={item}>
                      <button className="text-sm text-slate-600 hover:text-indigo-600 flex items-center justify-between w-full group text-left">
                        {item}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                      </button>
                    </li>
                  ))}
                  {category.items.length === 0 && (
                    <li className="text-sm text-slate-400 italic">No articles found in this category.</li>
                  )}
                </ul>
              </div>
            );
          })}
          {categories.length === 0 && !loading && (
            <div className="col-span-1 md:col-span-3 text-center py-10">
              <p className="text-slate-500">No results found for "{query}". Try a different search term.</p>
            </div>
          )}
        </div>
      )}

      <div className="professional-card p-8 bg-indigo-600 text-white overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold">Still need help?</h2>
            <p className="text-indigo-100 max-w-md">Our support team is available Monday to Friday, 8:00 AM to 5:00 PM (EAT).</p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors">
                <MessageCircle className="w-5 h-5" />
                Live Chat
              </button>
              <button className="px-6 py-3 bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-800 transition-colors">
                <Phone className="w-5 h-5" />
                Call Support
              </button>
            </div>
          </div>
          <div className="hidden lg:block opacity-20">
            <HelpCircle className="w-64 h-64" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="professional-card p-6 flex items-center justify-between group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
              <Book className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">User Manual</h4>
              <p className="text-sm text-slate-500">{t('Download the full PDF guide')}</p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
        </div>
        <div className="professional-card p-6 flex items-center justify-between group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">API Documentation</h4>
              <p className="text-sm text-slate-500">{t('For technical integrations')}</p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
        </div>
      </div>
    </div>
  );
}
