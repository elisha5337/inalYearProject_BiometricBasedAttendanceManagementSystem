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
  RefreshCw
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
  to_date: string;
  assigned_by: string;
}

export default function ManageShifts() {
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

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
    setIsRefreshing(true);
    try {
      const response = await apiRequest<{ success: boolean; shifts: Shift[] }>('/api/scheduling/shifts/');
      if (response.success) {
        setShifts(response.shifts);
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await apiRequest<{ success: boolean; assignments: Assignment[] }>('/api/scheduling/assignments/');
      if (response.success) {
        setAssignments(response.assignments);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [deptRes, userRes] = await Promise.all([
        apiRequest<{ success: boolean; departments: any[] }>('/accounts/api/departments/'),
        apiRequest<{ success: boolean; users: any[] }>('/accounts/api/users/')
      ]);
      if (deptRes.success) setDepartments(deptRes.departments);
      if (userRes.success) setEmployees(userRes.users);
    } catch (error) {
      console.error('Failed to fetch initialization data:', error);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchAssignments();
    fetchInitialData();
  }, []);

  const handleRefresh = () => {
    fetchShifts();
    fetchAssignments();
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const response = await apiRequest<{ success: boolean }>(`/api/scheduling/shifts/${shiftId}/`, {
        method: 'DELETE'
      });
      if (response.success || response) { // status 204
        fetchShifts();
      }
    } catch (error) {
      console.error('Failed to delete shift:', error);
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
    // Converts "08:00 AM" to "08:00"
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
      const response = await apiRequest<{ success: boolean }>('/api/scheduling/assignments/', {
        method: 'POST',
        body: {
          user_id: assignModal.userId,
          shift_id: assignModal.shiftId,
          from_date: assignModal.from_date,
          to_date: assignModal.to_date || null
        }
      });
      if (response.success) {
        setAssignModal({ ...assignModal, show: false });
        fetchShifts(); // Update counts
        fetchAssignments(); // Update list
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return;

    try {
      const response = await apiRequest<{ success: boolean }>(`/api/scheduling/assignments/${assignmentId}/`, {
        method: 'DELETE'
      });
      if (response.success || response) {
        fetchShifts();
        fetchAssignments();
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    }
  };

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
                    className="col-span-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-50 transition-colors flex items-center justify-center gap-1.5 mt-1 opacity-60 hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Shift
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="professional-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Shift Assignments</h3>
          <div className="flex gap-2">
            <button className="secondary-button py-1.5 text-xs">Calendar View</button>
            <button className="primary-button py-1.5 text-xs">List View</button>
          </div>
        </div>
        
        {assignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned By</th>
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
                    <td className="px-6 py-4 text-xs text-slate-500">{assignment.assigned_by}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
            <button className="text-blue-600 font-bold text-sm hover:underline">Assign Employees Now</button>
          </div>
        )}
      </div>

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
                  placeholder="e.g. Morning Shift, Night Shift..."
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
                  placeholder="Additional details about this shift..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all order-2 sm:order-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitShift}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 order-1 sm:order-2 flex items-center justify-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Shift' : 'Create Shift')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Assign Employee Modal */}
      {assignModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Assign Employee</h2>
                <p className="text-sm text-slate-500">Assign to {assignModal.shiftName}</p>
              </div>
              <button 
                onClick={() => setAssignModal({ ...assignModal, show: false })}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Select Employee</label>
                <select 
                  value={assignModal.userId}
                  onChange={(e) => setAssignModal({ ...assignModal, userId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select an employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} (@{emp.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">From Date</label>
                  <input 
                    type="date" 
                    value={assignModal.from_date}
                    onChange={(e) => setAssignModal({ ...assignModal, from_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">To Date (Optional)</label>
                  <input 
                    type="date" 
                    value={assignModal.to_date}
                    onChange={(e) => setAssignModal({ ...assignModal, to_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setAssignModal({ ...assignModal, show: false })}
                disabled={isSubmitting}
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all order-2 sm:order-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateAssignment}
                disabled={isSubmitting}
                className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 order-1 sm:order-2 flex items-center justify-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Export Shift Data</h2>
                <p className="text-sm text-slate-500">Select your preferred format</p>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
                  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' },
                  { id: 'csv', label: 'CSV', icon: TableIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setExportFormat(format.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      exportFormat === format.id 
                        ? "border-blue-600 bg-blue-50 shadow-sm" 
                        : "border-slate-100 bg-white hover:border-slate-200"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", format.bg, format.color)}>
                      <format.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{format.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert(`Exporting shift data as ${exportFormat.toUpperCase()}`);
                  setShowExportModal(false);
                }}
                disabled={!exportFormat}
                className={cn(
                  "flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 order-1 sm:order-2",
                  exportFormat 
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" 
                    : "bg-slate-300 cursor-not-allowed shadow-none"
                )}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
