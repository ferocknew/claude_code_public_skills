const SMB2 = require('@marsaud/smb2');
const { promisify } = require('util');

console.log('Testing SMB2 init...');
try {
  const smb2Client = new SMB2({
    share: '\\\\127.0.0.1\\test',
    domain: 'WORKGROUP',
    username: 'guest',
    password: '',
    autoCloseTimeout: 2000
  });
  console.log('SMB2 client created successfully');
} catch (e) {
  console.error('Error creating SMB2 client:', e);
}
