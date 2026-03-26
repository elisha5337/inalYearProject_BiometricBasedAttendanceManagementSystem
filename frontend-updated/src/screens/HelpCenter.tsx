import { Search, HelpCircle, Book, MessageCircle, Phone, ExternalLink, ChevronRight, FileText } from 'lucide-react';

const faqCategories = [
  {
    title: 'Getting Started',
    icon: HelpCircle,
    items: ['How to check-in?', 'Setting up your profile', 'Understanding roles'],
  },
  {
    title: 'Attendance & Shifts',
    icon: Book,
    items: ['Manual entry requests', 'Shift schedule changes', 'Grace periods'],
  },
  {
    title: 'Leave & Absence',
    icon: FileText,
    items: ['Applying for leave', 'Leave balance tracking', 'Medical certificate upload'],
  },
];

export default function HelpCenter() {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900">How can we help you?</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Search our knowledge base or browse categories below to find answers to your questions.</p>
        
        <div className="relative max-w-2xl mx-auto mt-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search for help articles..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-lg shadow-xl shadow-slate-200/50 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {faqCategories.map((category) => (
          <div key={category.title} className="professional-card p-6 space-y-6">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <category.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{category.title}</h3>
            <ul className="space-y-3">
              {category.items.map((item) => (
                <li key={item}>
                  <button className="text-sm text-slate-600 hover:text-blue-600 flex items-center justify-between w-full group">
                    {item}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="professional-card p-8 bg-blue-600 text-white overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold">Still need help?</h2>
            <p className="text-blue-100 max-w-md">Our support team is available Monday to Friday, 8:00 AM to 5:00 PM (EAT).</p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors">
                <MessageCircle className="w-5 h-5" />
                Live Chat
              </button>
              <button className="px-6 py-3 bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-colors">
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
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <Book className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">User Manual</h4>
              <p className="text-sm text-slate-500">Download the full PDF guide</p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
        </div>
        <div className="professional-card p-6 flex items-center justify-between group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">API Documentation</h4>
              <p className="text-sm text-slate-500">For technical integrations</p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>
    </div>
  );
}
