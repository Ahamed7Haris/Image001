import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  photoUrl?: string;
};

type DashboardStats = {
  totalUsers: number;
  healthAdvisors: number;
  wealthManagers: number;
  designatedUsers: number;
};

const DashboardCard = ({ title, value, description, icon }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300">
    <div className="flex items-start gap-3">
      <div className="bg-blue-50 p-3 rounded-lg">
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-gray-600 text-sm mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  </div>
);

const AdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    healthAdvisors: 0,
    wealthManagers: 0,
    designatedUsers: 0,
  });
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'pinging'>('pinging');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const calculateDashboardStats = useCallback((usersList: User[]) => {
    const stats = usersList.reduce((acc, user) => {
      const designations = user.designation?.split(',').map(d => d.trim()) ?? [];
      const isHa = designations.includes('Health insurance advisor');
      const isWm = designations.includes('Wealth Manager');
      if (isHa) acc.healthAdvisors++;
      if (isWm) acc.wealthManagers++;
      if (isHa || isWm) acc.designatedUsers++;
      return acc;
    }, { healthAdvisors: 0, wealthManagers: 0, designatedUsers: 0 });
    setDashboardStats({ ...stats, totalUsers: usersList.length });
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}api/users`, {
        credentials: 'include', // Include credentials for authentication
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Please login again' : 'Failed to connect to server');
      }
      const data = await response.json();
      setUsers(data);
      calculateDashboardStats(data);
      setError(null); // Clear any existing errors on successful fetch
    } catch (err) {
      setUsers([]); // Reset users on error
      setDashboardStats({ totalUsers: 0, healthAdvisors: 0, wealthManagers: 0, designatedUsers: 0 });
      setError(err instanceof Error ? err.message : 'Failed to fetch users. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, calculateDashboardStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const pingBackend = async () => {
      try {
        setBackendStatus('pinging');
        const response = await fetch(`${API_BASE_URL}api/ping`);
        setBackendStatus(response.ok ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    pingBackend();
    const interval = setInterval(pingBackend, 10000);
    return () => clearInterval(interval);
  }, [API_BASE_URL]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}api/admin/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      navigate('/admin-login');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmMessage('Are you sure you want to delete this user? This cannot be undone.');
    setConfirmAction(() => async () => {
      try {
        await fetch(`${API_BASE_URL}api/users/${id}`, { method: 'DELETE' });
        const updatedUsers = users.filter(u => u.id !== id);
        setUsers(updatedUsers);
        calculateDashboardStats(updatedUsers);
      } catch {
        setError('Failed to delete user.');
      } finally {
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const response = await fetch(`${API_BASE_URL}api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');
      const updatedUsers = users.map(u => u.id === editingUser.id ? data.user : u);
      setUsers(updatedUsers);
      calculateDashboardStats(updatedUsers);
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSearch = () => {
    const foundUser = users.find(u => u.email.toLowerCase() === searchEmail.trim().toLowerCase());
    if (foundUser) {
      handleEdit(foundUser);
      setError(null);
    } else {
      setError('User not found with this email.');
    }
  };

  const handleConfirm = () => {
    if (confirmAction) confirmAction();
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Top Title */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ABU PORTAL</h1>
          <nav className="hidden sm:flex items-center gap-4">
            <a href="/" className="text-gray-600 hover:text-gray-900">Home</a>
            <a href="/register" className="text-gray-600 hover:text-gray-900">Register</a>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
              Logout
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="space-y-6">
          {/* Dashboard Stats */}
          <section className="mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <DashboardCard 
                title="Total Users" 
                value={loading ? '-' : dashboardStats.totalUsers.toString()} 
                description="All registered members" 
                icon="👥" 
              />
              <DashboardCard 
                title="Health Advisors" 
                value={loading ? '-' : dashboardStats.healthAdvisors.toString()} 
                description="Health Insurance Advisors" 
                icon="⚕️" 
              />
              <DashboardCard 
                title="Wealth Managers" 
                value={loading ? '-' : dashboardStats.wealthManagers.toString()} 
                description="Wealth Management Team" 
                icon="📈" 
              />
              <DashboardCard 
                title="Designated Users" 
                value={loading ? '-' : dashboardStats.designatedUsers.toString()} 
                description="Users with specific roles" 
                icon="🤝" 
              />
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex justify-between items-center animate-fade-in">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button 
                onClick={() => setError(null)} 
                className="text-red-500 hover:text-red-700 transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Edit Form */}
          {editingUser && (
            <section className="bg-white p-4 sm:p-6 rounded-xl shadow-md border">
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Edit Member</h2>
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)} 
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input 
                      type="text" 
                      value={editingUser.name} 
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} 
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      required 
                      placeholder="Enter full name" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      value={editingUser.email} 
                      className="w-full p-3 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
                      disabled 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <input 
                      type="tel" 
                      value={editingUser.phone} 
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} 
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      required 
                      placeholder="Enter phone number" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Designation</label>
                    <select 
                      value={editingUser.designation} 
                      onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })} 
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      required
                    >
                      <option value="">Select Designation</option>
                      <option value="Health insurance advisor">Health Insurance Advisor</option>
                      <option value="Wealth Manager">Wealth Manager</option>
                      <option value="Health insurance advisor,Wealth Manager">Both Roles</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)} 
                    className="w-full sm:w-auto bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Search & User List */}
          <section className="bg-white p-4 sm:p-6 rounded-xl shadow-md border">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Search Member</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input 
                    type="email" 
                    placeholder="Enter member's email..." 
                    value={searchEmail} 
                    onChange={e => setSearchEmail(e.target.value)} 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
                <button 
                  onClick={handleSearch} 
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h2 className="text-2xl font-bold text-gray-800">Registered Members</h2>
                <span className="bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded-full">{users.length} total</span>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading members...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No members found</p>
                  </div>
                ) : users.map(user => (
                  <div key={user.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-full sm:w-auto flex items-center gap-4">
                      <img 
                        src={user.photoUrl ? `${API_BASE_URL}/${user.photoUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`} 
                        alt={user.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 flex-shrink-0"
                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=dc2626&color=fff`; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-gray-800 truncate">{user.name}</p>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                        <p className="text-sm text-gray-500">{user.phone}</p>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {(user.designation || '').split(',').map((d, i) => d.trim() && (
                          <span key={i} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">{d.trim()}</span>
                        ))}
                      </div>
                      <div className="flex flex-row gap-2 mt-2 sm:mt-4 w-full sm:w-auto">
                        <button 
                          onClick={() => handleEdit(user)} 
                          className="flex-1 sm:flex-initial bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)} 
                          className="flex-1 sm:flex-initial bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full">
            <p className="text-xl font-semibold text-gray-800 mb-6 text-center">{confirmMessage}</p>
            <div className="flex justify-center gap-4">
              <button onClick={handleCancelConfirm} className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
              <button onClick={handleConfirm} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Logout Button for Mobile */}
      <button 
        onClick={handleLogout}
        className="fixed bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-lg z-50 sm:hidden"
      >
        Logout
      </button>
    </div>
  );
};

export default AdminPanel;
