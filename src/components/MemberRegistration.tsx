// File: src/components/MemberRegistration.tsx
import { useState } from 'react';

const MemberRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    designation: 'Health Insurance Advisor',
    photo: null,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (name === 'photo') {
      setFormData({ ...formData, photo: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value as string | Blob));

    const res = await fetch('http://localhost:3000/register', {
      method: 'POST',
      body: data,
    });

    const result = await res.text();
    setLoading(false);
    alert(result);
  };

  return (
    <div className="bg-white shadow p-6 rounded">
      <h2 className="text-xl font-bold mb-4">New Member Registration</h2>
      <div className="space-y-4">
        <input name="name" type="text" placeholder="Name" className="w-full p-2 border" onChange={handleChange} />
        <input name="phone" type="text" placeholder="Phone Number" className="w-full p-2 border" onChange={handleChange} />
        <select name="designation" className="w-full p-2 border" onChange={handleChange} value={formData.designation}>
          <option>Health Insurance Advisor</option>
          <option>Wealth Manager</option>
          <option>Both</option>
        </select>
        <input name="email" type="email" placeholder="Email" className="w-full p-2 border" onChange={handleChange} />
        <input name="photo" type="file" accept=".jpg,.jpeg" className="w-full p-2 border" onChange={handleChange} />
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
};

export default MemberRegistration;
