export interface PatientRecord {
  id: string;
  userId: string;
  timestamp: string;
  symptoms: string;
  pastMedicines: string;
  doctorAppointments: string;
  transcription?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  userId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'cancelled' | 'completed';
}

export interface User {
  uid: string;
  email: string;
  role: 'patient' | 'doctor';
  displayName?: string;
}
