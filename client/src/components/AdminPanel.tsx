import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// --- TYPE DEFINITIONS ---
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

// --- DashboardCard Component ---
const DashboardCard = ({ title, value, description, icon }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-4 mb-3">
        {icon && <span className="text-3xl bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg text-blue-600">{icon}</span>}
        <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
      </div>
      <p className="text-4xl font-bold text-blue-600 mb-2">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
};

// --- AdminPanel Component ---
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
  // Best practice: VITE_API_URL in .env is defined without a trailing slash
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const calculateDashboardStats = useCallback((usersList: User[]) => {
    const stats = usersList.reduce((acc, user) => {
      const designations = typeof user.designation === 'string' ? user.designation.split(',').map(d => d.trim()) : [];
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
      const response = await fetch(`${API_BASE_URL}api/users`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setUsers(data);
      calculateDashboardStats(data);
    } catch (err) {
      setError('Failed to fetch users. Please try again later.');
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
      } catch (err) {
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
      } catch (err) {
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
    <div className="min-h-screen w-screen bg-gray-50">
      {/* --- HEADER --- */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">ABU PORTAL</h1>
            </div>
            <nav className="flex items-center gap-2">
              <a href="#home" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Home</a>
              <a href="#send-poster" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Send Poster</a>
              <a href="#register-member" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Register Member</a>
              <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">Logout</button>
            </nav>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          
          {/* --- DASHBOARD STATS --- */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard title="Total Users" value={dashboardStats.totalUsers} description="All registered members" icon="👥" />
              <DashboardCard title="Health Advisors" value={dashboardStats.healthAdvisors} description="Health Insurance Advisors" icon="⚕️" />
              <DashboardCard title="Wealth Managers" value={dashboardStats.wealthManagers} description="Wealth Management Team" icon="📈" />
              <DashboardCard title="Designated Users" value={dashboardStats.designatedUsers} description="Users with specific roles" icon="🤝" />
            </div>
          </section>

          {/* --- ERROR MESSAGE --- */}
          {error && (
            <div className="bg-red-100 text-red-800 px-5 py-3 rounded-lg flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold text-xl">&times;</button>
            </div>
          )}

          {/* --- EDIT FORM (Conditional) --- */}
          {editingUser && (
            <section className="bg-white p-6 rounded-xl shadow-md border">
              <form onSubmit={handleUpdate} className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Edit: {editingUser.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  {/* Email Input (Disabled) */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={editingUser.email}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  {/* Phone Input */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={editingUser.phone}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  {/* Designation Select */}
                  <div>
                    <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <select
                      id="designation"
                      name="designation"
                      value={editingUser.designation}
                      onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                      required
                    >
                      <option value="">Select Designation</option>
                      <option value="Health insurance advisor">Health Insurance Advisor</option>
                      <option value="Wealth Manager">Wealth Manager</option>
                      <option value="Health insurance advisor,Wealth Manager">Both Roles</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">Update User</button>
                  <button type="button" onClick={() => setEditingUser(null)} className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">Cancel</button>
                </div>
              </form>
            </section>
          )}

          {/* --- SEARCH & USER LIST --- */}
          <section className="bg-white p-6 rounded-xl shadow-md border">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Search Member</h2>
              <div className="flex gap-4">
                <input type="email" placeholder="Enter member's email..." value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="flex-1 p-3 border rounded-lg" />
                <button onClick={handleSearch} className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700">Search</button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Registered Members</h2>
                <span className="bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded-full">{users.length} total</span>
              </div>
              <div className="space-y-4">
                {loading ? <p className="text-center text-gray-500 py-4">Loading members...</p> : users.map(user => (
                  <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-xl hover:bg-gray-50">
                    <img 
                      src={user.photoUrl ? `${API_BASE_URL}/${user.photoUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`} 
                      alt={user.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=dc2626&color=fff`; }}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-lg text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-500">{user.phone}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(user.designation || '').split(',').map((d, i) => d.trim() && (
                          <span key={i} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">{d.trim()}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 self-start sm:self-center mt-3 sm:mt-0">
                      <button onClick={() => handleEdit(user)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">Edit</button>
                      <button onClick={() => handleDelete(user.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>
      
      {/* --- Confirmation Modal --- */}
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
    </div>
  );
};

export default AdminPanel;