import axios from 'axios';

async function testMapImageAPI() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('Testing Map Image API endpoints...');

  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@utctravel.com',
      password: 'password'
    });

    console.log('Login Response keys:', Object.keys(loginRes.data));
    console.log('Login Response body:', loginRes.data);

    const token = loginRes.data?.data?.token || loginRes.data?.token || loginRes.data?.accessToken;
    console.log('Extracted Token:', token ? token.substring(0, 15) + '...' : 'NULL');

    const headers = { Authorization: `Bearer ${token}` };

    const resPatch = await axios.patch(
      `${BASE_URL}/settings/homepage`,
      { mapImage: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1200' },
      { headers }
    );
    console.log('PATCH /settings/homepage response:', resPatch.data);

    const resGet = await axios.get(`${BASE_URL}/settings/homepage`);
    console.log('Public GET /settings/homepage mapImage:', resGet.data?.data?.content?.mapImage);
  } catch (err: any) {
    console.error('API Test Error:', err.message, err.response?.data);
  }
}

testMapImageAPI();
