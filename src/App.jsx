import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import Login from './Login';
import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import UserManagement from './components/UserManagement';
import ChangePassword from './components/ChangePassword';
import * as XLSX from 'xlsx';
import './App.css';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const STAFF_WEEKLY_OFFS = {
  "Sumonto Christian": ["Monday"],
  "Aruni Nayak": ["Monday"],
  "Surender Messey": ["Tuesday", "Thursday", "Saturday"]
};

const INITIAL_STAFF_PROFILES = {
  'Sumonto Christian': {
    empId: 'EMP001',
    designation: 'Assistant Pastor',
    email: 'xsumonto987@gmail.com',
    bankName: 'Punjab National Bank',
    accountNumber: '123456789012',
    baseSalary: 16500,
  },
  'Aruni Nayak': {
    empId: 'EMP002',
    designation: 'Church Coordinator',
    email: 'aruni.nayak21@gmail.com',
    bankName: 'State Bank of India',
    accountNumber: '987654321098',
    baseSalary: 16000,
  },
  'Surender Messey': {
    empId: 'EMP003',
    designation: 'Church Staff',
    email: 'surendermessy@gmail.com',
    bankName: 'HDFC Bank',
    accountNumber: '456789123456',
    baseSalary: 12000,
  },
};

function formatShortDate(val) {
  if (!val) return '—';
  const str = String(val).trim();
  const parts = str.split('-');

  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts.length === 3 ? parts[2] : null;

    if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      let suffix = 'th';
      if (day % 10 === 1 && day !== 11) suffix = 'st';
      else if (day % 10 === 2 && day !== 12) suffix = 'nd';
      else if (day % 10 === 3 && day !== 13) suffix = 'rd';

      const dayMonth = `${day}${suffix} ${MONTH_NAMES[monthIdx]}`;
      return year ? `${dayMonth} ${year}` : dayMonth;
    }
  }

  return str;
}

function getMemberBadge(gender, dob) {
  const isFemale = gender === 'Female';

  if (!dob || !dob.includes('-')) {
    return {
      label: isFemale ? 'Female' : 'Male',
      icon: isFemale ? '👩' : '👨',
      bg: isFemale ? '#be185d' : '#0284c7',
    };
  }

  const parts = dob.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (!isNaN(year) && year > 1900) {
      const today = new Date();
      let age = today.getFullYear() - year;
      const m = today.getMonth() - month;
      if (m < 0 || (m === 0 && today.getDate() < day)) {
        age--;
      }

      const isAdult = age >= 18;

      if (isFemale) {
        return {
          label: isAdult ? `Woman (${age} yrs)` : `Girl (${age} yrs)`,
          icon: '👩',
          bg: '#be185d',
        };
      } else {
        return {
          label: isAdult ? `Man (${age} yrs)` : `Boy (${age} yrs)`,
          icon: '👨',
          bg: isAdult ? '#0284c7' : '#059669',
        };
      }
    }
  }

  return {
    label: isFemale ? 'Female' : 'Male',
    icon: isFemale ? '👩' : '👨',
    bg: isFemale ? '#be185d' : '#0284c7',
  };
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow';
    let n_array = ('000000000' + n)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str +=
      n_array[1] != 0
        ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) +
          'Crore '
        : '';
    str +=
      n_array[2] != 0
        ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) +
          'Lakh '
        : '';
    str +=
      n_array[3] != 0
        ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) +
          'Thousand '
        : '';
    str +=
      n_array[4] != 0
        ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) +
          'Hundred '
        : '';
    str +=
      n_array[5] != 0
        ? (str != '' ? 'and ' : '') +
          (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]])
        : '';
    return str.trim();
  };

  const parts = num.toFixed(2).split('.');
  let rupees = inWords(parseInt(parts[0], 10));
  let paise =
    parseInt(parts[1], 10) > 0 ? inWords(parseInt(parts[1], 10)) + 'Paise' : '';

  return `Rupees ${rupees}${paise ? ' and ' + paise : ''} Only`;
}

const CHURCH_COORDS = { lat: 28.535379, lng: 77.216048 };
const ALLOWED_RADIUS_KM = 0.15;

const EXPENSE_CATEGORIES = [
  'Travel & Fuel (Petrol, Diesel, Cab/Auto Fare)',
  'Kitchen & Refreshments (Milk, Snacks, Rice, Tea, Paper Cups)',
  'Property & Maintenance (Cement, Bulb, Broom, Mop, Repairs)',
  'Ministry & Church Activities (Toffees for Kids, Gifts, Decorations)',
  'Office & Supplies (Pen, Pencil, Paper, Eraser, Scale, Registers)',
  'Utilities (Electricity, Water, Wi-Fi, Mobile Recharge)',
  'Staff & Support (Helper Wages, Guest Speaker Honorarium)',
  'Others',
];

const DEFAULT_OFFERING_CATEGORIES = [
  'Tithe',
  'Regular Offering',
  'Sunday School Offering',
  'Mission Offering',
  'Ladies Meeting Offering',
  'Special Donation',
  'Building Fund',
  'Others',
];

const PAYMENT_METHODS = ['Cash', 'UPI / Online'];

