
import { Report, ReportStatus, User } from './types';

// Mock Data
const reports: Report[] = [
    {
        id: '1', title: 'Test Report 1', status: ReportStatus.SuperAdminReview,
        reporter: { id: 'u1', name: 'Badal', role: 'Reporter' }, // Submitted by Badal
        assignedTo: { id: 'u2', name: 'Someone Else', role: 'Manager' },
        currentOwner: { id: 'admin', name: 'Super Admin', role: 'Super Admin' }, // Owned by Admin
    } as any,
    {
        id: '2', title: 'Test Report 2', status: ReportStatus.PersonResponse,
        reporter: { id: 'u3', name: 'Someone Else', role: 'Reporter' },
        assignedTo: { id: 'u1', name: 'Badal', role: 'Reporter' }, // Assigned TO Badal
        currentOwner: { id: 'u1', name: 'Badal', role: 'Reporter' }, // Owned by Badal
    } as any
];

const currentUser: User = { id: 'u1', name: 'Badal', role: 'Reporter' };

// Logic from App.tsx loadReports
const privacyFilter = (data: Report[], user: User) => {
    if (user.role !== 'Super Admin') {
        return data.filter(r =>
            r.reporter.id === user.id ||
            r.assignedTo.id === user.id ||
            r.currentOwner.id === user.id ||
            r.reporter.name === user.name ||
            r.assignedTo.name === user.name ||
            r.currentOwner.name === user.name
        );
    }
    return data;
};

// Logic from App.tsx filteredReports (My Action)
const myActionFilter = (data: Report[], user: User) => {
    return data.filter(r => r.currentOwner.id === user.id && r.status !== ReportStatus.Closed);
};

// Test
const visibleReports = privacyFilter(reports, currentUser);
console.log('Visible Reports (All):', visibleReports.map(r => r.title));

const myActionReports = myActionFilter(visibleReports, currentUser);
console.log('My Action Reports:', myActionReports.map(r => r.title));

if (visibleReports.length !== 2) console.error('FAIL: Expected 2 visible reports');
if (myActionReports.length !== 1) console.error('FAIL: Expected 1 my action report');
