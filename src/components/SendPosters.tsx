import React, { useState } from 'react';

const SendPosters: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [designation, setDesignation] = useState<string>('Health insurance advisor');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setMessage("Please select a poster template image.");
      return;
    }

    const formData = new FormData();
    formData.append('template', file); // ✅ Matches backend field
    formData.append('designation', designation); // ✅ Required by backend

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('http://localhost:3001/api/send-posters', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setMessage(`✅ ${result.recipientCount} posters sent successfully!`);
      } else {
        setMessage(result.error || "❌ Failed to send posters.");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg ">
      <h2 className="text-2xl font-semibold mb-4">Send Personalized Posters</h2>

      <form onSubmit={handleSubmit}>
        <label className="block mb-2 text-sm font-medium  overflow-auto text-gray-700">Choose Designation</label>
        <select
          className="w-full p-2 mb-4 border rounded"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        >
          <option value="Health insurance advisor">Health insurance advisor</option>
          <option value="Wealth Manager">Wealth Manager</option>
          <option value="both">Both</option>
        </select>

        <label className="block mb-2 text-sm font-medium text-gray-700">Upload Poster Template</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-4 w-full"
        />

        {preview && (
          <div className="mb-4 max-h-96 overflow-auto border rounded">
            <img src={preview} alt="Poster Preview" className="w-full object-contain" />
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Posters'}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
      )}
    </div>
  );
};

export default SendPosters;
