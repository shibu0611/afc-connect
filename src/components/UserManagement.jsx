import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Staff & Bank Manager States
  const [staffList, setStaffList] = useState([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    baseSalary: '',
    email: '',
    phone: '',
    password: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        email: docSnap.data().email || docSnap.data().username || docSnap.id,
        ...docSnap.data() 
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users: ", error);
    }
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'staff'));
      const staffData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(staffData);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStaff();
  }, []);

  const handleRoleChange = async (userId, newRoleValue) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRoleValue });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRoleValue } : u));
    } catch (error) {
      console.error("Error updating role: ", error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to remove this user?")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUsers(users.filter(u => u.id !== userId));
      } catch (error) {
        console.error("Error deleting user: ", error);
      }
    }
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    try {
      const staffId = editingStaff ? editingStaff.id : `EMP0${staffList.length + 1}`;
      await setDoc(doc(db, 'staff', staffId), formData, { merge: true });
      alert("Staff details saved successfully!");
      setShowAddStaffModal(false);
      setEditingStaff(null);
      setFormData({ name: '', role: '', bankName: '', accountNumber: '', ifsc: '', baseSalary: '', email: '', phone: '', password: '' });
      fetchStaff();
    } catch (error) {
      alert("Error saving staff: " + error.message);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      try {
        await deleteDoc(doc(db, 'staff', staffId));
        fetchStaff();
      } catch (error) {
        alert("Error deleting staff: " + error.message);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-5xl mx-auto mt-6 space-y-8">
      {/* Staff & Bank Accounts Manager Section */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Staff & Bank Accounts Manager (Secured by Password)</h3>
            <p className="text-xs text-gray-500 mt-1">Manage staff accounts, full bank account numbers, and base salaries for future salary slips.</p>
          </div>
          <button
            onClick={() => {
              setEditingStaff(null);
              setFormData({ name: '', role: '', bankName: '', accountNumber: '', ifsc: '', baseSalary: '', email: '', phone: '', password: '' });
              setShowAddStaffModal(!showAddStaffModal);
            }}
            className="bg-purple-700 text-white px-4 py-2 rounded font-bold text-sm"
          >
            {showAddStaffModal ? 'Close Form' : '+ Add New Staff / Bank Account'}
          </button>
        </div>

        {showAddStaffModal && (
          <form onSubmit={handleSaveStaff} className="bg-white p-4 rounded border mb-4 space-y-4 shadow-sm">
            <h4 className="font-bold text-gray-700">{editingStaff ? 'Edit Staff Details' : 'Add New Staff Member'}</h4>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="border p-2 rounded text-sm" required />
              <input type="text" placeholder="Role / Designation" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="border p-2 rounded text-sm" required />
              <input type="text" placeholder="Bank Name" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} className="border p-2 rounded text-sm" required />
              <input type="text" placeholder="Account Number" value={formData.accountNumber} onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} className="border p-2 rounded text-sm" required />
              <input type="text" placeholder="IFSC Code" value={formData.ifsc} onChange={(e) => setFormData({...formData, ifsc: e.target.value})} className="border p-2 rounded text-sm" required />
              <input type="number" placeholder="Base Monthly Salary (₹)" value={formData.baseSalary} onChange={(e) => setFormData({...formData, baseSalary: e.target.value})} className="border p-2 rounded text-sm" required />
              <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="border p-2 rounded text-sm" required />
              <input type="text" placeholder="Phone Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="border p-2 rounded text-sm" required />
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">Save Staff</button>
          </form>
        )}

        <div className="space-y-3">
          {staffList.map((staff) => (
            <div key={staff.id} className="bg-white p-4 rounded border flex justify-between items-center shadow-sm">
              <div>
                <p className="font-bold text-gray-800">{staff.name} <span className="text-xs text-gray-500 font-normal">({staff.role})</span></p>
                <p className="text-xs text-gray-600 mt-1">🏦 {staff.bankName} (A/c: <strong>{staff.accountNumber}</strong>) — 💰 ₹{staff.baseSalary}</p>
              </div>
              <div className="space-x-2">
                <button 
                  onClick={() => {
                    setEditingStaff(staff);
                    setFormData(staff);
                    setShowAddStaffModal(true);
                  }}
                  className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-bold"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteStaff(staff.id)}
                  className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Management & Role Assignment Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">User Management & Role Assignment</h2>
        
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="overflow-x-auto bg-white border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={user.role || 'GUEST'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="border rounded p-1 text-sm bg-gray-50 font-semibold"
                      >
                        <option value="admin">Admin (Full Access)</option>
                        <option value="staff">Staff (No Admin Controls)</option>
                        <option value="GUEST">GUEST (Masked Finances)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}