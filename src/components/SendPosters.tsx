import { useState } from 'react';

const SendPosters = () => {
  const [designation, setDesignation] = useState('Health Insurance Advisor');
  const [template, setTemplate] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const data = new FormData();
    if (template) data.append('template', template);
    data.append('designation', designation);

    const res = await fetch('http://localhost:3000/send-posters', {
      method: 'POST',
      body: data,
    });

    alert(await res.text());
    setLoading(false);
  };

  return (
    <div className="bg-white shadow-md rounded p-6 text-center">
      <h2 className="text-xl font-semibold mb-4">Send Personalized Posters</h2>

      <label className="block text-sm text-left mb-1">Choose Designation</label>
      <select value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full p-2 border mb-4 rounded">
        <option>Health Insurance Advisor</option>
        <option>Wealth Manager</option>
      </select>

      <label className="block text-sm text-left mb-1">Upload Poster Template</label>
      <input type="file" accept=".jpg,.jpeg" onChange={e => setTemplate(e.target.files?.[0] || null)} className="w-full p-2 border mb-4 rounded" />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Posters'}
      </button>
    </div>
  );
};

export default SendPosters;
