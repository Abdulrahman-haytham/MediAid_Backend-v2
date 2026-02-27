const http = require('http');

const user = JSON.stringify({
  type: 'user',
  username: 'demo_user',
  email: 'demo@mediaid.com',
  password: 'Password123!',
  firstName: 'Demo',
  lastName: 'User',
  phone: '1234567890',
  address: 'Demo Address',
  location: {
    coordinates: [30.0444, 31.2357]
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/users/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': user.length
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log('User created successfully');
      console.log('Email: demo@mediaid.com');
      console.log('Password: Password123!');
    } else if (res.statusCode === 409) {
      console.log('User already exists');
      console.log('Email: demo@mediaid.com');
      console.log('Password: Password123!');
    } else {
      console.log(`Error: Status Code ${res.statusCode}`);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(user);
req.end();
