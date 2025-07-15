import { useState } from 'react';
import MemberRegistration from './components/MemberRegistration';
import SendPosters from './components/SendPosters';
import MemberList from './components/MemberList'; // ✅ Corrected import

const App = () => {
  const [selectedAction, setSelectedAction] = useState('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-center">Automation Project</h1>
      <div className="flex gap-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded" onClick={() => setSelectedAction('register')}>New Member Registration</button>
        <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded" onClick={() => setSelectedAction('send')}>Send Posters</button>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded" onClick={() => setSelectedAction('list')}>View / Edit Members</button>
      </div>
      <div className="w-full max-w-4xl">
        {selectedAction === 'register' && <MemberRegistration />}
        {selectedAction === 'send' && <SendPosters />}
        {selectedAction === 'list' && <MemberList />}
      </div>
    </div>
  );
};

export default App;
