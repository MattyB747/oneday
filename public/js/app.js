// Best Day entry point. One clean mount per feature.
import { mountSetup } from './features/setup.js';
import { mountDashboard } from './features/dashboard.js';
import { mountPlanner } from './features/planner.js';

mountSetup();
mountDashboard();
mountPlanner();
