const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: '466583da-1d1f-4cb7-8370-77c0dbb7a48f', role: 'ADMIN', roleName: 'ADMIN', email: 'admin@utctravel.com' }, 'your_jwt_secret_key', { expiresIn: '1h' });
console.log(token);
