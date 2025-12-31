import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Plus, NotebookPen, X, AlertCircle, CheckCircle, HelpCircle, Activity, Calendar as CalendarIcon, Edit, ChevronLeft, ChevronRight, Loader2, Rocket, Plane, Zap, Shield, Crosshair, Radar, Target } from 'lucide-react';

const ICON_MAP = {
    rocket: Rocket,
    plane: Plane,
    zap: Zap,
    shield: Shield,
    crosshair: Crosshair,
    radar: Radar,
    target: Target
};

const initialVehicles = [
    {
        id: '117',
        name: 'High Density Battery Unit',
        status: 'Ready',
        icon: 'zap',
        notes: 'Software status unknown, ready to fly',
        bookings: [
            { date: '2025-12-30', pilot: 'Maverick', project: 'Battery Test', duration: '4h', notes: 'Initial stress test' }
        ]
    },
    {
        id: '125',
        name: 'Internal Test Vehicle',
        status: 'Maintenance',
        icon: 'shield',
        notes: 'Testing new landing legs, status messy. AMC Version: 1.3.13',
        bookings: []
    },
    {
        id: '931',
        name: 'Visual Nav Demo',
        status: 'Ready',
        icon: 'plane',
        notes: 'Equipped with visual nav & boson. Outlook great. Ready to demo. AMC Version: 1.3.13',
        bookings: []
    },
    {
        id: 'TBD',
        name: 'High Altitude Test',
        status: 'Unknown',
        icon: 'rocket',
        notes: 'New DQIO board. AMC Version: Unknown',
        bookings: []
    }
];

const PILOTS = ['Maverick', 'Iceman', 'Viper', 'Jester', 'Rooster', 'Bob', 'Michael', 'Devon', 'Renzo'];

const StatusBadge = ({ status }) => {
    const styles = {
        Ready: 'bg-green-500/20 text-green-400 border-green-500/50',
        Maintenance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
        Unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    };

    const icons = {
        Ready: <CheckCircle className="w-4 h-4 mr-2" />,
        Maintenance: <AlertCircle className="w-4 h-4 mr-2" />,
        Unknown: <HelpCircle className="w-4 h-4 mr-2" />
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
            {icons[status] || <HelpCircle className="w-4 h-4 mr-2" />}
            {status}
        </span>
    );
};



