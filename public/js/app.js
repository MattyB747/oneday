// Tempo entry point. One clean mount per feature.
import { mountSetup } from './features/setup.js';
import { mountDashboard } from './features/dashboard.js';

mountSetup();
mountDashboard();
