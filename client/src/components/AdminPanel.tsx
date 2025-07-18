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
  designatedUsers: number; // New stat for users with either designation
};

// DashboardCard Component
const DashboardCard = ({ title, value, description, icon }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        {icon && <span className="text-2xl bg-blue-50 w-12 h-12 flex items-center justify-center rounded-lg text-blue-600">{icon}</span>}
        <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-blue-600 mb-2">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
};

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

  // Get API_URL from environment variables.
  // It's best practice to define VITE_API_URL without a trailing slash in your .env file (e.g., VITE_API_URL=http://localhost:3001)
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Updated Dashboard Stats Calculation
  const calculateDashboardStats = useCallback((usersList: User[]) => {
    let totalUsers = usersList.length;
    let healthAdvisors = 0;
    let wealthManagers = 0;
    let designatedUsers = 0;

    usersList.forEach(user => {
      // Always treat designation as array of trimmed strings
      const designations = typeof user.designation === 'string'
        ? user.designation.split(',').map(d => d.trim())
        : Array.isArray(user.designation)
          ? user.designation
          : [];

      if (designations.includes('Health insurance advisor')) healthAdvisors++;
      if (designations.includes('Wealth Manager')) wealthManagers++;
      if (
        designations.includes('Health insurance advisor') ||
        designations.includes('Wealth Manager')
      ) {
        designatedUsers++;
      }
    });

    setDashboardStats({ totalUsers, healthAdvisors, wealthManagers, designatedUsers });
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}api/users`);
      const data = await response.json();
      setUsers(data);
      calculateDashboardStats(data); // Always update stats after fetch
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, calculateDashboardStats]);

  // Effect for fetching users and checking token expiration every 60 seconds
  useEffect(() => {
    fetchUsers(); // Initial fetch only
  }, [fetchUsers]);

  // Effect for 1-second backend ping for status indicator
  useEffect(() => {
    const pingBackend = async () => {
      try {
        setBackendStatus('pinging');
        // Construct URL with leading slash for the path
        const response = await fetch(`${API_BASE_URL}api/ping`); // Assuming a lightweight /api/ping endpoint
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (err) {
        setBackendStatus('offline');
      }
    };

    pingBackend(); // Initial ping
    const pingInterval = setInterval(pingBackend, 10000); // Ping every 1 second

    return () => clearInterval(pingInterval);
  }, [API_BASE_URL]); // Dependency array for ping effect

  // Secure logout: call backend to clear cookie, then redirect
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}api/admin/logout`, {
        method: 'POST',
        credentials: 'include', // Ensure cookies are sent
      });
    } catch (err) {
      // Ignore errors, just redirect
    }
    navigate('/admin-login');
  };

  const handleDelete = (id: string) => {
    setConfirmMessage('Are you sure you want to delete this user? This action cannot be undone.');
    setConfirmAction(() => async () => {
      try {
        await fetch(`${API_BASE_URL}api/users/${id}`, {
          method: 'DELETE',
        });
        const updatedUsers = users.filter(u => u.id !== id);
        setUsers(updatedUsers);
        calculateDashboardStats(updatedUsers); // Update stats immediately
        setError(null);
      } catch (err) {
        setError('Failed to delete user');
      } finally {
        setShowConfirmModal(false);
        setConfirmAction(null);
      }
    });
    setShowConfirmModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setError(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingUser) return;
    if (e.target.name === 'designation') {
      let value = e.target.value;
      if (value === 'Health insurance advisor' || value === 'Wealth Manager') {
        setEditingUser({ ...editingUser, designation: value });
      }
    } else {
      setEditingUser({ ...editingUser, [e.target.name]: e.target.value });
    }
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
      calculateDashboardStats(updatedUsers); // Update stats immediately
      setEditingUser(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSearch = () => {
    const foundUser = users.find(u => u.email === searchEmail.trim());
    if (foundUser) {
      handleEdit(foundUser);
    } else {
      setError('User not found with this email');
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:h-16 gap-4 sm:gap-0">
            {/* Left: Title and Status */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <div className={`
                px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 
                ${backendStatus === 'online' ? 'bg-green-100 text-green-800' :
                  backendStatus === 'offline' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'}
              `}>
                <span className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'online' ? 'bg-green-500 animate-pulse' :
                    backendStatus === 'offline' ? 'bg-red-500' :
                      'bg-yellow-500 animate-pulse'
                  }`}></span>
                {backendStatus === 'online' ? 'System Live' :
                  backendStatus === 'offline' ? 'System Offline' :
                    'Checking Status...'}
              </div>
            </div>

            {/* Right: Navigation */}
            <nav className="flex items-center gap-4 w-full sm:w-auto justify-center">
              <a href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                Home
              </a>
              <a href="/register" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                Register
              </a>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors">
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>


      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Stats at the top */}
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex flex-col gap-2 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
              <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardCard
                title="Total Users"
                value={dashboardStats.totalUsers.toLocaleString()}
                description="All registered members"
                icon="👥"
              />
              <DashboardCard
                title="Health Advisors"
                value={dashboardStats.healthAdvisors.toLocaleString()}
                description="Health Insurance Advisors"
                icon="⚕️"
              />
              <DashboardCard
                title="Wealth Managers"
                value={dashboardStats.wealthManagers.toLocaleString()}
                description="Wealth Management Team"
                icon="📈"
              />
              <DashboardCard
                title="Designated Users"
                value={dashboardStats.designatedUsers.toLocaleString()}
                description="Users with specific roles"
                icon="🤝"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-full space-y-6">

              {error && (
                <div className="bg-red-100 text-red-800 px-5 py-3 rounded-lg flex justify-between items-center shadow-md border border-red-200 animate-fade-in">
                  <span className="font-medium">{error}</span>
                  <button onClick={() => setError(null)} className="font-bold text-red-800 hover:text-red-900 text-xl ml-4">&times;</button>
                </div>
              )}

              {/* Search User by Email */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Search Member</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="email"
                      placeholder="Enter member's email address..."
                      value={searchEmail}
                      onChange={e => setSearchEmail(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 outline-none bg-gray-50"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                </div>
              </div>

              {/* Edit User Form */}
              {editingUser && (
                <form onSubmit={handleUpdate} className="bg-white shadow-lg p-8 rounded-xl mb-6 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit User Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input
                      type="text"
                      name="name"
                      value={editingUser.name}
                      onChange={handleEditChange}
                      placeholder="Full Name"
                      className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700 outline-none"
                      required
                    />
                    <input
                      type="email"
                      name="email"
                      value={editingUser.email}
                      className="p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                      disabled
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={editingUser.phone}
                      onChange={handleEditChange}
                      placeholder="Phone Number"
                      className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700 outline-none"
                      required
                    />
                    <select
                      name="designation"
                      value={editingUser.designation}
                      onChange={handleEditChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700 outline-none bg-white"
                      required
                    >
                      <option value="">Select Designation</option> {/* Added default option */}
                      <option value="Health insurance advisor">Health Insurance Advisor</option>
                      <option value="Wealth Manager">Wealth Manager</option>
                    </select>
                    <div className="flex gap-4 mt-4 col-span-full">
                      <button
                        type="submit"
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition-all duration-300 transform hover:scale-105 font-semibold"
                      >
                        Update User
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* User List */}
              <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Registered Members</h2>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {users.length} total
                  </span>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar rounded-lg"> {/* Increased height for better view */}
                  {loading ? (
                    <div className="text-center text-gray-500 py-10 text-lg">Loading users...</div>
                  ) : users.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 text-lg">No users found.</div>
                  ) : (
                    users.map(user => (
                      <div
                        key={user.id}
                        className="bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm rounded-xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 border border-gray-200 hover:border-blue-300"
                      >
                        <div className="relative">
                          {user.photoUrl ? (
                            <img
                              src={`${API_BASE_URL}/${user.photoUrl}`}
                              alt={user.name}
                              className="w-20 h-20 rounded-full object-cover border-4 border-blue-400 flex-shrink-0 bg-blue-50"
                              onError={(e) => { e.currentTarget.src = `https://placehold.co/80x80/cccccc/white?text=${user.name.charAt(0)}`; }}
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-blue-100 border-4 border-blue-400 text-blue-600 text-2xl font-bold">
                              {user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <div className="font-bold text-xl text-gray-800">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-sm text-gray-600">{user.phone}</div>
                          <div className="text-md text-blue-700 font-semibold mt-1">{user.designation}</div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-3">
                          <button
                            onClick={() => handleEdit(user)}
                            className="bg-yellow-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-yellow-600 transition-all duration-300 transform hover:scale-105 text-sm font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="bg-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 text-sm font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full transform scale-95 animate-scale-in border border-gray-200">
            <p className="text-xl font-semibold text-gray-800 mb-6 text-center">{confirmMessage}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleCancelConfirm}
                className="bg-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors duration-300 font-semibold shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors duration-300 font-semibold shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