const CalendarView = ({ bookings, onDateSelect, selectedDate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        // Adjust for Monday start (0=Sun, 1=Mon) -> (Day + 6) % 7 gives 0 for Mon
        const firstDay = new Date(year, month, 1).getDay();
        const padding = (firstDay + 6) % 7;

        const daysArray = [];
        for (let i = 0; i < padding; i++) daysArray.push(null);
        for (let i = 1; i <= days; i++) daysArray.push(new Date(year, month, i));
        return daysArray;
    };

    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const isBooked = (dateStr) => bookings.find(b => b.date === dateStr);

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-bold text-slate-200">{monthName}</span>
                <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-700 rounded"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => (
                    <div key={d} className="text-center text-xs text-slate-500 font-bold">{d}</div>
                ))}
                {days.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const dateStr = formatDate(date);
                    const booking = isBooked(dateStr);
                    const isSelected = selectedDate === dateStr;

                    // Tooltip positioning adjustment
                    const isLeftEdge = idx % 7 === 0; // Monday
                    const isRightEdge = idx % 7 === 6; // Sunday

                    return (
                        <div key={dateStr} className="relative group">
                            <button
                                type="button"
                                disabled={!!booking}
                                onClick={() => onDateSelect(dateStr)}
                                className={`
                  w-full aspect-square text-sm font-medium rounded flex items-center justify-center transition-all
                  ${booking
                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                        : isSelected
                                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}
                `}
                            >
                                {date.getDate()}
                            </button>

                            {/* Tooltip for booked dates */}
                            {booking && (
                                <div className={`absolute bottom-full mb-2 w-48 p-2 bg-slate-900 border border-slate-600 rounded shadow-xl z-50 hidden group-hover:block
                                    ${isLeftEdge ? 'left-0' : isRightEdge ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                                `}>
                                    <div className="text-xs text-slate-400">Reserved by</div>
                                    <div className="font-bold text-orange-400 text-sm">{booking.pilot}</div>
                                    <div className="text-xs text-slate-300 italic">{booking.project}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const BookingModal = ({ vehicle, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        date: '',
        pilot: '',
        project: '',
        duration: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.date) return alert('Please select a date');

        setIsSubmitting(true);
        setStatusMsg('');

        // 1. Save locally
        onSave(vehicle.id, formData);

        setIsSubmitting(false);
        alert('Booking Confirmed!');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border-2 border-slate-700 rounded-lg w-full max-w-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">

                {/* Left Side: Calendar */}
                <div className="p-6 bg-slate-900/30 border-r border-slate-700 flex-1 overflow-y-auto">
                    <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-orange-500" />
                        Select Date
                    </h3>
                    <CalendarView
                        bookings={vehicle.bookings}
                        selectedDate={formData.date}
                        onDateSelect={(date) => setFormData({ ...formData, date })}
                    />
                </div>

                {/* Right Side: Form */}
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Booking</h2>
                            <p className="text-slate-400 text-sm">Vehicle #{vehicle.id}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Selected Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                disabled
                                type="text"
                                className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-slate-400"
                                value={formData.date || 'No date selected'}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Pilot <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.pilot}
                                onChange={(e) => setFormData({ ...formData, pilot: e.target.value })}
                            >
                                <option value="">Select Pilot...</option>
                                {PILOTS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Project Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Visual Nav Test"
                                className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.project}
                                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Duration <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. 2 hours"
                                className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Notes
                            </label>
                            <textarea
                                rows="2"
                                placeholder="Additional details..."
                                className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="pt-4 mt-auto">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
                            </button>
                            {statusMsg && <p className="text-center text-xs mt-2 text-slate-400">{statusMsg}</p>}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const VehicleModal = ({ vehicle, onClose, onSave, mode = 'add' }) => {
    const [formData, setFormData] = useState(vehicle || {
        id: '',
        name: '',
        status: 'Ready',
        icon: 'plane',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border-2 border-slate-700 rounded-lg w-full max-w-md shadow-2xl">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wide">
                        {mode === 'edit' ? 'Edit Vehicle' : 'Add New Vehicle'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Vehicle ID</label>
                        <input
                            required
                            disabled={mode === 'edit'}
                            type="text"
                            className={`w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none ${mode === 'edit' ? 'text-slate-500 cursor-not-allowed' : ''}`}
                            value={formData.id}
                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Name</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Status</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="Ready">Ready</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Icon</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        >
                            {Object.keys(ICON_MAP).map(iconKey => (
                                <option key={iconKey} value={iconKey}>{iconKey.charAt(0).toUpperCase() + iconKey.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Notes</label>
                        <textarea
                            required
                            rows="3"
                            className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded transition-colors uppercase tracking-widest"
                    >
                        {mode === 'edit' ? 'Save Changes' : 'Add Vehicle'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const GlobalCalendarModal = ({ vehicles, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        // Adjust for Monday start (0=Sun, 1=Mon)
        const firstDay = new Date(year, month, 1).getDay();
        const padding = (firstDay + 6) % 7;

        const daysArray = [];
        // Add empty info for padding
        for (let i = 0; i < padding; i++) {
            daysArray.push(null);
        }

        for (let i = 1; i <= days; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return daysArray;
    };

    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getBookingsForDate = (date) => {
        if (!date) return [];
        // Use local date parts to avoid UTC shifting
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const allBookings = [];
        vehicles.forEach(v => {
            v.bookings.forEach(b => {
                if (b.date === dateStr) {
                    allBookings.push({ ...b, vehicle: v });
                }
            });
        });
        return allBookings;
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 md:p-8">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-xl w-full max-w-6xl shadow-2xl flex flex-col h-full max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <CalendarIcon className="w-8 h-8 text-orange-500" />
                        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">
                            Fleet Schedule // Global View
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                            <div className="px-6 flex items-center justify-center font-bold text-xl text-white min-w-[200px]">{monthName}</div>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><ChevronRight className="w-6 h-6" /></button>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                    <div className="grid grid-cols-7 gap-px bg-slate-700 mb-px border border-slate-700 rounded-t-lg overflow-hidden">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                            <div key={d} className="bg-slate-800 p-3 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-slate-700 border border-slate-700 rounded-b-lg overflow-hidden">
                        {days.map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`} className="bg-slate-900/50 min-h-[120px]" />;

                            const dayBookings = getBookingsForDate(date);
                            const isToday = date.toDateString() === new Date().toDateString();

                            // Tooltip positioning adjustment
                            const isLeftEdge = idx % 7 === 0; // Monday
                            const isRightEdge = idx % 7 === 6; // Sunday

                            return (
                                <div key={date.toISOString()} className={`bg-slate-900/80 p-2 min-h-[140px] hover:bg-slate-800/80 transition-colors group relative ${isToday ? 'ring-1 ring-orange-500/50 inset-0' : ''}`}>
                                    <div className={`text-right mb-2 font-mono text-sm ${isToday ? 'text-orange-500 font-bold' : 'text-slate-500'}`}>
                                        {date.getDate()}
                                    </div>

                                    <div className="space-y-1">
                                        {dayBookings.map((booking, bIdx) => {
                                            const Icon = ICON_MAP[booking.vehicle.icon] || Rocket;
                                            return (
                                                <div key={bIdx} className="group/item relative">
                                                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700/50 p-1.5 rounded text-xs hover:border-orange-500/50 cursor-help transition-colors">
                                                        <Icon className="w-3 h-3 text-orange-500 shrink-0" />
                                                        <span className="font-bold text-slate-300 truncate">#{booking.vehicle.id}</span>
                                                        <span className="text-slate-500 truncate hidden xl:inline">{booking.pilot}</span>
                                                    </div>

                                                    {/* Popover Tooltip */}
                                                    <div className={`absolute bottom-full mb-2 w-64 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl p-3 z-50 hidden group-hover/item:block pointer-events-none
                                                        ${isLeftEdge ? 'left-0' : isRightEdge ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                                                     `}>
                                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
                                                            <div className="font-bold text-orange-400 flex items-center gap-2">
                                                                <Icon className="w-4 h-4" />
                                                                Vehicle #{booking.vehicle.id}
                                                            </div>
                                                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{booking.duration}</span>
                                                        </div>
                                                        <div className="space-y-1 text-xs">
                                                            <div className="grid grid-cols-[60px_1fr] gap-2">
                                                                <span className="text-slate-500 font-mono uppercase">Project</span>
                                                                <span className="text-slate-200 font-medium">{booking.project}</span>
                                                            </div>
                                                            <div className="grid grid-cols-[60px_1fr] gap-2">
                                                                <span className="text-slate-500 font-mono uppercase">Pilot</span>
                                                                <span className="text-slate-200 font-medium">{booking.pilot}</span>
                                                            </div>
                                                            {booking.notes && (
                                                                <div className="mt-2 text-slate-400 italic border-l-2 border-slate-700 pl-2">
                                                                    "{booking.notes}"
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Arrow */}
                                                        <div className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-600
                                                            ${isLeftEdge ? 'left-4' : isRightEdge ? 'right-4' : 'left-1/2 -translate-x-1/2'}
                                                         `} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

function App() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingModalVehicle, setBookingModalVehicle] = useState(null);
    const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [calendarOpen, setCalendarOpen] = useState(false);

    // Initial Data Seeding (only if DB is empty)
    const seedInitialData = async () => {
        const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
        if (count === 0) {
            console.log('Seeding initial data...');
            const { error } = await supabase.from('vehicles').insert(initialVehicles.map(v => ({
                id: v.id,
                name: v.name,
                status: v.status,
                icon: v.icon,
                notes: v.notes
            })));

            if (!error) {
                // Seed bookings separately
                const bookingsToInsert = [];
                initialVehicles.forEach(v => {
                    v.bookings.forEach(b => {
                        bookingsToInsert.push({
                            vehicle_id: v.id,
                            date: b.date,
                            pilot: b.pilot,
                            project: b.project,
                            duration: b.duration,
                            notes: b.notes
                        });
                    });
                });
                if (bookingsToInsert.length > 0) {
                    await supabase.from('bookings').insert(bookingsToInsert);
                }
            }
        }
    };

    const fetchData = async () => {
        if (!isSupabaseConfigured()) {
            setVehicles(initialVehicles);
            setLoading(false);
            return;
        }

        try {
            // 1. Fetch Vehicles
            const { data: vehiclesData, error: vError } = await supabase
                .from('vehicles')
                .select('*')
                .order('id');

            if (vError) throw vError;

            // 2. Fetch Bookings
            const { data: bookingsData, error: bError } = await supabase
                .from('bookings')
                .select('*');

            if (bError) throw bError;

            // 3. Merge
            const merged = vehiclesData.map(v => ({
                ...v,
                bookings: bookingsData.filter(b => b.vehicle_id === v.id)
            }));

            setVehicles(merged);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Fallback to local if fetch fails (e.g., table missing)
            setVehicles(initialVehicles);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSupabaseConfigured()) {
            seedInitialData().then(() => fetchData());

            // Realtime Subscription
            const channel = supabase
                .channel('schema-db-changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public' },
                    () => {
                        // Refresh data on any change
                        fetchData();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            console.warn('Supabase not configured. Using local data.');
            setVehicles(initialVehicles);
            setLoading(false);
        }
    }, []);

    const handleBooking = async (id, booking) => {
        if (!isSupabaseConfigured()) {
            // Fallback (Local)
            setVehicles(vehicles.map(v => {
                if (v.id === id) {
                    return { ...v, bookings: [...v.bookings, booking] };
                }
                return v;
            }));
            return;
        }

        // Supabase Insert
        const { error } = await supabase.from('bookings').insert({
            vehicle_id: id,
            date: booking.date,
            pilot: booking.pilot,
            project: booking.project,
            duration: booking.duration,
            notes: booking.notes
        });

        if (error) {
            console.error('Error saving booking:', error);
            alert('Failed to save booking');
        }
    };

    const handleSaveVehicle = async (data) => {
        if (!isSupabaseConfigured()) {
            // Fallback (Local)
            if (editingVehicle) {
                setVehicles(vehicles.map(v => v.id === data.id ? { ...data, bookings: v.bookings } : v));
            } else {
                setVehicles([...vehicles, { ...data, bookings: [] }]);
            }
            setEditingVehicle(null);
            return;
        }

        // Supabase Upsert
        const { error } = await supabase.from('vehicles').upsert({
            id: data.id,
            name: data.name,
            status: data.status,
            icon: data.icon,
            notes: data.notes
        });

        if (error) {
            console.error('Error saving vehicle:', error);
            alert('Failed to save vehicle');
        } else {
            setEditingVehicle(null);
        }
    };

    const openEditModal = (vehicle) => {
        setEditingVehicle(vehicle);
        setVehicleModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans selection:bg-orange-500/30">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-slate-700 pb-6 gap-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-orange-500" />
                        DQ Fleet
                    </h1>
                    <p className="text-slate-400 mt-2 font-mono text-sm">R&D FIELD OPERATIONS UNIT</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setCalendarOpen(true)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-white px-4 py-3 rounded transition-all flex items-center gap-2"
                        title="Global Schedule"
                    >
                        <CalendarIcon className="w-5 h-5" />
                        <span className="hidden md:inline font-bold uppercase tracking-wider text-xs">Fleet Schedule</span>
                    </button>

                    <button
                        onClick={() => { setEditingVehicle(null); setVehicleModalOpen(true); }}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-3 rounded flex items-center gap-2 transition-all font-bold uppercase tracking-wider"
                    >
                        <Plus className="w-5 h-5 text-orange-500" />
                        Add Vehicle
                    </button>
                </div>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map(vehicle => {
                    const IconComponent = ICON_MAP[vehicle.icon] || Rocket;
                    return (
                        <div key={vehicle.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-colors shadow-lg flex flex-col">

                            <div className="p-6 border-b border-slate-700/50 relative">
                                <button
                                    onClick={() => openEditModal(vehicle)}
                                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                                    title="Edit Vehicle"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <StatusBadge status={vehicle.status} />
                                </div>

                                {/* Enhanced Vehicle ID Display */}
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                        <IconComponent className="w-8 h-8 text-orange-500" />
                                    </div>
                                    <div>
                                        <span className="font-mono text-slate-500 text-xs block mb-1">UNIT IDENTIFIER</span>
                                        <h3 className="text-4xl font-black text-white tracking-tighter">
                                            #{vehicle.id}
                                        </h3>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-slate-200 mb-2">{vehicle.name}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed font-mono bg-slate-900/50 p-3 rounded border border-slate-800">
                                    {vehicle.notes}
                                </p>
                            </div>

                            <div className="p-6 bg-slate-900/20 mt-auto">
                                {vehicle.bookings.length > 0 ? (
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <CalendarIcon className="w-3 h-3" /> Upcoming Bookings
                                        </h4>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                            {vehicle.bookings.map((b, i) => (
                                                <div key={i} className="bg-slate-800 p-2 rounded text-sm border-l-2 border-orange-500">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-white font-medium">{b.date}</span>
                                                        <span className="text-slate-500 text-xs">{b.duration}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-300">{b.pilot}</span>
                                                        <span className="text-slate-500 italic truncate ml-2">{b.project}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6 text-slate-600 text-sm italic py-4 text-center border border-dashed border-slate-700 rounded">
                                        No active bookings
                                    </div>
                                )}

                                <button
                                    onClick={() => setBookingModalVehicle(vehicle)}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border-2 border-transparent hover:border-slate-500"
                                >
                                    <NotebookPen className="w-5 h-5" />
                                    Book Now
                                </button>
                            </div>

                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            {bookingModalVehicle && (
                <BookingModal
                    vehicle={bookingModalVehicle}
                    onClose={() => setBookingModalVehicle(null)}
                    onSave={handleBooking}
                />
            )}

            {vehicleModalOpen && (
                <VehicleModal
                    vehicle={editingVehicle}
                    mode={editingVehicle ? 'edit' : 'add'}
                    onClose={() => { setVehicleModalOpen(false); setEditingVehicle(null); }}
                    onSave={handleSaveVehicle}
                />
            )}



            {calendarOpen && (
                <GlobalCalendarModal
                    vehicles={vehicles}
                    onClose={() => setCalendarOpen(false)}
                />
            )}

        </div>
    );
}

export default App;
