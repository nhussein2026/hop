import 'dotenv/config';

import { authService } from '../services/auth.service.js';

authService.reset();
console.log('Hop password and sessions removed. Open Hop on this machine to set a new password.');
