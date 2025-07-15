// File: src/components/MemberList.tsx
import { useEffect, useState } from 'react';

interface Member {
  name: string;
  phone: string;
  email: string;
  designation: string;
  photo: string;
}

const MemberList = () => {
  const [members, setMembers] = useState<Member[]>([]);

  const fetchMembers = async () => {
    const res = await fetch('http://localhost:3000/members');
    const data = await res.json();
    setMembers(data);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleDelete = async (email: string, designation: string) => {
    await fetch('http://localhost:3000/delete-member', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, designation }),
    });
    fetchMembers();
  };

  return (
    <div className="bg-white shadow p-6 rounded w-full">
      <h2 className="text-xl font-bold mb-4">Member List</h2>
      <table className="w-full text-left border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Photo</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Phone</th>
            <th className="p-2 border">Designation</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={i}>
              <td className="p-2 border">
                <img src={`http://localhost:3000/${m.photo}`} alt={m.name} className="w-12 h-12 rounded-full" />
              </td>
              <td className="p-2 border">{m.name}</td>
              <td className="p-2 border">{m.email}</td>
              <td className="p-2 border">{m.phone}</td>
              <td className="p-2 border">{m.designation}</td>
              <td className="p-2 border">
                <button
                  onClick={() => handleDelete(m.email, m.designation)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MemberList;
