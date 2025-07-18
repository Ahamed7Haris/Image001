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

// DashboardCard Component (reused from the simple-dashboard immersive)
const DashboardCard = ({ title, value, description, icon }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-3 flex flex-col items-start justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-100"> {/* Reduced padding to p-3 */}
      <div className="flex items-center mb-1"> {/* Reduced margin-bottom */}
        {icon && <div className="text-xl mr-1">{icon}</div>} {/* Reduced icon size and margin */}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3> {/* Reduced title text size */}
      </div>
      <p className="text-2xl font-bold text-blue-700 mb-0.5">{value}</p> {/* Reduced value text size */}
      <p className="text-xs text-gray-500">{description}</p> {/* Description text size remains xs */}
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

  // Function to calculate dashboard statistics
  const calculateDashboardStats = useCallback((usersList: User[]) => {
    const totalUsers = usersList.length;
    const healthAdvisors = usersList.filter(user => user.designation === 'Health insurance advisor').length;
    const wealthManagers = usersList.filter(user => user.designation === 'Wealth Manager').length;
    // Count users who are either Health insurance advisor OR Wealth Manager
    const designatedUsers = usersList.filter(user =>
      user.designation === 'Health insurance advisor' || user.designation === 'Wealth Manager'
    ).length;
    setDashboardStats({ totalUsers, healthAdvisors, wealthManagers, designatedUsers });
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      // Construct URL with leading slash for the path
      const response = await fetch(`${API_BASE_URL}api/users`);
      const data = await response.json();
      setUsers(data);
      calculateDashboardStats(data); // Calculate stats after fetching users
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, calculateDashboardStats]);

  // Effect for fetching users and checking token expiration every 60 seconds
  useEffect(() => {
    fetchUsers(); // Initial fetch

    const dataRefreshInterval = setInterval(() => {
      const authData = localStorage.getItem('adminAuth');
      if (authData) {
        const { loginTime, expiresIn } = JSON.parse(authData);
        // Check for token expiration
        if (Date.now() - loginTime > expiresIn) {
          handleLogout();
        }
      }
      // Refresh dashboard data every 60 seconds
      fetchUsers();
    }, 60000); // Every 60 seconds

    return () => clearInterval(dataRefreshInterval);
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

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin-login');
  };

  const handleDelete = (id: string) => {
    setConfirmMessage('Are you sure you want to delete this user? This action cannot be undone.');
    setConfirmAction(() => async () => {
      try {
        // Construct URL with leading slash for the path
        await fetch(`${API_BASE_URL}api/users/${id}`, {
          method: 'DELETE',
        });
        // Update local state and recalculate stats
        const updatedUsers = users.filter(u => u.id !== id);
        setUsers(updatedUsers);
        calculateDashboardStats(updatedUsers);
        setError(null); // Clear any previous error
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
      // Construct URL with leading slash for the path
      const response = await fetch(`${API_BASE_URL}api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');

      // Update local state and recalculate stats
      const updatedUsers = users.map(u => u.id === editingUser.id ? data.user : u);
      setUsers(updatedUsers);
      calculateDashboardStats(updatedUsers);
      setEditingUser(null);
      setError(null); // Clear any previous error
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 overflow-y-auto mt-16">
      <div className="w-full flex flex-col lg:flex-row gap-8"> {/* Changed from max-w-7xl mx-auto to w-full */}
        {/* Left Column: Admin Panel Content */}
        <div className="lg:w-2/3 w-full space-y-8"> {/* Added space-y for consistent vertical spacing */}
          <div className="bg-white rounded-xl shadow-lg p-6 flex justify-between items-center border border-gray-100">
            <h1 className="text-3xl font-extrabold text-gray-900">Admin Panel</h1>
            <button onClick={handleLogout} className="bg-red-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-700 transition-all duration-300 transform hover:scale-105 font-semibold">
              Logout
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-800 px-5 py-3 rounded-lg flex justify-between items-center shadow-md border border-red-200 animate-fade-in">
              <span className="font-medium">{error}</span>
              <button onClick={() => setError(null)} className="font-bold text-red-800 hover:text-red-900 text-xl ml-4">&times;</button>
            </div>
          )}

          {/* Search User by Email */}
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row gap-4 border border-gray-100">
            <input
              type="email"
              placeholder="Search user by email..."
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400 outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              Search
            </button>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Registered Members</h2>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar"> {/* Increased max-height, added custom-scrollbar */}
              {loading ? (
                <div className="text-center text-gray-500 py-10 text-lg">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center text-gray-500 py-10 text-lg">No users found.</div>
              ) : (
                users.map(user => (
                  <div
                    key={user.id}
                    className="bg-gray-50 hover:bg-gray-100 transition-colors shadow-sm rounded-lg p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 border border-gray-200"
                  >
                    {user.photoUrl && (
                      <img
                        src={`${API_BASE_URL}/${user.photoUrl}`} // Use API_BASE_URL here
                        alt={user.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-blue-400 flex-shrink-0"
                        onError={(e) => { e.currentTarget.src = `https://placehold.co/80x80/cccccc/white?text=No+Img`; }}
                      />
                    )}
                    <div className="flex-1 text-center sm:text-left">
                      <div className="font-bold text-xl text-gray-800">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="text-sm text-gray-600">{user.phone}</div>
                      <div className="text-md text-blue-700 font-semibold mt-1">{user.designation}</div>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-3 mt-4 sm:mt-0">
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

        {/* Right Column: Simple Dashboard */}
        <div className="lg:w-1/3 w-full mt-6 lg:mt-0 space-y-8"> {/* Added space-y */}
          <div className="bg-blue-700 text-white p-6 rounded-xl shadow-lg mb-6 flex flex-col items-start border border-blue-600">
            <div className="flex justify-between items-center w-full mb-3">
              <h2 className="text-2xl font-bold">Dashboard Summary</h2>
              <div className={`px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
                  backendStatus === 'online' ? 'bg-green-500' :
                  backendStatus === 'offline' ? 'bg-red-500' :
                  'bg-yellow-500'
              }`}>
                <span className={`w-3 h-3 rounded-full ${
                  backendStatus === 'online' ? 'bg-white' :
                  backendStatus === 'offline' ? 'bg-white' :
                  'bg-white animate-pulse'
                }`}></span>
                Backend: {backendStatus.charAt(0).toUpperCase() + backendStatus.slice(1)}
              </div>
            </div>
            <p className="text-sm text-blue-200">Data last updated: {new Date().toLocaleTimeString()}</p>
          </div>
          <div className="grid grid-cols-1 gap-6"> {/* Dashboard cards */}
            <DashboardCard
              title="Total Registered Users"
              value={dashboardStats.totalUsers.toLocaleString()}
              description="All users in the system"
              icon="👥"
            />
            <DashboardCard
              title="Health Advisors"
              value={dashboardStats.healthAdvisors.toLocaleString()}
              description="Users with Health Insurance Advisor designation"
              icon="⚕️"
            />
            <DashboardCard
              title="Wealth Managers"
              value={dashboardStats.wealthManagers.toLocaleString()}
              description="Users with Wealth Manager designation"
              icon="📈"
            />
            <DashboardCard
              title="Designated Users"
              value={dashboardStats.designatedUsers.toLocaleString()}
              description="Users with either Health Advisor or Wealth Manager designation"
              icon="🤝"
            />
          </div>
        </div>
      </div>

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

      {/* Custom CSS for scrollbar and animations */}
      <style>
        {`
          /* Custom Scrollbar for User List */
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 10px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #555;
          }

          /* Fade-in animation for error messages and modal */
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
          }

          /* Scale-in animation for modal */
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-scale-in {
            animation: scale-in 0.3s ease-out forwards;
          }
        `}
      </style>
    </div>
  );
};

export default AdminPanel;