function DateOfferingTableCard({
  date,
  dateItems,
  sortedTithes,
  nonTithes,
  totalTithes,
  totalOfferings,
  grandTotal,
  isAdmin,
  dailySheets,
  todayStr,
  onEditOffering,
  onDeleteOffering,
  onUploadSheet,
  onQuickAddForDate,
}) {
  const [showTithes, setShowTithes] = useState(false);
  const sheet = dailySheets[date];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          backgroundColor: '#f3e8ff',
          padding: '12px 16px',
          fontWeight: 'bold',
          color: '#6b21a8',
          fontSize: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #cbd5e1',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>📅 Date: {date}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <button
              onClick={() => onQuickAddForDate(date)}
              style={{
                backgroundColor: '#7e22ce',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ➕ Add, Edit or Delete Offering for {date}
            </button>
          )}
          <span style={{ fontSize: '13px', color: '#16a34a' }}>
            Date Total: ₹{grandTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '13px',
        }}
      >
        <thead
          style={{
            backgroundColor: '#f8fafc',
            color: '#475569',
            borderBottom: '2px solid #cbd5e1',
          }}
        >
          <tr>
            <th style={{ padding: '12px 16px' }}>Giver / Source</th>
            <th style={{ padding: '12px 16px' }}>Category</th>
            <th style={{ padding: '12px 16px' }}>Method</th>
            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
            {isAdmin && (
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedTithes.length > 0 && (
            <>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fdf4ff' }}>
                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#7e22ce' }}>
                  <button
                    onClick={() => setShowTithes(!showTithes)}
                    style={{
                      backgroundColor: '#7e22ce',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '8px',
                    }}
                  >
                    {showTithes ? '▼ Hide Tithe Givers' : '▶ View Tithe Givers'}
                  </button>
                  Tithes Collected ({sortedTithes.length} givers)
                </td>
                <td style={{ padding: '12px 16px', color: '#334155' }}>Tithe</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>Mixed</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}>
                  ₹{totalTithes.toLocaleString('en-IN')}
                </td>
                {isAdmin && <td style={{ padding: '12px 16px' }}></td>}
              </tr>

              {showTithes &&
                sortedTithes.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#faf5ff' }}>
                    <td style={{ padding: '10px 16px 10px 32px', color: '#1e293b', fontSize: '12px' }}>
                      ↳ {t.memberName}
                      {t.note && <span style={{ color: '#94a3b8', fontSize: '11px' }}> (Note: {t.note})</span>}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#334155', fontSize: '12px' }}>Tithe</td>
                    <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '12px' }}>{t.method || 'Cash'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a', fontSize: '12px' }}>
                      ₹{Number(t.amount).toLocaleString('en-IN')}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => onEditOffering(t)}
                          style={{ backgroundColor: '#f1f5f9', color: '#6b21a8', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', marginRight: '4px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteOffering(t.id)}
                          style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </>
          )}

          {nonTithes.map((o, idx) => {
            let displayGiver = o.memberName || 'Congregation / General';
            if (displayGiver.includes('Anonymous')) displayGiver = 'Congregation / General';

            return (
              <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#1e293b' }}>
                  {displayGiver}
                  {o.note && <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>Note: {o.note}</div>}
                </td>
                <td style={{ padding: '12px 16px', color: '#334155' }}>{o.category}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{o.method || 'Cash'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}>
                  ₹{Number(o.amount).toLocaleString('en-IN')}
                </td>
                {isAdmin && (
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => onEditOffering(o)}
                      style={{ backgroundColor: '#f1f5f9', color: '#6b21a8', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', marginRight: '6px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteOffering(o.id)}
                      style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
          <tr>
            <td colSpan={isAdmin ? 4 : 3} style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>
              <div style={{ float: 'left', textAlign: 'left' }}>
              {sheet ? (
              <button 
                onClick={() => {
                  const win = window.open();
                  win.document.write(`<html><head><title>${sheet.name}</title></head><body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;"><img src="${sheet.file}" style="max-width:100%;max-height:100%;object-fit:contain;" /></body></html>`);
                }}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#16a34a', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                📄 View Daily Counting Sheet ({sheet.name})
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#dc2626', fontStyle: 'italic' }}>
                  ⚠️ No sheet uploaded for {date}.
                </span>
                {isAdmin && (
                  <button 
                    onClick={() => onUploadSheet(date)}
                    style={{ backgroundColor: '#7e22ce', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Upload Sheet Now
                  </button>
                )}
              </div>
            )}
              </div>
              <span style={{ marginRight: '16px', color: '#0284c7' }}>
                Tithes: ₹{totalTithes.toLocaleString('en-IN')}
              </span>
              <span style={{ marginRight: '16px', color: '#ea580c' }}>
                Offerings: ₹{totalOfferings.toLocaleString('en-IN')}
              </span>
              Grand Total:
            </td>
            <td colSpan="2" style={{ padding: '16px', textAlign: 'left', fontWeight: 'bold', color: '#16a34a', fontSize: '16px' }}>
              ₹{grandTotal.toLocaleString('en-IN')}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const MemberCard = React.memo(
  ({
    member,
    isSelected,
    isDuplicate,
    isAdmin,
    onToggleSelect,
    onEditNote,
    onEditMember,
    onDeleteMember,
  }) => {
    const badge = getMemberBadge(member.gender, member.dob);

    return (
      <div
        style={{
          backgroundColor: isSelected ? '#f3e8ff' : '#ffffff',
          border: isDuplicate
            ? '2px solid #f59e0b'
            : isSelected
            ? '2px solid #7e22ce'
            : '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div>
          {isDuplicate && (
            <div
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #f59e0b',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '4px',
                marginBottom: '8px',
                width: 'fit-content',
              }}
            >
              ⚠️ Possible Duplicate
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAdmin && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(member.id)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#7e22ce',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#6b21a8',
                }}
              >
                {member.name}
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                backgroundColor: badge.bg,
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{badge.icon}</span> {badge.label}
            </span>
          </div>

          <div
            style={{
              fontSize: '13px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '12px',
            }}
          >
            <div>
              📱 <strong>Mobile:</strong> {member.mobile || '—'}
            </div>
            <div>
              🎂 <strong>DOB:</strong> {formatShortDate(member.dob)}
            </div>
            <div>
              💍 <strong>Anniversary:</strong>{' '}
              {formatShortDate(member.anniversary)}
            </div>
            <div>
              🏠 <strong>Address:</strong> {member.address || '—'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f8fafc',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
              fontSize: '12px',
              color: '#334155',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                CUSTOM NOTE:
              </span>
              {isAdmin && (
                <button
                  onClick={() => onEditNote(member)}
                  style={{
                    backgroundColor: '#e2e8f0',
                    color: '#6b21a8',
                    border: 'none',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>
            <div style={{ marginTop: '4px' }}>
              {member.customNote || 'No custom note added yet.'}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '10px',
            }}
          >
            <button
              onClick={() => onEditMember(member)}
              style={{
                flex: 1,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteMember(member.id)}
              style={{
                flex: 1,
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default function App() {
  const { user, role, signOutUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [rulesDocUrl, setRulesDocUrl] = useState('');
  useEffect(() => {
    const savedDoc = localStorage.getItem('afc_rules_doc');
    if (savedDoc) {
      setRulesDocUrl(savedDoc);
    }
  }, []);
  const [expenseFilterPeriod, setExpenseFilterPeriod] = useState('current_month');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rulesFile, setRulesFile] = useState(null);

  const handleUploadRulesDoc = async () => {
    if (!rulesFile) {
      alert('Please click "Choose File" first.');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const fileBase64 = uploadEvent.target.result;
        localStorage.setItem('afc_rules_doc', fileBase64);
        setRulesDocUrl(fileBase64);
        setRulesFile(null);
        alert('Rules & Regulations letter uploaded successfully!');
      };
      reader.readAsDataURL(rulesFile);
    } catch (error) {
      console.error("Error uploading document: ", error);
      alert("Failed to upload Rules & Regulations letter.");
    }
  };

  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [staffDailyAttendance, setStaffDailyAttendance] = useState([]);
  const [churchEvents, setChurchEvents] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [staffProfiles, setStaffProfiles] = useState(INITIAL_STAFF_PROFILES);

  const [offeringCategories, setOfferingCategories] = useState(
    DEFAULT_OFFERING_CATEGORIES
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const [attendanceDate, setAttendanceDate] = useState(todayStr);

  const [reportModule, setReportModule] = useState('expenses');
  const [reportTimeframe, setReportTimeframe] = useState('monthly');
  const [reportStartDate, setReportStartDate] = useState(todayStr);
  const [reportEndDate, setReportEndDate] = useState(todayStr);

  const filteredReportData = useMemo(() => {
    const now = new Date();
    let startD = new Date();
    let endD = new Date(todayStr);

    if (reportTimeframe === 'weekly') {
      startD.setDate(now.getDate() - 7);
    } else if (reportTimeframe === 'monthly') {
      startD.setMonth(now.getMonth() - 1);
    } else if (reportTimeframe === 'yearly') {
      startD.setFullYear(now.getFullYear() - 1);
    } else if (reportTimeframe === 'custom') {
      startD = new Date(reportStartDate);
      endD = new Date(reportEndDate);
    }

    const startStr = startD.toISOString().split('T')[0];
    const endStr = endD.toISOString().split('T')[0];

    if (reportModule === 'expenses') {
      return (expenses || []).filter(
        (e) => e.date >= startStr && e.date <= endStr
      );
    } else if (reportModule === 'offerings') {
      return (offerings || []).filter(
        (o) => o.date >= startStr && o.date <= endStr
      );
    } else if (reportModule === 'attendance') {
      return (staffDailyAttendance || []).filter(
        (a) => a.date >= startStr && a.date <= endStr
      );
    }
    return [];
  }, [
    reportModule,
    reportTimeframe,
    reportStartDate,
    reportEndDate,
    expenses,
    offerings,
    staffDailyAttendance,
    todayStr,
  ]);

  const handleDownloadCustomReportExcel = () => {
    if (filteredReportData.length === 0) {
      alert('No records found for the selected timeframe and module!');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredReportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${reportModule}_report`);
    XLSX.writeFile(
      wb,
      `AFC_${reportModule.toUpperCase()}_Report_${todayStr}.xlsx`
    );
  };

  const [selectedPayrollMonth, setSelectedPayrollMonth] =
    useState(currentMonthStr);
  const [selectedSalarySlipStaff, setSelectedSalarySlipStaff] = useState(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  const [memberForm, setMemberForm] = useState({
    gender: '',
    name: '',
    mobile: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    annivDay: '',
    annivMonth: '',
    address: '',
    customNote: '',
  });
  const [showOnlyMissingDetails, setShowOnlyMissingDetails] = useState(false);
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');

  const [staffForm, setStaffForm] = useState({
    name: '',
    empId: '',
    designation: '',
    email: '',
    bankName: '',
    accountNumber: '',
    baseSalary: '',
  });
  const [editingStaffName, setEditingStaffName] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: '',
    detail: '',
    date: todayStr,
    receiptFile: null,
    receiptName: '',
    missingBill: false,
    missingBillJustification: '',
    delayReason: '',
    paymentSource: 'Direct UPI by Pastor Robby',
  });
  const [editingExpense, setEditingExpense] = useState(null);

  const [advanceForm, setAdvanceForm] = useState({
    staffName: 'Sumonto Christian',
    amount: '',
    date: todayStr,
    note: '',
  });

  const [offeringForm, setOfferingForm] = useState({
    memberName: 'Anonymous (Given Anonymously)',
    category: 'Tithe',
    amount: '',
    method: 'Cash',
    note: '',
    date: todayStr,
    receiptFile: null,
    receiptName: '',
  });
  const [editingOffering, setEditingOffering] = useState(null);
  const [dailySheets, setDailySheets] = useState({});
  const [selectedDailyDate, setSelectedDailyDate] = useState(todayStr);
  const [dailyFileObj, setDailyFileObj] = useState({ file: null, name: '' });
  const [showDailySheetModal, setShowDailySheetModal] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    date: todayStr,
    time: '18:00',
    type: 'Cottage Prayer',
    location: '',
    description: '',
  });

  const [dwrText, setDwrText] = useState('');
  const [fieldDutyReason, setFieldDutyReason] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('All Staff');
  const [newTaskDays, setNewTaskDays] = useState('1');

  useEffect(() => {
    if (!user) return;

    const unsubMembers = onSnapshot(collection(db, 'members'), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubOfferings = onSnapshot(collection(db, 'offerings'), (snap) => {
      setOfferings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubSheets = onSnapshot(collection(db, 'daily_sheets'), (snap) => {
      const sheetsMap = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.date) {
          sheetsMap[data.date] = { file: data.file, name: data.name };
        }
      });
      setDailySheets(sheetsMap);
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubAdvances = onSnapshot(collection(db, 'advances'), (snap) => {
      setAdvances(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubStaffAtt = onSnapshot(
      collection(db, 'staff_attendance'),
      (snap) => {
        setStaffDailyAttendance(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      }
    );

    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      setChurchEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTasks = onSnapshot(collection(db, 'task_templates'), (snap) => {
      setTaskTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubStaffProfilesDoc = onSnapshot(
      doc(db, 'settings', 'staff_profiles'),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().profiles) {
          setStaffProfiles(docSnap.data().profiles);
        }
      }
    );

    return () => {
      unsubMembers();
      unsubSheets();
      unsubExpenses();
      unsubOfferings();
      unsubAttendance();
      unsubAdvances();
      unsubStaffAtt();
      unsubEvents();
      unsubTasks();
      unsubStaffProfilesDoc();
    };
  }, [user]);

  const userEmail = (user?.email || '').toLowerCase();

  const userRole = useMemo(() => {
    if (userEmail.includes('shivkumarjena') || userEmail.includes('shibu'))
      return 'admin';
    if (userEmail.includes('robby') || userEmail.includes('pastorrobby'))
      return 'pastor';
    return 'staff';
  }, [userEmail]);

  const isAdmin = userRole === 'admin';
  const isPastor = userRole === 'pastor';
  const isStaff = userRole === 'staff';

  const isRuchi = userEmail.includes('ruchi') || userEmail.includes('aruni');
  const isSumonto =
    userEmail.includes('sumonto') || userEmail.includes('xsumonto987');
  const isSurrender =
    userEmail.includes('surendermessy') || userEmail.includes('surrender');

  const userProfilePic = useMemo(() => {
    if (userEmail.includes('shivkumarjena') || userEmail.includes('shibu'))
      return '/shibu-profile.jpg';
    if (userEmail.includes('robby_7c') || userEmail.includes('robby'))
      return '/robby-profile.jpg';
    if (userEmail.includes('xsumonto987') || userEmail.includes('sumonto'))
      return '/sumonto-profile.jpg';
    return null;
  }, [userEmail]);

  const canAddMember = isAdmin;
  const canViewOfferings = isAdmin || isPastor;
  const canAddOffering = isAdmin || isPastor;
  const canEditOffering = isAdmin;

  const canViewAttendance = isAdmin || isPastor || isRuchi;
  const canViewPayroll = isAdmin || isPastor;

  const canAddExpense = (isAdmin || isPastor || isStaff) && !isRuchi;
  const canApproveExpense = isPastor || isAdmin;
  const canEditPastAttendance = isAdmin;

  const visibleExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const hasPermission = (isAdmin || isPastor) || (exp.addedBy || '').toLowerCase() === userEmail.toLowerCase();
      if (!hasPermission) return false;

      if (!exp.date) return true;
      const expDate = new Date(exp.date);
      const today = new Date();

      if (expenseFilterPeriod === 'current_month') {
        return expDate.getMonth() === today.getMonth() && expDate.getFullYear() === today.getFullYear();
      }
      if (expenseFilterPeriod === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        return expDate >= oneWeekAgo && expDate <= today;
      }
      if (expenseFilterPeriod === 'year') {
        return expDate.getFullYear() === today.getFullYear();
      }
      return true;
    });
  }, [expenses, isAdmin, isPastor, userEmail, expenseFilterPeriod]);

  const availableTabs = useMemo(() => {
    const tabs = ['dashboard', 'calendar', 'members'];
    if (canViewAttendance) tabs.push('attendance');
    if (!isRuchi) tabs.push('expenses');
    if (canViewOfferings) tabs.push('offerings');
    if (canViewPayroll) tabs.push('payroll');
    if (canViewPayroll) tabs.push('reports');
    tabs.push('staff portal');
    return tabs;
  }, [canViewAttendance, canViewOfferings, canViewPayroll, isRuchi, isAdmin]);

  const staffWallets = useMemo(() => {
    const getWallet = (name) => {
      const totalAdv = advances
        .filter((a) => a.staffName?.toLowerCase().includes(name.toLowerCase()))
        .reduce((sum, item) => sum + (item.amount || 0), 0);

      const totalSpent = expenses
        .filter(
          (e) =>
            e.status === 'Approved' &&
            e.paymentSource?.toLowerCase().includes(name.toLowerCase())
        )
        .reduce((sum, item) => sum + (item.amount || 0), 0);

      return { totalAdv, totalSpent, balance: totalAdv - totalSpent };
    };

    return {
      Sumonto: getWallet('Sumonto'),
      Surrender: getWallet('Surrender'),
    };
  }, [advances, expenses]);

  const currentDayOfWeek = new Date().getDay();
  const isMonday = currentDayOfWeek === 1;

  const latePassesUsedThisMonth = useMemo(() => {
    return staffDailyAttendance.filter(
      (a) =>
        (a.email || '').toLowerCase() === userEmail &&
        a.date?.startsWith(currentMonthStr) &&
        a.usedLatePass
    ).length;
  }, [staffDailyAttendance, userEmail, currentMonthStr]);

  const myTodayShift = staffDailyAttendance.find(
    (a) => a.date === todayStr && (a.email || '').toLowerCase() === userEmail
  );

  const visibleTasks = useMemo(() => {
    return taskTemplates.filter((t) => {
      const assigned = t.assignedTo || 'All Staff';
      if (isAdmin || isPastor) return true;
      if (assigned === 'All Staff') return true;
      if (isSumonto && assigned.includes('Sumonto')) return true;
      if (isSurrender && assigned.includes('Surender')) return true;
      if (isRuchi && (assigned.includes('Aruni') || assigned.includes('Ruchi')))
        return true;
      return false;
    });
  }, [taskTemplates, isAdmin, isPastor, isSumonto, isSurrender, isRuchi]);

  const todaySubmittedDWRs = useMemo(() => {
    return staffDailyAttendance.filter(
      (a) => a.date === todayStr && a.dailyWorkReport
    );
  }, [staffDailyAttendance, todayStr]);

  const verifyLocationAndExecute = (actionCallback, bypassGeofence = false) => {
    if (bypassGeofence) {
      actionCallback();
      return;
    }

    if (!navigator.geolocation) {
      alert('Your device or browser does not support GPS Location!');
      return;
    }

    alert('📍 Checking your GPS location at the church premises...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getDistanceFromLatLonInKm(
          latitude,
          longitude,
          CHURCH_COORDS.lat,
          CHURCH_COORDS.lng
        );

        if (dist <= ALLOWED_RADIUS_KM) {
          actionCallback();
        } else {
          alert(
            `❌ Punch Failed! You are ${Math.round(
              dist * 1000
            )} meters away. You must be at the church premises.`
          );
        }
      },
      () => {
        alert('❌ Please ENABLE LOCATION/GPS permissions on your browser.');
      },
      { enableHighAccuracy: true }
    );
  };

  const handlePunchIn = (applyLatePass = false) => {
    if (applyLatePass && latePassesUsedThisMonth >= 2) {
      alert(
        '⚠️ You have already used your 2 allowed Late Passes for this month!'
      );
      return;
    }

    verifyLocationAndExecute(async () => {
      try {
        await addDoc(collection(db, 'staff_attendance'), {
          email: user.email,
          date: todayStr,
          punchInTime: new Date().toISOString(),
          punchOutTime: null,
          breaks: [],
          totalBreakMinutes: 0,
          usedLatePass: applyLatePass,
          dailyWorkReport: '',
          completedTasks: [],
          fieldDutyStatus: 'None',
        });
        alert('✅ Successfully Punched In!');
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  const handlePunchOut = () => {
    if (new Date().getDay() === 0) { alert("Sundays only require Punch In. No Punch Out needed!"); return; }
    if (!myTodayShift) return;

    const startTime = new Date(myTodayShift.punchInTime).getTime();
    const nowTime = new Date().getTime();
    const totalWorkedMinutes =
      Math.round((nowTime - startTime) / 60000) -
      (myTodayShift.totalBreakMinutes || 0);

    if (totalWorkedMinutes < 420) {
      const remainingMins = 420 - totalWorkedMinutes;
      const remHours = Math.floor(remainingMins / 60);
      const remMins = remainingMins % 60;

      const proceed = window.confirm(
        `⏳ Polite Notice: You have completed ${Math.floor(
          totalWorkedMinutes / 60
        )} hrs ${totalWorkedMinutes % 60} mins today. ` +
          `You have ${remHours} hrs ${remMins} mins remaining to complete your 7-hour target.\n\n` +
          `Do you still wish to Punch Out early?`
      );
      if (!proceed) return;
    }

    verifyLocationAndExecute(async () => {
      try {
        await updateDoc(doc(db, 'staff_attendance', myTodayShift.id), {
          punchOutTime: new Date().toISOString(),
        });
        alert(
          "✅ Successfully Punched Out! Don't forget to submit your Daily Work Report before midnight if you haven't already."
        );
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }, myTodayShift.fieldDutyStatus === 'Approved');
  };

  const handleToggleBreak = async () => {
    if (!myTodayShift) return;
    const breaks = [...(myTodayShift.breaks || [])];
    const isCurrentlyOnBreak =
      breaks.length > 0 && !breaks[breaks.length - 1].end;

    if (isCurrentlyOnBreak) {
      breaks[breaks.length - 1].end = new Date().toISOString();
      const startTime = new Date(breaks[breaks.length - 1].start).getTime();
      const endTime = new Date(breaks[breaks.length - 1].end).getTime();
      const minutesUsed = Math.round((endTime - startTime) / 60000);

      await updateDoc(doc(db, 'staff_attendance', myTodayShift.id), {
        breaks: breaks,
        totalBreakMinutes: (myTodayShift.totalBreakMinutes || 0) + minutesUsed,
      });
      alert(`▶️ Resumed work! Used ${minutesUsed} mins for this break.`);
    } else {
      breaks.push({ start: new Date().toISOString(), end: null });
      await updateDoc(doc(db, 'staff_attendance', myTodayShift.id), {
        breaks: breaks,
      });
      alert('☕ Break started. Enjoy!');
    }
  };

  const handleSaveDWR = async () => {
    if (!myTodayShift) {
      alert('Please Punch In first before submitting your Daily Work Report.');
      return;
    }
    if (!dwrText.trim()) {
      alert('Please enter details of what you accomplished today.');
      return;
    }

    await updateDoc(doc(db, 'staff_attendance', myTodayShift.id), {
      dailyWorkReport: dwrText.trim(),
      dwrSubmittedAt: new Date().toISOString(),
    });
    alert('✅ Daily Work Report saved successfully!');
  };

  const handleRequestFieldDuty = async () => {
    if (!myTodayShift) return;
    if (!fieldDutyReason.trim()) {
      alert('Please enter the reason and location for official field duty.');
      return;
    }

    await updateDoc(doc(db, 'staff_attendance', myTodayShift.id), {
      fieldDutyReason: fieldDutyReason.trim(),
      fieldDutyStatus: 'Pending',
    });
    alert('📩 Field Duty request sent to Pastor Robby for approval!');
    setFieldDutyReason('');
  };

  const handleToggleTask = async (taskTitle) => {
    if (!myTodayShift) return;
    const currentCompleted = myTodayShift.completedTasks || [];
    let updated;
    if (currentCompleted.includes(taskTitle)) {
      updated = currentCompleted.filter((t) => t !== taskTitle);
    } else {
      updated = [...currentCompleted, taskTitle];
    }
    await updateDoc(doc(db, 'staff_attendance', myTodayShift.id), {
      completedTasks: updated,
    });
  };

  const handleCreateTaskTemplate = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const daysCount = parseInt(newTaskDays, 10) || 1;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (daysCount - 1));
    const formattedDueDate = targetDate.toISOString().split('T')[0];

    await addDoc(collection(db, 'task_templates'), {
      title: newTaskTitle.trim(),
      assignedTo: newTaskAssignee,
      daysAllowed: daysCount,
      dueDate: formattedDueDate,
      createdBy: user.email,
      createdAt: serverTimestamp(),
    });
    setNewTaskTitle('');
    alert(
      `Task assigned to ${newTaskAssignee} with a ${daysCount}-day deadline (Due: ${formatShortDate(
        formattedDueDate
      )})!`
    );
  };

  const handleDeleteTaskTemplate = async (id) => {
    await deleteDoc(doc(db, 'task_templates', id));
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) {
      alert('Title and Date are required!');
      return;
    }

    await addDoc(collection(db, 'events'), {
      ...eventForm,
      addedBy: user.email,
      createdAt: serverTimestamp(),
    });
    alert('📅 Event added to Church Calendar!');
    setEventForm({
      title: '',
      date: todayStr,
      time: '18:00',
      type: 'Cottage Prayer',
      location: '',
      description: '',
    });
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm('Delete this event from calendar?')) {
      await deleteDoc(doc(db, 'events', id));
    }
  };

  const handleSaveStaffProfile = async (e) => {
    e.preventDefault();

    const adminPassword = prompt(
      '🔐 Enter Admin Password (Nonu@1607) to save bank & staff account details:'
    );
    if (adminPassword === null) return;
    if (adminPassword !== 'Nonu@1607') {
      alert('❌ Incorrect Admin Password! Changes aborted.');
      return;
    }

    if (!staffForm.name || !staffForm.baseSalary || !staffForm.accountNumber) {
      alert('Staff Name, Full Account Number, and Base Salary are required!');
      return;
    }

    const updatedProfiles = { ...staffProfiles };

    if (editingStaffName && editingStaffName !== staffForm.name) {
      delete updatedProfiles[editingStaffName];
    }

    updatedProfiles[staffForm.name] = {
      empId:
        staffForm.empId || `EMP00${Object.keys(updatedProfiles).length + 1}`,
      designation: staffForm.designation || 'Church Staff',
      email: staffForm.email || '',
      bankName: staffForm.bankName || 'Bank Name',
      accountNumber: staffForm.accountNumber || '',
      baseSalary: Number(staffForm.baseSalary),
    };

    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'staff_profiles'), {
        profiles: updatedProfiles,
      });
      setStaffProfiles(updatedProfiles);
      setStaffForm({
        name: '',
        empId: '',
        designation: '',
        email: '',
        bankName: '',
        accountNumber: '',
        baseSalary: '',
      });
      setEditingStaffName(null);
      setShowAddStaffModal(false);
      alert('✅ Staff profile and bank account details saved successfully!');
    } catch (err) {
      alert('Error saving staff profile: ' + err.message);
    }
  };

  const handleEditStaffClick = (name) => {
    const adminPassword = prompt(
      '🔐 Enter Admin Password (Nonu@1607) to edit staff bank details:'
    );
    if (adminPassword === null) return;
    if (adminPassword !== 'Nonu@1607') {
      alert('❌ Incorrect Admin Password!');
      return;
    }

    const prof = staffProfiles[name];
    setEditingStaffName(name);
    setStaffForm({
      name: name,
      empId: prof.empId || '',
      designation: prof.designation || '',
      email: prof.email || '',
      bankName: prof.bankName || '',
      accountNumber: prof.accountNumber || prof.accountLast4 || '',
      baseSalary: prof.baseSalary || '',
    });
    setShowAddStaffModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStaffProfile = async (name) => {
    const adminPassword = prompt(
      '🔐 Enter Admin Password (Nonu@1607) to delete staff account:'
    );
    if (adminPassword === null) return;
    if (adminPassword !== 'Nonu@1607') {
      alert('❌ Incorrect Admin Password!');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${name} from staff payroll & accounts?`
      )
    ) {
      const updatedProfiles = { ...staffProfiles };
      delete updatedProfiles[name];
      try {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'settings', 'staff_profiles'), {
          profiles: updatedProfiles,
        });
        setStaffProfiles(updatedProfiles);
        alert('✅ Staff account deleted successfully!');
      } catch (err) {
        alert('Error deleting staff profile: ' + err.message);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      alert('All password fields are required!');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordForm.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);
      alert('✅ Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      alert('❌ Error updating password: ' + err.message);
    }
  };

  const duplicateNameSet = useMemo(() => {
    const nameCounts = {};
    (members || []).forEach((m) => {
      const cleanName = (m.name || '').trim().toLowerCase();
      if (cleanName) {
        nameCounts[cleanName] = (nameCounts[cleanName] || 0) + 1;
      }
    });
    const set = new Set();
    Object.keys(nameCounts).forEach((name) => {
      if (nameCounts[name] > 1) set.add(name);
    });
    return set;
  }, [members]);

  const filteredMembers = useMemo(() => {
    let list = members || [];
    if (memberSearch.trim()) {
      list = list.filter((m) =>
        (m.name || '').toLowerCase().includes(memberSearch.toLowerCase())
      );
    }
    if (showOnlyMissingDetails) {
      list = list.filter(
        (m) =>
          !m.dob ||
          !m.mobile ||
          !String(m.dob).includes('-') ||
          String(m.mobile).trim() === '' ||
          !(m.name || '').trim().includes(' ')
      );
    }
    if (showInactiveMembers) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffStr = ninetyDaysAgo.toISOString().split('T')[0];

      list = list.filter((m) => {
        let hasBeenPresent = false;
        (attendance || []).forEach((record) => {
          if (
            record.date >= cutoffStr &&
            record.records &&
            record.records[m.id] === 'Present'
          ) {
            hasBeenPresent = true;
          }
        });
        return !hasBeenPresent;
      });
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [
    members,
    memberSearch,
    showOnlyMissingDetails,
    showInactiveMembers,
    attendance,
  ]);

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('Excel file is empty!');
          return;
        }

        let count = 0;
        for (const row of data) {
          const rawName = row.name || row.Name || row['Full Name'] || '';
          if (!rawName) continue;

          let rawDob = row.dob || row.DOB || row['Date of Birth'] || '';
          let rawAnniv = row.anniversary || row.Anniversary || '';

          const cleanDate = (val) => {
            if (!val) return '';
            if (typeof val === 'number') {
              const parsed = XLSX.SSF.parse_date_code(val);
              if (parsed) {
                return `${String(parsed.d).padStart(2, '0')}-${String(
                  parsed.m
                ).padStart(2, '0')}-${parsed.y}`;
              }
            }
            const str = String(val).trim();
            if (str.includes('-')) {
              const parts = str.split('-');
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  return `${parts[2].padStart(2, '0')}-${parts[1].padStart(
                    2,
                    '0'
                  )}-${parts[0]}`;
                }
                return `${parts[0].padStart(2, '0')}-${parts[1].padStart(
                  2,
                  '0'
                )}-${parts[2]}`;
              } else if (parts.length === 2) {
                return `${parts[0].padStart(2, '0')}-${parts[1].padStart(
                  2,
                  '0'
                )}`;
              }
            }
            return str;
          };

          await addDoc(collection(db, 'members'), {
            gender: row.gender || row.Gender || 'Male',
            name: String(rawName).trim(),
            mobile: row.mobile ? String(row.mobile).replace(/\D/g, '') : '',
            dob: cleanDate(rawDob),
            anniversary: cleanDate(rawAnniv),
            address: row.address || row.Address || '',
            customNote: row.note || row.CustomNote || '',
            createdAt: serverTimestamp(),
          });
          count++;
        }
        alert(`Successfully imported ${count} member(s) from Excel!`);
      } catch (err) {
        alert('Error processing Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExportMembersExcel = () => {
    if (members.length === 0) {
      alert('No member records to export!');
      return;
    }
    const exportData = members.map((m) => ({
      Name: m.name,
      Gender: m.gender,
      Mobile: m.mobile || '',
      'Date of Birth': formatShortDate(m.dob),
      Anniversary: formatShortDate(m.anniversary),
      Address: m.address || '',
      'Custom Note': m.customNote || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Church Members');
    XLSX.writeFile(wb, `Apostolic_Church_Members_${todayStr}.xlsx`);
  };

  const {
    todayBirthdays,
    todayAnniversaries,
    monthBirthdays,
    monthAnniversaries,
  } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;

    const todayBday = [];
    const todayAnniv = [];
    const monthBday = [];
    const monthAnniv = [];

    (members || []).forEach((m) => {
      if (m.dob && String(m.dob).includes('-')) {
        const parts = String(m.dob).split('-');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);

        if (month === currentMonth) {
          monthBday.push({ ...m, day });
          if (day === currentDay) todayBday.push(m);
        }
      }

      if (m.anniversary && String(m.anniversary).includes('-')) {
        const parts = String(m.anniversary).split('-');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);

        if (month === currentMonth) {
          monthAnniv.push({ ...m, day });
          if (day === currentDay) todayAnniv.push(m);
        }
      }
    });

    monthBday.sort((a, b) => a.day - b.day);
    monthAnniv.sort((a, b) => a.day - b.day);

    return {
      todayBirthdays: todayBday,
      todayAnniversaries: todayAnniv,
      monthBirthdays: monthBday,
      monthAnniversaries: monthAnniv,
    };
  }, [members]);

  const selectedDateAttendanceMap = useMemo(() => {
    const record = attendance.find((a) => a.date === attendanceDate);
    return record ? record.records || {} : {};
  }, [attendance, attendanceDate]);

  const handleToggleAttendance = async (memberId, currentStatus) => {
    const isToday = attendanceDate === todayStr;
    if (!isToday && !canEditPastAttendance) {
      alert(
        '⚠️ Only Admin Shibu can edit past attendance records. Please contact Admin Shibu with your reason.'
      );
      return;
    }
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    const updatedMap = { ...selectedDateAttendanceMap, [memberId]: newStatus };
    const existingRecord = attendance.find((a) => a.date === attendanceDate);

    try {
      if (existingRecord) {
        await updateDoc(doc(db, 'attendance', existingRecord.id), {
          records: updatedMap,
          updatedBy: user.email,
        });
      } else {
        await addDoc(collection(db, 'attendance'), {
          date: attendanceDate,
          records: updatedMap,
          createdBy: user.email,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      alert('Error saving attendance: ' + err.message);
    }
  };

  const handleAutoCleanDuplicates = async () => {
    const groupedByName = {};
    (members || []).forEach((m) => {
      const cleanName = (m.name || '').trim().toLowerCase();
      if (!groupedByName[cleanName]) groupedByName[cleanName] = [];
      groupedByName[cleanName].push(m);
    });

    const toDeleteIds = [];
    Object.keys(groupedByName).forEach((name) => {
      const group = groupedByName[name];
      if (group.length > 1) {
        group.sort((a, b) => {
          const scoreA = (a.mobile ? 2 : 0) + (a.address ? 1 : 0);
          const scoreB = (b.mobile ? 2 : 0) + (b.address ? 1 : 0);
          return scoreB - scoreA;
        });
        for (let i = 1; i < group.length; i++) {
          toDeleteIds.push(group[i].id);
        }
      }
    });

    if (toDeleteIds.length === 0) {
      alert('No duplicate members found!');
      return;
    }

    if (
      window.confirm(
        `Found ${toDeleteIds.length} duplicate member entry/entries. Remove them?`
      )
    ) {
      for (const id of toDeleteIds) {
        await deleteDoc(doc(db, 'members', id));
      }
      setSelectedMemberIds([]);
      alert('Duplicates successfully cleaned!');
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (
      !memberForm.gender ||
      !memberForm.name ||
      !memberForm.dobDay ||
      !memberForm.dobMonth
    ) {
      alert('Gender, Name, and Date of Birth (Day & Month) are required.');
      return;
    }

    let formattedDob = `${memberForm.dobDay.padStart(
      2,
      '0'
    )}-${memberForm.dobMonth.padStart(2, '0')}`;
    if (memberForm.dobYear) {
      formattedDob += `-${memberForm.dobYear}`;
    }

    const formattedAnniv =
      memberForm.annivDay && memberForm.annivMonth
        ? `${memberForm.annivDay.padStart(
            2,
            '0'
          )}-${memberForm.annivMonth.padStart(2, '0')}`
        : '';

    const payload = {
      gender: memberForm.gender,
      name: memberForm.name,
      mobile: memberForm.mobile,
      dob: formattedDob,
      anniversary: formattedAnniv,
      address: memberForm.address,
      customNote: memberForm.customNote,
    };

    try {
      if (editingMember) {
        await updateDoc(doc(db, 'members', editingMember.id), payload);
        setEditingMember(null);
      } else {
        await addDoc(collection(db, 'members'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setMemberForm({
        gender: '',
        name: '',
        mobile: '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        annivDay: '',
        annivMonth: '',
        address: '',
        customNote: '',
      });
    } catch (err) {
      alert('Error saving member: ' + err.message);
    }
  };

  const handleDeleteMember = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      await deleteDoc(doc(db, 'members', id));
      setSelectedMemberIds((prev) => prev.filter((item) => item !== id));
    }
  }, []);

  const toggleSelectMember = useCallback((id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    }
  };

  const handleDeleteSelectedMembers = async () => {
    if (selectedMemberIds.length === 0) return;
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedMemberIds.length} selected member(s)?`
      )
    ) {
      for (const id of selectedMemberIds) {
        await deleteDoc(doc(db, 'members', id));
      }
      setSelectedMemberIds([]);
      alert('Selected members deleted successfully!');
    }
  };

  const handleEditCustomField = useCallback(async (m) => {
    const newNote = prompt(
      `Add / Edit Custom Field for ${m.name}:`,
      m.customNote || ''
    );
    if (newNote !== null) {
      await updateDoc(doc(db, 'members', m.id), { customNote: newNote });
    }
  }, []);

  const handleEditMember = useCallback((m) => {
    setEditingMember(m);
    let dDay = '',
      dMonth = '',
      dYear = '',
      aDay = '',
      aMonth = '';
    if (m.dob && String(m.dob).includes('-')) {
      const parts = String(m.dob).split('-');
      dDay = String(parseInt(parts[0], 10));
      dMonth = String(parseInt(parts[1], 10));
      if (parts.length === 3) dYear = parts[2];
    }
    if (m.anniversary && String(m.anniversary).includes('-')) {
      const parts = String(m.anniversary).split('-');
      aDay = String(parseInt(parts[0], 10));
      aMonth = String(parseInt(parts[1], 10));
    }

    setMemberForm({
      gender: m.gender || '',
      name: m.name || '',
      mobile: m.mobile || '',
      dobDay: dDay,
      dobMonth: dMonth,
      dobYear: dYear,
      annivDay: aDay,
      annivMonth: aMonth,
      address: m.address || '',
      customNote: m.customNote || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearAllData = async () => {
    const enteredPassword = prompt(
      '⚠️ ENTER SECURITY PASSWORD TO CLEAR ALL DATA:'
    );
    if (enteredPassword === null) return;

    if (enteredPassword === 'Nonu@1607') {
      if (
        window.confirm(
          'Password verified! Are you 100% sure you want to PERMANENTLY ERASE all database records?'
        )
      ) {
        for (const m of members) await deleteDoc(doc(db, 'members', m.id));
        for (const e of expenses) await deleteDoc(doc(db, 'expenses', e.id));
        for (const o of offerings) await deleteDoc(doc(db, 'offerings', o.id));
        for (const a of attendance)
          await deleteDoc(doc(db, 'attendance', a.id));
        for (const adv of advances)
          await deleteDoc(doc(db, 'advances', adv.id));
        for (const sa of staffDailyAttendance)
          await deleteDoc(doc(db, 'staff_attendance', sa.id));
        for (const ev of churchEvents)
          await deleteDoc(doc(db, 'events', ev.id));
        for (const t of taskTemplates)
          await deleteDoc(doc(db, 'task_templates', t.id));
        setSelectedMemberIds([]);
        alert('All app data has been successfully cleared!');
      }
    } else {
      alert('❌ Incorrect Password! Clear All Data operation aborted.');
    }
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(
        'File size exceeds 2MB limit! Please upload a smaller image or screenshot.'
      );
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setExpenseForm((prev) => ({
        ...prev,
        receiptFile: evt.target.result,
        receiptName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleOfferingFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(
        'File size exceeds 2MB limit! Please upload a smaller image or scan.'
      );
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setOfferingForm((prev) => ({
        ...prev,
        receiptFile: evt.target.result,
        receiptName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDailyFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setDailyFileObj({ file: evt.target.result, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDailySheet = async () => {
    if (!dailyFileObj.file) {
      alert('Please choose a file to upload first!');
      return;
    }
    try {
      await addDoc(collection(db, 'daily_sheets'), {
        date: selectedDailyDate,
        file: dailyFileObj.file,
        name: dailyFileObj.name,
        note: dailyFileObj.note || '',
        createdAt: serverTimestamp()
      });
      setShowDailySheetModal(false);
      setDailyFileObj({ file: null, name: '', note: '' });
      alert(`✅ Daily collection sheet saved successfully for ${selectedDailyDate}!`);
    } catch (err) {
      alert('Error saving counting sheet: ' + err.message);
    }
  };
  const handleAddAdvance = async (e) => {
    e.preventDefault();
    if (!advanceForm.amount) {
      alert('Amount is required!');
      return;
    }
    try {
      await addDoc(collection(db, 'advances'), {
        staffName: advanceForm.staffName,
        amount: Number(advanceForm.amount),
        date: advanceForm.date,
        note: advanceForm.note || '',
        givenBy: user.email,
        createdAt: serverTimestamp(),
      });
      alert(
        `₹${advanceForm.amount} Advance recorded for ${advanceForm.staffName}!`
      );
      setAdvanceForm({
        staffName: 'Sumonto Christian',
        amount: '',
        date: todayStr,
        note: '',
      });
    } catch (err) {
      alert('Error recording advance: ' + err.message);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.category) {
      alert('Amount and Category are required.');
      return;
    }

    if (!expenseForm.missingBill && !expenseForm.receiptFile) {
      alert(
        '⚠️ Attaching a Bill / Receipt is MANDATORY unless you select "Submit Without Bill" with justification.'
      );
      return;
    }

    if (
      expenseForm.missingBill &&
      !expenseForm.missingBillJustification.trim()
    ) {
      alert(
        '⚠️ You selected to submit without a bill! You MUST enter a proper justification/reason for Pastor Robby.'
      );
      return;
    }

    const isPastDate = expenseForm.date < todayStr;
    if (isPastDate && !expenseForm.delayReason.trim()) {
      alert(
        '⚠️ This bill is not from today! You MUST enter a logical reason for the delayed submission before proceeding.'
      );
      return;
    }

    try {
      const payload = {
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        detail: expenseForm.detail || '',
        date: expenseForm.date,
        receiptFile: expenseForm.missingBill ? null : expenseForm.receiptFile,
        receiptName: expenseForm.missingBill
          ? 'No Bill Attached (Justified)'
          : expenseForm.receiptName || 'Attached Bill',
        missingBill: expenseForm.missingBill,
        missingBillJustification: expenseForm.missingBill
          ? expenseForm.missingBillJustification.trim()
          : '',
        justification: '',
        delayReason: isPastDate ? expenseForm.delayReason.trim() : '',
        paymentSource: expenseForm.paymentSource,
        status: 'Pending',
        rejectionReason: '',
        addedBy: user.email,
        updatedAt: serverTimestamp(),
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), payload);
        setEditingExpense(null);
        alert('Expense resubmitted to Pastor Robby for approval!');
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        alert('Expense submitted successfully to Pastor Robby for review!');
      }

      setExpenseForm({
        amount: '',
        category: '',
        detail: '',
        date: todayStr,
        receiptFile: null,
        receiptName: '',
        missingBill: false,
        missingBillJustification: '',
        delayReason: '',
        paymentSource: 'Direct UPI by Pastor Robby',
      });
    } catch (err) {
      alert('Error saving expense: ' + err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (
      window.confirm('Are you sure you want to delete this expense record?')
    ) {
      await deleteDoc(doc(db, 'expenses', id));
    }
  };

  const handleRejectExpense = async (expenseId) => {
    const reason = prompt(
      'Please enter the reason for rejecting this expense:'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert('⚠️ Rejection reason is required!');
      return;
    }
    await updateDoc(doc(db, 'expenses', expenseId), {
      status: 'Rejected',
      rejectionReason: reason.trim(),
      reviewedBy: user.email,
      reviewedAt: serverTimestamp(),
    });
    alert('Expense rejected with reason!');
  };

  const handleApproveExpense = async (expenseId) => {
    await updateDoc(doc(db, 'expenses', expenseId), {
      status: 'Approved',
      reviewedBy: user.email,
      reviewedAt: serverTimestamp(),
    });
    alert('Expense approved successfully!');
  };

  const handleEditExpenseClick = (eItem) => {
    setEditingExpense(eItem);
    setExpenseForm({
      amount: eItem.amount,
      category: eItem.category,
      detail: eItem.detail || '',
      date: eItem.date,
      receiptFile: eItem.receiptFile || null,
      receiptName: eItem.receiptName || '',
      missingBill: eItem.missingBill || false,
      missingBillJustification: eItem.missingBillJustification || '',
      delayReason: eItem.delayReason || '',
      paymentSource: eItem.paymentSource || 'Direct UPI by Pastor Robby',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfferingCategoryChange = (e) => {
    const selected = e.target.value;
    if (selected === 'ADD_NEW') {
      const newCat = prompt(
        'Enter new offering category name (e.g., Youth Offering, Thanksgiving):'
      );
      if (newCat && newCat.trim() !== '') {
        const cleanCat = newCat.trim();
        if (!offeringCategories.includes(cleanCat)) {
          setOfferingCategories([...offeringCategories, cleanCat]);
        }
        setOfferingForm({ ...offeringForm, category: cleanCat });
      }
    } else {
      setOfferingForm({ ...offeringForm, category: selected });
    }
  };

  const handleSaveOffering = async (e) => {
    e.preventDefault();
    if (!offeringForm.amount || !offeringForm.category) {
      alert('Amount and Category are required.');
      return;
    }
    if (offeringForm.category === 'Tithe' && !offeringForm.memberName) {
      alert(
        '⚠️ Tithes must be recorded with a member name or Anonymous! Please select.'
      );
      return;
    }

    try {
      const payload = {
        memberName: offeringForm.memberName || 'Anonymous (Given Anonymously)',
        category: offeringForm.category,
        amount: Number(offeringForm.amount),
        method: offeringForm.method || 'Cash',
        note: offeringForm.note || '',
        date: offeringForm.date,
        receiptFile: offeringForm.receiptFile || null,
        receiptName: offeringForm.receiptName || '',
        updatedBy: user.email,
      };

      if (editingOffering) {
        await updateDoc(doc(db, 'offerings', editingOffering.id), payload);
        setEditingOffering(null);
        alert('Offering record updated successfully!');
      } else {
        await addDoc(collection(db, 'offerings'), {
          ...payload,
          addedBy: user.email,
          createdAt: serverTimestamp(),
        });
        alert('Offering / Tithe recorded successfully!');
      }

      setOfferingForm({
        memberName: 'Anonymous (Given Anonymously)',
        category: 'Tithe',
        amount: '',
        method: 'Cash',
        note: '',
        date: todayStr,
        receiptFile: null,
        receiptName: '',
      });
    } catch (err) {
      alert('Error saving offering: ' + err.message);
    }
  };

  const handleEditOfferingClick = (o) => {
    setEditingOffering(o);
    setOfferingForm({
      memberName: o.memberName || 'Anonymous (Given Anonymously)',
      category: o.category,
      amount: o.amount,
      method: o.method || 'Cash',
      note: o.note || '',
      date: o.date,
      receiptFile: o.receiptFile || null,
      receiptName: o.receiptName || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteOffering = async (id) => {
    if (
      window.confirm('Are you sure you want to delete this offering record?')
    ) {
      await deleteDoc(doc(db, 'offerings', id));
    }
  };

  const hasAnyData =
    (members || []).length > 0 ||
    (expenses || []).length > 0 ||
    (offerings || []).length > 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyOfferingTotal = (offerings || [])
    .filter((o) => {
      const d = new Date(o.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const monthlyExpenseTotal = (expenses || [])
    .filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        e.status === 'Approved'
      );
    })
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const pendingExpensesCount = (expenses || []).filter(
    (e) => e.status === 'Pending'
  ).length;

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: '#6b21a8',
          backgroundColor: '#f8fafc',
          height: '100vh',
          fontWeight: 'bold',
        }}
      >
        Loading Apostolic Faith Church...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        color: '#1e293b',
        minHeight: '100vh',
        fontFamily: 'sans-serif',
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#6b21a8',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(107, 33, 168, 0.2)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/church-logo.png"
            alt="Church Logo"
            style={{
              width: '52px',
              height: '52px',
              objectFit: 'contain',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              padding: '2px',
            }}
          />
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                letterSpacing: '0.5px',
              }}
            >
              Apostolic Faith Church
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#f3e8ff',
                fontWeight: 'bold',
                letterSpacing: '1px',
                marginTop: '2px',
              }}
            >
              BIRTH. BUILD. BLESS.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            textAlign: 'right',
          }}
        >
          {userProfilePic && (
            <img
              src={userProfilePic}
              alt="Profile"
              style={{
                width: '56px',
                height: '56px',
                objectFit: 'cover',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: '12px',
                color: '#e9d5ff',
                marginBottom: '6px',
              }}
            >
              Logged in as: <strong>{user.email}</strong> ({userRole})
            </div>
            <button
              onClick={signOutUser}
              style={{
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {availableTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              textTransform: 'capitalize',
              border: activeTab === tab ? 'none' : '1px solid #cbd5e1',
              cursor: 'pointer',
              backgroundColor: activeTab === tab ? '#7e22ce' : '#ffffff',
              color: activeTab === tab ? '#ffffff' : '#475569',
              boxShadow:
                activeTab === tab
                  ? '0 2px 6px rgba(126, 34, 206, 0.3)'
                  : '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {tab === 'offerings'
              ? 'Offering & Tithes'
              : tab === 'payroll'
              ? 'Payroll & Slips'
              : tab}
          </button>
        ))}
      </div>

      {activeTab === 'calendar' && (
        <div>
          <h2 style={{ color: '#6b21a8', marginBottom: '16px' }}>
            Church Calendar & Events
          </h2>

          {(isPastor || isAdmin) && (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 14px 0',
                  color: '#6b21a8',
                  fontSize: '16px',
                }}
              >
                + Schedule Church Event
              </h3>
              <form
                onSubmit={handleSaveEvent}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    placeholder="Event Title *"
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title: e.target.value })
                    }
                    required
                    style={{
                      flex: 2,
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                    }}
                  />
                  <select
                    value={eventForm.type}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, type: e.target.value })
                    }
                    style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="Cottage Prayer">Cottage Prayer</option>
                    <option value="House Visit">House Visit</option>
                    <option value="Prayer Meeting">Prayer Meeting</option>
                    <option value="Sunday Service">Sunday Service</option>
                    <option value="Youth Event">Youth Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, date: e.target.value })
                    }
                    required
                    style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                    }}
                  />
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, time: e.target.value })
                    }
                    style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                    }}
                  />
                </div>

                <input
                  placeholder="Location / Member Name (e.g. Bro. Kishore's Residence)"
                  value={eventForm.location}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, location: e.target.value })
                  }
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                />

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(234,88,12,0.2)',
                  }}
                >
                  📅 Add Event to Calendar
                </button>
              </form>
            </div>
          )}

          <h3 style={{ color: '#1e293b' }}>
            Upcoming Events ({churchEvents.length})
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {churchEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      backgroundColor: '#f3e8ff',
                      color: '#6b21a8',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {ev.type}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      style={{
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <h4
                  style={{
                    margin: '10px 0 6px 0',
                    color: '#1e293b',
                    fontSize: '16px',
                  }}
                >
                  {ev.title}
                </h4>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  📅 <strong>Date:</strong> {ev.date} at {ev.time}
                </div>
                {ev.location && (
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#64748b',
                      marginTop: '4px',
                    }}
                  >
                    📍 <strong>Location:</strong> {ev.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && canViewPayroll && (
        <div>
          <h2 style={{ color: '#6b21a8', marginBottom: '16px' }}>
            Church Reports & Analytics Hub
          </h2>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                margin: '0 0 14px 0',
                fontSize: '16px',
                color: '#6b21a8',
              }}
            >
              📥 Pull Custom & Time-Based Reports
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginBottom: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Select Report Module:
                </label>
                <select
                  value={reportModule}
                  onChange={(e) => setReportModule(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                  }}
                >
                  <option value="expenses">💸 Expenses & Bills</option>
                  <option value="offerings">💰 Offerings & Tithes</option>
                  <option value="attendance">
                    ⏱️ Staff Attendance & Shifts
                  </option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Timeframe Filter:
                </label>
                <select
                  value={reportTimeframe}
                  onChange={(e) => setReportTimeframe(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                  }}
                >
                  <option value="weekly">📅 Past 1 Week (Weekly)</option>
                  <option value="monthly">🗓️ Past 1 Month (Monthly)</option>
                  <option value="yearly">📊 Past 1 Year (Yearly)</option>
                  <option value="custom">⚙️ Custom Date Range</option>
                </select>
              </div>

              {reportTimeframe === 'custom' && (
                <>
                  <div>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#475569',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      From Date:
                    </label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '10px',
                        borderRadius: '8px',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#475569',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      To Date:
                    </label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '10px',
                        borderRadius: '8px',
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownloadCustomReportExcel}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
                }}
              >
                📥 Download Report ({reportTimeframe.toUpperCase()}) - Excel
              </button>

              <button
                onClick={() => window.print()}
                style={{
                  backgroundColor: '#7e22ce',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(126,34,206,0.2)',
                }}
              >
                🖨️ Print / Save PDF View
              </button>
            </div>
          </div>

          <h3 style={{ color: '#1e293b' }}>
            Report Preview ({filteredReportData.length} records found)
          </h3>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {filteredReportData.length > 0 ? (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                    <th
                      style={{
                        padding: '8px',
                        border: '1px solid #cbd5e1',
                        textAlign: 'left',
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: '8px',
                        border: '1px solid #cbd5e1',
                        textAlign: 'left',
                      }}
                    >
                      Module / Details
                    </th>
                    <th
                      style={{
                        padding: '8px',
                        border: '1px solid #cbd5e1',
                        textAlign: 'right',
                      }}
                    >
                      Amount / Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportData.map((item, idx) => (
                    <tr key={idx}>
                      <td
                        style={{ padding: '8px', border: '1px solid #cbd5e1' }}
                      >
                        {item.date || '—'}
                      </td>
                      <td
                        style={{ padding: '8px', border: '1px solid #cbd5e1' }}
                      >
                        {item.category || item.title || item.email || 'Record'}{' '}
                        —{' '}
                        <em>
                          {item.detail ||
                            item.memberName ||
                            item.dailyWorkReport ||
                            ''}
                        </em>
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: item.amount ? '#16a34a' : '#475569',
                        }}
                      >
                        {item.amount
                          ? `₹${item.amount}`
                          : item.status || 'Recorded'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px',
                  color: '#64748b',
                }}
              >
                No records found for this custom timeframe filter.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && canViewPayroll && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <h2 style={{ margin: 0, color: '#6b21a8' }}>
              Payroll & Salary Slips
            </h2>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#475569',
                }}
              >
                Select Month:
              </label>
              <input
                type="month"
                value={selectedPayrollMonth}
                onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  color: '#1e293b',
                  fontWeight: 'bold',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {Object.keys(staffProfiles).map((staffName) => {
              const profile = staffProfiles[staffName];

              const monthShifts = staffDailyAttendance.filter(
                (a) =>
                  (a.email || '').toLowerCase() ===
                    (profile.email || '').toLowerCase() &&
                  a.date?.startsWith(selectedPayrollMonth)
              );

              const staffOffs = STAFF_WEEKLY_OFFS[staffName] || [];
              const weeklyOffs = staffOffs.length * 4;
              const totalDaysInMonth = Math.max(1, 30 - weeklyOffs);
              const completedDays = monthShifts.length;
              const approvedLeaves = 0;
              const unpaidLeaves = Math.max(
                0,
                totalDaysInMonth - completedDays - approvedLeaves
              );

              const baseSalary = profile.baseSalary || 0;
              const perDayRate = baseSalary / totalDaysInMonth;
              const lossOfPay = unpaidLeaves * perDayRate;
              const netPayable = Math.max(0, baseSalary - lossOfPay);

              return (
                <div
                  key={staffName}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: '#6b21a8',
                          fontSize: '17px',
                        }}
                      >
                        {staffName}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {profile.designation} ({profile.empId})
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#16a34a',
                      }}
                    >
                      ₹{netPayable.toFixed(2)}
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '12px',
                      color: '#334155',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      📊 <strong>Base Monthly Salary:</strong> ₹
                      {baseSalary.toLocaleString('en-IN')}
                    </div>
                    <div>
                      🏦 <strong>Bank & A/c:</strong> {profile.bankName} (
                      {profile.accountNumber || profile.accountLast4})
                    </div>
                    <div>
                      🗓️ <strong>Completed Days:</strong> {completedDays} /{' '}
                      {totalDaysInMonth}
                    </div>
                    <div>
                      ❌ <strong>Unpaid Days (Loss of Pay):</strong>{' '}
                      {unpaidLeaves} days
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedSalarySlipStaff({
                        staffName,
                        profile,
                        selectedPayrollMonth,
                        totalDaysInMonth,
                        completedDays,
                        weeklyOffs,
                        unpaidLeaves,
                        baseSalary,
                        perDayRate,
                        lossOfPay,
                        netPayable,
                      })
                    }
                    style={{
                      width: '100%',
                      backgroundColor: '#7e22ce',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(126,34,206,0.2)',
                    }}
                  >
                    📄 View & Print Salary Slip
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedSalarySlipStaff && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <button
                onClick={() => window.print()}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🖨️ Print / Download PDF
              </button>
              <button
                onClick={() => setSelectedSalarySlipStaff(null)}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ❌ Close
              </button>
            </div>

            <div
              id="salary-slip-print"
              style={{
                border: '2px solid #3b0764',
                padding: '20px',
                borderRadius: '8px',
                color: '#000',
                backgroundColor: '#fff',
                fontFamily: 'serif',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  borderBottom: '2px solid #3b0764',
                  paddingBottom: '10px',
                  marginBottom: '14px',
                }}
              >
                <img
                  src="/church-logo.png"
                  alt="Logo"
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'contain',
                  }}
                />
                <h1
                  style={{
                    margin: '4px 0 0 0',
                    color: '#3b0764',
                    fontSize: '26px',
                    fontWeight: 'bold',
                  }}
                >
                  Apostolic Faith Church
                </h1>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#6b21a8',
                    letterSpacing: '1px',
                  }}
                >
                  BIRTH. BUILD. BLESS.
                </div>
                <h3
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: '16px',
                    color: '#1e293b',
                  }}
                >
                  Salary Slip -{' '}
                  {
                    MONTH_NAMES[
                      parseInt(
                        selectedSalarySlipStaff.selectedPayrollMonth.split(
                          '-'
                        )[1],
                        10
                      ) - 1
                    ]
                  }{' '}
                  {selectedSalarySlipStaff.selectedPayrollMonth.split('-')[0]}
                </h3>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  marginBottom: '14px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <strong>Slip No.</strong>
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      SAL-{selectedSalarySlipStaff.selectedPayrollMonth}-001
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <strong>Employee ID</strong>
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      {selectedSalarySlipStaff.profile.empId}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <strong>Employee Name</strong>
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      {selectedSalarySlipStaff.staffName}
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <strong>Designation</strong>
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      {selectedSalarySlipStaff.profile.designation}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <strong>Bank Name</strong>
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      {selectedSalarySlipStaff.profile.bankName}
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <strong>A/c Number</strong>
                    </td>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      {selectedSalarySlipStaff.profile.accountNumber ||
                        selectedSalarySlipStaff.profile.accountLast4}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  marginBottom: '14px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#3b0764', color: '#fff' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>
                      EARNINGS & DEDUCTIONS
                    </th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>
                      AMOUNT (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                      Basic Monthly Salary
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        textAlign: 'right',
                      }}
                    >
                      ₹{selectedSalarySlipStaff.baseSalary.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        color: '#dc2626',
                      }}
                    >
                      Deductions: Loss of Pay (
                      {selectedSalarySlipStaff.unpaidLeaves} Days)
                    </td>
                    <td
                      style={{
                        padding: '6px',
                        border: '1px solid #cbd5e1',
                        textAlign: 'right',
                        color: '#dc2626',
                      }}
                    >
                      - ₹{selectedSalarySlipStaff.lossOfPay.toFixed(2)}
                    </td>
                  </tr>
                  <tr
                    style={{
                      backgroundColor: '#f3e8ff',
                      fontWeight: 'bold',
                      fontSize: '14px',
                    }}
                  >
                    <td
                      style={{
                        padding: '8px',
                        border: '1px solid #cbd5e1',
                        color: '#3b0764',
                      }}
                    >
                      NET SALARY PAYABLE
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        border: '1px solid #cbd5e1',
                        textAlign: 'right',
                        color: '#3b0764',
                      }}
                    >
                      ₹{selectedSalarySlipStaff.netPayable.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginBottom: '14px',
                  color: '#1e293b',
                }}
              >
                ({numberToWords(selectedSalarySlipStaff.netPayable)})
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '10px',
                  color: '#64748b',
                  marginTop: '20px',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '10px',
                }}
              >
                This is a system-generated salary slip from AFC Connect and does
                not require a physical signature.
                <br />
                <strong>
                  JE-7, Rear Basement, Next to Durga Medicos, Khirki Extension,
                  Malviya Nagar, New Delhi-110017 | afcmediadelhi@gmail.com
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'staff portal' && (
        <div>
          <h2 style={{ color: '#6b21a8', marginBottom: '16px' }}>
            Staff Portal
          </h2>
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#6b21a8' }}>📜 Church Rules & Regulations</h3>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>Click below to view the official signed letter from Pastor Robby.</p>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {rulesDocUrl ? (
              <button 
              onClick={() => {
                const win = window.open();
                win.document.write(`<iframe src="${rulesDocUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
              }}
              style={{ backgroundColor: '#6b21a8', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'inline-block' }}
            >
              👀 View Rules & Regulations Letter
            </button>
              ) : (
                <span style={{ fontSize: '13px', color: '#dc2626', fontStyle: 'italic' }}>No document uploaded yet.</span>
              )}

              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  <input type="file" onChange={(e) => setRulesFile(e.target.files[0])} style={{ fontSize: '12px' }} />
                  <button onClick={handleUploadRulesDoc} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📤 Upload / Update Letter
                  </button>
                </div>
              )}
            </div>
          </div>

          {isMonday && (isSumonto || isRuchi) && (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                color: '#166534',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <h3 style={{ margin: 0 }}>🎉 Happy Monday Off!</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>
                Enjoy your day of rest. You do not need to punch in today.
              </p>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', color: '#6b21a8' }}>
                Daily Shift Attendance
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginBottom: '16px',
                }}
              >
                Work Hours: 10:00 AM - 6:00 PM (Net Target: 7 Hours) <br />
                Late Passes Used This Month:{' '}
                <strong style={{ color: '#ea580c' }}>
                  {latePassesUsedThisMonth} / 2
                </strong>
              </p>

              {!myTodayShift ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <button
                    onClick={() => handlePunchIn(false)}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
                    }}
                  >
                    📍 Normal Punch In (On Time)
                  </button>

                  <button
                    onClick={() => handlePunchIn(true)}
                    style={{
                      backgroundColor: '#ea580c',
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(234,88,12,0.2)',
                    }}
                  >
                    ⏰ Punch In with 2-Hour Late Pass (Used:{' '}
                    {latePassesUsedThisMonth}/2)
                  </button>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        color: '#16a34a',
                        fontWeight: 'bold',
                        fontSize: '13px',
                      }}
                    >
                      ✅ Punched In at:{' '}
                      {new Date(myTodayShift.punchInTime).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </div>
                    {myTodayShift.usedLatePass && (
                      <div
                        style={{
                          color: '#d97706',
                          fontSize: '11px',
                          marginTop: '2px',
                          fontWeight: 'bold',
                        }}
                      >
                        ⏰ Applied 2-Hour Late Pass
                      </div>
                    )}

                    {myTodayShift.punchOutTime && (
                      <div
                        style={{
                          color: '#dc2626',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          marginTop: '6px',
                        }}
                      >
                        🏁 Punched Out at:{' '}
                        {new Date(myTodayShift.punchOutTime).toLocaleTimeString(
                          [],
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        color: '#475569',
                        fontSize: '11px',
                        marginTop: '6px',
                      }}
                    >
                      ☕ Break Minutes Used:{' '}
                      {myTodayShift.totalBreakMinutes || 0} / 60 mins
                    </div>
                  </div>

                  {!myTodayShift.punchOutTime && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        flexDirection: 'column',
                      }}
                    >
                      {myTodayShift.breaks &&
                      myTodayShift.breaks.length > 0 &&
                      !myTodayShift.breaks[myTodayShift.breaks.length - 1]
                        .end ? (
                        <button
                          onClick={handleToggleBreak}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          ▶️ Resume Work (End Break)
                        </button>
                      ) : (
                        <button
                          onClick={handleToggleBreak}
                          style={{
                            backgroundColor: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          ☕ Start Break
                        </button>
                      )}

                      <button
                        onClick={handlePunchOut}
                        style={{
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          marginTop: '6px',
                        }}
                      >
                        🏁 Punch Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#7e22ce' }}>
                🔒 Change Account Password
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginBottom: '14px',
                }}
              >
                Update your login password securely.
              </p>

              <form
                onSubmit={handleChangePassword}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <input
                  type="password"
                  placeholder="Current Password *"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  required
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <input
                  type="password"
                  placeholder="New Password (min 6 chars) *"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  required
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <input
                  type="password"
                  placeholder="Confirm New Password *"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#7e22ce',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  🔐 Update Password
                </button>
              </form>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>
                Daily Task Checklist
              </h3>

              {(isPastor || isAdmin) && (
                <form
                  onSubmit={handleCreateTaskTemplate}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '14px',
                  }}
                >
                  <input
                    placeholder="New Checklist Item..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <option value="All Staff">Assign to: All Staff</option>
                      {Object.keys(staffProfiles).map((sName) => (
                        <option key={sName} value={sName}>
                          Assign to: {sName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={newTaskDays}
                      onChange={(e) => setNewTaskDays(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <option value="1">Deadline: 1 Day</option>
                      <option value="2">Deadline: 2 Days</option>
                      <option value="3">Deadline: 3 Days</option>
                      <option value="5">Deadline: 5 Days</option>
                      <option value="7">Deadline: 7 Days</option>
                    </select>

                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      + Add Task
                    </button>
                  </div>
                </form>
              )}

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {visibleTasks.length > 0 ? (
                  visibleTasks.map((task) => {
                    const isChecked = (
                      myTodayShift?.completedTasks || []
                    ).includes(task.title);
                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              color: isChecked ? '#16a34a' : '#1e293b',
                              fontWeight: isChecked ? 'bold' : 'normal',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleTask(task.title)}
                              disabled={!myTodayShift}
                              style={{ accentColor: '#16a34a' }}
                            />
                            <span
                              style={{
                                textDecoration: isChecked
                                  ? 'line-through'
                                  : 'none',
                              }}
                            >
                              {task.title}
                            </span>
                          </label>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTaskTemplate(task.id)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#dc2626',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      color: '#64748b',
                      fontSize: '12px',
                      textAlign: 'center',
                      padding: '10px',
                    }}
                  >
                    No tasks assigned specifically to you today.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div>
          <h2 style={{ color: '#6b21a8', marginBottom: '16px' }}>Dashboard</h2>
          
          {/* Today's Special Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#6b21a8' }}>
                🎂 Today's Birthdays ({todayBirthdays.length})
              </h3>
              {todayBirthdays.length > 0 ? (
                todayBirthdays.map((m) => (
                  <div key={m.id} style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                    <strong>{m.name}</strong> ({m.mobile || 'No Mobile'})
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>No birthdays today.</div>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#6b21a8' }}>
                💍 Today's Marriage Anniversaries ({todayAnniversaries.length})
              </h3>
              {todayAnniversaries.length > 0 ? (
                todayAnniversaries.map((m) => (
                  <div key={m.id} style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                    <strong>{m.name}</strong> ({m.mobile || 'No Mobile'})
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>No anniversaries today.</div>
              )}
            </div>
          </div>

          {/* Current Month's Special Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#6b21a8' }}>
                🎈 This Month's Birthdays ({monthBirthdays.length})
              </h3>
              {monthBirthdays.length > 0 ? (
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {monthBirthdays.map((m) => (
                    <div key={m.id} style={{ fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                      <strong>{m.day}th</strong>: {m.name} ({m.mobile || 'No Mobile'})
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>No birthdays this month.</div>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#6b21a8' }}>
                🎊 This Month's Marriage Anniversaries ({monthAnniversaries.length})
              </h3>
              {monthAnniversaries.length > 0 ? (
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {monthAnniversaries.map((m) => (
                    <div key={m.id} style={{ fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                      <strong>{m.day}th</strong>: {m.name} ({m.mobile || 'No Mobile'})
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b' }}>No anniversaries this month.</div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, color: '#6b21a8', fontSize: '16px' }}>
                    Staff & Bank Accounts Manager (Secured by Password)
                  </h3>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      margin: '4px 0 0 0',
                    }}
                  >
                    Manage staff accounts, full bank account numbers, and base
                    salaries for future salary slips.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddStaffModal(!showAddStaffModal)}
                  style={{
                    backgroundColor: '#7e22ce',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(126,34,206,0.2)',
                  }}
                >
                  {showAddStaffModal
                    ? '✕ Close Form'
                    : '➕ Add New Staff / Bank Account'}
                </button>
              </div>

              {showAddStaffModal && (
                <div
                  style={{
                    marginTop: '16px',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '16px',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 10px 0',
                      fontSize: '14px',
                      color: '#d97706',
                    }}
                  >
                    {editingStaffName
                      ? `🔐 Edit Staff Profile (${editingStaffName})`
                      : '🔐 Enter New Staff Details'}
                  </h4>

                  <form
                    onSubmit={handleSaveStaffProfile}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        placeholder="Full Official Name *"
                        value={staffForm.name}
                        onChange={(e) =>
                          setStaffForm({ ...staffForm, name: e.target.value })
                        }
                        required
                        style={{
                          flex: 2,
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      />
                      <input
                        placeholder="Employee ID (e.g. EMP004)"
                        value={staffForm.empId}
                        onChange={(e) =>
                          setStaffForm({ ...staffForm, empId: e.target.value })
                        }
                        style={{
                          flex: 1,
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        placeholder="Designation (e.g. Church Staff)"
                        value={staffForm.designation}
                        onChange={(e) =>
                          setStaffForm({
                            ...staffForm,
                            designation: e.target.value,
                          })
                        }
                        style={{
                          flex: 1,
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      />
                      <input
                        placeholder="Email Address"
                        value={staffForm.email}
                        onChange={(e) =>
                          setStaffForm({ ...staffForm, email: e.target.value })
                        }
                        style={{
                          flex: 1,
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        placeholder="Bank Name (e.g. HDFC Bank)"
                        value={staffForm.bankName}
                        onChange={(e) =>
                          setStaffForm({
                            ...staffForm,
                            bankName: e.target.value,
                          })
                        }
                        style={{
                          flex: 2,
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      />
                      <input
                        placeholder="Full Bank A/c Number * (e.g. 123456789012)"
                        value={staffForm.accountNumber}
                        onChange={(e) =>
                          setStaffForm({
                            ...staffForm,
                            accountNumber: e.target.value,
                          })
                        }
                        required
                        style={{
                          flex: 2,
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Base Monthly Salary (₹) *"
                        value={staffForm.baseSalary}
                        onChange={(e) =>
                          setStaffForm({
                            ...staffForm,
                            baseSalary: e.target.value,
                          })
                        }
                        required
                        style={{
                          flex: 1,
                          backgroundColor: '#f8fafc',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                        }}
                      />
                    </div>

                    <div
                      style={{ display: 'flex', gap: '8px', marginTop: '6px' }}
                    >
                      <button
                        type="submit"
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        {editingStaffName
                          ? '🔒 Update Staff Profile'
                          : '🔒 Save New Staff Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddStaffModal(false);
                          setEditingStaffName(null);
                          setStaffForm({
                            name: '',
                            empId: '',
                            designation: '',
                            email: '',
                            bankName: '',
                            accountNumber: '',
                            baseSalary: '',
                          });
                        }}
                        style={{
                          backgroundColor: '#e2e8f0',
                          color: '#334155',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div
                style={{
                  marginTop: '16px',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '12px',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '13px',
                    color: '#6b21a8',
                  }}
                >
                  Active Staff Accounts ({Object.keys(staffProfiles).length}):
                </h4>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {Object.keys(staffProfiles).map((sName) => {
                    const prof = staffProfiles[sName];
                    return (
                      <div
                        key={sName}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '10px',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <strong>{sName}</strong> ({prof.designation}) — 💳{' '}
                          {prof.bankName} (A/c:{' '}
                          <strong>
                            {prof.accountNumber || prof.accountLast4}
                          </strong>
                          ) — 💰 ₹{prof.baseSalary?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleEditStaffClick(sName)}
                            style={{
                              backgroundColor: '#e2e8f0',
                              color: '#6b21a8',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            🔐 Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStaffProfile(sName)}
                            style={{
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Total Members
              </h3>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#6b21a8',
                }}
              >
                {members.length}
              </p>
            </div>
            {canViewOfferings && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Monthly Offering
                </h3>
                <p
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#16a34a',
                  }}
                >
                  ₹{monthlyOfferingTotal}
                </p>
              </div>
            )}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Monthly Expenses
              </h3>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#dc2626',
                }}
              >
                ₹{monthlyExpenseTotal}
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Pending Expenses
              </h3>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ea580c',
                }}
              >
                {pendingExpensesCount}
              </p>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'members' && (
        <div>
          {isAdmin && duplicateNameSet.size > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                color: '#92400e',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                ⚠️ Warning: {duplicateNameSet.size} duplicate member name(s)
                detected!
              </div>
              <button
                onClick={handleAutoCleanDuplicates}
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🧹 Clean Duplicates
              </button>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <h2 style={{ margin: 0, color: '#6b21a8' }}>
              Church Members ({members.length})
            </h2>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isAdmin && (
                <label
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  📤 Upload Excel Sheet
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              <button
                onClick={handleExportMembersExcel}
                style={{
                  backgroundColor: '#7e22ce',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                📊 Download Excel Report
              </button>

              {isAdmin && hasAnyData && (
                <button
                  onClick={handleClearAllData}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  🔒 Clear All Data
                </button>
              )}
            </div>
          </div>

          {canAddMember && (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  color: '#6b21a8',
                }}
              >
                {editingMember ? 'Edit Member Details' : '+ Add New Member'}
              </h3>
              <form
                onSubmit={handleSaveMember}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <select
                  value={memberForm.gender}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, gender: e.target.value })
                  }
                  required
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                >
                  <option value="">Select Gender *</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                <input
                  placeholder="Full Name *"
                  value={memberForm.name}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, name: e.target.value })
                  }
                  required
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                />

                <input
                  type="tel"
                  placeholder="Mobile Number (10 digits)"
                  value={memberForm.mobile}
                  onChange={(e) =>
                    setMemberForm({
                      ...memberForm,
                      mobile: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                />

                {/* Date of Birth Fields (Day, Month, Year) */}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b' }}>
                    Date of Birth * (Day, Month & Optional Year)
                  </label>
                  <div
                    style={{ display: 'flex', gap: '8px', marginTop: '4px' }}
                  >
                    <select
                      value={memberForm.dobDay}
                      onChange={(e) =>
                        setMemberForm({ ...memberForm, dobDay: e.target.value })
                      }
                      required
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                      }}
                    >
                      <option value="">Day *</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d)}>
                          {d}
                        </option>
                      ))}
                    </select>

                    <select
                      value={memberForm.dobMonth}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          dobMonth: e.target.value,
                        })
                      }
                      required
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                      }}
                    >
                      <option value="">Month *</option>
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={mName} value={String(idx + 1)}>
                          {mName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={memberForm.dobYear}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          dobYear: e.target.value,
                        })
                      }
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                      }}
                    >
                      <option value="">Year (Optional)</option>
                      {Array.from({ length: 110 }, (_, i) => 2026 - i).map(
                        (y) => (
                          <option key={y} value={String(y)}>
                            {y}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* Anniversary Fields (Day, Month) */}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b' }}>
                    Marriage Anniversary (Day & Month Optional)
                  </label>
                  <div
                    style={{ display: 'flex', gap: '8px', marginTop: '4px' }}
                  >
                    <select
                      value={memberForm.annivDay}
                      onChange={(e) =>
                        setMemberForm({ ...memberForm, annivDay: e.target.value })
                      }
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                      }}
                    >
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d)}>
                          {d}
                        </option>
                      ))}
                    </select>

                    <select
                      value={memberForm.annivMonth}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          annivMonth: e.target.value,
                        })
                      }
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                      }}
                    >
                      <option value="">Month</option>
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={mName} value={String(idx + 1)}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  placeholder="Residential Address"
                  rows="2"
                  value={memberForm.address}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, address: e.target.value })
                  }
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                />

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '6px',
                    boxShadow: '0 2px 4px rgba(234,88,12,0.2)',
                  }}
                >
                  {editingMember ? 'Update Member' : 'Save Member'}
                </button>
              </form>
            </div>
          )}

          <input
            placeholder="🔍 Search member by name..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {filteredMembers.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                isSelected={selectedMemberIds.includes(m.id)}
                isDuplicate={duplicateNameSet.has(
                  (m.name || '').trim().toLowerCase()
                )}
                isAdmin={isAdmin}
                onToggleSelect={toggleSelectMember}
                onEditNote={handleEditCustomField}
                onEditMember={handleEditMember}
                onDeleteMember={handleDeleteMember}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && canViewAttendance && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ margin: 0, color: '#6b21a8' }}>Sunday Attendance</h2>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                padding: '8px 12px',
                borderRadius: '8px',
              }}
            />
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {members.map((m) => {
              const status = selectedDateAttendanceMap[m.id] || 'Absent';
              const isPresent = status === 'Present';

              return (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 'bold',
                        color: '#6b21a8',
                      }}
                    >
                      {m.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      📱 {m.mobile || 'No Mobile'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAttendance(m.id, status)}
                    style={{
                      backgroundColor: isPresent ? '#16a34a' : '#f1f5f9',
                      color: isPresent ? '#ffffff' : '#475569',
                      border: isPresent ? 'none' : '1px solid #cbd5e1',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {isPresent ? '✅ Present' : '❌ Mark Present'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'expenses' && !isRuchi && (
        <div>
          <h2 style={{ color: '#6b21a8', marginBottom: '16px' }}>
            Expenses Management
          </h2>

          {canAddExpense && (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 14px 0',
                  fontSize: '16px',
                  color: '#6b21a8',
                }}
              >
                {editingExpense
                  ? '✏️ Resubmit Expense for Pastor Robby Approval'
                  : '+ Submit New Expense'}
              </h3>

              <form
                onSubmit={handleSaveExpense}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>
                    Payment Method / Source
                  </label>
                  <select
                    value={expenseForm.paymentSource}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        paymentSource: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <option value="Direct UPI by Pastor Robby">
                      Direct UPI Paid by Pastor Robby (To Shopkeeper)
                    </option>
                    <option value="Deduct from Sumonto Christian Advance">
                      Deduct from Sumonto Christian's Advance Wallet
                    </option>
                    <option value="Deduct from Surender Messey Advance">
                      Deduct from Surender Messey's Advance Wallet
                    </option>
                    <option value="Out-of-Pocket (Needs Reimbursement)">
                      Out-of-Pocket (Needs Reimbursement)
                    </option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    placeholder="Amount (₹) *"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                    required
                    style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                    }}
                  />

                  <select
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        category: e.target.value,
                      })
                    }
                    required
                    style={{
                      flex: 1,
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="">Select Category *</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  placeholder="Detailed Explanation of Expense *"
                  value={expenseForm.detail}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, detail: e.target.value })
                  }
                  required
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>
                      Date of Expense *
                    </label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, date: e.target.value })
                      }
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '10px',
                        borderRadius: '8px',
                        marginTop: '4px',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: '11px',
                        color: '#dc2626',
                        fontWeight: 'bold',
                      }}
                    >
                      🧾 Attach Bill / Receipt (MANDATORY *)
                    </label>
                    <input
                      type="file"
                      accept="image/*, application/pdf"
                      onChange={handleReceiptFileChange}
                      disabled={expenseForm.missingBill}
                      required={!expenseForm.missingBill}
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                        marginTop: '4px',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  {editingExpense
                    ? '📩 Resubmit Expense to Pastor Robby'
                    : '📩 Submit Expense for Pastor Robby Approval'}
                </button>
              </form>
            </div>
          )}
          <h3
            style={{
              color: '#1e293b',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '10px',
              marginTop: '20px'
            }}
          >
            Professional Expense Ledger
          </h3>

