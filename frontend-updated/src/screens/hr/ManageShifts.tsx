import { useEffect, useState, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Calendar, 
  Users, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  AlertCircle,
  X,
  Clock as ClockIcon,
  ArrowLeft,
  Download,
  FileText,
  Table as TableIcon,
  FileSpreadsheet,
  RefreshCw,
    CalendarDays,
  Gift,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { formatRelativeTime } from '../../lib/admin';

interface Shift {
  id: string;
  name: string;
  description: string;
  department: string;
  department_id: string | null;
  start_time: string;
  end_time: string;
  grace_period: string;
  work_days: string;
  employeesCount: number;
}

interface Assignment {
  id: string;
  employeeName: string;
  userName: string;
  shiftName: string;
  from_date: string;
  to_date: string | null;
  assigned_by: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  is_recurring: boolean;
}

export default function ManageShifts() {
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false); // NEW
  const [exportFormat, setExportFormat] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]); // NEW
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // New Shift Form State
  const [newShift, setNewShift] = useState({
    name: '',
    description: '',
    department_id: '',
    start_time: '08:00',
    end_time: '16:00',
    grace_period: 15,
    work_days: 'Mon - Fri'
  });

  // New Holiday Form State
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    is_recurring: false
  });

  const [assignModal, setAssignModal] = useState({
    show: false,
    shiftId: '',
    shiftName: '',
    userId: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);

  const fetchShifts = async () => {
    try {
      const response = await apiRequest<{ success: boolean; shifts: Shift[] }>('/api/scheduling/shifts/');
      if (response.success) setShifts(response.shifts);
    } catch (error) { console.error('Failed to fetch shifts:', error); }
  };

  const fetchAssignments = async () => {
    try {
      const response = await apiRequest<{ success: boolean; assignments: Assignment[] }>('/api/scheduling/assignments/');
      if (response.success) setAssignments(response.assignments);
    } catch (error) { console.error('Failed to fetch assignments:', error); }
  };

  const fetchHolidays = async () => {
    try {
      const response = await apiRequest<{ success: boolean; holidays: Holiday[] }>('/api/scheduling/holidays/');
      if (response.success) setHolidays(response.holidays);
    } catch (error) { console.error('Failed to fetch holidays:', error); }
  };

  const fetchInitialData = async () => {
    setIsRefreshing(true);
    try {
      const [deptRes, userRes] = await Promise.all([
        apiRequest<{ success: boolean; departments: any[] }>('/accounts/api/departments/'),
        apiRequest<{ success: boolean; users: any[] }>('/accounts/api/users/')
      ]);
      if (deptRes.success) setDepartments(deptRes.departments);
      if (userRes.success) setEmployees(userRes.users);
      await Promise.all([fetchShifts(), fetchAssignments(), fetchHolidays()]);
    } catch (error) {
      console.error('Failed to fetch initialization data:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleRefresh = () => {
    fetchInitialData();
  };

  const handleSubmitShift = async () => {
    if (!newShift.name || !newShift.start_time || !newShift.end_time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/scheduling/shifts/${editShiftId}/` : '/api/scheduling/shifts/';
      const response = await apiRequest<{ success: boolean; message: string }>(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: newShift
      });
      if (response.success) {
        setShowModal(false);
        setIsEditing(false);
        setEditShiftId(null);
        setNewShift({
          name: '',
          description: '',
          department_id: '',
          start_time: '08:00',
          end_time: '16:00',
          grace_period: 15,
          work_days: 'Mon - Fri'
        });
        fetchShifts();
      }
    } catch (error) {
      console.error('Failed to submit shift:', error);
      alert(error instanceof Error ? error.message : 'Failed to save shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) return;
    setIsSubmitting(true);
    try {
      await apiRequest('/api/scheduling/holidays/', {
        method: 'POST',
        body: newHoliday
      });
      setNewHoliday({ name: '', date: '', is_recurring: false });
      fetchHolidays();
    } catch (e) {
      alert('Failed to add holiday.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Remove this holiday from the calendar?')) return;
    try {
      await apiRequest(`/api/scheduling/holidays/${id}/`, { method: 'DELETE' });
      fetchHolidays();
    } catch (e) {
      alert('Error removing holiday.');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (isDeleting) return;
    if (!confirm('Are you sure you want to delete this shift? This will also remove all associated employee assignments.')) return;

    setIsDeleting(shiftId);
    try {
      await apiRequest(`/api/scheduling/shifts/${shiftId}/`, {
        method: 'DELETE'
      });
      setShifts(prev => prev.filter(s => s.id !== shiftId));
      fetchShifts();
      fetchAssignments();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      alert('Failed to delete shift.');
      fetchShifts();
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditShift = (shift: Shift) => {
    setIsEditing(true);
    setEditShiftId(shift.id);
    setNewShift({
      name: shift.name,
      description: shift.description,
      department_id: shift.department_id || '',
      start_time: convertToTimeInput(shift.start_time),
      end_time: convertToTimeInput(shift.end_time),
      grace_period: parseInt(shift.grace_period),
      work_days: shift.work_days
    });
    setShowModal(true);
  };

  const convertToTimeInput = (timeStr: string) => {
    try {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      if (period === 'PM' && hours !== '12') hours = (parseInt(hours) + 12).toString();
      if (period === 'AM' && hours === '12') hours = '00';
      return `${hours.padStart(2, '0')}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignModal.userId || !assignModal.from_date) {
      alert('Please select an employee and a start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest<{ success: boolean; message?: string }>('/api/scheduling/assignments/', {
        method: 'POST',
        body: {
          user_id: assignModal.userId,
          shift_id: assignModal.shiftId,
          from_date: assignModal.from_date,
          to_date: assignModal.to_date || null
        }
      });
      
      if (response.success) {
        setAssignModal(prev => ({ ...prev, show: false, userId: '', to_date: '' }));
        fetchShifts();
        fetchAssignments();
      } else {
        alert(response.message || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert(error instanceof Error ? error.message : 'Invalid data provided.');
      fetchShifts();
      fetchAssignments();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (isDeleting) return;
    if (!confirm('Remove this assignment?')) return;

    setIsDeleting(assignmentId);
    try {
      await apiRequest(`/api/scheduling/assignments/${assignmentId}/`, {
        method: 'DELETE'
      });
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      fetchShifts();
      fetchAssignments();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      alert('Failed to delete assignment.');
      fetchAssignments();
    } finally {
      setIsDeleting(null);
    }
  };

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    // Fill previous month days
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, date: null });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, date: dateStr });
    }

    return days;
  }, [currentDate]);

  const getDayDetails = (dateStr: string) => {
    const dayAssignments = assignments.filter(assignment => {
      const from = new Date(assignment.from_date);
      const to = assignment.to_date ? new Date(assignment.to_date) : null;
      const target = new Date(dateStr);
      from.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      if (to) {
        to.setHours(0, 0, 0, 0);
        return target >= from && target <= to;
      }
      return target.getTime() === from.getTime();
    });

    const dayHoliday = holidays.find(h => h.date === dateStr);
    return { assignments: dayAssignments, holiday: dayHoliday };
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/hr" 
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shift Management</h1>
            <p className="text-slate-500">Define work schedules and assign employee shifts</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            className="secondary-button p-2.5"
            title="Refresh Shifts"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowHolidayModal(true)}
            className="secondary-button gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            title="Manage Public Holidays"
          >
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Public Holidays</span>
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
            className="secondary-button p-2.5"
            title="Export Shift Data"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              setIsEditing(false);
              setNewShift({
                name: '',
                description: '',
                department_id: '',
                start_time: '08:00',
                end_time: '16:00',
                grace_period: 15,
                work_days: 'Mon - Fri'
              });
              setShowModal(true);
            }}
            className="primary-button gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Shift</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 grayscale opacity-50">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm font-bold">Loading Schedules...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <Clock className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Shifts Defined</h3>
            <p className="text-sm text-slate-500">Create a shift to start managing attendance.</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="professional-card group hover:border-blue-300 transition-all">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{shift.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{shift.description || 'No description'}</p>
                
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Time Range</span>
                    <span className="font-bold text-slate-900">{shift.start_time} - {shift.end_time}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Grace Period</span>
                    <span className="font-bold text-amber-600">{shift.grace_period}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Assigned</span>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-900">{shift.employeesCount}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleEditShift(shift)}
                    className="py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button 
                    onClick={() => setAssignModal({ ...assignModal, show: true, shiftId: shift.id, shiftName: shift.name })}
                    className="py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign
                  </button>
                  <button 
                    onClick={() => handleDeleteShift(shift.id)}
                    disabled={isDeleting === shift.id}
                    className="col-span-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-50 transition-colors flex items-center justify-center gap-1.5 mt-1 opacity-60 hover:opacity-100 disabled:opacity-30"
                  >
                    {isDeleting === shift.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    {isDeleting === shift.id ? 'Deleting...' : 'Delete Shift'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Shift Assignments</h3>
          <div className="flex items-center gap-4">
            {viewMode === 'calendar' && (
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={prevMonth} className="p-1 hover:bg-white rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-3 text-xs font-bold text-slate-700 min-w-[100px] text-center">{monthName} {currentDate.getFullYear()}</span>
                <button onClick={nextMonth} className="p-1 hover:bg-white rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "py-1.5 px-4 text-xs font-bold rounded-lg transition-all",
                  viewMode === 'calendar' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Calendar View
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "py-1.5 px-4 text-xs font-bold rounded-lg transition-all",
                  viewMode === 'list' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                List View
              </button>
            </div>
          </div>
        </div>
        
        {viewMode === 'list' ? (
          assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {assignment.employeeName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{assignment.employeeName}</p>
                            <p className="text-[10px] text-slate-500">@{assignment.userName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{assignment.shiftName}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{assignment.from_date} to {assignment.to_date || 'Ongoing'}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          disabled={isDeleting === assignment.id}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-30"
                        >
                          {isDeleting === assignment.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">No recent assignments</h4>
                <p className="text-sm text-slate-500 mt-1">Start assigning employees to shifts to see them here.</p>
              </div>
            </div>
          )
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-slate-50 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{day}</div>
              ))}
              {calendarDays.map((item, idx) => {
                const { assignments: dateAssignments, holiday } = item.date ? getDayDetails(item.date) : { assignments: [], holiday: null };
                const isToday = item.date === new Date().toISOString().split('T')[0];
                
                return (
                  <div key={idx} className={cn(
                    "min-h-[120px] bg-white p-2 group transition-colors relative",
                    item.day ? "hover:bg-slate-50/50" : "bg-slate-50/30",
                    holiday && "bg-emerald-50/40 hover:bg-emerald-50/60"
                  )}>
                    {item.day && (
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                          "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full z-10",
                          isToday ? "bg-blue-600 text-white" : "text-slate-500"
                        )}>{item.day}</span>
                        {holiday && <div className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[7px] font-black rounded-full uppercase tracking-tighter shadow-sm border border-emerald-200">{holiday.name}</div>}
                      </div>
                    )}
                    <div className="space-y-1">
                      {dateAssignments.slice(0, 3).map(assign => (
                        <div key={assign.id} className="text-[10px] p-1 bg-blue-50 text-blue-700 rounded border border-blue-100 truncate font-medium shadow-sm">
                          {assign.employeeName.split(' ')[0]}: {assign.shiftName}
                        </div>
                      ))}
                      {dateAssignments.length > 3 && (
                        <div className="text-[9px] text-center font-bold text-slate-400 mt-1">
                          + {dateAssignments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* NEW: PUBLIC HOLIDAY MODAL */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200 border border-emerald-200"><Gift className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Institutional Holidays</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Manage Official Closed Days</p>
                </div>
              </div>
              <button onClick={() => setShowHolidayModal(false)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Add New Holiday</h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Event Name</label>
                    <input type="text" value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} placeholder="e.g. Ethiopian New Year" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Calendar Date</label>
                    <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" />
                  </div>
                  <div onClick={() => setNewHoliday(p => ({...p, is_recurring: !p.is_recurring}))} className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl cursor-pointer hover:bg-emerald-50 transition-colors group">
                    <div>
                      <p className="text-[10px] font-black text-emerald-900 uppercase">Recurring Yearly</p>
                      <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">Enable for fixed annual holidays</p>
                    </div>
                    <div className={cn("w-10 h-5 rounded-full relative transition-all", newHoliday.is_recurring ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm", newHoliday.is_recurring ? "right-1" : "left-1")}></div></div>
                  </div>
                  <button onClick={handleCreateHoliday} disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Registration"}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Registered Holidays</h4>
                <div className="space-y-3">
                  {holidays.length > 0 ? holidays.map(h => (
                    <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="text-center bg-white w-10 h-10 rounded-xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                          <p className="text-[7px] font-black text-slate-400 uppercase leading-none">{new Date(h.date).toLocaleString('default', { month: 'short' })}</p>
                          <p className="text-sm font-black text-emerald-600 leading-none">{new Date(h.date).getDate()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{h.name}</p>
                          <div className="flex items-center gap-2">
                            {h.is_recurring && <span className="text-[7px] font-black bg-emerald-100 text-emerald-700 px-1 rounded uppercase tracking-widest">Recurring</span>}
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{new Date(h.date).getFullYear()}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteHoliday(h.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )) : (
                    <div className="py-10 text-center space-y-3">
                      <CalendarDays className="w-10 h-10 text-slate-200 mx-auto" />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">No holidays scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Shift' : 'Create New Shift'}</h2>
                <p className="text-sm text-slate-500">{isEditing ? 'Update the details for this work schedule' : 'Define a new work schedule for employees'}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Shift Name</label>
                <input 
                  type="text" 
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  placeholder="e.g. Morning Shift..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Department</label>
                <select 
                  value={newShift.department_id}
                  onChange={(e) => setNewShift({ ...newShift, department_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Department (Optional)</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Start Time</label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="time" 
                      value={newShift.start_time}
                      onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">End Time</label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="time" 
                      value={newShift.end_time}
                      onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Grace Period (Mins)</label>
                  <input 
                    type="number" 
                    value={newShift.grace_period}
                    onChange={(e) => setNewShift({ ...newShift, grace_period: parseInt(e.target.value) })}
                    placeholder="15"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Work Days</label>
                  <select 
                    value={newShift.work_days}
                    onChange={(e) => setNewShift({ ...newShift, work_days: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option>Mon - Fri</option>
                    <option>Mon - Sat</option>
                    <option>Sat - Sun</option>
                    <option>All Week</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description (Optional)</label>
                <textarea 
                  rows={2}
                  value={newShift.description}
                  onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                  placeholder="Additional details..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all order-2 sm:order-1 disabled:opacity-50">Cancel</button>
              <button onClick={handleSubmitShift} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 order-1 sm:order-2 flex items-center justify-center gap-2">
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isEditing ? 'Update Shift' : 'Create Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">Assign to {assignModal.shiftName}</h2>
              <button onClick={() => setAssignModal({ ...assignModal, show: false })} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Select Employee</label>
                <select value={assignModal.userId} onChange={(e) => setAssignModal({ ...assignModal, userId: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select an employee...</option>
                  {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} (@{emp.username})</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">From Date</label>
                  <input type="date" value={assignModal.from_date} onChange={(e) => setAssignModal({ ...assignModal, from_date: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">To Date</label>
                  <input type="date" value={assignModal.to_date} onChange={(e) => setAssignModal({ ...assignModal, to_date: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                </div>
              </div>
              <button onClick={handleCreateAssignment} disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg transition-all active:scale-95">Assign Staff</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Export Schedule</h2>
              <button onClick={() => setShowExportModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['pdf', 'excel', 'csv'].map(fmt => (
                <button key={fmt} onClick={() => setExportFormat(fmt)} className={cn("p-4 border-2 rounded-xl flex flex-col items-center gap-2", exportFormat === fmt ? "border-blue-600 bg-blue-50" : "border-slate-100")}>
                  {fmt === 'pdf' ? <FileText className="text-red-500" /> : fmt === 'excel' ? <FileSpreadsheet className="text-green-500" /> : <TableIcon className="text-blue-500" />}
                  <span className="text-[10px] font-bold uppercase">{fmt}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowExportModal(false)} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl font-bold">Download</button>
          </div>
        </div>
      )}
    </div>
  );
}
