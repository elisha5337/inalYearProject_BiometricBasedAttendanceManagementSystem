import { useEffect, useMemo, useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  RefreshCw,
  Settings,
  Trash2,
  Wifi,
  WifiOff,
  X,
  Save,
  MapPin,
  Hash,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import {
  createDevice,
  deleteDevice,
  fetchDevices,
  updateDevice,
  type DeviceFormPayload,
  type DeviceRecord,
} from '../../lib/admin';

export default function ManageDevices() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceRecord | null>(null);

  const [formData, setFormData] = useState<DeviceFormPayload>({
    name: '',
    type: 'Kiosk',
    location: '',
    ip: '',
  });

  async function loadDevices(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await fetchDevices();
      setDevices(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Unable to load devices right now.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesType = typeFilter === 'All Types' || device.type === typeFilter;
      const matchesSearch =
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.ip.includes(searchQuery);
      return matchesType && matchesSearch;
    });
  }, [devices, typeFilter, searchQuery]);

  const stats = useMemo(
    () => ({
      total: devices.length,
      online: devices.filter((device) => device.status === 'online').length,
      offline: devices.filter((device) => device.status === 'offline').length,
      maintenance: devices.filter((device) => device.status === 'maintenance').length,
    }),
    [devices],
  );

  const handleOpenModal = (device?: DeviceRecord) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        name: device.name,
        type: device.type,
        location: device.location,
        ip: device.ip,
      });
    } else {
      setEditingDevice(null);
      setFormData({
        name: '',
        type: 'Kiosk',
        location: '',
        ip: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setError(null);
      if (editingDevice) {
        await updateDevice(editingDevice.id, formData);
      } else {
        await createDevice(formData);
      }

      setIsModalOpen(false);
      await loadDevices();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Unable to save device changes.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await deleteDevice(id);
      setDevices((current) => current.filter((device) => device.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete device.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Device Management</h1>
          <p className="text-slate-500">Monitor and configure biometric terminals and scanners</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => loadDevices(true)} className="secondary-button gap-2 justify-center">
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh Status
          </button>
          <button onClick={() => handleOpenModal()} className="primary-button gap-2 justify-center">
            <Plus className="w-4 h-4" />
            Register Device
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="professional-card p-6 border-l-4 border-blue-600">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Devices</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
        </div>
        <div className="professional-card p-6 border-l-4 border-green-600">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Online</p>
          <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.online}</h3>
        </div>
        <div className="professional-card p-6 border-l-4 border-red-600">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Offline</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.offline}</h3>
        </div>
        <div className="professional-card p-6 border-l-4 border-amber-600">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Maintenance</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.maintenance}</h3>
        </div>
      </div>

      <div className="professional-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, location or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="w-full lg:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full lg:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 outline-none"
            >
              <option>All Types</option>
              <option>Kiosk</option>
              <option>Handheld</option>
              <option>Desktop</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Device Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Sync</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading devices...
                  </td>
                </tr>
              ) : filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        {device.type === 'Kiosk' && <Monitor className="w-4 h-4" />}
                        {device.type === 'Handheld' && <Smartphone className="w-4 h-4" />}
                        {device.type === 'Desktop' && <Cpu className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{device.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{device.ip}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{device.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{device.location}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {device.status === 'online' ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider',
                          device.status === 'online'
                            ? 'text-green-600'
                            : device.status === 'maintenance'
                              ? 'text-amber-600'
                              : 'text-red-600',
                        )}
                      >
                        {device.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-600 font-medium">
                        {device.lastSync ? new Date(device.lastSync).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}
                      </span>
                      {device.battery && (
                        <span className="text-[10px] text-red-500 font-bold">Battery: {device.battery}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(device)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(device.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No devices found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900">
                {editingDevice ? 'Configure Device' : 'Register New Device'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Name</label>
                <div className="relative">
                  <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. Main Entrance Kiosk"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        type: e.target.value as DeviceFormPayload['type'],
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Kiosk">Kiosk</option>
                    <option value="Handheld">Handheld</option>
                    <option value="Desktop">Desktop</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="text"
                      value={formData.ip}
                      onChange={(e) => setFormData((current) => ({ ...current, ip: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="192.168.1.XX"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Installation Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData((current) => ({ ...current, location: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="e.g. Block B, Room 101"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 secondary-button py-3">
                  Cancel
                </button>
                <button type="submit" className="flex-1 primary-button py-3 gap-2">
                  <Save className="w-4 h-4" />
                  {editingDevice ? 'Update Config' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
