import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { Clock, User, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Appointment } from '../types';

interface AppointmentSchedulerProps {
  onSchedule: (appointment: Omit<Appointment, 'id' | 'userId' | 'status'>) => void;
}

export const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({ onSchedule }) => {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [patientName, setPatientName] = useState('');

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSchedule({
      patientName,
      date: format(date, 'yyyy-MM-dd'),
      time,
      reason
    });
    setReason('');
    setPatientName('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          Select Date
        </h3>
        <Calendar
          onChange={(val) => setDate(val as Date)}
          value={date}
          className="border-none rounded-2xl shadow-sm w-full"
          minDate={new Date()}
        />
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-700 font-medium">
            Selected: {format(date, 'MMMM do, yyyy')}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            Available slots are shown on the right.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-600" />
          Appointment Details
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Full Name"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Time</label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => {
                const isOccupied = Math.random() > 0.8; // Mock vacancy logic
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isOccupied}
                    onClick={() => setTime(slot)}
                    className={cn(
                      "py-2 text-sm font-medium rounded-lg border transition-all relative",
                      time === slot 
                        ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                        : isOccupied 
                          ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    )}
                  >
                    {slot}
                    {isOccupied && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Red dot indicates slot is already booked.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your symptoms..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-24 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Schedule Appointment
          </button>
        </form>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