<div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Filter View:</label>
            <select 
              value={expenseFilterPeriod || 'current_month'} 
              onChange={(e) => setExpenseFilterPeriod(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', color: '#1e293b' }}
            >
              <option value="current_month">📅 Current Month (Default)</option>
              <option value="all">📂 All Expenses</option>
              <option value="year">🗓️ This Year</option>
              <option value="custom">🔍 Custom Date Range</option>
            </select>
          </div>

<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
{visibleExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', color: '#64748b' }}>
                No expense records found.
              </div>
            ) : (
              visibleExpenses.sort((a, b) => b.date.localeCompare(a.date)).map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>
                        📅 {exp.date} | Added by: {exp.addedBy}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                        {exp.category}
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                        📝 {exp.detail}
                      </div>
                      <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '4px', fontWeight: 'bold' }}>
                        💳 Source: {exp.paymentSource}
                      </div>
                      {exp.missingBill ? (
                        <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', fontWeight: 'bold' }}>
                          ⚠️ No Bill: {exp.missingBillJustification}
                        </div>
                      ) : exp.receiptFile ? (
                        <a href={exp.receiptFile} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', display: 'inline-block', fontWeight: 'bold' }}>
                          📎 View Attached Bill
                        </a>
                      ) : null}
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                        ₹{Number(exp.amount).toLocaleString('en-IN')}
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: '6px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: exp.status === 'Approved' ? '#dcfce7' : exp.status === 'Rejected' ? '#fee2e2' : '#fef9c3',
                          color: exp.status === 'Approved' ? '#166534' : exp.status === 'Rejected' ? '#991b1b' : '#854d0e',
                        }}
                      >
                        {exp.status === 'Approved' ? '✅ Approved' : exp.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending'}
                      </div>
                      {exp.status === 'Rejected' && exp.rejectionReason && (
                        <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', maxWidth: '200px' }}>
                          Reason: {exp.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', flexWrap: 'wrap' }}>
                    {(isAdmin || exp.addedBy === user.email) && (
                      <>
                        <button onClick={() => handleEditExpenseClick(exp)} style={{ backgroundColor: '#f1f5f9', color: '#6b21a8', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Edit</button>
                        <button onClick={() => handleDeleteExpense(exp.id)} style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Delete</button>
                      </>
                    )}
                    
                    {canApproveExpense && exp.status === 'Pending' && (
                      <>
                        <button onClick={() => handleApproveExpense(exp.id)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}>✅ Approve</button>
                        <button onClick={() => handleRejectExpense(exp.id)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'offerings' && canViewOfferings && (
        <div>
          <h2 style={{ color: '#6b21a8', marginBottom: '16px' }}>
            Offerings & Tithes Tracker
          </h2>

          {canAddOffering && (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 14px 0',
                  fontSize: '16px',
                  color: '#6b21a8',
                }}
              >
                {editingOffering
                  ? '✏️ Edit Offering / Tithe Record'
                  : '+ Record Offering / Tithe'}
              </h3>
              <form
                onSubmit={handleSaveOffering}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>
                    Giver Name / Member (Select ANONYMOUS for anonymous giving)
                  </label>
                  <select
                    value={offeringForm.memberName}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        memberName: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                      marginTop: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    <option value="Anonymous (Given Anonymously)">
                      🔒 ANONYMOUS (Given Anonymously)
                    </option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>
                      Offering Type / Category
                    </label>
                    <select
                      value={offeringForm.category}
                      onChange={handleOfferingCategoryChange}
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '10px',
                        borderRadius: '8px',
                        marginTop: '4px',
                      }}
                    >
                      {offeringCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      placeholder="Amount (₹) *"
                      value={offeringForm.amount}
                      onChange={(e) =>
                        setOfferingForm({
                          ...offeringForm,
                          amount: e.target.value,
                        })
                      }
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '10px',
                        borderRadius: '8px',
                        marginTop: '4px',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>
                    Offering Date *
                  </label>
                  <input
                    type="date"
                    value={offeringForm.date || ''}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        date: e.target.value,
                      })
                    }
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                      marginTop: '4px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Add any specific note here..."
                    value={offeringForm.note || ''}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        note: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '10px',
                      borderRadius: '8px',
                      marginTop: '4px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  {editingOffering
                    ? 'Update Offering Record'
                    : '💰 Save Offering Record'}
                </button>
              </form>
            </div>
          )}

          <div
            style={{
              backgroundColor: '#f3e8ff',
              border: '2px dashed #7e22ce',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: '#6b21a8', fontSize: '15px' }}>
                📋 Done recording all tithes & offerings for today?
              </h3>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                Click 'Yes, All Recorded' to attach today's physical counting
                sheet summary document.
              </p>
            </div>
            <button
              onClick={() => setShowDailySheetModal(true)}
              style={{
                backgroundColor: '#7e22ce',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✅ Yes, All Recorded (Upload Sheet)
            </button>
          </div>

          {showDailySheetModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    color: '#6b21a8',
                    fontSize: '18px',
                  }}
                >
                  📁 Upload Daily Counting Sheet
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    marginBottom: '16px',
                  }}
                >
                  Select the collection date and upload the counting sheet
                  document matching today's totals.
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#475569',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Collection Date *
                    </label>
                    <input
                      type="date"
                      value={selectedDailyDate}
                      onChange={(e) => setSelectedDailyDate(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '10px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#475569',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Counting Sheet Document (Image / PDF) *
                    </label>
                    <input
                      type="file"
                      accept="image/*, application/pdf"
                      onChange={handleDailyFileSelect}
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    {dailyFileObj.name && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#16a34a',
                        fontWeight: 'bold',
                        marginTop: '4px',
                      }}
                    >
                      📎 Selected: {dailyFileObj.name}
                    </div>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#475569',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Note / Justification (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter any clarification or details..."
                      value={dailyFileObj.note || ''}
                      onChange={(e) => setDailyFileObj({ ...dailyFileObj, note: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: '#f8fafc',
                        color: '#1e293b',
                        border: '1px solid #cbd5e1',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleSaveDailySheet}
                    style={{
                      flex: 1,
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    💾 Save & Link Sheet
                  </button>
                  <button
                    onClick={() => {
                      setShowDailySheetModal(false);
                      setDailyFileObj({ file: null, name: '' });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <h3
            style={{
              color: '#1e293b',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '10px',
            }}
          >
            Professional Offering Ledger
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            {(() => {
              const groupedByDate = {};
              (offerings || []).forEach((o) => {
                const d = o.date || todayStr;
                if (!groupedByDate[d]) groupedByDate[d] = [];
                groupedByDate[d].push(o);
              });

              const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

              if (sortedDates.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', color: '#64748b' }}>
                    No offering or tithe records found.
                  </div>
                );
              }

              return sortedDates.map((date) => {
                const dateItems = groupedByDate[date];
                const tithes = dateItems.filter((o) => o.category === 'Tithe');
                const nonTithes = dateItems.filter((o) => o.category !== 'Tithe');

                const totalTithes = tithes.reduce((sum, o) => sum + Number(o.amount || 0), 0);
                const totalOfferings = nonTithes.reduce((sum, o) => sum + Number(o.amount || 0), 0);
                const grandTotal = totalTithes + totalOfferings;

                const sortedTithes = [...tithes].sort((a, b) => {
                  const nameA = (a.memberName || '').toLowerCase();
                  const nameB = (b.memberName || '').toLowerCase();
                  return nameA.localeCompare(nameB);
                });

                return (
                  <DateOfferingTableCard
                    key={date}
                    date={date}
                    dateItems={dateItems}
                    sortedTithes={sortedTithes}
                    nonTithes={nonTithes}
                    totalTithes={totalTithes}
                    totalOfferings={totalOfferings}
                    grandTotal={grandTotal}
                    isAdmin={isAdmin}
                    dailySheets={dailySheets}
                    todayStr={todayStr}
                    onEditOffering={handleEditOfferingClick}
                    onDeleteOffering={handleDeleteOffering}
                    onUploadSheet={(d) => {
                      setSelectedDailyDate(d);
                      setShowDailySheetModal(true);
                    }}
                    onQuickAddForDate={(d) => {
                      setOfferingForm({ ...offeringForm, date: d });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}