import React from 'react';
import { Download, Table as TableIcon, History, Pill, Stethoscope, Calendar as CalendarIcon } from 'lucide-react';
import { PatientRecord, Appointment } from '../types';
import * as XLSX from 'xlsx';

interface DashboardProps {
  records: PatientRecord[];
  appointments: Appointment[];
  role: 'patient' | 'doctor';
}

export const Dashboard: React.FC<DashboardProps> = ({ records, appointments, role }) => {
  const exportToExcel = () => {
    const data = records.map(r => ({
      Date: new Date(r.timestamp).toLocaleString(),
      Symptoms: r.symptoms,
      'Past Medicines': r.pastMedicines,
      'Doctor Appointments': r.doctorAppointments,
      Transcription: r.transcription || '',
      Notes: r.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patient Records");
    XLSX.writeFile(wb, "Patient_Data.xlsx");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <History className="w-7 h-7 text-blue-600" />
          {role === 'doctor' ? 'All Patient Records' : 'My Medical History'}
        </h2>
        {role === 'doctor' && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Recent Interactions
          </h3>
          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-500">
                No records found.
              </div>
            ) : (
              records.map((record) => (
                <div key={record.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-400 uppercase">Symptoms</p>
                      <p className="text-gray-700">{record.symptoms}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-400 uppercase">Medicines</p>
                      <p className="text-gray-700">{record.pastMedicines}</p>
                    </div>
                  </div>
                  {record.transcription && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Raw Transcription</p>
                      <p className="text-xs text-gray-500 italic line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                        {record.transcription}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Upcoming Appointments
          </h3>
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-500 text-sm">
                No upcoming appointments.
              </div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-gray-800">{apt.time}</p>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-green-50 text-green-600 rounded">
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">{apt.patientName}</p>
                  <p className="text-xs text-gray-400">{apt.date}</p>
                  <p className="text-xs text-blue-600 mt-2 italic">"{apt.reason}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
